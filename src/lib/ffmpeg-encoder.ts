// FFmpeg encoder module for legacy mode video conversion
// This encapsulates the ffmpeg.wasm logic for use when WebCodecs is not available

import type { VideoConversionSettings } from '@/types/video-conversion';
import { QUALITY_CRF, RESOLUTION_DIMENSIONS } from '@/types/video-conversion';

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
    // Use quality setting to determine CRF (4-63, lower is better quality)
    const crf = QUALITY_CRF[settings.quality] ?? 23;
    args.push('-crf', crf.toString());
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
