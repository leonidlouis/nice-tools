// WebP.wasm encoder for animated WebP creation
// Uses WebCodecs VideoDecoder for hardware-accelerated frame extraction
// Falls back to ffmpeg.wasm if WebCodecs fails

import type { VideoConversionSettings, ConversionPhase } from '@/types/video-conversion';

// wasm-webp types
interface WebPAnimationFrame {
  data: Uint8Array;
  duration: number; // in milliseconds
  config?: {
    lossless?: number;
    quality?: number;
  };
}

interface WebPModule {
  encodeAnimation: (
    width: number,
    height: number,
    hasAlpha: boolean,
    frames: WebPAnimationFrame[]
  ) => Promise<Uint8Array | null>;
}

// Module state
let webpModule: WebPModule | null = null;
let initPromise: Promise<WebPModule> | null = null;

/**
 * Initialize wasm-webp module
 */
async function initWebpWasm(): Promise<WebPModule> {
  if (webpModule) return webpModule;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Dynamic import to avoid loading on startup
      const wasmWebp = await import('wasm-webp');
      
      // The module exports functions directly
      webpModule = wasmWebp as unknown as WebPModule;
      console.log('[WebpWasm] Module initialized');
      return webpModule;
    } catch (error) {
      console.error('[WebpWasm] Failed to initialize:', error);
      throw new Error('Failed to initialize webp.wasm module');
    }
  })();

  return initPromise;
}

/**
 * Check if webp.wasm can be used for conversion
 * 
 * NOTE: Currently returns false because full WebCodecs demuxing is not implemented.
 * When implemented, this will check for WebCodecs support and video format compatibility.
 */
export function canUseWebpWasm(
  _settings: VideoConversionSettings,
  _capabilities: { webCodecsSupported: boolean }
): boolean {
  // TODO: Implement full WebCodecs + MP4Box demuxing for frame extraction
  // For now, always return false to use ffmpeg.wasm fallback
  // This ensures reliability while the fast path is being developed
  
  // When ready, check:
  // 1. settings.outputFormat === 'webp'
  // 2. capabilities.webCodecsSupported
  // 3. 'VideoDecoder' in self
  // 4. Input format is demuxable (MP4 via MP4Box.js, or WebM)
  
  return false;
}

/**
 * Convert video to animated WebP using wasm-webp
 * 
 * NOTE: This is a placeholder implementation. Full implementation requires:
 * 1. MP4Box.js integration for MP4 demuxing
 * 2. WebM demuxer for WebM files
 * 3. WebCodecs VideoDecoder configuration per codec
 * 4. Frame sampling and scaling pipeline
 */
export async function convertWithWebpWasm(
  _videoData: ArrayBuffer,
  _fileName: string,
  _settings: VideoConversionSettings,
  _onProgress?: (phase: ConversionPhase, progress: number) => void
): Promise<Uint8Array> {
  throw new Error(
    'webp.wasm fast path not yet implemented. ' +
    'Use ffmpeg.wasm fallback for WebP conversion.'
  );
}

/**
 * Encode frames to animated WebP using wasm-webp
 * Exported for when we have pre-extracted frames
 */
export async function encodeFramesToWebP(
  frames: Array<{ data: Uint8Array; width: number; height: number; duration: number }>,
  quality: number
): Promise<Uint8Array> {
  if (frames.length === 0) {
    throw new Error('No frames to encode');
  }
  
  const module = await initWebpWasm();
  
  const { width, height } = frames[0];
  const webpFrames: WebPAnimationFrame[] = frames.map((frame) => ({
    data: frame.data,
    duration: frame.duration,
    config: {
      lossless: 0,
      quality,
    },
  }));
  
  const result = await module.encodeAnimation(width, height, true, webpFrames);
  
  if (!result) {
    throw new Error('WebP encoding failed - no output generated');
  }
  
  return result;
}

/**
 * Get WebP quality (default to 75 for balanced quality)
 */
export function getWebpQuality(): number {
  return 75;
}

/**
 * Clear the wasm-webp module (for testing/memory cleanup)
 */
export function clearWebpWasmModule(): void {
  webpModule = null;
  initPromise = null;
}

/**
 * TODO: Full WebCodecs implementation plan:
 * 
 * 1. Add MP4Box.js to dependencies for MP4 demuxing
 * 2. Create demuxVideo() function:
 *    - For MP4: Use MP4Box.js to extract video track chunks
 *    - For WebM: Use WebM demuxer
 *    - For other: Fall back to ffmpeg.wasm
 * 
 * 3. Create extractFramesWithWebCodecs() function:
 *    - Configure VideoDecoder with detected codec
 *    - Feed demuxed chunks to decoder
 *    - Sample frames to target FPS
 *    - Scale frames to target resolution using OffscreenCanvas
 *    - Convert VideoFrame to RGBA Uint8Array
 *    - Close VideoFrame immediately to free memory
 * 
 * 4. Integration:
 *    - Update canUseWebpWasm() to check format support
 *    - Implement convertWithWebpWasm() using above functions
 *    - Maintain ffmpeg.wasm fallback for unsupported formats
 * 
 * Expected performance improvement: 2-3x faster than ffmpeg.wasm
 * Bundle size: 1.35MB (vs 24.5MB for ffmpeg.wasm)
 */
