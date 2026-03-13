// Video conversion types for the Video Converter tool

export type VideoFormat = 'webm' | 'gif';
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
export const FORMAT_DISPLAY_NAMES: Record<string, string> = {
  webm: 'WebM',
  gif: 'GIF Animation - this is slow and the filesize result will be 100x larger than the original video; gif is an ancient inefficient format, will add options here to downscale the video first before converting to .gif',
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
  reading: 'Reading file...',
  converting: 'Converting video...',
  writing: 'Writing output...',
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
