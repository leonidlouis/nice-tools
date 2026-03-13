// Web Worker for video conversion using ffmpeg.wasm
// Runs in a separate thread to avoid blocking the main UI

import { FFmpeg } from '@ffmpeg/ffmpeg';
import type {
  VideoConversionSettings,
  VideoWorkerMessage,
  VideoWorkerResponse,
  ConversionPhase,
  BrowserCapabilities,
} from '../types/video-conversion';
import { QUALITY_CRF, RESOLUTION_DIMENSIONS } from '../types/video-conversion';
import { convertWithWebCodecs } from '../lib/webcodecs-encoder';
import { detectCapabilities, canUseWebCodecs } from '../lib/video-conversion';

// Worker state
interface WorkerState {
  ffmpeg: FFmpeg | null;
  initPromise: Promise<FFmpeg> | null;
  currentJob: { id: string; abort: () => void } | null;
  startTime: number;
  multiThreaded: boolean;
  recentLogs: string[];
  lastProgressTime: number;
  lastProgressValue: number;
}

const state: WorkerState = {
  ffmpeg: null,
  initPromise: null,
  currentJob: null,
  startTime: 0,
  multiThreaded: false,
  recentLogs: [],
  lastProgressTime: 0,
  lastProgressValue: 0,
};

// Send progress update with phase
function sendProgress(id: string, progress: number, phase: ConversionPhase, estimatedTimeRemaining?: number) {
  const response: VideoWorkerResponse = {
    type: 'progress',
    payload: {
      id,
      progress,
      phase,
      estimatedTimeRemaining,
    },
  };
  self.postMessage(response);
}

// Promise-based FFmpeg initialization with deduplication
async function getFFmpeg(multiThreaded: boolean = false): Promise<FFmpeg> {
  // If switching between single/multi-threaded, reinitialize
  if (state.multiThreaded !== multiThreaded && state.ffmpeg) {
    state.ffmpeg.terminate();
    state.ffmpeg = null;
    state.initPromise = null;
  }

  state.multiThreaded = multiThreaded;

  if (!state.initPromise) {
    state.initPromise = initFFmpeg(multiThreaded);
  }
  return state.initPromise;
}

/**
 * Resets the FFmpeg instance and all state.
 * Called between conversions to prevent state corruption.
 */
async function resetFFmpeg(): Promise<void> {
  console.log('[Worker] Resetting FFmpeg state...');

  // Cancel any current job
  if (state.currentJob) {
    state.currentJob.abort();
    state.currentJob = null;
  }

  // Terminate FFmpeg if it exists
  if (state.ffmpeg) {
    try {
      state.ffmpeg.terminate();
    } catch (error) {
      console.warn('[Worker] Error terminating FFmpeg:', error);
    }
    state.ffmpeg = null;
  }

  // Reset all state
  state.initPromise = null;
  state.startTime = 0;
  state.recentLogs = [];
  state.lastProgressTime = 0;
  state.lastProgressValue = 0;

  console.log('[Worker] FFmpeg state reset complete');
}

