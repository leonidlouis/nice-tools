// Video conversion orchestration - manages the video converter worker

import type {
  VideoFile,
  VideoConversionSettings,
  VideoConversionRequest,
  VideoWorkerMessage,
  VideoWorkerResponse,
  VideoConversionProgress,
  VideoConversionResult,
} from '@/types/video-conversion';
import {
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_BYTES,
} from '@/types/video-conversion';

// Track worker instance
let workerInstance: Worker | null = null;
let workerReady = false;
const pendingResolvers: Map<string, (value: unknown) => void> = new Map();
const progressCallbacks: Map<string, (progress: VideoConversionProgress) => void> = new Map();

/**
 * Generates a unique ID for file tracking.
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formats bytes into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formats seconds into human-readable duration.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Validates if a file is a supported video file.
 */
export function isValidVideoFile(file: File): boolean {
  // Check MIME type
  if (SUPPORTED_VIDEO_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  
  // Check extension as fallback
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) {
    return true;
  }
  
  return false;
}

/**
 * Gets the video worker instance (singleton).
 */
function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker('/workers/video-converter.worker.js', {
      type: 'module',
    });

    workerInstance.onmessage = (event: MessageEvent<VideoWorkerResponse>) => {
      const message = event.data;

      if (message.type === 'ready') {
        workerReady = true;
        console.log('[VideoConversion] Worker ready');
        return;
      }

      if (message.type === 'init-error') {
        console.error('[VideoConversion] Worker init error:', message.payload.message);
        // Reject any pending promises
        pendingResolvers.forEach((resolver, id) => {
          resolver({
            id,
            status: 'error',
            error: message.payload.message,
          });
        });
        pendingResolvers.clear();
        return;
      }

      if (message.type === 'progress') {
        const callback = progressCallbacks.get(message.payload.id);
        if (callback) {
          callback(message.payload);
        }
        return;
      }

      if (message.type === 'result') {
        const resolver = pendingResolvers.get(message.payload.id);
        if (resolver) {
          resolver(message.payload);
          pendingResolvers.delete(message.payload.id);
          progressCallbacks.delete(message.payload.id);
        }
        return;
      }

      if (message.type === 'log') {
        // Log FFmpeg output for debugging
        console.log('[FFmpeg]', message.payload);
      }
    };

    workerInstance.onerror = (error) => {
      console.error('[VideoConversion] Worker error:', error);
    };
  }

  return workerInstance;
}

/**
 * Initializes the video converter worker.
 */
export async function initVideoWorker(multiThreaded: boolean = false): Promise<void> {
  const worker = getWorker();
  
  if (workerReady) {
    return;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Worker initialization timeout'));
    }, 60000); // 60 second timeout for large WASM files

    const checkReady = () => {
      if (workerReady) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };

    // Send init message with multi-threading preference
    const message: VideoWorkerMessage = { 
      type: 'init',
      payload: { multiThreaded }
    };
    worker.postMessage(message);

    checkReady();
  });
}

/**
 * Terminates the video worker to free resources.
 */
export function terminateVideoWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerReady = false;
    pendingResolvers.clear();
    progressCallbacks.clear();
  }
}

/**
 * Converts a single video file.
 */
