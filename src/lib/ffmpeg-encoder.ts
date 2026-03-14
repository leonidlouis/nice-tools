// FFmpeg encoder module for video conversion
// Supports WebM, GIF, GIFV, and WebP output formats

import type { VideoConversionSettings, GifOptimizationLevel } from '@/types/video-conversion';
import { 
  QUALITY_CRF, 
  RESOLUTION_DIMENSIONS, 
  GIF_OPTIMIZATION_PRESETS,
  type VideoQuality
} from '@/types/video-conversion';

/**
 * Builds FFmpeg arguments based on conversion settings.
 * This function is shared between the worker and can be used standalone.
 */
export function buildFFmpegArgs(
  input: string,
  output: string,
  settings: VideoConversionSettings
): string[] {
  const args = ['-nostdin', '-fflags', '+genpts', '-i', input];

  // Route to appropriate encoder based on format
  switch (settings.outputFormat) {
    case 'gif':
      args.push(...buildGifArgs(settings));
      break;
    case 'gifv':
      args.push(...buildGifvArgs(settings));
      break;
    case 'webp':
      args.push(...buildWebpArgs(settings));
      break;
    case 'webm':
    default:
      args.push(...buildWebmArgs(settings));
      break;
  }

  // Overwrite output
  args.push('-y', output);

  return args;
}

/**
 * Builds FFmpeg arguments for GIF encoding with optimization presets.
 */
function buildGifArgs(settings: VideoConversionSettings): string[] {
  const args: string[] = [];
  
  // No audio for GIF
  args.push('-an');
  
  // Use optimization preset
  const preset = GIF_OPTIMIZATION_PRESETS[settings.gifOptimization ?? 'balanced'];
  
  // Build GIF filter chain
  const gifFilter = buildGifFilter(settings, preset);
  args.push('-vf', gifFilter);
  
  return args;
}

/**
 * Builds GIF filter string with palette optimization.
 */
function buildGifFilter(
  settings: VideoConversionSettings,
  preset: typeof GIF_OPTIMIZATION_PRESETS[GifOptimizationLevel]
): string {
  let filter = `fps=${preset.fps}`;
  
  // Determine resolution - use preset resolution unless explicitly set
  let targetResolution = settings.resolution;
  if (targetResolution === 'original') {
    targetResolution = preset.resolution;
  }
  
  const dims = RESOLUTION_DIMENSIONS[targetResolution];
  if (dims) {
    filter += `,scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease:flags=lanczos`;
  }
  
  // Palette generation and application
  filter += `,split[s0][s1];[s0]palettegen=max_colors=${preset.maxColors}:stats_mode=${preset.statsMode}[p];[s1][p]paletteuse=dither=${preset.dither}`;
  
  return filter;
}

/**
 * Builds FFmpeg arguments for GIFV (WebM renamed to .gifv).
 * GIFV is literally just WebM with a different extension - no special encoding needed.
 * Uses the same VP8 encoding as WebM but strips audio.
 */
function buildGifvArgs(settings: VideoConversionSettings): string[] {
  // GIFV = WebM without audio, same encoding settings
  const args = buildWebmArgs({ ...settings, outputFormat: 'webm' });
  
  // Remove audio stream mapping and audio codec (force no audio)
  const filteredArgs = args.filter(arg => 
    !arg.startsWith('-map') && 
    !arg.startsWith('-c:a') && 
    !arg.startsWith('-b:a')
  );
  
  // Add no audio flag at the beginning
  const anIndex = filteredArgs.findIndex(arg => arg === '-an');
  if (anIndex === -1) {
    filteredArgs.unshift('-an');
  }
  
  return filteredArgs;
}

/**
 * Builds FFmpeg arguments for animated WebP.
 * Uses libwebp codec with quality settings.
 */
function buildWebpArgs(settings: VideoConversionSettings): string[] {
  const args: string[] = [];
  
  // No audio for WebP
  args.push('-an');
  
  // WebP encoder
  args.push('-c:v', 'libwebp');
  
  // Default quality (balanced)
  args.push('-quality', '75');
  
  // WebP-specific settings
  args.push('-lossless', '0'); // Lossy for smaller files
  args.push('-loop', '0'); // Infinite loop
  args.push('-preset', 'picture'); // Optimized for photos/videos
  args.push('-vsync', 'vfr'); // Variable frame rate support
  
  // Build video filter
  let filter = '';
  
  // Resolution scaling
  if (settings.resolution !== 'original') {
    const dims = RESOLUTION_DIMENSIONS[settings.resolution];
    if (dims) {
      filter = `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease:flags=lanczos`;
    }
  }
  
  if (filter) {
    args.push('-vf', filter);
  }
  
  // Frame rate
  if (settings.fps !== 'original') {
    args.push('-r', settings.fps);
  }
  
  return args;
}

/**
 * Builds FFmpeg arguments for WebM encoding.
 */
function buildWebmArgs(settings: VideoConversionSettings): string[] {
  const args: string[] = [];
  
  // Explicit stream mapping: video first, then audio (optional)
  args.push('-map', '0:v:0', '-map', '0:a:0?');
  
  // VP8 video codec (libvpx)
  args.push('-c:v', 'libvpx');
  
  // Use default CRF value (balanced quality)
  const crf = QUALITY_CRF[settings.quality] ?? 23;
  args.push('-crf', crf.toString());
  args.push('-b:v', '0'); // Use CRF mode
  
  // Vorbis audio codec
  args.push('-c:a', 'libvorbis');
  args.push('-b:a', '128k');
  
  // Resolution scaling
  if (settings.resolution !== 'original') {
    const dims = RESOLUTION_DIMENSIONS[settings.resolution];
    if (dims) {
      args.push('-vf', `scale=${dims.width}:${dims.height}:force_original_aspect_ratio=decrease`);
    }
  }
  
  // Frame rate
  if (settings.fps !== 'original') {
    args.push('-r', settings.fps);
  }
  
  return args;
}