async function initFFmpeg(multiThreaded: boolean): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();

  // Set up logging
  ffmpeg.on('log', ({ message, type }) => {
    console.log('[FFmpeg]', type, message);
    // Capture recent logs for error reporting
    state.recentLogs.push(message);
    if (state.recentLogs.length > 50) {
      state.recentLogs.shift();
    }
    // Update heartbeat on log activity — proves FFmpeg is still alive
    // even when the progress event hasn't fired recently
    state.lastProgressTime = Date.now();
    const response: VideoWorkerResponse = { type: 'log', payload: message };
    self.postMessage(response);
  });

  // Set up progress tracking with time estimation
  ffmpeg.on('progress', ({ progress, time }) => {
    console.log('[FFmpeg] Progress:', Math.round(progress * 100) + '%', 'Time:', time);
    if (state.currentJob) {
      const progressPercent = Math.min(Math.round(progress * 100), 100);

      // Update heartbeat tracking
      state.lastProgressTime = Date.now();
      state.lastProgressValue = progressPercent;

      // Calculate estimated time remaining
      let estimatedTimeRemaining: number | undefined;
      if (progressPercent > 0 && progressPercent < 100) {
        const elapsed = (Date.now() - state.startTime) / 1000;
        const totalEstimated = elapsed / (progressPercent / 100);
        estimatedTimeRemaining = Math.round(totalEstimated - elapsed);
      }

      sendProgress(state.currentJob.id, progressPercent, 'converting', estimatedTimeRemaining);
    }
  });

  // Load FFmpeg core
  const baseURL = self.location.origin;
  // Cache-busting version - FORCE FRESH LOAD (missing const.js/errors.js fix)
  const CACHE_VERSION = 'v0.12.10-fix1';

  try {
    if (multiThreaded) {
      // Try multi-threaded version first (faster but requires COOP/COEP headers)
      console.log('[Worker] Loading multi-threaded FFmpeg...');
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg/ffmpeg-core.mt.js?v=${CACHE_VERSION}`,
        wasmURL: `${baseURL}/ffmpeg/ffmpeg-core.mt.wasm?v=${CACHE_VERSION}`,
        workerURL: `${baseURL}/ffmpeg/ffmpeg-worker.mt.js?v=${CACHE_VERSION}`,
      });
      console.log('[Worker] Multi-threaded FFmpeg loaded successfully');
    } else {
      // Single-threaded version (slower but compatible everywhere)
      console.log('[Worker] Loading single-threaded FFmpeg...');
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg/ffmpeg-core.js?v=${CACHE_VERSION}`,
        wasmURL: `${baseURL}/ffmpeg/ffmpeg-core.wasm?v=${CACHE_VERSION}`,
        workerURL: `${baseURL}/ffmpeg/worker.js?v=${CACHE_VERSION}`,
      });
      console.log('[Worker] Single-threaded FFmpeg loaded successfully');
    }
  } catch (error) {
    console.warn('[Worker] Failed to load from local, trying CDN...', error);

    // Fallback to CDN - use same version as local files
    if (multiThreaded) {
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/umd/ffmpeg-core.wasm',
        workerURL: 'https://unpkg.com/@ffmpeg/core-mt@0.12.10/dist/umd/ffmpeg-core.worker.js',
      });
    } else {
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm',
      });
    }
  }

  state.ffmpeg = ffmpeg;
  return ffmpeg;
}

// Build FFmpeg arguments based on settings
function buildFFmpegArgs(
  input: string,
  output: string,
  settings: VideoConversionSettings
): string[] {
  const args = ['-nostdin', '-fflags', '+genpts', '-i', input];

  // Video conversion - only WebM and GIF supported
  if (settings.outputFormat === 'gif') {
    // GIF encoding - no audio, use GIF codec
    args.push('-an'); // No audio for GIF

    // Build GIF filter chain
    let gifFilter = 'fps=15';
    if (settings.resolution !== 'original') {
      const dims = RESOLUTION_DIMENSIONS[settings.resolution];
      if (dims) {
        gifFilter += `,scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease:flags=lanczos`;
      }
    }
    gifFilter += ',split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse';
    args.push('-vf', gifFilter);
  } else if (settings.outputFormat === 'webm') {
    // Explicit stream mapping: video first, then audio (optional)
    // The '?' suffix makes audio optional - videos without audio won't fail
    args.push('-map', '0:v:0', '-map', '0:a:0?');

    // WebM encoding with VP8 video and Vorbis audio
    args.push('-c:v', 'libvpx'); // VP8 encoder is 'libvpx'
    args.push('-crf', '10'); // VP8 CRF (4-63, lower is better quality)
    args.push('-b:v', '0'); // Use CRF mode (variable bitrate)
    // Only encode audio if stream exists
    args.push('-c:a', 'libvorbis');
    args.push('-b:a', '128k');

    // Resolution scaling for WebM
    if (settings.resolution !== 'original') {
      const dims = RESOLUTION_DIMENSIONS[settings.resolution];
      if (dims) {
        args.push(
          '-vf',
          `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease`
        );
      }
    }
  }

  // Frame rate (not for GIF)
  if (settings.fps !== 'original' && settings.outputFormat !== 'gif') {
    args.push('-r', settings.fps);
  }

  // Overwrite output
  args.push('-y', output);

  return args;
}

