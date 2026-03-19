"use client";

import { useState, useMemo } from "react";
import { decodeJwt, decodeProtectedHeader, JWTPayload } from "jose";
import { ShieldCheck, Clock, Copy, Check, AlertCircle, Info, FileCode, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sendEvent } from "@/lib/analytics";

interface DecodedToken {
    header: any;
    payload: JWTPayload | null;
    isValid: boolean;
    error: string | null;
}

export default function JwtDebuggerPage() {
    const [token, setToken] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    const decoded = useMemo<DecodedToken>(() => {
        if (!token) {
            return {
                header: null,
                payload: null,
                isValid: false,
                error: "Enter a JWT to decode",
            };
        }

        try {
            const header = decodeProtectedHeader(token);
            const payload = decodeJwt(token);

            sendEvent('jwt_decoded', { alg: header.alg });

            return {
                header,
                payload,
                isValid: true,
                error: null,
            };
        } catch (err) {
            return {
                header: null,
                payload: null,
                isValid: false,
                error: err instanceof Error ? err.message : "Invalid JWT format",
            };
        }
    }, [token]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const formatTime = (seconds?: number) => {
        if (!seconds) return "N/A";
        return new Date(seconds * 1000).toLocaleString();
    };

    const isExpired = decoded.payload?.exp ? Date.now() >= decoded.payload.exp * 1000 : false;

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
                {/* Tool Header */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <ShieldCheck className="size-5 text-primary" />
                            JWT Debugger
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Decode and inspect JSON Web Tokens locally. <strong>No data is sent to any server.</strong>
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_1.5fr]">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                    <FileCode className="size-4" />
                                    Encoded Token
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="Paste your JWT here..."
                                    className="min-h-[300px] font-mono text-xs resize-none bg-muted/10 border-muted-foreground/20 focus-visible:ring-primary/30"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.trim())}
                                />
                                <Alert className="bg-amber-500/5 border-amber-500/20 py-2">
                                    <AlertCircle className="size-4 text-amber-600" />
                                    <AlertDescription className="text-[10px] text-amber-700 font-medium">
                                        NEVER paste production secrets or private keys into any online tool.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Output Section */}
                    <div className="space-y-6">
                        {!decoded.header && !decoded.payload ? (
                            <Card className="h-full border-dashed flex items-center justify-center min-h-[400px]">
                                <div className="text-center space-y-3 p-12">
                                    <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto opacity-50">
                                        <Search className="size-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground italic">Waiting for a valid token...</p>
                                </div>
                            </Card>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Status Alert */}
                                {decoded.isValid ? (
                                    <Alert className={cn(
                                        "py-2",
                                        isExpired ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20"
                                    )}>
                                        <AlertTitle className={cn(
                                            "text-xs font-bold flex items-center gap-2",
                                            isExpired ? "text-destructive" : "text-green-600"
                                        )}>
                                            {isExpired ? "Token Expired" : "Valid Structure"}
                                            <Badge variant={isExpired ? "destructive" : "outline"} className="text-[9px] h-4">
                                                {decoded.header?.alg}
                                            </Badge>
                                        </AlertTitle>
                                    </Alert>
                                ) : (
                                    <Alert variant="destructive" className="py-2">
                                        <AlertTitle className="text-xs font-bold">Invalid Token</AlertTitle>
                                        <AlertDescription className="text-[10px]">{decoded.error}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Header */}
                                <Card>
                                    <CardHeader className="pb-4 border-b px-4 flex flex-row items-center justify-between">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Header</CardTitle>
                                        <Button variant="ghost" size="icon" className="size-6" onClick={() => handleCopy(JSON.stringify(decoded.header, null, 2), 'header')}>
                                            {copied === 'header' ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-4 bg-muted/5">
                                        <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap text-blue-600 dark:text-blue-400">
                                            {JSON.stringify(decoded.header, null, 2)}
                                        </pre>
                                    </CardContent>
                                </Card>

                                {/* Payload */}
                                <Card>
                                    <CardHeader className="pb-4 border-b px-4 flex flex-row items-center justify-between">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payload</CardTitle>
                                        <Button variant="ghost" size="icon" className="size-6" onClick={() => handleCopy(JSON.stringify(decoded.payload, null, 2), 'payload')}>
                                            {copied === 'payload' ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-4 bg-muted/5">
                                        <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap text-pink-600 dark:text-pink-400">
                                            {JSON.stringify(decoded.payload, null, 2)}
                                        </pre>
                                    </CardContent>
                                </Card>

                                {/* Time Visualization */}
                                {decoded.payload && (decoded.payload.exp || decoded.payload.iat) && (
                                    <Card>
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timestamps</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid gap-3 pt-0">
                                            {decoded.payload.iat && (
                                                <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/50">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="size-3 text-muted-foreground" />
                                                        <span className="text-[10px] font-bold">Issued At (iat)</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono">{formatTime(decoded.payload.iat)}</span>
                                                </div>
                                            )}
                                            {decoded.payload.exp && (
                                                <div className={cn(
                                                    "flex items-center justify-between p-2 rounded border",
                                                    isExpired ? "bg-destructive/5 border-destructive/20" : "bg-muted/20 border-border/50"
                                                )}>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="size-3 text-muted-foreground" />
                                                        <span className="text-[10px] font-bold">Expiration (exp)</span>
                                                    </div>
                                                    <span className="text-[10px] font-mono">{formatTime(decoded.payload.exp)}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
