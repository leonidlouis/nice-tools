'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Settings2,
    Info,
    ChevronDown,
    ChevronUp,
    Cpu,
    AlertTriangle,
} from 'lucide-react';
import type {
    VideoConversionSettings,
    VideoFormat,
    VideoResolution,
    VideoPreset,
    VideoFps,
    BrowserCapabilities
} from '@/types/video-conversion';
import { isMultiThreadingSupported, detectCapabilities } from '@/lib/video-conversion';
import { FORMAT_DISPLAY_NAMES } from '@/types/video-conversion';
import { sendEvent } from '@/lib/analytics';
import { ProcessingModeBanner } from './video-converter-banner';

interface VideoSettingsPanelProps {
    settings: VideoConversionSettings;
    onSettingsChange: (settings: VideoConversionSettings) => void;
    disabled?: boolean;
}

const VIDEO_FORMATS: VideoFormat[] = ['webm', 'gif'];

export function VideoSettingsPanel({ settings, onSettingsChange, disabled }: VideoSettingsPanelProps) {
    const [showQualityGuide, setShowQualityGuide] = useState(false);
    const [showPerformanceInfo, setShowPerformanceInfo] = useState(false);
    const [capabilities, setCapabilities] = useState<BrowserCapabilities | null>(null);
    const canUseMultiThreading = isMultiThreadingSupported();

    // Detect browser capabilities on mount
    useEffect(() => {
        detectCapabilities().then(setCapabilities);
    }, []);

    const handleFormatChange = (format: VideoFormat) => {
        onSettingsChange({ ...settings, outputFormat: format });
        sendEvent('video_settings_changed', { setting: 'format', value: format });
    };

    const handleQualityChange = (quality: VideoConversionSettings['quality']) => {
        onSettingsChange({ ...settings, quality });
        sendEvent('video_settings_changed', { setting: 'quality', value: quality });
    };

    const handleResolutionChange = (resolution: VideoResolution) => {
        onSettingsChange({ ...settings, resolution });
        sendEvent('video_settings_changed', { setting: 'resolution', value: resolution });
    };

    const handlePresetChange = (preset: VideoPreset) => {
        onSettingsChange({ ...settings, preset });
        sendEvent('video_settings_changed', { setting: 'preset', value: preset });
    };

    const handleFpsChange = (fps: VideoFps) => {
        onSettingsChange({ ...settings, fps });
        sendEvent('video_settings_changed', { setting: 'fps', value: fps });
    };

    const handleMultiThreadedChange = (enabled: boolean) => {
        onSettingsChange({ ...settings, multiThreaded: enabled });
        sendEvent('video_settings_changed', { setting: 'multiThreaded', value: enabled });
    };

    const getQualityDescription = (quality: string) => {
        switch (quality) {
            case 'high': return 'Best quality, larger files';
            case 'medium': return 'Good balance (recommended)';
            case 'low': return 'Smaller files, lower quality';
            default: return '';
        }
    };

    const availableFormats = VIDEO_FORMATS;

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Settings2 className="w-4 h-4" />
                    Conversion Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Performance Info Banner */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-blue-800 dark:text-blue-400">
                                Browser-Based Processing
                            </p>
                            <p className="text-blue-700 dark:text-blue-500 mt-1">
                                Videos are converted entirely in your browser. This is expected to be <b>slower compared to desktop-based apps.</b>
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowPerformanceInfo(!showPerformanceInfo)}
                                className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                            >
                                {showPerformanceInfo ? 'Show less' : 'Learn more'}
                                {showPerformanceInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>

                    {showPerformanceInfo && (
                        <div className="mt-2 pt-2 border-t border-blue-500/20 space-y-2">
                            <p>
                                <strong>Why?</strong>
                                <br />
                                Browser-based conversion uses software
                                encoding by default - software encoding is <i>slow</i>
                                <br /><br />
                                Modern browsers with hardware acceleration (Chrome 94+,
                                Firefox 130+, Safari 16.4+) <i>could</i> be fast*.
                                <br /><br />
                                *: still slower than desktop apps.
                            </p>
                        </div>
                    )}
                </div>

                {/* Legacy Mode Banner - only shown when using ffmpeg.wasm fallback */}
                <ProcessingModeBanner capabilities={capabilities} />

                {/* Mode Selection */}
                {/* Output Format */}
                <div className="space-y-3">
                    <span className="text-sm font-medium">Output Format</span>
                    <div className="grid grid-cols-3 gap-2">
                        {availableFormats.map((format) => (
                            <button
                                key={format}
                                type="button"
                                onClick={() => handleFormatChange(format)}
                                disabled={disabled}
                                className={`
                                    py-2 px-2 text-xs sm:text-sm font-medium rounded-lg transition-all
                                    ${settings.outputFormat === format
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10'}
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {format.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {FORMAT_DISPLAY_NAMES[settings.outputFormat] || settings.outputFormat.toUpperCase()}
                    </p>
                </div>

                <div className="h-px bg-border/50" />

                {/* Multi-threading Toggle */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Multi-Threading</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleMultiThreadedChange(!settings.multiThreaded)}
                            disabled={disabled || !canUseMultiThreading}
                            className={`
                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                ${settings.multiThreaded ? 'bg-primary' : 'bg-muted'}
                                ${disabled || !canUseMultiThreading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            <span
                                className={`
                                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                    ${settings.multiThreaded ? 'translate-x-6' : 'translate-x-1'}
                                `}
                            />
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {canUseMultiThreading
                            ? settings.multiThreaded
                                ? 'Enabled: Uses multiple CPU cores for faster conversion (2-5x faster)'
                                : 'Disabled: Single-core processing (slower but more compatible)'
                            : 'Not available on this device/browser. Requires SharedArrayBuffer support.'
                        }
                    </p>
                    {/* Multi-Threading Warning Banner */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-amber-800 dark:text-amber-400">
                                    Experimental Feature
                                </p>
                                <p className="text-amber-700 dark:text-amber-500 mt-1">
                                    Multi-threading can improve conversion speed but may cause stability issues.
                                    If you experience crashes or errors, disable this option.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Quality */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Quality</span>
                        <span className="text-xs text-muted-foreground capitalize">
                            {settings.quality} • {getQualityDescription(settings.quality)}
                        </span>
                    </div>
                    <div className="flex p-1 bg-muted rounded-xl">
                        {(['low', 'medium', 'high'] as const).map((quality) => (
                            <button
                                key={quality}
                                type="button"
                                onClick={() => handleQualityChange(quality)}
                                disabled={disabled}
                                className={`
                                    flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all capitalize
                                    ${settings.quality === quality
                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {quality}
                            </button>
                        ))}
                    </div>

                    {/* Quality Guide Toggle */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowQualityGuide(!showQualityGuide)}
                            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline focus:outline-none"
                        >
                            <Info className="w-3 h-3" />
                            <span>Quality guide</span>
                            {showQualityGuide ? (
                                <ChevronUp className="w-3 h-3" />
                            ) : (
                                <ChevronDown className="w-3 h-3" />
                            )}
                        </button>

                        {showQualityGuide && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <p><span className="font-semibold">High:</span> Best visual quality, larger file sizes (CRF 18)</p>
                                <p><span className="font-semibold">Medium:</span> Good balance for most use cases (CRF 23)</p>
                                <p><span className="font-semibold">Low:</span> Smaller files, acceptable quality loss (CRF 28)</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resolution, Frame Rate, and Encoding Speed are hidden - using default values */}
            </CardContent>
        </Card>
    );
}