// Cache for browser capabilities (detected once per worker session)
let workerCapabilities: BrowserCapabilities | null = null;

/**
 * Detects browser capabilities in the worker context.
 */
async function detectWorkerCapabilities(): Promise<BrowserCapabilities> {
  if (workerCapabilities) {
    return workerCapabilities;
  }

  const capabilities: BrowserCapabilities = {
    webCodecsSupported: false,
    supportedVideoEncoders: [],
    supportedVideoDecoders: [],
    webCodecsVP9Supported: false,
    webCodecsAV1Supported: false,
    webCodecsH264Supported: false,
    webCodecsVP8Supported: false,
  };

  // Check basic WebCodecs support
  if (!('VideoEncoder' in self) || !('VideoDecoder' in self)) {
    workerCapabilities = capabilities;
    return capabilities;
  }

  capabilities.webCodecsSupported = true;

  // Check VP8 support
  try {
    const vp8Support = await VideoEncoder.isConfigSupported({
      codec: 'vp8',
      width: 1920,
      height: 1080,
      bitrate: 2_000_000,
      framerate: 30,
    });
    const isSupported = vp8Support.supported ?? false;
    capabilities.webCodecsVP8Supported = isSupported;
    capabilities.supportedVideoEncoders.push({ codec: 'vp8', supported: isSupported });
  } catch {
    capabilities.supportedVideoEncoders.push({ codec: 'vp8', supported: false });
  }

  // Check VP9 support
  try {
    const vp9Support = await VideoEncoder.isConfigSupported({
      codec: 'vp09.00.10.08',
      width: 1920,
      height: 1080,
      bitrate: 2_000_000,
      framerate: 30,
    });
    const isSupported = vp9Support.supported ?? false;
    capabilities.webCodecsVP9Supported = isSupported;
    capabilities.supportedVideoEncoders.push({ codec: 'vp9', supported: isSupported });
  } catch {
    capabilities.supportedVideoEncoders.push({ codec: 'vp9', supported: false });
  }

  // Check AV1 support
  try {
    const av1Support = await VideoEncoder.isConfigSupported({
      codec: 'av01.0.00M.08',
      width: 1920,
      height: 1080,
      bitrate: 2_000_000,
      framerate: 30,
    });
    const isSupported = av1Support.supported ?? false;
    capabilities.webCodecsAV1Supported = isSupported;
    capabilities.supportedVideoEncoders.push({ codec: 'av1', supported: isSupported });
  } catch {
    capabilities.supportedVideoEncoders.push({ codec: 'av1', supported: false });
  }

  // Check H.264 support
  try {
    const h264Support = await VideoEncoder.isConfigSupported({
      codec: 'avc1.42001e',
      width: 1920,
      height: 1080,
      bitrate: 2_000_000,
      framerate: 30,
    });
    const isSupported = h264Support.supported ?? false;
    capabilities.webCodecsH264Supported = isSupported;
    capabilities.supportedVideoEncoders.push({ codec: 'h264', supported: isSupported });
  } catch {
    capabilities.supportedVideoEncoders.push({ codec: 'h264', supported: false });
  }

  workerCapabilities = capabilities;
  console.log('[Worker] Browser capabilities detected:', capabilities);
  return capabilities;
}

/**
 * Determines if WebCodecs can be used for the given conversion settings.
 */
function canUseWebCodecsInWorker(
  settings: VideoConversionSettings,
  capabilities: BrowserCapabilities
): boolean {
  // Must have WebCodecs support
  if (!capabilities.webCodecsSupported) {
    return false;
  }

  // GIF requires ffmpeg.wasm
  if (settings.outputFormat === 'gif') {
    return false;
  }

  // WebM (VP8/VP9) - WebCodecs can handle this if VP8 or VP9 is supported
  if (settings.outputFormat === 'webm') {
    return capabilities.webCodecsVP9Supported || capabilities.webCodecsVP8Supported;
  }

  // Default to ffmpeg.wasm for unsupported formats
  return false;
}

