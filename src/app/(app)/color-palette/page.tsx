"use client";

import { useState, useMemo } from "react";
import chroma from "chroma-js";
import { Palette, Copy, Check, RefreshCw, AlertCircle, Info, Download, LayoutGrid } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { sendEvent } from "@/lib/analytics";

type PaletteMode = 'monochromatic' | 'analogous' | 'triadic' | 'complementary';

export default function ColorPalettePage() {
    const [seedColor, setSeedColor] = useState("#3b82f6");
    const [copied, setCopied] = useState<string | null>(null);
    const [mode, setMode] = useState<PaletteMode>('monochromatic');

    const palette = useMemo(() => {
        try {
            if (!chroma.valid(seedColor)) return [];
            
            let colors: chroma.Color[] = [];
            const base = chroma(seedColor);

            switch (mode) {
                case 'monochromatic':
                    // @ts-ignore
                    colors = chroma.scale([base.darken(2), base, base.brighten(2)]).colors(5, 'color');
                    break;
                case 'analogous':
                    colors = [
                        base.set('hsl.h', '-30'),
                        base.set('hsl.h', '-15'),
                        base,
                        base.set('hsl.h', '+15'),
                        base.set('hsl.h', '+30'),
                    ];
                    break;
                case 'triadic':
                    colors = [
                        base.set('hsl.h', '-120'),
                        base.set('hsl.h', '-60'),
                        base,
                        base.set('hsl.h', '+60'),
                        base.set('hsl.h', '+120'),
                    ];
                    break;
                case 'complementary':
                    colors = [
                        base,
                        base.set('hsl.h', '+180').desaturate(0.5),
                        base.set('hsl.h', '+180'),
                        base.set('hsl.h', '+180').brighten(0.5),
                        base.brighten(1),
                    ];
                    break;
            }

            return colors.map(c => ({
                hex: c.hex(),
                rgb: c.css(),
                hsl: c.css('hsl'),
                isDark: c.luminance() < 0.5,
                contrastOnWhite: chroma.contrast(c, 'white'),
                contrastOnBlack: chroma.contrast(c, 'black'),
            }));
        } catch (e) {
            return [];
        }
    }, [seedColor, mode]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const generateRandom = () => {
        const randomColor = chroma.random().hex();
        setSeedColor(randomColor);
        sendEvent('color_palette_generated', { method: 'random' });
    };

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
                {/* Tool Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Palette className="size-5 text-primary" />
                            Color Palette Generator
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Create accessible color schemes with WCAG contrast checks.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={generateRandom} className="h-8 gap-2">
                        <RefreshCw className="size-3.5" />
                        Random Color
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                    {/* Controls Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm sm:text-base flex items-center gap-2">Seed Color</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <div 
                                        className="size-10 rounded-md border shadow-sm shrink-0" 
                                        style={{ backgroundColor: seedColor }}
                                    />
                                    <Input 
                                        value={seedColor} 
                                        onChange={(e) => setSeedColor(e.target.value)}
                                        className="font-mono uppercase"
                                        placeholder="#000000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Generation Mode</label>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {(['monochromatic', 'analogous', 'triadic', 'complementary'] as PaletteMode[]).map((m) => (
                                            <Button
                                                key={m}
                                                variant={mode === m ? "secondary" : "ghost"}
                                                size="sm"
                                                className="justify-start h-8 text-xs capitalize"
                                                onClick={() => {
                                                    setMode(m);
                                                    sendEvent('color_palette_generated', { mode: m });
                                                }}
                                            >
                                                {m}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-primary/5 border-primary/10 shadow-none">
                            <CardContent className="p-4 flex items-start gap-3">
                                <Info className="size-4 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold">WCAG Guidelines</p>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        AA requires 4.5:1 for normal text. AAA requires 7:1. Large text needs at least 3:1.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Palette Display */}
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="p-0">
                                <div className="flex flex-col sm:flex-row h-64 sm:h-48 w-full overflow-hidden rounded-t-xl">
                                    {palette.map((color, i) => (
                                        <div 
                                            key={i}
                                            className="flex-1 flex flex-col items-center justify-end pb-4 group relative cursor-pointer"
                                            style={{ backgroundColor: color.hex }}
                                            onClick={() => handleCopy(color.hex, `hex-${i}`)}
                                        >
                                            <div className={cn(
                                                "opacity-0 group-hover:opacity-100 transition-opacity bg-background/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold mb-2",
                                                color.isDark ? "text-white" : "text-black"
                                            )}>
                                                {copied === `hex-${i}` ? "COPIED" : "CLICK TO COPY"}
                                            </div>
                                            <span className={cn(
                                                "font-mono text-sm font-bold",
                                                color.isDark ? "text-white/90" : "text-black/90"
                                            )}>
                                                {color.hex.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 grid gap-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {palette.map((color, i) => (
                                            <div key={i} className="space-y-3 p-4 rounded-lg border bg-muted/5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-3 rounded-full border" style={{ backgroundColor: color.hex }} />
                                                        <span className="text-xs font-bold font-mono">{color.hex.toUpperCase()}</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="size-6" onClick={() => handleCopy(color.hex, `color-${i}`)}>
                                                        {copied === `color-${i}` ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                                                    </Button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-muted-foreground font-medium uppercase">On White</span>
                                                        <Badge variant={color.contrastOnWhite >= 4.5 ? "outline" : "destructive"} className="h-4 px-1 text-[9px]">
                                                            {color.contrastOnWhite.toFixed(2)}:1 {color.contrastOnWhite >= 7 ? "AAA" : color.contrastOnWhite >= 4.5 ? "AA" : "FAIL"}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-muted-foreground font-medium uppercase">On Black</span>
                                                        <Badge variant={color.contrastOnBlack >= 4.5 ? "outline" : "destructive"} className="h-4 px-1 text-[9px]">
                                                            {color.contrastOnBlack.toFixed(2)}:1 {color.contrastOnBlack >= 7 ? "AAA" : color.contrastOnBlack >= 4.5 ? "AA" : "FAIL"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
