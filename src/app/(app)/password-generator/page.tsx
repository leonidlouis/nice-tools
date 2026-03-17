"use client";

import { useState, useEffect, useCallback } from "react";
import { KeyRound, Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const LOWER_CHARS = "abcdefghijklmnopqrstuvwxyz";
const UPPER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBER_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

const SIMILAR_CHARS = /[il1Lo0O]/g;

function calculateStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: "Too Weak", color: "bg-red-500" };
    let score = 0;
    if (password.length > 8) score += 20;
    if (password.length > 12) score += 20;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;

    if (score < 40) return { score, label: "Weak", color: "bg-red-500" };
    if (score < 70) return { score, label: "Fair", color: "bg-yellow-500" };
    if (score < 90) return { score, label: "Good", color: "bg-blue-500" };
    return { score: 100, label: "Strong", color: "bg-green-500" };
}

export default function PasswordGeneratorPage() {
    const [password, setPassword] = useState("");
    const [length, setLength] = useState(16);
    const [useLower, setUseLower] = useState(true);
    const [useUpper, setUseUpper] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [excludeSimilar, setExcludeSimilar] = useState(false);
    const [copied, setCopied] = useState(false);

    const generatePassword = useCallback(() => {
        // Enforce at least one option is selected.
        // If all are false, we force lowercase temporarily for generation.
        const actualLower = useLower || (!useUpper && !useNumbers && !useSymbols);
        
        let chars = "";
        if (actualLower) chars += LOWER_CHARS;
        if (useUpper) chars += UPPER_CHARS;
        if (useNumbers) chars += NUMBER_CHARS;
        if (useSymbols) chars += SYMBOL_CHARS;

        if (excludeSimilar) {
            chars = chars.replace(SIMILAR_CHARS, "");
        }

        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);
        let generated = "";
        for (let i = 0; i < length; i++) {
            generated += chars[array[i] % chars.length];
        }
        setPassword(generated);
        setCopied(false);
    }, [length, useLower, useUpper, useNumbers, useSymbols, excludeSimilar]);

    useEffect(() => {
        generatePassword();
    }, [generatePassword]);

    const handleCopy = async () => {
        if (!password) return;
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const strength = calculateStrength(password);

    // Prevent turning off the last active switch
    const handleSwitchChange = (setter: React.Dispatch<React.SetStateAction<boolean>>, currentVal: boolean) => {
        return (checked: boolean) => {
            const activeCount = [useLower, useUpper, useNumbers, useSymbols].filter(Boolean).length;
            if (!checked && activeCount === 1 && currentVal) {
                // Do not allow turning off the last one
                return;
            }
            setter(checked);
        };
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full">
            <div>
                <h1 className="text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
                    <KeyRound className="size-5" />
                    Password Generator
                </h1>
                <p className="text-xs text-muted-foreground">
                    Generate secure, high-entropy passwords directly in your browser. No data leaves your device.
                </p>
            </div>

            <div className="max-w-2xl space-y-6 bg-card border border-border/60 rounded-xl p-6 shadow-sm">
                <div className="relative group">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/40 min-h-[5rem] overflow-x-auto">
                        <span className="text-2xl font-mono tracking-wider text-foreground break-all pr-12">
                            {password}
                        </span>
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 bg-muted/80 backdrop-blur-sm p-1 rounded-md shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={generatePassword}
                            title="Regenerate Password"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className="size-4" />
                        </Button>
                        <Button
                            variant="default"
                            size="icon"
                            onClick={handleCopy}
                            title="Copy to Clipboard"
                            className="h-8 w-8 transition-all"
                        >
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-muted-foreground">Password Strength</span>
                        <span className="font-medium">{strength.label}</span>
                    </div>
                    <Progress value={strength.score} className="h-2" indicatorClassName={strength.color} />
                </div>

                <div className="space-y-6 pt-4 border-t border-border/40">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">Password Length</label>
                            <span className="text-sm font-mono text-muted-foreground">{length}</span>
                        </div>
                        <Slider
                            value={[length]}
                            onValueChange={(val) => setLength(val[0])}
                            min={6}
                            max={128}
                            step={1}
                            className="w-full"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between space-x-2 border border-border/40 rounded-lg p-3">
                            <label htmlFor="lowercase" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                Lowercase (a-z)
                            </label>
                            <Switch
                                id="lowercase"
                                checked={useLower}
                                onCheckedChange={handleSwitchChange(setUseLower, useLower)}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2 border border-border/40 rounded-lg p-3">
                            <label htmlFor="uppercase" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                Uppercase (A-Z)
                            </label>
                            <Switch
                                id="uppercase"
                                checked={useUpper}
                                onCheckedChange={handleSwitchChange(setUseUpper, useUpper)}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2 border border-border/40 rounded-lg p-3">
                            <label htmlFor="numbers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                Numbers (0-9)
                            </label>
                            <Switch
                                id="numbers"
                                checked={useNumbers}
                                onCheckedChange={handleSwitchChange(setUseNumbers, useNumbers)}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2 border border-border/40 rounded-lg p-3">
                            <label htmlFor="symbols" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                Symbols (!@#$)
                            </label>
                            <Switch
                                id="symbols"
                                checked={useSymbols}
                                onCheckedChange={handleSwitchChange(setUseSymbols, useSymbols)}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2 border border-border/40 rounded-lg p-3">
                            <label htmlFor="excludeSimilar" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer">
                                Exclude Similar (i, l, 1, L, o, 0, O)
                            </label>
                            <Switch
                                id="excludeSimilar"
                                checked={excludeSimilar}
                                onCheckedChange={setExcludeSimilar}
                            />
                        </div>
                    </div>
                    
                    {([useLower, useUpper, useNumbers, useSymbols].filter(Boolean).length === 1) && (
                        <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 p-2 rounded-md">
                            <AlertCircle className="size-4" />
                            <span>At least one character type must be selected.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