// FFmpeg conversion function
async function convertWithFFmpeg(
  id: string,
  videoData: ArrayBuffer,
  fileName: string,
  settings: VideoConversionSettings,
  signal: AbortSignal
): Promise<void> {
  // Initialize FFmpeg with appropriate threading mode
  const ffmpeg = await getFFmpeg(settings.multiThreaded);
  const inputPath = `input_${id}.tmp`;
  const outputPath = `output_${id}.${settings.outputFormat}`;

  state.startTime = Date.now();
  state.recentLogs = []; // Clear logs from previous conversion
  state.lastProgressTime = Date.now();
  state.lastProgressValue = 0;

  let aborted = false;
  const abortHandler = () => {
    aborted = true;
  };
  signal.addEventListener('abort', abortHandler);

  try {
    // Phase 1: Reading file
    sendProgress(id, 5, 'reading');
    await ffmpeg.writeFile(inputPath, new Uint8Array(videoData));

    if (aborted) {
      throw new Error('Conversion cancelled');
    }

    // Phase 2: Converting
    sendProgress(id, 0, 'converting');
    const args = buildFFmpegArgs(inputPath, outputPath, settings);
    console.log('[Worker] Executing:', args.join(' '));
    console.log('[Worker] Starting conversion with timeout protection...');

    // Create abort-aware exec promise with real-time error detection
    const execPromise = new Promise<void>((resolve, reject) => {
      const ffmpegPromise = ffmpeg.exec(args);

      // Check for abort and errors every 100ms
      const abortCheckInterval = setInterval(() => {
        if (aborted) {
          clearInterval(abortCheckInterval);
          reject(new Error('Conversion cancelled'));
          return;
        }

        // Check for critical errors in recent logs
        const hasCriticalError = state.recentLogs.slice(-5).some(log =>
          log.includes('Stream map') && log.includes('matches no streams')
        );

        if (hasCriticalError) {
          clearInterval(abortCheckInterval);
          reject(new Error('Stream mapping failed: Video may not have an audio stream. Try converting a video with audio, or use GIF format for silent videos.'));
        }
      }, 100);

      ffmpegPromise
        .then(() => {
          clearInterval(abortCheckInterval);
          resolve();
        })
        .catch((err) => {
          clearInterval(abortCheckInterval);
          reject(err);
        });
    });

    // Timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Conversion timeout - process may be stuck')), 1800000); // 30 minute timeout
    });

    // Heartbeat monitoring to detect stuck conversions (no progress for 30 seconds)
    const heartbeatPromise = new Promise<void>((_, reject) => {
      const checkInterval = setInterval(() => {
        if (aborted) {
          clearInterval(checkInterval);
          reject(new Error('Conversion cancelled'));
          return;
        }
        const timeSinceLastProgress = Date.now() - state.lastProgressTime;
        if (timeSinceLastProgress > 60000) { // 60 seconds
          clearInterval(checkInterval);
          reject(new Error(`Conversion stuck - no progress for ${Math.round(timeSinceLastProgress / 1000)} seconds`));
        }
      }, 5000); // Check every 5 seconds

      // Clean up interval when conversion completes or fails
      execPromise.then(() => clearInterval(checkInterval)).catch(() => clearInterval(checkInterval));
    });

    await Promise.race([execPromise, timeoutPromise, heartbeatPromise]);

    // Check if conversion actually succeeded by looking for error messages in logs
    // NOTE: 'Aborted()' appears in successful conversions too (process termination), don't use it as error indicator
    const hasError = state.recentLogs.some(log =>
      log.includes('Conversion failed') ||
      log.includes('Error initializing') ||
      log.includes('Invalid argument') ||
      log.includes('Unknown encoder') ||
      log.includes('Could not write header') ||
      log.includes('Stream map') ||
      log.includes('matches no streams')
    );

    if (hasError) {
      throw new Error(`FFmpeg conversion failed. Check codec compatibility for ${settings.outputFormat} format.`);
    }

    // Phase 3: Writing output
    sendProgress(id, 95, 'writing');
    const outputData = await ffmpeg.readFile(outputPath);

    // Convert to ArrayBuffer for transfer
    let buffer: ArrayBuffer;
    if (outputData instanceof Uint8Array) {
      buffer = outputData.buffer.slice(outputData.byteOffset, outputData.byteOffset + outputData.byteLength) as ArrayBuffer;
    } else if (typeof outputData === 'string') {
      // Convert string to ArrayBuffer
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(outputData);
      buffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
    } else {
      throw new Error('Unexpected output data type');
    }

    // Phase 4: Complete
    sendProgress(id, 100, 'complete');

    // Send result
    const response: VideoWorkerResponse = {
      type: 'result',
      payload: {
        id,
        status: 'success',
        outputData: buffer,
        outputSize: buffer.byteLength,
      },
    };
    self.postMessage(response, { transfer: [buffer] });

  } catch (error) {
    if (aborted || (error instanceof Error && error.message.includes('cancelled'))) {
      const response: VideoWorkerResponse = {
        type: 'result',
        payload: {
          id,
          status: 'cancelled',
        },
      };
      self.postMessage(response);
    } else {
      // Get last few log lines for error context
      const errorLogs = state.recentLogs.slice(-10).join('\n');
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
      const fullError = `${errorMessage}\n\nRecent FFmpeg logs:\n${errorLogs}`;

      const response: VideoWorkerResponse = {
        type: 'result',
        payload: {
          id,
          status: 'error',
          error: fullError,
        },
      };
      self.postMessage(response);
    }
  } finally {
    signal.removeEventListener('abort', abortHandler);

    // Cleanup - always run even on error
    try {
      await ffmpeg.deleteFile(inputPath).catch(() => { });
      await ffmpeg.deleteFile(outputPath).catch(() => { });
    } catch {
      // Ignore cleanup errors
    }

    state.currentJob = null;
  }
}

