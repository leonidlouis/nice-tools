// Video conversion types for the Video Converter tool

export type VideoFormat = 'webm' | 'gif' | 'gifv' | 'webp';
export type GifOptimizationLevel = 'size' | 'balanced' | 'quality';
export type ConversionMode = 'convert';
export type VideoQuality = 'high' | 'medium' | 'low';
export type VideoResolution = 'original' | '4k' | '1080p' | '720p' | '480p';
export type VideoPreset = 'ultrafast' | 'fast' | 'medium' | 'slow';
export type VideoFps = 'original' | '60' | '30' | '24' | '15';
export type ConversionPhase = 'reading' | 'converting' | 'writing' | 'complete';
export type VideoCodec = 'vp8' | 'vp9' | 'av1' | 'h264';
export type ProcessingEngine = 'webcodecs' | 'ffmpeg';

export interface VideoConversionSettings {
  mode: ConversionMode;
  outputFormat: VideoFormat;
  quality: VideoQuality;
  resolution: VideoResolution;
  preset: VideoPreset;
  fps: VideoFps;
  multiThreaded: boolean; // Use multi-threaded FFmpeg for faster processing
  gifOptimization: GifOptimizationLevel; // GIF-specific optimization
}

export type ConversionStatus = 'pending' | 'processing' | 'done' | 'error' | 'cancelled';

export interface VideoFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  status: ConversionStatus;
  progress: number; // 0-100
  phase?: ConversionPhase; // Current phase of conversion
  outputBlob?: Blob;
  outputSize?: number;
  error?: string;
  duration?: number; // video duration in seconds
  thumbnail?: string; // base64 thumbnail
  estimatedTimeRemaining?: number; // in seconds
}

// Worker messages
export interface VideoConversionRequest {
  id: string;
  videoData: ArrayBuffer;
  fileName: string;
  settings: VideoConversionSettings;
}

export interface VideoConversionProgress {
  id: string;
  progress: number;
  phase: ConversionPhase;
  estimatedTimeRemaining?: number;
}

export interface VideoConversionResult {
  id: string;
  status: 'success' | 'error' | 'cancelled';
  outputData?: ArrayBuffer;
  outputSize?: number;
  error?: string;
}

export type VideoWorkerMessage =
  | { type: 'init'; payload?: { multiThreaded?: boolean } }
  | { type: 'convert'; payload: VideoConversionRequest }
  | { type: 'cancel'; payload: { id: string } }
  | { type: 'get-metadata'; payload: { id: string; videoData: ArrayBuffer } }
  | { type: 'reset' };

export type VideoWorkerResponse =
  | { type: 'ready' }
  | { type: 'init-error'; payload: { message: string } }
  | { type: 'progress'; payload: VideoConversionProgress }
  | { type: 'result'; payload: VideoConversionResult }
  | { type: 'metadata'; payload: { id: string; duration: number; width: number; height: number } }
  | { type: 'log'; payload: string };

// Supported video MIME types
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/avi',
  'video/x-flv',
  'video/mpeg',
  'video/ogg',
];

export const SUPPORTED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.mkv',
  '.flv',
  '.mpeg',
  '.mpg',
  '.ogv',
  '.m4v',
  '.3gp',
  '.wmv',
];

// Format display names
export const FORMAT_DISPLAY_NAMES: Record<VideoFormat, string> = {
  webm: 'WebM Video - standard web video format with good compression',
  gif: "GIF Animation - legacy format, 10-100x larger file size, honestly you shouldn't use this it's old and bad.",
  gifv: 'GIFV - modern, better GIFs, 60-80% smaller',
  webp: 'WebP Animation - modern format, works in <img> tags (25-35% smaller than GIF) - this will use software encoding, so it will be much slower.',
};

// Format short names for UI
export const FORMAT_SHORT_NAMES: Record<VideoFormat, string> = {
  webm: 'WebM',
  gif: 'GIF',
  gifv: 'GIFV',
  webp: 'WebP',
};

// GIF Optimization presets - size/balanced/quality
export const GIF_OPTIMIZATION_PRESETS: Record<GifOptimizationLevel, {
  fps: number;
  maxColors: number;
  resolution: VideoResolution;
  dither: string;
  statsMode: string;
}> = {
  size: {
    fps: 10,
    maxColors: 64,
    resolution: '480p',
    dither: 'bayer',
    statsMode: 'single',
  },
  balanced: {
    fps: 12,
    maxColors: 128,
    resolution: '720p',
    dither: 'floyd_steinberg',
    statsMode: 'single',
  },
  quality: {
    fps: 15,
    maxColors: 256,
    resolution: '1080p',
    dither: 'floyd_steinberg',
    statsMode: 'full',
  },
};



// Quality settings (CRF values for libx264)
export const QUALITY_CRF: Record<VideoQuality, number> = {
  high: 18,
  medium: 23,
  low: 28,
};

// Resolution dimensions
export const RESOLUTION_DIMENSIONS: Record<VideoResolution, { width: number; height: number } | null> = {
  original: null,
  '4k': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
};

// Hardcoded max file size limit (100MB)
export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Phase display names
export const PHASE_DISPLAY_NAMES: Record<ConversionPhase, string> = {
  reading: 'Preparing...',
  converting: 'Converting...',
  writing: 'Finalizing...',
  complete: 'Complete',
};

// Browser capability detection for WebCodecs
export interface VideoCodecSupport {
  codec: VideoCodec;
  supported: boolean;
  acceleration?: 'hardware' | 'software';
}

export interface BrowserCapabilities {
  webCodecsSupported: boolean;
  supportedVideoEncoders: VideoCodecSupport[];
  supportedVideoDecoders: VideoCodecSupport[];
  webCodecsVP9Supported: boolean;
  webCodecsAV1Supported: boolean;
  webCodecsH264Supported: boolean;
  webCodecsVP8Supported: boolean;
}

// Processing mode for UI display
export interface ProcessingModeInfo {
  engine: ProcessingEngine;
  isHardwareAccelerated: boolean;
  codec?: VideoCodec;
}
