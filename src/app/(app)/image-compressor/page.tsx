'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DropZone } from '@/components/drop-zone';
import { SettingsPanel } from '@/components/settings-panel';
import { FileList } from '@/components/file-list';
import { DownloadButton } from '@/components/download-button';
import { Button } from '@/components/ui/button';
import { Play, RefreshCw, Loader2 } from 'lucide-react';
import {
    generateId,
    compressFiles,
    isValidImageFile
} from '@/lib/compression';
import { getDefaultParallelWorkers } from '@/lib/worker-pool';
import { sendEvent } from '@/lib/analytics';
import type { ImageFile, CompressionSettings } from '@/types/compression';
import { ImagePreview } from '@/components/image-preview';

export default function ImageCompressorPage() {
    const [files, setFiles] = useState<ImageFile[]>([]);
    const [settings, setSettings] = useState<CompressionSettings>(() => ({
        quality: 80,
        format: 'jpeg',
        parallelWorkers: getDefaultParallelWorkers(),
    }));
    const [lastRunSettings, setLastRunSettings] = useState<CompressionSettings | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewFileId, setPreviewFileId] = useState<string | null>(null);

    // Check if settings changed since last run
    const hasUnsavedChanges = lastRunSettings && (
        lastRunSettings.quality !== settings.quality ||
        lastRunSettings.format !== settings.format ||
        lastRunSettings.parallelWorkers !== settings.parallelWorkers
    );

    // Add new files
    const handleFilesAdded = useCallback((newFiles: File[]) => {
        const validFiles = newFiles.filter(isValidImageFile);

        sendEvent('files_added', {
            count: validFiles.length,
            types: validFiles.map(f => f.type),
            total_size: validFiles.reduce((acc, f) => acc + f.size, 0)
        });

        const imageFiles: ImageFile[] = validFiles
            .map(file => ({
                id: generateId(),
                file,
                name: file.name,
                originalSize: file.size,
                status: 'pending' as const,
            }));

        setFiles(prev => [...prev, ...imageFiles]);
    }, []);

    // Update file in state
    const updateFile = useCallback((updatedFile: ImageFile) => {
        setFiles(prev =>
            prev.map(f => f.id === updatedFile.id ? updatedFile : f)
        );
    }, []);

    // Remove file
    const handleRemoveFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    // Clear all files
    const handleClearAll = useCallback(() => {
        setFiles([]);
        setLastRunSettings(null);
    }, []);

    // Start compression or Re-compress
    const handleStartCompression = useCallback(async () => {
        let filesToProcess = files.filter(f => f.status === 'pending');

        if (filesToProcess.length === 0 && files.length > 0) {
            filesToProcess = files.map(f => ({
                ...f,
                status: 'pending' as const,
                error: undefined,
                compressedSize: undefined,
                compressedBlob: undefined,
                percentSaved: undefined
            }));
            setFiles(filesToProcess);
        }

        if (filesToProcess.length === 0) return;

        setIsProcessing(true);
        setLastRunSettings(settings);

        sendEvent('compression_started', {
            file_count: filesToProcess.length,
            settings: settings
        });

        const startTime = performance.now();

        try {
            await compressFiles(filesToProcess, settings, updateFile);

            const duration = performance.now() - startTime;
            const completedFiles = filesToProcess;

            sendEvent('batch_completed', {
                file_count: completedFiles.length,
                duration_ms: Math.round(duration),
                settings: settings
            });
        } catch (error) {
            console.error('Compression batch failed', error);
            sendEvent('error_occurred', {
                context: 'batch_compression',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            setIsProcessing(false);
        }
    }, [files, settings, updateFile]);

    // Preview a file
    const handlePreview = useCallback((file: ImageFile) => {
        setPreviewFileId(file.id);
        sendEvent('preview_opened', {
            file_name: file.name,
            file_size: file.originalSize
        });
    }, []);

    // Retry a failed file
    const handleRetryFile = useCallback(async (file: ImageFile) => {
        if (file.status !== 'error' || !file.file) return;

        const resetFile: ImageFile = { ...file, status: 'pending', error: undefined };
        updateFile(resetFile);

        setIsProcessing(true);
        try {
            await compressFiles([resetFile], settings, updateFile);
        } finally {
            setIsProcessing(false);
        }
    }, [settings, updateFile]);

    const pendingCount = files.filter(f => f.status === 'pending').length;
    const showRecompress = files.length > 0 && pendingCount === 0 && hasUnsavedChanges;

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full">
                {/* Tool Header */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Image Compressor</h1>
                        <p className="text-xs text-muted-foreground">Instant batch image compression — 100% in your browser</p>
                    </div>
                    {files.length > 0 && (
                        <DownloadButton files={files} disabled={isProcessing} />
                    )}
                </div>

                {/* Drop Zone */}
                <DropZone
                    onFilesAdded={handleFilesAdded}
                    disabled={isProcessing}
                />

                {/* If we have files, show settings and file list */}
                {files.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:pb-0">
                        {/* Sidebar: Settings + Actions */}
                        <div className="space-y-4 order-2 lg:order-1">
                            <SettingsPanel
                                settings={settings}
                                onSettingsChange={setSettings}
                                disabled={isProcessing}
                            />

                            {/* Desktop Compress Button */}
                            <Button
                                size="lg"
                                onClick={handleStartCompression}
                                disabled={(!pendingCount && !showRecompress) || isProcessing}
                                className="w-full gap-2 hidden lg:flex shadow-lg shadow-primary/10"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : showRecompress ? <RefreshCw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                {isProcessing
                                    ? 'Processing...'
                                    : showRecompress
                                        ? 'Re-compress'
                                        : pendingCount > 0
                                            ? `Compress ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                                            : 'Finished'}
                            </Button>
                        </div>

                        {/* Main: File List */}
                        <div className="order-1 lg:order-2 min-w-0 w-full">
                            <FileList
                                files={files}
                                onRemoveFile={handleRemoveFile}
                                onClearAll={handleClearAll}
                                onRetryFile={handleRetryFile}
                                onPreview={handlePreview}
                            />
                        </div>

                        {/* Mobile Sticky Compress Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 border-t z-40 lg:hidden safe-area-bottom shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                            <div className="max-w-md mx-auto">
                                <Button
                                    size="lg"
                                    onClick={handleStartCompression}
                                    disabled={(!pendingCount && !showRecompress) || isProcessing}
                                    className="w-full gap-2 shadow-xl shadow-primary/20"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : showRecompress ? <RefreshCw className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                    {isProcessing
                                        ? 'Processing...'
                                        : showRecompress
                                            ? 'Re-compress'
                                            : pendingCount > 0
                                                ? `Compress ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                                                : 'Finished'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {files.length === 0 && (
                    <div className="text-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex flex-wrap justify-center gap-2">
                            <p id="upload-instructions" className="text-xs text-muted-foreground">
                                lightning fast, no uploads, private.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <ImagePreview
                key={previewFileId}
                file={files.find(f => f.id === previewFileId) || null}
                isOpen={!!previewFileId}
                onClose={() => setPreviewFileId(null)}
            />
        </div>
    );
}
