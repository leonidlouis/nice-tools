'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Play, Pause, Volume2, VolumeX, SwitchCamera, Maximize } from 'lucide-react';
import type { VideoFile } from '@/types/video-conversion';
import { formatBytes } from '@/lib/video-conversion';

interface VideoPreviewProps {
    file: VideoFile | null;
    isOpen: boolean;
    onClose: () => void;
}

export function VideoPreview({ file, isOpen, onClose }: VideoPreviewProps) {
    const [showOriginal, setShowOriginal] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(1);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Create object URLs using useMemo for synchronous computation
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const outputVideoUrl = useMemo(() => {
        if (file?.outputBlob && isOpen) {
            return URL.createObjectURL(file.outputBlob);
        }
        return null;
    }, [file?.outputBlob, isOpen]);

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const originalVideoUrl = useMemo(() => {
        if (file?.file && isOpen) {
            return URL.createObjectURL(file.file);
        }
        return null;
    }, [file?.file, isOpen]);

    // Cleanup object URLs
    useEffect(() => {
        return () => {
            if (outputVideoUrl) {
                URL.revokeObjectURL(outputVideoUrl);
            }
            if (originalVideoUrl) {
                URL.revokeObjectURL(originalVideoUrl);
            }
        };
    }, [outputVideoUrl, originalVideoUrl]);

    // Set volume on video element when it changes or when switching videos
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted, showOriginal]);

    const handleDownload = () => {
        if (!file?.outputBlob) return;
        const url = URL.createObjectURL(file.outputBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            if (newVolume === 0) {
                setIsMuted(true);
                videoRef.current.muted = true;
            } else if (isMuted) {
                setIsMuted(false);
                videoRef.current.muted = false;
            }
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (video) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                video.requestFullscreen();
            }
        }
    };

    const toggleBeforeAfter = useCallback(() => {
        const newShowOriginal = !showOriginal;
        setShowOriginal(newShowOriginal);
        
        // Sync video time between original and converted
        if (videoRef.current) {
            const currentTimeValue = videoRef.current.currentTime;
            const wasPlaying = !videoRef.current.paused;
            
            // Small delay to let the video element update with new source
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.currentTime = currentTimeValue;
                    videoRef.current.volume = volume;
                    videoRef.current.muted = isMuted;
                    if (wasPlaying) {
                        videoRef.current.play().catch(() => {});
                    }
                }
            }, 50);
        }
    }, [showOriginal, volume, isMuted]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!file) return null;

    const currentVideoUrl = showOriginal ? originalVideoUrl : outputVideoUrl;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-base sm:text-lg truncate pr-4">
                            {file.name}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-4 space-y-4">
                    {/* Video Player */}
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                        {currentVideoUrl ? (
                            <video
                                ref={videoRef}
                                src={currentVideoUrl}
                                className="w-full h-full"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                muted={isMuted}
                                playsInline
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/50">
                                Loading preview...
                            </div>
                        )}

                        {/* Custom Controls Overlay */}
                        {currentVideoUrl && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                {/* Progress Bar */}
                                <input
                                    type="range"
                                    min={0}
                                    max={duration || 0}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer mb-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {/* Play/Pause Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={togglePlay}
                                            className="h-8 w-8 text-white hover:bg-white/20"
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-4 h-4" />
                                            ) : (
                                                <Play className="w-4 h-4" />
                                            )}
                                        </Button>

                                        {/* Volume Control with Slider */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={toggleMute}
                                                className="h-8 w-8 text-white hover:bg-white/20"
                                            >
                                                {isMuted || volume === 0 ? (
                                                    <VolumeX className="w-4 h-4" />
                                                ) : (
                                                    <Volume2 className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <input
                                                type="range"
                                                min={0}
                                                max={1}
                                                step={0.1}
                                                value={isMuted ? 0 : volume}
                                                onChange={handleVolumeChange}
                                                className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                            />
                                        </div>

                                        {/* Time Display */}
                                        <span className="text-xs text-white/80">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>
                                    </div>

                                    {/* Fullscreen Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleFullscreen}
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                    >
                                        <Maximize className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* File Info */}
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Original size: </span>
                            <span className="font-medium">{formatBytes(file.originalSize)}</span>
                        </div>
                        {file.outputSize && (
                            <div>
                                <span className="text-muted-foreground">Output size: </span>
                                <span className="font-medium">{formatBytes(file.outputSize)}</span>
                            </div>
                        )}
                        {file.duration && (
                            <div>
                                <span className="text-muted-foreground">Duration: </span>
                                <span className="font-medium">{formatTime(file.duration)}</span>
                            </div>
                        )}
                        {file.outputSize && (
                            <div>
                                <span className="text-muted-foreground">Size change: </span>
                                <span className={`font-medium ${file.outputSize < file.originalSize ? 'text-green-600' : 'text-amber-600'}`}>
                                    {file.outputSize < file.originalSize ? '-' : '+'}
                                    {Math.abs(Math.round(((file.outputSize - file.originalSize) / file.originalSize) * 100))}%
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Before/After Toggle - moved to bottom */}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={toggleBeforeAfter}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors"
                        >
                            <SwitchCamera className="w-4 h-4" />
                            {showOriginal ? 'Showing: Original' : 'Showing: Converted'}
                        </button>
                    </div>

                    {/* Download Button */}
                    {file.outputBlob && (
                        <Button
                            onClick={handleDownload}
                            className="w-full gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download video
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