// Main conversion function with routing
async function convertVideo(
  id: string,
  videoData: ArrayBuffer,
  fileName: string,
  settings: VideoConversionSettings,
  signal: AbortSignal
): Promise<void> {
  // Detect capabilities to determine which engine to use
  const capabilities = await detectWorkerCapabilities();
  const useWebCodecs = canUseWebCodecsInWorker(settings, capabilities);

  if (useWebCodecs) {
    console.log('[Worker] Using WebCodecs for conversion');
    await convertWithWebCodecsInWorker(id, videoData, fileName, settings, capabilities, signal);
  } else {
    // Log why WebCodecs isn't being used
    if (!capabilities.webCodecsSupported) {
      console.log('[Worker] WebCodecs not supported in this browser, using FFmpeg.wasm (legacy mode)');
    } else if (settings.outputFormat === 'gif') {
      console.log('[Worker] GIF output requires FFmpeg.wasm (WebCodecs does not support GIF)');
    } else if (!capabilities.webCodecsVP9Supported && !capabilities.webCodecsVP8Supported) {
      console.log('[Worker] VP8/VP9 encoding not supported, using FFmpeg.wasm (legacy mode)');
    } else {
      console.log('[Worker] Using FFmpeg.wasm (legacy mode) for conversion');
    }
    await convertWithFFmpeg(id, videoData, fileName, settings, signal);
  }
}

/**
 * Converts video using WebCodecs API within the worker.
 */
