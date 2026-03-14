// WebCodecs video encoder implementation using mediabunny for hardware-accelerated conversion

import type { VideoConversionSettings, VideoCodec } from '@/types/video-conversion';
import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  WebMOutputFormat,
  BufferTarget,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_LOW,
} from 'mediabunny';

// Map our resolution settings to dimensions
const RESOLUTION_DIMENSIONS: Record<string, { width: number; height: number } | null> = {
  original: null,
  '4k': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
};

/**
 * Smooth progress tracker that interpolates between real progress updates
 * to provide smooth UI updates during encoding.
 */
class SmoothProgressTracker {
  private startTime: number;
  private lastRealProgress: number = 0;
  private lastRealProgressTime: number = 0;
  private estimatedTotalTime: number | null = null;
  private interpolationId: ReturnType<typeof setInterval> | null = null;
  private onProgress: (progress: number) => void;
  private isComplete: boolean = false;

  constructor(onProgress: (progress: number) => void) {
    this.startTime = Date.now();
    this.lastRealProgressTime = this.startTime;
    this.onProgress = onProgress;
    this.startInterpolation();
  }

  private startInterpolation() {
    // Update progress every 100ms based on time estimation
    this.interpolationId = setInterval(() => {
      if (this.isComplete || this.lastRealProgress >= 100) {
        return;
      }

      // If we have an estimated total time, interpolate progress
      if (this.estimatedTotalTime && this.estimatedTotalTime > 0) {
        const elapsed = Date.now() - this.startTime;
        const timeBasedProgress = (elapsed / this.estimatedTotalTime) * 100;
        
        // Use the higher of real progress or time-based estimate, but cap at 99%
        const displayProgress = Math.min(
          Math.max(this.lastRealProgress, timeBasedProgress),
          99
        );
        
        // Only report if changed
        if (Math.round(displayProgress) !== Math.round(this.lastRealProgress)) {
          this.onProgress(Math.round(displayProgress));
        }
      } else {
        // No estimate yet, slowly increment to show activity (max 5% ahead of last real progress)
        const timeSinceLastUpdate = Date.now() - this.lastRealProgressTime;
        if (timeSinceLastUpdate > 500) {
          const incrementalProgress = this.lastRealProgress + Math.min(timeSinceLastUpdate / 1000, 5);
          if (incrementalProgress < 99) {
            this.onProgress(Math.round(incrementalProgress));
          }
        }
      }
    }, 200); // Update every 200ms
  }

  reportRealProgress(progress: number) {
    // Ensure progress only moves forward
    progress = Math.max(progress, this.lastRealProgress);
    this.lastRealProgress = progress;
    this.lastRealProgressTime = Date.now();
    
    // Update time estimation based on actual progress
    if (progress > 5 && progress < 100) {
      const elapsed = Date.now() - this.startTime;
      this.estimatedTotalTime = elapsed / (progress / 100);
    }
    
    this.onProgress(Math.round(progress));
  }

  stop() {
    if (this.interpolationId) {
      clearInterval(this.interpolationId);
      this.interpolationId = null;
    }
  }

  complete() {
    this.isComplete = true;
    this.stop();
    this.onProgress(100);
  }
}

/**
 * Converts a video file using WebCodecs API with mediabunny.
 * This provides hardware-accelerated encoding when available.
 */
export async function convertWithWebCodecs(
  file: File,
  settings: VideoConversionSettings,
  codec: VideoCodec = 'vp9',
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log('[WebCodecs] Starting conversion with mediabunny');
  console.log('[WebCodecs] Settings received:', {
    resolution: settings.resolution,
    fps: settings.fps,
    outputFormat: settings.outputFormat,
    quality: settings.quality,
  });

  try {
    // Create input from file
    const input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    });

    // Create output with WebM format
    const output = new Output({
      format: new WebMOutputFormat(),
      target: new BufferTarget(),
    });

    // Determine output resolution
    const resolution = RESOLUTION_DIMENSIONS[settings.resolution];
    
    // Use medium quality as default
    const quality = QUALITY_MEDIUM;
    
    // Log the actual quality values for debugging
    console.log('[WebCodecs] Using quality:', quality);
    
    // Map codec preference
    const codecPreference = codec === 'vp9' ? 'vp9' : 'vp8';
    
    // Determine framerate
    const frameRate = settings.fps === 'original' 
      ? undefined 
      : parseInt(settings.fps, 10);

    // Build video options
    // Note: Not specifying hardwareAcceleration - mediabunny will automatically
    // try hardware first and fall back to software if not available
    // Note: mediabunny expects 'bitrate', not 'quality' - it should be a Quality instance
    const videoOptions: Record<string, unknown> = {
      codec: codecPreference,
      bitrate: quality,
      // CRITICAL: Always force transcode to ensure bitrate/quality settings are applied
      forceTranscode: true,
    };

    if (resolution) {
      videoOptions.width = resolution.width;
      videoOptions.height = resolution.height;
      videoOptions.fit = 'contain';
    }

    if (frameRate) {
      videoOptions.frameRate = frameRate;
    }

    console.log('[WebCodecs] Video options:', {
      codec: videoOptions.codec,
      bitrate: videoOptions.bitrate,
      width: videoOptions.width,
      height: videoOptions.height,
      frameRate: videoOptions.frameRate,
      forceTranscode: videoOptions.forceTranscode,
    });

    // Create conversion with options
    const conversion = await Conversion.init({
      input,
      output,
      video: videoOptions,
      audio: { codec: 'opus' }, // Re-encode audio to Opus for WebM
    });

    if (!conversion.isValid) {
      throw new Error('Conversion configuration is invalid. Discarded tracks: ' + 
        conversion.discardedTracks.map(t => t.reason).join(', '));
    }

    // Set up smooth progress tracking
    let progressTracker: SmoothProgressTracker | null = null;
    
    if (onProgress) {
      progressTracker = new SmoothProgressTracker(onProgress);
      
      // Hook into mediabunny's progress callback - MUST assign this to receive updates
      // The property starts as undefined but must be set to receive progress callbacks
      const originalOnProgress = conversion.onProgress;
      conversion.onProgress = (progress: number) => {
        progressTracker?.reportRealProgress(progress * 100);
        if (originalOnProgress) {
          originalOnProgress(progress);
        }
      };
    }

    // Execute conversion
    try {
      await conversion.execute();
      progressTracker?.complete();
    } catch (error) {
      progressTracker?.stop();
      throw error;
    }

    // Get output buffer and create blob
    const buffer = output.target.buffer;
    if (!buffer) {
      throw new Error('Conversion produced no output');
    }

    const outputBlob = new Blob([buffer], { type: 'video/webm' });

    console.log('[WebCodecs] Conversion complete. Output size:', outputBlob.size);
    return outputBlob;
  } catch (error) {
    console.error('[WebCodecs] Conversion failed:', error);
    throw error;
  }
}

/**
 * Checks if WebCodecs encoding is supported for a specific codec.
 */
export async function isWebCodecsSupported(codec: VideoCodec): Promise<boolean> {
  if (!('VideoEncoder' in window)) {
    return false;
  }

  const codecStrings: Record<VideoCodec, string> = {
    vp8: 'vp8',
    vp9: 'vp09.00.10.08',
    av1: 'av01.0.00M.08',
    h264: 'avc1.42001e',
  };

  try {
    const configSupport = await VideoEncoder.isConfigSupported({
      codec: codecStrings[codec],
      width: 1920,
      height: 1080,
      bitrate: 2_000_000,
      framerate: 30,
    });
    return configSupport.supported ?? false;
  } catch {
    return false;
  }
}
