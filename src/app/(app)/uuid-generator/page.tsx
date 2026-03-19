"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4, v7 as uuidv7 } from "uuid";
import { Fingerprint, Copy, Check, RefreshCw, Settings2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UuidGeneratorPage() {
    const [uuids, setUuids] = useState<string[]>([]);
    const [version, setVersion] = useState<"v4" | "v7">("v4");
    const [quantity, setQuantity] = useState(1);
    const [hyphens, setHyphens] = useState(true);
    const [copied, setCopied] = useState(false);

    const generateUuids = useCallback(() => {
        const newUuids = [];
        const count = Math.min(Math.max(1, quantity), 10000); // hard limit 10,000

        for (let i = 0; i < count; i++) {
            let id = version === "v4" ? uuidv4() : uuidv7();
            if (!hyphens) {
                id = id.replace(/-/g, "");
            }
            newUuids.push(id);
        }
        
        setUuids(newUuids);
        setCopied(false);
    }, [version, quantity, hyphens]);

    // Initial mount generation
    useEffect(() => {
        generateUuids();
    }, []); // Run once on mount

    // Regenerate when dependencies change, but only if not the first mount
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        generateUuids();
    }, [generateUuids]);

    const handleCopy = async () => {
        if (uuids.length === 0) return;
        try {
            await navigator.clipboard.writeText(uuids.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleDownload = () => {
        if (uuids.length === 0) return;
        const blob = new Blob([uuids.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `uuids-${version}-${new Date().toISOString().split("T")[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
                    <Fingerprint className="size-5" />
                    UUID Generator
                </h1>
                <p className="text-xs text-muted-foreground">
                    Generate universally unique identifiers (v4 & v7). Fast, secure, and completely local.
                </p>
            </div>

            <Card className="max-w-2xl border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Settings2 className="w-4 h-4" />
                        Generation Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Controls */}
                    <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Version</label>
                            <div className="flex gap-2">
                                <Button
                                    variant={version === "v4" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setVersion("v4")}
                                >
                                    v4 (Random)
                                </Button>
                                <Button
                                    variant={version === "v7" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setVersion("v7")}
                                >
                                    v7 (Time-based)
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Quantity</label>
                            <Input
                                type="number"
                                min={1}
                                max={10000}
                                value={quantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) setQuantity(val);
                                }}
                                className="w-24 text-right"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Include Hyphens</label>
                            <Switch
                                checked={hyphens}
                                onCheckedChange={setHyphens}
                            />
                        </div>
                    </div>

                    {/* Output Area */}
                    <div className="relative group mt-4">
                        <div className="bg-muted/50 rounded-lg border border-border/40 p-4 pr-28 h-[200px] overflow-y-auto font-mono text-sm">
                            {uuids.map((id, index) => (
                                <div key={index} className="break-all text-foreground">{id}</div>
                            ))}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 bg-muted/80 backdrop-blur-sm p-1 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={generateUuids}
                                title="Regenerate"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                                <RefreshCw className="size-4" />
                            </Button>
                            <Button
                                variant="default"
                                size="icon"
                                onClick={handleCopy}
                                title="Copy All"
                                className="h-8 w-8 transition-all"
                            >
                                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleDownload}
                                title="Download TXT"
                                className="h-8 w-8 transition-all"
                            >
                                <Download className="size-4" />
                            </Button>
                        </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-center">
                        {uuids.length} UUID{uuids.length !== 1 ? 's' : ''} generated
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
