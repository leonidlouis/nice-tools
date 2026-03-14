'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Play, Pause, Volume2, VolumeX, SwitchCamera, Maximize, Loader2 } from 'lucide-react';
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
    const [isLoading, setIsLoading] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Store playback state to restore after switch
    const savedStateRef = useRef({
        currentTime: 0,
        wasPlaying: false,
    });

    // Object URLs stored in ref to prevent recreation
    const urlsRef = useRef<{ original: string | null; converted: string | null }>({
        original: null,
        converted: null,
    });

    // Reset state when dialog opens with a new file
    useEffect(() => {
        if (isOpen && file) {
            // Reset all state for new file
            setShowOriginal(false);
            setIsPlaying(false);
            setIsMuted(true);
            setVolume(1);
            setDuration(0);
            setCurrentTime(0);
            setIsLoading(false);
            savedStateRef.current = { currentTime: 0, wasPlaying: false };
            
            // Create new URLs
            urlsRef.current.original = URL.createObjectURL(file.file);
            if (file.outputBlob) {
                urlsRef.current.converted = URL.createObjectURL(file.outputBlob);
            }
            setVideoReady(true);
        }
        
        return () => {
            if (urlsRef.current.original) {
                URL.revokeObjectURL(urlsRef.current.original);
                urlsRef.current.original = null;
            }
            if (urlsRef.current.converted) {
                URL.revokeObjectURL(urlsRef.current.converted);
                urlsRef.current.converted = null;
            }
            setVideoReady(false);
        };
    }, [isOpen, file]);

    // Determine current source
    const currentSrc = showOriginal 
        ? urlsRef.current.original 
        : urlsRef.current.converted;

    // Check if output is an image format
    const isImageFormat = !showOriginal && file && 
        (file.name.endsWith('.gif') || file.name.endsWith('.webp'));

    // Handle toggle with state preservation
    const handleToggle = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        // Save current state
        savedStateRef.current = {
            currentTime: video.currentTime,
            wasPlaying: !video.paused,
        };

        // Show loading
        setIsLoading(true);
        
        // Switch mode (triggers src change)
        setShowOriginal(prev => !prev);
    }, []);

    // Restore state when video loads after switch
    const handleLoadedMetadata = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        setDuration(video.duration);
        setIsLoading(false);

        // Restore time
        video.currentTime = savedStateRef.current.currentTime;
        
        // Restore play state
        if (savedStateRef.current.wasPlaying) {
            video.play().catch(() => setIsPlaying(false));
        }
    }, []);

    // Sync video state with React state
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.volume = isMuted ? 0 : volume;
            video.muted = isMuted;
        }
    }, [volume, isMuted]);

    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            setCurrentTime(video.currentTime);
        }
    }, []);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        
        if (isPlaying) {
            video.pause();
        } else {
            video.play().catch(() => {});
        }
    }, [isPlaying]);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        
        const newMuted = !isMuted;
        video.muted = newMuted;
        setIsMuted(newMuted);
    }, [isMuted]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        
        const newVolume = parseFloat(e.target.value);
        video.volume = newVolume;
        setVolume(newVolume);
        
        if (newVolume === 0) {
            video.muted = true;
            setIsMuted(true);
        } else if (isMuted) {
            video.muted = false;
            setIsMuted(false);
        }
    }, [isMuted]);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        
        const time = parseFloat(e.target.value);
        video.currentTime = time;
        setCurrentTime(time);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    }, []);

    const handleDownload = useCallback(() => {
        if (!file?.outputBlob) return;
        
        const url = URL.createObjectURL(file.outputBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [file]);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!file) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="text-base sm:text-lg truncate pr-4 max-w-[300px] sm:max-w-[400px] md:max-w-[500px]" title={file.name}>
                        {file.name.length > 60 
                            ? `${file.name.slice(0, 35)}...${file.name.slice(-20)}`
                            : file.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-4 space-y-4">
                    {/* Video Container */}
                    <div 
                        ref={containerRef}
                        className="relative bg-black rounded-lg overflow-hidden"
                        style={{ aspectRatio: '16/9', minHeight: '200px' }}
                    >
                        {isImageFormat ? (
                            <img
                                src={urlsRef.current.converted || ''}
                                alt={file.name}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <>
                                {/* SINGLE VIDEO ELEMENT */}
                                {videoReady && (
                                    <video
                                        key={file.id + (showOriginal ? '-original' : '-converted')}
                                        ref={videoRef}
                                        src={currentSrc || ''}
                                        className="w-full h-full object-contain"
                                        onLoadedMetadata={handleLoadedMetadata}
                                        onTimeUpdate={handleTimeUpdate}
                                        onPlay={() => setIsPlaying(true)}
                                        onPause={() => setIsPlaying(false)}
                                        muted={isMuted}
                                        playsInline
                                        preload="metadata"
                                    />
                                )}
                                
                                {/* Loading Overlay */}
                                {isLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </>
                        )}

                        {/* Custom Controls */}
                        {!isImageFormat && !isLoading && (
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
                                        {/* Play/Pause */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={togglePlay}
                                            className="h-8 w-8 text-white hover:bg-white/20"
                                        >
                                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </Button>

                                        {/* Volume */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={toggleMute}
                                                className="h-8 w-8 text-white hover:bg-white/20"
                                            >
                                                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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

                                        {/* Time */}
                                        <span className="text-xs text-white/80">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>
                                    </div>

                                    {/* Fullscreen */}
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

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Toggle */}
                        <button
                            onClick={handleToggle}
                            disabled={isLoading}
                            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-muted rounded-lg hover:bg-muted-foreground/10 transition-colors sm:flex-1 disabled:opacity-50"
                        >
                            <SwitchCamera className="w-4 h-4" />
                            {isLoading ? 'Loading...' : (showOriginal ? 'Showing: Original' : 'Showing: Converted')}
                        </button>

                        {/* Download */}
                        {file.outputBlob && (
                            <Button
                                onClick={handleDownload}
                                className="w-full sm:w-auto sm:flex-1 gap-2"
                            >
                                <Download className="w-4 h-4" />
                                {file.name.endsWith('.gif') ? 'Download GIF' :
                                 file.name.endsWith('.webp') ? 'Download WebP' :
                                 file.name.endsWith('.gifv') ? 'Download GIFV' :
                                 'Download WebM'}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
