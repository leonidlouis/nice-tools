'use client';

import { AlertCircle } from 'lucide-react';
import type { BrowserCapabilities } from '@/types/video-conversion';

interface ProcessingModeBannerProps {
  capabilities: BrowserCapabilities | null;
}

/**
 * Shows a banner when the browser is using legacy mode (ffmpeg.wasm).
 * Modern browsers using WebCodecs get no banner (expected behavior).
 */
export function ProcessingModeBanner({ capabilities }: ProcessingModeBannerProps) {
  // Don't show anything if capabilities haven't been detected yet
  if (!capabilities) {
    return null;
  }

  // Modern browsers using WebCodecs - no banner (expected fast behavior)
  if (capabilities.webCodecsSupported && 
      (capabilities.webCodecsVP9Supported || capabilities.webCodecsVP8Supported)) {
    return null;
  }

  // Legacy mode - show informational banner
  return (
    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-400">
            Legacy Mode
          </p>
          <p className="text-amber-700 dark:text-amber-500 mt-1">
            Your browser uses standard processing. Conversion may take longer.
            For faster results, use Chrome 94+, Firefox 130+, or Safari 16.4+.
          </p>
        </div>
      </div>
    </div>
  );
}
