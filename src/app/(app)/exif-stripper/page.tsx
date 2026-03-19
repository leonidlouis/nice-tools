"use client";

import { useState, useCallback, useMemo } from "react";
import { 
    ShieldOff, 
    Trash2, 
    Download, 
    Image as ImageIcon, 
    AlertCircle, 
    CheckCircle2, 
    Loader2,
    Info,
    Search,
    ShieldAlert
} from "lucide-react";
import { DropZone } from "@/components/drop-zone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn, formatBytes } from "@/lib/utils";
import { sendEvent } from "@/lib/analytics";
import type { ImageFile } from "@/types/exif-stripper";
import { stripMultipleFiles } from "@/lib/exif-stripper";
import JSZip from "jszip";

export default function ExifStripperPage() {
    const [files, setFiles] = useState<ImageFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesAdded = useCallback((newFiles: File[]) => {
        const imageFiles: ImageFile[] = newFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            name: file.name,
            originalSize: file.size,
            status: 'pending',
            progress: 0,
        }));

        setFiles(prev => [...prev, ...imageFiles]);
        sendEvent('files_added', { count: newFiles.length, tool: 'exif-stripper' });
    }, []);

    const updateFile = useCallback((id: string, updates: Partial<ImageFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }, []);

    const handleRemoveFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleClearAll = () => {
        setFiles([]);
    };

    const handleStartStripping = useCallback(async () => {
        const filesToProcess = files.filter(f => f.status === 'pending');
        if (filesToProcess.length === 0) return;

        setIsProcessing(true);
        sendEvent('exif_stripping_started', { count: filesToProcess.length });

        try {
            await stripMultipleFiles(filesToProcess, (updatedFile) => {
                setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
            });
            sendEvent('exif_batch_completed', { count: filesToProcess.length });
        } catch (error) {
            console.error('Stripping batch failed', error);
            sendEvent('exif_error_occurred', { 
                context: 'batch_stripping', 
                message: error instanceof Error ? error.message : 'Unknown error' 
            });
        } finally {
            setIsProcessing(false);
        }
    }, [files, updateFile]);

    const handleDownload = (file: ImageFile) => {
        if (!file.strippedBlob) return;

        const url = URL.createObjectURL(file.strippedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stripped-${file.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        sendEvent('download_clicked', { name: file.name, size: file.strippedSize });
    };

    const handleDownloadAll = async () => {
        const completedFiles = files.filter(f => f.status === 'done' && f.strippedBlob);
        if (completedFiles.length === 0) return;

        if (completedFiles.length === 1) {
            handleDownload(completedFiles[0]);
        } else {
            const zip = new JSZip();
            completedFiles.forEach(file => {
                zip.file(`stripped-${file.name}`, file.strippedBlob!);
            });
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'stripped-images.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            sendEvent('download_all_clicked', { tool: 'exif-stripper', count: completedFiles.length });
        }
    };

    const pendingCount = files.filter(f => f.status === 'pending').length;
    const completedCount = files.filter(f => f.status === 'done').length;

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
                {/* Tool Header */}
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <ShieldOff className="size-5 text-primary" />
                            EXIF Stripper
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Surgically remove GPS, camera info, and sensitive metadata — 100% private.
                        </p>
                    </div>
                    {files.length > 0 && !isProcessing && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleClearAll} className="h-8 gap-1.5">
                                <Trash2 className="size-3.5" />
                                Clear
                            </Button>
                            {completedCount > 0 && (
                                <Button size="sm" onClick={handleDownloadAll} className="h-8 gap-1.5 shadow-sm">
                                    <Download className="size-3.5" />
                                    Download All
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* DropZone */}
                <DropZone 
                    onFilesAdded={handleFilesAdded} 
                    disabled={isProcessing} 
                    descriptionText="Supports JPEG, PNG, WebP • 100% local & private"
                />

                {files.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
                        {/* File List */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-4 border-b">
                                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                        <ImageIcon className="size-4" />
                                        Files ({files.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y max-h-[500px] overflow-y-auto">
                                        {files.map((file) => (
                                            <div key={file.id} className="p-4 flex items-center justify-between gap-4 bg-muted/5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="size-10 rounded bg-muted flex items-center justify-center shrink-0">
                                                        <ImageIcon className="size-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold truncate">{file.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{formatBytes(file.originalSize)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    {file.status === 'processing' && (
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <Loader2 className="size-3.5 animate-spin text-primary" />
                                                            <span className="text-[9px] font-bold text-primary uppercase">Stripping...</span>
                                                        </div>
                                                    )}
                                                    {file.status === 'done' && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex flex-col items-end">
                                                                <Badge variant="outline" className="text-[9px] h-4 bg-green-500/5 text-green-600 border-green-500/20">
                                                                    SCRUBBED
                                                                </Badge>
                                                                <span className="text-[9px] text-muted-foreground font-medium text-right">
                                                                    {Math.round(((file.originalSize - (file.strippedSize || file.originalSize)) / file.originalSize) * 100) === 0
                                                                        ? "Clean"
                                                                        : `-${Math.round(((file.originalSize - (file.strippedSize || 0)) / file.originalSize) * 100)}%`
                                                                    }
                                                                </span>
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="size-8" onClick={() => handleDownload(file)}>
                                                                <Download className="size-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {file.status === 'pending' && (
                                                        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveFile(file.id)}>
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Summary & Actions */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                        <ShieldAlert className="size-4 text-primary" />
                                        Privacy Guard
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">Pending Scrub</span>
                                            <span className="font-bold">{pendingCount} images</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">Privacy Protection</span>
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20">Active</Badge>
                                        </div>
                                    </div>

                                    <Button 
                                        className="w-full gap-2 shadow-lg shadow-primary/10" 
                                        size="lg"
                                        disabled={isProcessing || pendingCount === 0}
                                        onClick={handleStartStripping}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" />
                                                Scrubbing...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldOff className="size-4" />
                                                Strip Metadata
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-primary/5 border-primary/10 shadow-none">
                                <CardContent className="p-4 flex items-start gap-3">
                                    <Info className="size-4 text-primary shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold">Privacy Note</p>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                                            This tool removes EXIF, XMP, and GPS data. Image content remains unchanged, but all "hidden" identifiers are purged.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
