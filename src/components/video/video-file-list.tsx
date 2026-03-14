'use client';

import React, { useMemo, useCallback } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    FileVideo,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Trash2,
    Clock,
    Download,
    RotateCcw,
    Eye,
    XCircle,
} from 'lucide-react';
import { formatBytes, formatDuration } from '@/lib/video-conversion';
import { PHASE_DISPLAY_NAMES } from '@/types/video-conversion';
import { sendEvent } from '@/lib/analytics';
import type { VideoFile } from '@/types/video-conversion';

interface VideoFileListProps {
    files: VideoFile[];
    onRemoveFile: (id: string) => void;
    onClearAll: () => void;
    onRetryFile?: (file: VideoFile) => void;
    onPreview?: (file: VideoFile) => void;
    onCancelFile?: (id: string) => void;
    isProcessing?: boolean;
}

export function VideoFileList({
    files,
    onRemoveFile,
    onClearAll,
    onRetryFile,
    onPreview,
    onCancelFile,
    isProcessing
}: VideoFileListProps) {

    // Memoize expensive calculations
    const stats = useMemo(() => {
        let totalOriginal = 0;
        let totalOutput = 0;
        let completedCount = 0;
        let processingCount = 0;
        let errorCount = 0;
        let cancelledCount = 0;

        files.forEach(f => {
            totalOriginal += f.originalSize;
            if (f.status === 'done') {
                completedCount++;
                totalOutput += (f.outputSize || 0);
            } else if (f.status === 'processing') {
                processingCount++;
            } else if (f.status === 'error') {
                errorCount++;
            } else if (f.status === 'cancelled') {
                cancelledCount++;
            }
        });

        return {
            totalOriginal,
            totalOutput,
            completedCount,
            processingCount,
            errorCount,
            cancelledCount,
            overallProgress: files.length > 0
                ? Math.round((completedCount / files.length) * 100)
                : 0,
            totalSaved: totalOriginal > 0 && totalOutput > 0
                ? Math.round(((totalOriginal - totalOutput) / totalOriginal) * 100)
                : 0,
        };
    }, [files]);

    // Calculate queue positions for pending/processing files
    const queuePositions = useMemo(() => {
        const positions: Record<string, { position: number; total: number }> = {};
        let queueCounter = 0;
        
        files.forEach(file => {
            if (file.status === 'pending' || file.status === 'processing') {
                queueCounter++;
            }
        });
        
        let currentPosition = 0;
        files.forEach(file => {
            if (file.status === 'pending' || file.status === 'processing') {
                currentPosition++;
                positions[file.id] = { position: currentPosition, total: queueCounter };
            }
        });
        
        return positions;
    }, [files]);

    // Confirm before clearing all files
    const handleClearAll = useCallback(() => {
        if (files.length > 0 && window.confirm('Remove all files? This cannot be undone.')) {
            sendEvent('clear_all_clicked', { file_count: files.length });
            onClearAll();
        }
    }, [files.length, onClearAll]);

    const { totalOriginal, totalOutput, completedCount, processingCount, errorCount, cancelledCount, overallProgress, totalSaved } = stats;

    if (files.length === 0) {
        return null;
    }

    return (
        <>
            <Card className="max-w-full overflow-hidden">
                <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                    display: block;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: var(--border);
                    border-radius: 9999px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: var(--muted-foreground);
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: var(--border) transparent;
                }
            `}</style>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                            <FileVideo className="w-4 h-4" />
                            Files ({files.length})
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Clear All</span>
                            <span className="sm:hidden">Clear</span>
                        </Button>
                    </div>

                    {/* Overall Progress */}
                    <div className="space-y-2 pt-2">
                        <div className="flex flex-wrap justify-between gap-y-1 text-sm">
                            <span className="text-muted-foreground">
                                {completedCount} of {files.length} complete
                                {processingCount > 0 && ` • ${processingCount} processing`}
                                {errorCount > 0 && ` • ${errorCount} failed`}
                                {cancelledCount > 0 && ` • ${cancelledCount} cancelled`}
                            </span>
                            {totalSaved !== 0 && completedCount > 0 && (
                                <span className={`font-medium ${totalSaved > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600'}`}>
                                    {totalSaved > 0 ? `-${totalSaved}%` : `+${Math.abs(totalSaved)}%`}
                                </span>
                            )}
                        </div>
                        <Progress value={overallProgress} className="h-2" />
                    </div>

                    {/* Summary Stats */}
                    {completedCount > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm pt-2">
                            <div>
                                <span className="text-muted-foreground">Original: </span>
                                <span className="font-medium">{formatBytes(totalOriginal)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Output: </span>
                                <span className="font-medium">{formatBytes(totalOutput)}</span>
                            </div>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="pt-0">
                    <div className="relative group/list">
                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar overscroll-contain">
                            {files.map((file) => {
                                const queueInfo = queuePositions[file.id];
                                return (
                                    <VideoFileItem
                                        key={file.id}
                                        file={file}
                                        onRemove={onRemoveFile}
                                        onRetry={onRetryFile}
                                        onPreview={onPreview}
                                        onCancel={onCancelFile}
                                        isProcessing={isProcessing}
                                        queuePosition={queueInfo?.position}
                                        totalQueue={queueInfo?.total}
                                    />
                                );
                            })}
                        </div>
                        {/* Scroll hint gradient */}
                        <div className="absolute bottom-0 left-0 right-1 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none opacity-0 group-hover/list:opacity-100 transition-opacity" />
                    </div>
                </CardContent>
            </Card>

            {/* Error Details Box - Shows only when there are errors */}
            <ErrorDetailsBox files={files} />
        </>
    );
}

