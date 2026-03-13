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

// Map our quality settings to mediabunny quality constants
const MEDIABUNNY_QUALITY = {
  high: QUALITY_HIGH,
  medium: QUALITY_MEDIUM,
  low: QUALITY_LOW,
};

// Map our resolution settings to dimensions
const RESOLUTION_DIMENSIONS: Record<string, { width: number; height: number } | null> = {
  original: null,
  '4k': { width: 3840, height: 2160 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
};

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
  console.log('[WebCodecs] Starting conversion with mediabunny, codec:', codec);

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
    
    // Determine quality
    const quality = MEDIABUNNY_QUALITY[settings.quality] ?? QUALITY_MEDIUM;
    
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
    };

    if (resolution) {
      videoOptions.width = resolution.width;
      videoOptions.height = resolution.height;
      videoOptions.fit = 'contain';
    }

    if (frameRate) {
      videoOptions.frameRate = frameRate;
    }

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

    // Set up progress tracking
    if (onProgress && conversion.onProgress !== undefined) {
      const originalOnProgress = conversion.onProgress;
      conversion.onProgress = (progress: number) => {
        onProgress(Math.round(progress * 100));
        if (originalOnProgress) {
          originalOnProgress(progress);
        }
      };
    }

    // Execute conversion
    await conversion.execute();

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
