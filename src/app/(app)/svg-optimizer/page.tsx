'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DropZone } from '@/components/drop-zone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Download,
    Zap,
    FileCode,
    Settings2,
    ArrowRightLeft,
    Check,
    Loader2,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { optimizeSvg, defaultSettings } from '@/lib/svg-optimizer';
import type { SVGOptimizerSettings, SVGOptimizerResponse } from '@/types/svg-optimizer';
import { sendEvent } from '@/lib/analytics';
import { formatBytes, cn } from '@/lib/utils';

export default function SVGOptimizerPage() {
    const [originalSvg, setOriginalSvg] = useState<string | null>(null);
    const [optimizedSvg, setOptimizedSvg] = useState<string | null>(null);
    const [settings, setSettings] = useState<SVGOptimizerSettings>(defaultSettings);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [stats, setStats] = useState<{ originalSize: number; optimizedSize: number } | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
    const [optimizedUrl, setOptimizedUrl] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Cleanup Blob URLs
    useEffect(() => {
        const url = originalUrl;
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [originalUrl]);

    useEffect(() => {
        const url = optimizedUrl;
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [optimizedUrl]);

    const handleFilesAdded = useCallback(async (files: File[]) => {
        const file = files[0];
        if (!file || !file.name.toLowerCase().endsWith('.svg')) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            setOriginalSvg(content);
            setOptimizedSvg(null);

            if (originalUrl) URL.revokeObjectURL(originalUrl);
            setOriginalUrl(URL.createObjectURL(new Blob([content], { type: 'image/svg+xml' })));

            setStats(null);
            setError(null);

            sendEvent('svg_file_added', {
                file_name: file.name,
                file_size: file.size
            });

            // Initial optimization
            await runOptimization(content, settings);
        };
        reader.readAsText(file);
    }, [settings, originalUrl]);

    const runOptimization = useCallback(async (svg: string, currentSettings: SVGOptimizerSettings) => {
        setIsProcessing(true);
        setError(null);
        try {
            const result = await optimizeSvg(svg, currentSettings);
            if (result.status === 'success' && result.optimizedSvgString) {
                setOptimizedSvg(result.optimizedSvgString);

                if (optimizedUrl) URL.revokeObjectURL(optimizedUrl);
                setOptimizedUrl(URL.createObjectURL(new Blob([result.optimizedSvgString], { type: 'image/svg+xml' })));

                setStats({
                    originalSize: result.originalSize,
                    optimizedSize: result.optimizedSize!,
                });
            } else {
                setError(result.error || 'Failed to optimize SVG');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error during optimization');
        } finally {
            setIsProcessing(false);
        }
    }, [optimizedUrl]);

    const handleSettingChange = (key: keyof SVGOptimizerSettings, value: boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        if (originalSvg) {
            runOptimization(originalSvg, newSettings);
        }
    };

    const handleDownload = () => {
        if (!optimizedSvg || !fileName) return;

        const blob = new Blob([optimizedSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `optimized-${fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        sendEvent('download_clicked', {
            file_name: fileName,
            savings: stats ? (1 - stats.optimizedSize / stats.originalSize) * 100 : 0
        });
    };

    const handleClear = () => {
        setOriginalSvg(null);
        setOptimizedSvg(null);
        setStats(null);
        setFileName(null);
        setError(null);
    };

    const savingsPercent = stats
        ? Math.max(0, ((stats.originalSize - stats.optimizedSize) / stats.originalSize) * 100)
        : 0;

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
                {/* Tool Header */}
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Zap className="size-5 text-primary" />
                            SVG Nano-Optimizer
                        </h1>
                        <p className="text-xs text-muted-foreground">Aggressive SVG minification — 100% local processing</p>
                    </div>
                    {originalSvg && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleClear} className="h-8 gap-1.5">
                                <Trash2 className="size-3.5" />
                                <span className="hidden sm:inline">Clear</span>
                            </Button>
                            {optimizedSvg && (
                                <Button size="sm" onClick={handleDownload} className="h-8 gap-1.5 shadow-sm">
                                    <Download className="size-3.5" />
                                    <span className="hidden sm:inline">Download</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {!originalSvg ? (
                    <DropZone
                        onFilesAdded={handleFilesAdded}
                        disabled={isProcessing}
                        accept=".svg"
                        validator={(file) => file.name.toLowerCase().endsWith('.svg')}
                        multiple={false}
                        instructionText="Drop your SVG here"
                        descriptionText="Supports SVG files • 100% local processing"
                    />
                ) : (
                    <div className="grid  lg:grid-cols-[1fr_320px]">
                        <div className="space-y-6">
                            {/* Comparison View */}
                            <Card className="overflow-hidden">
                                <CardHeader className="pb-4 border-b">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <CardTitle className="text-sm sm:text-base flex items-center gap-2">Comparison</CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 h-5">
                                                    {formatBytes(stats?.originalSize || 0)}
                                                </Badge>
                                                <ArrowRightLeft className="size-3 text-muted-foreground" />
                                                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 h-5 bg-primary/10 text-primary border-primary/20">
                                                    {formatBytes(stats?.optimizedSize || 0)}
                                                </Badge>
                                            </div>
                                        </div>
                                        {stats && (
                                            <Badge variant="outline" className="text-[10px] font-bold text-green-600 border-green-500/20 bg-green-500/5">
                                                {savingsPercent.toFixed(1)}% SAVED
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 relative aspect-square sm:aspect-video bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-muted/10 flex items-center justify-center overflow-hidden">
                                    {isProcessing && !optimizedSvg && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                                            <Loader2 className="size-8 animate-spin text-primary" />
                                        </div>
                                    )}

                                    <div
                                        ref={containerRef}
                                        className="relative w-full h-full flex items-center justify-center select-none"
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-12">
                                            {originalUrl && showOriginal && (
                                                <img
                                                    src={originalUrl}
                                                    alt="Original SVG"
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            )}
                                        </div>

                                        {optimizedUrl && !showOriginal && (
                                            <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-12">
                                                <img
                                                    src={optimizedUrl}
                                                    alt="Optimized SVG"
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                {optimizedSvg && (
                                    <div className="p-4 border-t flex items-center justify-center">
                                        <div className="flex items-center bg-muted/50 p-1 rounded-lg">
                                            <Button
                                                variant={showOriginal ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setShowOriginal(true)}
                                                className="h-8 px-4"
                                            >
                                                Original
                                            </Button>
                                            <Button
                                                variant={!showOriginal ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setShowOriginal(false)}
                                                className="h-8 px-4"
                                            >
                                                Optimized
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>

                            <Card className="bg-primary/5 border-primary/10 shadow-none">
                                <CardContent className="p-4 flex items-start gap-3">
                                    <FileCode className="size-5 text-primary shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-semibold">Pro Tip: Local Only Processing</h4>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                            Your SVG stays in your browser. We use <code className="bg-primary/10 px-1 rounded text-primary">svgo</code> running in a Web Worker to ensure privacy and keep the interface snappy.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                        <Settings2 className="size-4" />
                                        Optimizer Settings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y max-h-[500px] overflow-y-auto">
                                        <SettingToggle
                                            label="Remove ViewBox"
                                            description="Keeps aspect ratio but removes fixed size"
                                            checked={settings.removeViewBox}
                                            onChange={(v) => handleSettingChange('removeViewBox', v)}
                                        />
                                        <SettingToggle
                                            label="Cleanup IDs"
                                            description="Minify or remove unused element IDs"
                                            checked={settings.cleanupIds}
                                            onChange={(v) => handleSettingChange('cleanupIds', v)}
                                        />
                                        <SettingToggle
                                            label="Remove Dimensions"
                                            description="Removes width/height attributes"
                                            checked={settings.removeDimensions}
                                            onChange={(v) => handleSettingChange('removeDimensions', v)}
                                        />
                                        <SettingToggle
                                            label="Cleanup Attributes"
                                            description="Remove redundant whitespace"
                                            checked={settings.cleanupAttrs}
                                            onChange={(v) => handleSettingChange('cleanupAttrs', v)}
                                        />
                                        <SettingToggle
                                            label="Merge Paths"
                                            description="Combine multiple paths into one"
                                            checked={settings.mergePaths}
                                            onChange={(v) => handleSettingChange('mergePaths', v)}
                                        />
                                        <SettingToggle
                                            label="Convert Shapes"
                                            description="Convert basic shapes to paths"
                                            checked={settings.convertShapeToPath}
                                            onChange={(v) => handleSettingChange('convertShapeToPath', v)}
                                        />
                                        <SettingToggle
                                            label="Sort Attributes"
                                            description="Sort attributes for better compression"
                                            checked={settings.sortAttrs}
                                            onChange={(v) => handleSettingChange('sortAttrs', v)}
                                        />
                                        <SettingToggle
                                            label="Remove Metadata"
                                            description="Remove editor metadata & comments"
                                            checked={settings.removeMetadata}
                                            onChange={(v) => handleSettingChange('removeMetadata', v)}
                                        />
                                        <SettingToggle
                                            label="Minify Styles"
                                            description="Minify style elements using CSSO"
                                            checked={settings.minifyStyles}
                                            onChange={(v) => handleSettingChange('minifyStyles', v)}
                                        />
                                        <SettingToggle
                                            label="Collapse Groups"
                                            description="Remove useless <g> elements"
                                            checked={settings.collapseGroups}
                                            onChange={(v) => handleSettingChange('collapseGroups', v)}
                                        />
                                        <SettingToggle
                                            label="Clean Strokes/Fills"
                                            description="Remove useless stroke & fill attributes"
                                            checked={settings.removeUselessStrokeAndFill}
                                            onChange={(v) => handleSettingChange('removeUselessStrokeAndFill', v)}
                                        />
                                        <SettingToggle
                                            label="Move Attrs to Group"
                                            description="Move common attributes to enclosing group"
                                            checked={settings.moveElemsAttrsToGroup}
                                            onChange={(v) => handleSettingChange('moveElemsAttrsToGroup', v)}
                                        />
                                        <SettingToggle
                                            label="Remove Scripts"
                                            description="Remove potentially harmful scripts"
                                            checked={settings.removeScripts}
                                            onChange={(v) => handleSettingChange('removeScripts', v)}
                                        />
                                    </div>
                                </CardContent>
                                <div className="p-4 border-t w-full flex justify-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-[11px] h-8 gap-2 font-bold uppercase flex items-center justify-center"
                                        onClick={() => {
                                            setSettings(defaultSettings);
                                            if (originalSvg) runOptimization(originalSvg, defaultSettings);
                                        }}
                                    >
                                        <RefreshCw className="size-3" />
                                        Reset to Defaults
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 gap-4">
            <div className="space-y-0.5">
                <Label className="text-sm font-medium leading-none">{label}</Label>
                <p className="text-xs text-muted-foreground leading-tight">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-2">
            <div className="flex items-center gap-2">
                {icon}
                <h3 className="text-sm font-bold">{title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
    );
}