interface ErrorDetailsBoxProps {
    files: VideoFile[];
}

function ErrorDetailsBox({ files }: ErrorDetailsBoxProps) {
    const [isExpanded, setIsExpanded] = React.useState(false);

    // Get files with errors
    const errorFiles = files.filter(f => f.status === 'error' && f.error);

    if (errorFiles.length === 0) {
        return null;
    }

    // Build email body with error details
    const buildEmailBody = () => {
        const errorDetails = errorFiles.map(f =>
            `File: ${f.name}\nError: ${f.error}`
        ).join('\n\n---\n\n');

        return encodeURIComponent(
            `Hi,\n\nI encountered errors while converting videos:\n\n${errorDetails}\n\n` +
            `Browser: ${navigator.userAgent}\n` +
            `Timestamp: ${new Date().toISOString()}\n\n` +
            `Please help me resolve this issue.`
        );
    };

    return (
        <Card className="mt-4 border-destructive/50 bg-destructive/5 gap-1 ">
            <CardHeader className={isExpanded ? "pb-3" : "pb-0"}>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-destructive">
                        <AlertCircle className="w-4 h-4" />
                        Conversion Errors ({errorFiles.length})
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-destructive hover:text-destructive/80"
                    >
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className={isExpanded ? "pt-0 space-y-3" : "py-0"}>
                {isExpanded && (
                    <>
                        {errorFiles.map((file, index) => (
                            <div
                                key={file.id}
                                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                            >
                                <p className="text-sm font-medium text-destructive mb-1">
                                    {index + 1}. {file.name}
                                </p>
                                <pre className="text-xs text-destructive/80 whitespace-pre-wrap overflow-x-auto font-mono bg-black/5 p-2 rounded">
                                    {file.error}
                                </pre>
                            </div>
                        ))}
                        <div className="pt-2">
                            <p className="text-xs text-muted-foreground">
                                Encountered errors while converting your video(s).{' '}
                                <a
                                    href={`mailto:louisleonid325@gmail.com?subject=Video%20Conversion%20Error%20Report&body=${buildEmailBody()}`}
                                    className="text-destructive hover:underline font-medium"
                                    onClick={() => sendEvent('video_error_report_clicked', { error_count: errorFiles.length })}
                                >
                                    Click here to report this issue
                                </a>{' '}
                                and I'll help you resolve it.
                            </p>
                        </div>
                    </>
                )}

                {!isExpanded && (
                    <p className="text-xs text-muted-foreground py-3">
                        Encountered errors while converting your video(s).{' '}
                        <a
                            href={`mailto:louisleonid325@gmail.com?subject=Video%20Conversion%20Error%20Report&body=${buildEmailBody()}`}
                            className="text-destructive hover:underline font-medium"
                            onClick={() => sendEvent('video_error_report_clicked', { error_count: errorFiles.length })}
                        >
                            Click here to report this issue
                        </a>{' '}
                        and I'll help you resolve it.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

interface VideoFileItemProps {
    file: VideoFile;
    onRemove: (id: string) => void;
    onRetry?: (file: VideoFile) => void;
    onPreview?: (file: VideoFile) => void;
    onCancel?: (id: string) => void;
    isProcessing?: boolean;
    queuePosition?: number;
    totalQueue?: number;
}

// Hook to track if this is the first progress update for a processing file
function useFirstProgressUpdate(file: VideoFile) {
    const [hasReceivedProgress, setHasReceivedProgress] = React.useState(false);
    const prevPhaseRef = React.useRef(file.phase);

    React.useEffect(() => {
        if (file.status !== 'processing') {
            setHasReceivedProgress(false);
            return;
        }

        // Reset when entering converting phase (FFmpeg hasn't reported yet)
        if (file.phase === 'converting' && prevPhaseRef.current !== 'converting') {
            setHasReceivedProgress(false);
        }

        // Enable transitions once FFmpeg reports real progress (> 0)
        if (file.phase === 'converting' && file.progress > 0) {
            setHasReceivedProgress(true);
        }

        prevPhaseRef.current = file.phase;
    }, [file.progress, file.phase, file.status]);

    return hasReceivedProgress;
}

// Download individual file
function downloadFile(file: VideoFile) {
    if (!file.outputBlob) return;
    const url = URL.createObjectURL(file.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Memoized VideoFileItem
const VideoFileItem = React.memo(function VideoFileItem({
    file,
    onRemove,
    onRetry,
    onPreview,
    onCancel,
    isProcessing,
    queuePosition,
    totalQueue
}: VideoFileItemProps) {
    const hasReceivedProgress = useFirstProgressUpdate(file);

    return (
        <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted active:bg-muted/80 transition-colors group min-h-[56px]">
            {/* Status Icon */}
            <div className="flex-shrink-0">
                {file.status === 'pending' && (
                    <Clock className="w-5 h-5 text-muted-foreground" />
                )}
                {file.status === 'processing' && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {file.status === 'done' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                {file.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                {file.status === 'cancelled' && (
                    <XCircle className="w-5 h-5 text-amber-500" />
                )}
            </div>

            {/* File Info */}
            <div
                className={`flex-1 min-w-0 ${onPreview && file.status === 'done' ? 'cursor-pointer' : ''}`}
                onClick={() => file.status === 'done' && onPreview?.(file)}
            >
                <p className="text-sm font-medium truncate ph-no-capture" title={file.name}>
                    <span className="sm:hidden">
                        {file.name.length > 25
                            ? `${file.name.slice(0, 16)}...${file.name.slice(-7)}`
                            : file.name}
                    </span>
                    <span className="hidden sm:inline">{file.name}</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(file.originalSize)}</span>
                    {file.status === 'done' && file.outputSize && (
                        <>
                            <span>→</span>
                            <span>{formatBytes(file.outputSize)}</span>
                        </>
                    )}
                    {file.status === 'processing' && file.estimatedTimeRemaining !== undefined && (
                        <span className="text-primary">
                            ~{formatDuration(file.estimatedTimeRemaining)} remaining
                        </span>
                    )}
                    {file.status === 'error' && file.error && (
                        <span className="text-destructive truncate max-w-[100px]">{file.error}</span>
                    )}
                    {file.status === 'cancelled' && (
                        <span className="text-amber-500">Cancelled</span>
                    )}
                </div>
                {/* Progress bar for processing */}
                {file.status === 'processing' && (
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-primary font-medium">
                                {file.phase ? PHASE_DISPLAY_NAMES[file.phase] : 'Processing...'}
                                {queuePosition && totalQueue && totalQueue > 1 && (
                                    <span className="ml-2 text-muted-foreground">
                                        ({queuePosition}/{totalQueue})
                                    </span>
                                )}
                            </span>
                            <span className="text-muted-foreground">{file.progress}%</span>
                        </div>
                        <Progress value={file.progress} className="h-1.5" disableTransition={!hasReceivedProgress} />
                    </div>
                )}
                {/* Queue position for pending files */}
                {file.status === 'pending' && queuePosition && totalQueue && totalQueue > 1 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                        Waiting... ({queuePosition}/{totalQueue})
                    </div>
                )}
            </div>

            {/* Badge */}
            <div className="flex-shrink-0">
                {file.status === 'done' && file.outputSize && (
                    <Badge
                        variant={file.outputSize < file.originalSize ? 'default' : 'secondary'}
                        className={file.outputSize < file.originalSize ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                        {file.outputSize < file.originalSize
                            ? `-${Math.round(((file.originalSize - file.outputSize) / file.originalSize) * 100)}%`
                            : 'Done'}
                    </Badge>
                )}

                {file.status === 'pending' && (
                    <Badge variant="secondary" className="hidden sm:inline-flex bg-muted-foreground/10 hover:bg-muted-foreground/20 text-muted-foreground">Ready</Badge>
                )}
                {file.status === 'error' && (
                    <Badge variant="destructive" className="hidden sm:inline-flex">Failed</Badge>
                )}
                {file.status === 'cancelled' && (
                    <Badge variant="secondary" className="hidden sm:inline-flex bg-amber-500/10 text-amber-600">Cancelled</Badge>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Cancel button for processing files */}
                {file.status === 'processing' && onCancel && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel(file.id);
                        }}
                        aria-label={`Cancel ${file.name}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                    </Button>
                )}

                {/* Preview Button */}
                {onPreview && file.status === 'done' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview(file);
                        }}
                        aria-label={`Preview ${file.name}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                )}

                {/* Download button for completed files */}
                {file.status === 'done' && file.outputBlob && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                        }}
                        aria-label={`Download ${file.name}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                )}

                {/* Retry button for failed or cancelled files - disabled when any conversion is in progress */}
                {(['error', 'cancelled'].includes(file.status)) && onRetry && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRetry?.(file);
                        }}
                        disabled={isProcessing}
                        aria-label={`Retry ${file.name}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                )}

                {/* Remove Button - disabled during processing */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(file.id);
                    }}
                    disabled={file.status === 'processing'}
                    aria-label={`Remove ${file.name}`}
                    className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
});