export async function convertVideoFile(
  videoFile: VideoFile,
  settings: VideoConversionSettings,
  onProgress: (progress: VideoConversionProgress) => void
): Promise<VideoFile> {
  const worker = getWorker();
  
  // Ensure worker is initialized with appropriate threading mode
  if (!workerReady) {
    await initVideoWorker(settings.multiThreaded);
  }

  // Update status to processing
  const processingFile: VideoFile = { 
    ...videoFile, 
    status: 'processing',
    progress: 0,
    phase: 'reading',
  };

  try {
    // Check file size against hardcoded limit
    if (videoFile.file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File size (${formatBytes(videoFile.file.size)}) exceeds the ${MAX_FILE_SIZE_MB}MB limit`
      );
    }

    // Read file data
    const videoData = await videoFile.file.arrayBuffer();

    // Create request
    const request: VideoConversionRequest = {
      id: videoFile.id,
      videoData,
      fileName: videoFile.name,
      settings,
    };

    // Register progress callback
    progressCallbacks.set(videoFile.id, onProgress);

    // Send to worker and wait for result
    const result = await new Promise<VideoConversionResult>((resolve) => {
      pendingResolvers.set(videoFile.id, resolve as (value: unknown) => void);
      
      const message: VideoWorkerMessage = {
        type: 'convert',
        payload: request,
      };
      
      worker.postMessage(message, [videoData]);
    });

    // Handle result
    if (result.status === 'success' && result.outputData) {
      const mimeType = getOutputMimeType(settings.outputFormat);
      const outputBlob = new Blob([result.outputData], { type: mimeType });
      const baseName = videoFile.name.replace(/\.[^.]+$/, '');

      return {
        ...videoFile,
        status: 'done',
        progress: 100,
        phase: 'complete',
        outputBlob,
        outputSize: result.outputSize,
        name: `${baseName}.${settings.outputFormat}`,
      };
    } else if (result.status === 'cancelled') {
      return {
        ...videoFile,
        status: 'cancelled',
        progress: 0,
        phase: undefined,
      };
    } else {
      return {
        ...videoFile,
        status: 'error',
        error: result.error || 'Conversion failed',
        progress: 0,
        phase: undefined,
      };
    }
  } catch (error) {
    console.error('Conversion error:', error);
    return {
      ...videoFile,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      progress: 0,
      phase: undefined,
    };
  }
}

/**
 * Cancels an ongoing conversion.
 */
export function cancelConversion(id: string): void {
  const worker = getWorker();
  const message: VideoWorkerMessage = {
    type: 'cancel',
    payload: { id },
  };
  worker.postMessage(message);
}

/**
 * Gets the MIME type for an output format.
 */
function getOutputMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    webm: 'video/webm',
    gif: 'image/gif',
  };
  return mimeTypes[format] || 'video/webm';
}

/**
 * Resets the FFmpeg instance in the worker.
 * Needed between conversions when using multi-threading to prevent memory issues.
 */
function resetFFmpegInWorker(): void {
  if (workerInstance) {
    // Terminate and recreate worker to ensure clean state
    workerInstance.terminate();
    workerInstance = null;
    workerReady = false;
    pendingResolvers.clear();
    progressCallbacks.clear();
  }
}

/**
 * Converts multiple video files sequentially.
 * Videos are processed one at a time due to resource intensity.
 * 
 * IMPORTANT: When processing multiple files, multi-threading is automatically disabled
 * to prevent SharedArrayBuffer deadlocks and state corruption issues.
 */
export async function convertVideoFiles(
  files: VideoFile[],
  settings: VideoConversionSettings,
  onFileProgress: (file: VideoFile) => void
): Promise<VideoFile[]> {
  const results: VideoFile[] = [];
  const pendingFiles = files.filter(f => f.status === 'pending');
  
  // Force single-threaded mode when processing multiple files
  // This prevents SharedArrayBuffer deadlocks and state corruption
  const isMultiFile = pendingFiles.length > 1;
  const effectiveSettings: VideoConversionSettings = isMultiFile 
    ? { ...settings, multiThreaded: false }
    : settings;

  if (isMultiFile && settings.multiThreaded) {
    console.log('[VideoConversion] Multi-threading disabled for multiple files to prevent deadlocks');
  }

  for (const file of files) {
    if (file.status !== 'pending') {
      results.push(file);
      continue;
    }

    try {
      // Use fresh worker for each file when multi-threading is enabled
      // This prevents state corruption between conversions
      if (effectiveSettings.multiThreaded) {
        console.log('[VideoConversion] Using fresh worker for multi-threaded conversion');
        resetFFmpegInWorker();
      }

      const result = await convertVideoFile(file, effectiveSettings, (progress) => {
        const updatedFile: VideoFile = {
          ...file,
          status: 'processing',
          progress: progress.progress,
          phase: progress.phase,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
        };
        onFileProgress(updatedFile);
      });

      results.push(result);
      onFileProgress(result);

      // Reset FFmpeg between files when multi-threading is enabled
      // This prevents memory accumulation and thread synchronization issues
      if (effectiveSettings.multiThreaded) {
        console.log('[VideoConversion] Resetting FFmpeg for next file (multi-threading)');
        resetFFmpegInWorker();
        // Increased delay to 2000ms to ensure proper PThread cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('[VideoConversion] File conversion failed:', error);
      const errorFile: VideoFile = {
        ...file,
        status: 'error',
        error: error instanceof Error ? error.message : 'Conversion failed',
        progress: 0,
      };
      results.push(errorFile);
      onFileProgress(errorFile);
      
      // Reset worker on error too
      if (effectiveSettings.multiThreaded) {
        resetFFmpegInWorker();
        // Increased delay for error cleanup
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  return results;
}

/**
 * Gets default video conversion settings.
 */
export function getDefaultVideoSettings(): VideoConversionSettings {
  return {
    mode: 'convert',
    outputFormat: 'webm',
    quality: 'medium',
    resolution: 'original',
    preset: 'medium',
    fps: 'original',
    multiThreaded: false,
  };
}

/**
 * Detects if device is mobile.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  const isTouch = navigator.maxTouchPoints > 0;
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  return mobileUA || (isTouch && isSmallScreen);
}

/**
 * Checks if multi-threaded FFmpeg is likely to work.
 * Requires COOP/COEP headers which may not be present on all hosts.
 */
export function isMultiThreadingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for SharedArrayBuffer support (required for multi-threading)
  if (typeof SharedArrayBuffer === 'undefined') {
    return false;
  }
  
  // Check if we're in a cross-origin isolated context
  if ((window as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true) {
    return true;
  }
  
  // On localhost, it might work even without the headers
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return true;
  }
  
  return false;
}
