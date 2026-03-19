'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { VideoDropZone } from '@/components/video/video-drop-zone';
import { VideoSettingsPanel } from '@/components/video/video-settings-panel';
import { VideoFileList } from '@/components/video/video-file-list';
import { VideoPreview } from '@/components/video/video-preview';
import { Button } from '@/components/ui/button';

import { Play, RefreshCw, Loader2, AlertTriangle, Smartphone, Download, Video } from 'lucide-react';
import {
    generateId,
    convertVideoFiles,
    cancelConversion,
    getDefaultVideoSettings,
    isMobileDevice,
    formatBytes,
    terminateVideoWorker,
} from '@/lib/video-conversion';
import { sendEvent } from '@/lib/analytics';
import type { VideoFile, VideoConversionSettings } from '@/types/video-conversion';
import { MAX_FILE_SIZE_MB } from '@/types/video-conversion';
import JSZip from 'jszip';

export default function VideoConverterPage() {
    const [files, setFiles] = useState<VideoFile[]>([]);
    const [settings, setSettings] = useState<VideoConversionSettings>(getDefaultVideoSettings);
    const [lastRunSettings, setLastRunSettings] = useState<VideoConversionSettings | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewFileId, setPreviewFileId] = useState<string | null>(null);
    const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);
    const [mobileWarningDismissed, setMobileWarningDismissed] = useState(false);

    // Detect mobile device
    const isMobile = useMemo(() => isMobileDevice(), []);

    // Check if settings changed since last run
    const hasUnsavedChanges = lastRunSettings && (
        lastRunSettings.mode !== settings.mode ||
        lastRunSettings.outputFormat !== settings.outputFormat ||
        lastRunSettings.quality !== settings.quality ||
        lastRunSettings.resolution !== settings.resolution ||
        lastRunSettings.preset !== settings.preset ||
        lastRunSettings.fps !== settings.fps ||
        lastRunSettings.multiThreaded !== settings.multiThreaded ||
        lastRunSettings.gifOptimization !== settings.gifOptimization
    );

    // Cleanup worker on unmount
    useEffect(() => {
        return () => {
            terminateVideoWorker();
        };
    }, []);

    // Add new files
    const handleFilesAdded = useCallback((newFiles: File[]) => {
        // Check file sizes against limit
        const validFiles: File[] = [];
        const rejectedFiles: File[] = [];

        newFiles.forEach(file => {
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > MAX_FILE_SIZE_MB) {
                rejectedFiles.push(file);
            } else {
                validFiles.push(file);
            }
        });

        // Show warning for rejected files
        if (rejectedFiles.length > 0) {
            const rejectedNames = rejectedFiles.map(f => f.name).join(', ');
            alert(
                `The following files exceed the ${MAX_FILE_SIZE_MB}MB limit and were not added:\n\n${rejectedNames}`
            );
        }

        if (validFiles.length === 0) return;

        sendEvent('video_files_added', {
            count: validFiles.length,
            types: validFiles.map(f => f.type),
            total_size: validFiles.reduce((acc, f) => acc + f.size, 0)
        });

        const videoFiles: VideoFile[] = validFiles.map(file => ({
            id: generateId(),
            file,
            name: file.name,
            originalSize: file.size,
            status: 'pending',
            progress: 0,
        }));

        setFiles(prev => [...prev, ...videoFiles]);
    }, []);

    // Update file in state
    const updateFile = useCallback((updatedFile: VideoFile) => {
        setFiles(prev =>
            prev.map(f => f.id === updatedFile.id ? updatedFile : f)
        );
    }, []);

    // Remove file
    const handleRemoveFile = useCallback((id: string) => {
        // Cancel if processing
        const file = files.find(f => f.id === id);
        if (file?.status === 'processing') {
            cancelConversion(id);
        }
        setFiles(prev => prev.filter(f => f.id !== id));
    }, [files]);

    // Clear all files
    const handleClearAll = useCallback(() => {
        // Cancel any processing files
        files.filter(f => f.status === 'processing').forEach(f => {
            cancelConversion(f.id);
        });
        setFiles([]);
        setLastRunSettings(null);
        setIsProcessing(false);
    }, [files]);

    // Cancel a processing file
    const handleCancelFile = useCallback((id: string) => {
        cancelConversion(id);
        // Update state immediately for better UX
        setFiles(prev =>
            prev.map(f => f.id === id ? { ...f, status: 'cancelled', progress: 0 } : f)
        );
    }, []);

    // Start conversion
    const handleStartConversion = useCallback(async () => {
        let filesToProcess = files.filter(f => f.status === 'pending' || f.status === 'cancelled');

        // If no pending/cancelled but we have done files with setting changes, re-process all
        if (filesToProcess.length === 0 && files.length > 0 && hasUnsavedChanges) {
            filesToProcess = files.map(f => ({
                ...f,
                status: 'pending' as const,
                error: undefined,
                outputBlob: undefined,
                outputSize: undefined,
                progress: 0,
                name: f.file.name, // Reset name to original
            }));
            setFiles(filesToProcess);
        }

        if (filesToProcess.length === 0) return;

        setIsProcessing(true);
        setIsLoadingFFmpeg(true);
        setLastRunSettings(settings);

        sendEvent('video_conversion_started', {
            file_count: filesToProcess.length,
            settings: settings
        });

        const startTime = performance.now();

        try {
            // Initialize FFmpeg (this will load the worker and FFmpeg)
            const { initVideoWorker } = await import('@/lib/video-conversion');
            await initVideoWorker();
            setIsLoadingFFmpeg(false);

            // Process files sequentially
            await convertVideoFiles(filesToProcess, settings, updateFile);

            const duration = performance.now() - startTime;

            sendEvent('video_batch_completed', {
                file_count: filesToProcess.length,
                duration_ms: Math.round(duration),
                settings: settings
            });
        } catch (error) {
            console.error('Video conversion batch failed', error);
            sendEvent('video_error_occurred', {
                context: 'batch_conversion',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsProcessing(false);
            setIsLoadingFFmpeg(false);
        }
    }, [files, settings, hasUnsavedChanges, updateFile]);

    // Preview a file
    const handlePreview = useCallback((file: VideoFile) => {
        if (file.status === 'done') {
            setPreviewFileId(file.id);
            sendEvent('video_preview_opened', {
                file_name: file.name,
                file_size: file.originalSize
            });
        }
    }, []);

    // Retry a failed or cancelled file
    const handleRetryFile = useCallback(async (file: VideoFile) => {
        if (!['error', 'cancelled'].includes(file.status)) return;

        const resetFile: VideoFile = {
            ...file,
            status: 'pending',
            error: undefined,
            progress: 0,
            name: file.file.name, // Reset name to original
        };
        updateFile(resetFile);

        setIsProcessing(true);

        // Immediately set to processing so progress bar shows
        const processingFile: VideoFile = {
            ...resetFile,
            status: 'processing',
            phase: 'reading',
        };
        updateFile(processingFile);

        try {
            const { convertVideoFile } = await import('@/lib/video-conversion');
            const result = await convertVideoFile(processingFile, settings, (progress) => {
                updateFile({
                    ...processingFile,
                    progress: progress.progress,
                    phase: progress.phase,
                    estimatedTimeRemaining: progress.estimatedTimeRemaining
                });
            });
            updateFile(result);
        } finally {
            setIsProcessing(false);
        }
    }, [settings, updateFile]);

    // Download all files as ZIP
    const handleDownloadAll = useCallback(async () => {
        const completedFiles = files.filter(f => f.status === 'done' && f.outputBlob);
        if (completedFiles.length === 0) return;

        if (completedFiles.length === 1) {
            // Single file - download directly
            const file = completedFiles[0];
            const url = URL.createObjectURL(file.outputBlob!);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            // Multiple files - create ZIP
            const zip = new JSZip();
            completedFiles.forEach(file => {
                zip.file(file.name, file.outputBlob!);
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'converted-videos.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        sendEvent('video_download_all', { count: completedFiles.length });
    }, [files]);

    const pendingCount = files.filter(f => f.status === 'pending').length;
    const processingCount = files.filter(f => f.status === 'processing').length;
    const completedCount = files.filter(f => f.status === 'done').length;
    const cancelledCount = files.filter(f => f.status === 'cancelled').length;
    const showReconvert = files.length > 0 && pendingCount === 0 && processingCount === 0 && completedCount > 0 && hasUnsavedChanges;

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
                {/* Tool Header */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Video className="size-5" />
                            Video Converter
                        </h1>
                        <p className="text-xs text-muted-foreground">Convert to WebM, WebP (Animated), GIFV, GIF — 100% in your browser</p>
                    </div>
                    {completedCount > 0 && !isProcessing && (
                        <Button
                            variant="outline"
                            onClick={handleDownloadAll}
                            className="gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download {completedCount > 1 ? 'All' : ''}
                        </Button>
                    )}
                </div>

                {/* Mobile Warning */}
                {isMobile && !mobileWarningDismissed && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <Smartphone className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">Mobile Device Detected</h3>
                                <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                                    Video conversion is resource-intensive and may be slow on mobile devices.
                                    For the best experience, please use a desktop computer.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMobileWarningDismissed(true)}
                                    className="mt-3 border-amber-500/30 hover:bg-amber-500/20"
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Drop Zone */}
                <VideoDropZone
                    onFilesAdded={handleFilesAdded}
                    disabled={isProcessing}
                />

                {/* Beta Warning & Disclaimer - shown when no files uploaded */}
                {files.length === 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                        <div className="flex gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs space-y-1.5">
                                <p className="font-semibold text-amber-800 dark:text-amber-400">
                                    Important Notes
                                </p>
                                <ul className="text-amber-700 dark:text-amber-500 list-disc list-inside space-y-0.5">
                                    <li><strong>BETA:</strong> Not yet tested with all video types — bugs may occur</li>
                                    <li><strong>Browser-based:</strong> Performance is expected to be slower than desktop apps; converting 10mb+ files may take a while</li>
                                </ul>
                                <p className="text-amber-700 dark:text-amber-500 pt-0.5">
                                    Spotted a bug? <a href="mailto:louisleonid325@gmail.com" className="underline hover:text-amber-900 dark:hover:text-amber-300 font-medium">Email me here</a>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* If we have files, show settings and file list */}
                {files.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:pb-0">
                        {/* Sidebar: Settings + Actions */}
                        <div className="space-y-4 order-2 lg:order-1">
                            <VideoSettingsPanel
                                settings={settings}
                                onSettingsChange={setSettings}
                                onFormatChange={(format) => {
                                    // Reset all files to pending when format changes
                                    if (files.length > 0) {
                                        setFiles(prev => prev.map(f => ({
                                            ...f,
                                            status: 'pending' as const,
                                            error: undefined,
                                            outputBlob: undefined,
                                            outputSize: undefined,
                                            progress: 0,
                                        })));
                                        setLastRunSettings(null);
                                    }
                                }}
                                disabled={isProcessing}
                            />

                            {/* Desktop Convert Button */}
                            <Button
                                size="lg"
                                onClick={handleStartConversion}
                                disabled={(!pendingCount && !showReconvert && !cancelledCount) || isProcessing}
                                className="w-full gap-2 hidden lg:flex shadow-lg shadow-primary/10"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : showReconvert ? (
                                    <RefreshCw className="w-5 h-5" />
                                ) : (
                                    <Play className="w-5 h-5" />
                                )}
                                {isProcessing
                                    ? isLoadingFFmpeg
                                        ? 'Loading FFmpeg...'
                                        : `Processing ${processingCount > 0 ? `(${processingCount})` : ''}...`
                                    : showReconvert
                                        ? 'Re-convert'
                                        : pendingCount > 0
                                            ? `Convert ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                                            : cancelledCount > 0
                                                ? `Retry ${cancelledCount} Cancelled`
                                                : 'Finished'}
                            </Button>
                        </div>

                        {/* Main: File List */}
                        <div className="order-1 lg:order-2 min-w-0 w-full">
                            <VideoFileList
                                files={files}
                                onRemoveFile={handleRemoveFile}
                                onClearAll={handleClearAll}
                                onRetryFile={handleRetryFile}
                                onPreview={handlePreview}
                                onCancelFile={handleCancelFile}
                                isProcessing={isProcessing}
                            />
                        </div>

                        {/* Mobile Sticky Convert Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 border-t z-40 lg:hidden safe-area-bottom shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                            <div className="max-w-md mx-auto">
                                <Button
                                    size="lg"
                                    onClick={handleStartConversion}
                                    disabled={(!pendingCount && !showReconvert && !cancelledCount) || isProcessing}
                                    className="w-full gap-2 shadow-xl shadow-primary/20"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : showReconvert ? (
                                        <RefreshCw className="w-5 h-5" />
                                    ) : (
                                        <Play className="w-5 h-5" />
                                    )}
                                    {isProcessing
                                        ? isLoadingFFmpeg
                                            ? 'Loading...'
                                            : 'Processing...'
                                        : showReconvert
                                            ? 'Re-convert'
                                            : pendingCount > 0
                                                ? `Convert ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                                                : cancelledCount > 0
                                                    ? `Retry ${cancelledCount} Cancelled`
                                                    : 'Finished'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <VideoPreview
                file={files.find(f => f.id === previewFileId) || null}
                isOpen={!!previewFileId}
                onClose={() => setPreviewFileId(null)}
            />
        </div>
    );
}
