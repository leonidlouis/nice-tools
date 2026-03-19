"use client";

import { useState, useEffect } from "react";
import { Ruler, Type, Database, Palette, Info, Copy, Check, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sendEvent } from "@/lib/analytics";

export default function UnitConverterPage() {
    const [copied, setCopied] = useState<string | null>(null);

    // Typography State
    const [px, setPx] = useState("16");
    const [baseSize, setBaseSize] = useState("16");
    const rem = (parseFloat(px) / parseFloat(baseSize)).toFixed(3);

    // Data Size State
    const [mb, setMb] = useState("1024");
    const gb = (parseFloat(mb) / 1024).toFixed(3);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
        sendEvent('unit_converted', { unit: id });
    };

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
                {/* Tool Header */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Ruler className="size-5 text-primary" />
                            Unit Converter
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Fast conversion for common developer units.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Typography */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                <Type className="size-4" />
                                Typography (PX to REM)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Pixels (px)</Label>
                                    <Input 
                                        type="number" 
                                        value={px} 
                                        onChange={(e) => setPx(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Base Size</Label>
                                    <Input 
                                        type="number" 
                                        value={baseSize} 
                                        onChange={(e) => setBaseSize(e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/20 border flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Result</p>
                                    <p className="text-xl font-mono font-bold text-primary">{rem}rem</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleCopy(rem, 'rem')}>
                                    {copied === 'rem' ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Storage */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                <Database className="size-4" />
                                Data Size (MB to GB)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Megabytes (MB)</Label>
                                <Input 
                                    type="number" 
                                    value={mb} 
                                    onChange={(e) => setMb(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="p-4 rounded-lg bg-muted/20 border flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Result</p>
                                    <p className="text-xl font-mono font-bold text-primary">{gb}GB</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleCopy(gb, 'gb')}>
                                    {copied === 'gb' ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-primary/5 border-primary/10 shadow-none">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Info className="size-4 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold">Did you know?</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Most modern browsers use a default base size of 16px. Converting to REM ensures your layout respects user accessibility settings.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
