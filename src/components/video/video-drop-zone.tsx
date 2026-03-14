'use client';

import { useCallback, useState } from 'react';
import { Upload, Video, FileVideo } from 'lucide-react';
import { isValidVideoFile } from '@/lib/video-conversion';
import { SUPPORTED_VIDEO_EXTENSIONS } from '@/types/video-conversion';

interface VideoDropZoneProps {
    onFilesAdded: (files: File[]) => void;
    disabled?: boolean;
}

export function VideoDropZone({ onFilesAdded, disabled }: VideoDropZoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragActive(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files);
        const validFiles = droppedFiles.filter(isValidVideoFile);

        if (validFiles.length > 0) {
            onFilesAdded(validFiles);
        }
    }, [onFilesAdded, disabled]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
        const validFiles = selectedFiles.filter(isValidVideoFile);

        if (validFiles.length > 0) {
            onFilesAdded(validFiles);
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    }, [onFilesAdded]);

    return (
        <div
            role="region"
            aria-label="Video upload area"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
        relative flex flex-col items-center justify-center
        min-h-[180px] sm:min-h-[240px] md:min-h-[280px] rounded-2xl border-2 border-dashed
        transition-all duration-300 ease-out cursor-pointer
        ${isDragActive
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
        >
            <label htmlFor="video-upload-input" className="sr-only">
                Select videos to convert
            </label>
            <input
                id="video-upload-input"
                type="file"
                multiple
                accept={SUPPORTED_VIDEO_EXTENSIONS.join(',')}
                onChange={handleFileInput}
                disabled={disabled}
                aria-label="Select videos to convert"
                aria-describedby="video-upload-instructions"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className={`
        flex flex-col items-center gap-3 sm:gap-4 p-6 sm:p-8 text-center
        transition-transform duration-300
        ${isDragActive ? 'scale-110' : ''}
      `}>
                <div className={`
          p-3 sm:p-4 rounded-full transition-colors duration-300
          ${isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
        `}>
                    {isDragActive ? (
                        <FileVideo className="w-8 h-8 sm:w-10 sm:h-10" />
                    ) : (
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10" />
                    )}
                </div>

                <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1">
                        {isDragActive ? 'Drop videos here' : 'Drag & drop videos'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        or tap to browse files
                    </p>
                </div>

                <p id="video-upload-instructions" className="text-xs text-muted-foreground">
                    Supports MP4, WebM, MOV, AVI, MKV
                </p>
            </div>
        </div>
    );
}