async function convertWithWebCodecsInWorker(
  id: string,
  videoData: ArrayBuffer,
  fileName: string,
  settings: VideoConversionSettings,
  capabilities: BrowserCapabilities,
  signal: AbortSignal
): Promise<void> {
  let aborted = false;
  const abortHandler = () => {
    aborted = true;
  };
  signal.addEventListener('abort', abortHandler);

  try {
    // Determine which codec to use
    const codec = capabilities.webCodecsVP9Supported ? 'vp9' : 'vp8';
    
    // Create File from ArrayBuffer
    const inputFile = new File([videoData], fileName, { type: 'video/webm' });

    // Send progress update
    sendProgress(id, 10, 'reading');

    // Import the WebCodecs encoder dynamically
    const { convertWithWebCodecs } = await import('../lib/webcodecs-encoder');

    if (aborted) {
      throw new Error('Conversion cancelled');
    }

    // Perform conversion with progress tracking
    sendProgress(id, 20, 'converting');
    
    const outputBlob = await convertWithWebCodecs(
      inputFile,
      settings,
      codec,
      (progress) => {
        // Map progress (20-95%) to our progress range
        const mappedProgress = 20 + Math.round((progress / 100) * 75);
        sendProgress(id, mappedProgress, 'converting');
      }
    );

    if (aborted) {
      throw new Error('Conversion cancelled');
    }

    // Convert blob to ArrayBuffer
    sendProgress(id, 95, 'writing');
    const buffer = await outputBlob.arrayBuffer();

    // Complete
    sendProgress(id, 100, 'complete');

    // Send result
    const response: VideoWorkerResponse = {
      type: 'result',
      payload: {
        id,
        status: 'success',
        outputData: buffer,
        outputSize: buffer.byteLength,
      },
    };
    self.postMessage(response, { transfer: [buffer] });

  } catch (error) {
    if (aborted || (error instanceof Error && error.message.includes('cancelled'))) {
      const response: VideoWorkerResponse = {
        type: 'result',
        payload: {
          id,
          status: 'cancelled',
        },
      };
      self.postMessage(response);
    } else {
      const errorMessage = error instanceof Error ? error.message : 'WebCodecs conversion error';
      
      // If WebCodecs fails, fall back to FFmpeg
      console.warn('[Worker] WebCodecs conversion failed, falling back to FFmpeg:', errorMessage);
      
      try {
        await convertWithFFmpeg(id, videoData, fileName, settings, signal);
      } catch (fallbackError) {
        const response: VideoWorkerResponse = {
          type: 'result',
          payload: {
            id,
            status: 'error',
            error: errorMessage,
          },
        };
        self.postMessage(response);
      }
    }
  } finally {
    signal.removeEventListener('abort', abortHandler);
    state.currentJob = null;
  }
}

// Worker message handler
self.onmessage = async (event: MessageEvent<VideoWorkerMessage>) => {
  const message = event.data;

  if (message.type === 'init') {
    try {
      const multiThreaded = message.payload?.multiThreaded || false;
      await getFFmpeg(multiThreaded);
      const response: VideoWorkerResponse = { type: 'ready' };
      self.postMessage(response);
    } catch (error) {
      console.error('[Worker] Init failed:', error);
      const response: VideoWorkerResponse = {
        type: 'init-error',
        payload: {
          message: error instanceof Error ? error.message : 'Unknown initialization error',
        },
      };
      self.postMessage(response);
    }
    return;
  }

  if (message.type === 'convert') {
    const { id, videoData, fileName, settings } = message.payload;

    // Create abort controller for this job
    const abortController = new AbortController();
    state.currentJob = {
      id,
      abort: () => abortController.abort(),
    };

    try {
      await convertVideo(id, videoData, fileName, settings, abortController.signal);
    } catch (error) {
      // Error is handled in convertVideo, this catches unexpected errors
      console.error('[Worker] Unexpected error:', error);
      const response: VideoWorkerResponse = {
        type: 'result',
        payload: {
          id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unexpected error',
        },
      };
      self.postMessage(response);
    }
    return;
  }

  if (message.type === 'cancel') {
    const { id } = message.payload;
    if (state.currentJob?.id === id) {
      console.log('[Worker] Cancelling conversion:', id);
      state.currentJob.abort();
      // Also terminate FFmpeg to stop the process immediately
      if (state.ffmpeg) {
        console.log('[Worker] Terminating FFmpeg instance');
        state.ffmpeg.terminate();
        state.ffmpeg = null;
        state.initPromise = null;
      }
    }
    return;
  }

  if (message.type === 'reset') {
    try {
      await resetFFmpeg();
      const response: VideoWorkerResponse = { type: 'ready' };
      self.postMessage(response);
    } catch (error) {
      console.error('[Worker] Reset failed:', error);
      const response: VideoWorkerResponse = {
        type: 'init-error',
        payload: {
          message: error instanceof Error ? error.message : 'Unknown reset error',
        },
      };
      self.postMessage(response);
    }
    return;
  }
};

// Signal that worker is loaded
console.log('[Worker] Video converter worker loaded');
