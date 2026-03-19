"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import cronstrue from "cronstrue";
import * as cronParser from "cron-parser";
import { 
    Clock, 
    Copy, 
    Check, 
    LayoutGrid, 
    List, 
    Play,
    Timer,
    CalendarDays,
    Settings2,
    RotateCcw,
    Zap,
    MousePointer2,
    Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { sendEvent } from "@/lib/analytics";

const PRESETS = [
    { label: "Every Minute", value: "* * * * *" },
    { label: "Every 5 Minutes", value: "*/5 * * * *" },
    { label: "Hourly", value: "0 * * * *" },
    { label: "Daily at Midnight", value: "0 0 * * *" },
    { label: "Daily at 9:00 AM", value: "0 9 * * *" },
    { label: "Weekly (Monday)", value: "0 0 * * 1" },
    { label: "Monthly (1st)", value: "0 0 1 * *" },
];

const TAB_CONFIG = [
    { id: "minutes", label: "Minutes", index: 0, min: 0, max: 59 },
    { id: "hours", label: "Hours", index: 1, min: 0, max: 23 },
    { id: "dom", label: "Day of Month", index: 2, min: 1, max: 31 },
    { id: "months", label: "Months", index: 3, min: 1, max: 12 },
    { id: "dow", label: "Day of Week", index: 4, min: 0, max: 6 },
];

const MONTH_LABELS: Record<number, string> = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
};

const DAY_LABELS: Record<number, string> = {
    0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"
};

export default function CronVisualizerPage() {
    const [cron, setCron] = useState("*/15 * * * *");
    const [isUtc, setIsUtc] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("minutes");

    const cronParts = useMemo(() => {
        const parts = cron.split(" ");
        while (parts.length < 5) parts.push("*");
        return parts;
    }, [cron]);

    const humanReadable = useMemo(() => {
        try {
            setError(null);
            return cronstrue.toString(cron);
        } catch (err) {
            setError("Invalid cron expression");
            return "Invalid expression";
        }
    }, [cron]);

    const nextOccurrences = useMemo(() => {
        try {
            const options = {
                currentDate: new Date(),
                utc: isUtc,
            };
            const interval = cronParser.CronExpressionParser.parse(cron, options);
            const dates = [];
            for (let i = 0; i < 5; i++) {
                dates.push(interval.next().toDate());
            }
            return dates;
        } catch (err) {
            return [];
        }
    }, [cron, isUtc]);

    const handleCopy = () => {
        navigator.clipboard.writeText(cron);
        setCopied(true);
        sendEvent('download_clicked', { type: 'cron_copy' });
        setTimeout(() => setCopied(false), 2000);
    };

    const updateCronPart = (index: number, value: string) => {
        const parts = [...cronParts];
        parts[index] = value;
        setCron(parts.join(" "));
    };

    const toggleValue = (partIndex: number, value: number) => {
        let part = cronParts[partIndex];
        const valStr = value.toString();
        
        if (part === "*" || part.includes("/") || part.includes("-")) {
            part = valStr;
        } else {
            const values = part.split(",");
            if (values.includes(valStr)) {
                const newValues = values.filter(v => v !== valStr);
                part = newValues.length === 0 ? "*" : newValues.join(",");
            } else {
                values.push(valStr);
                values.sort((a, b) => parseInt(a) - parseInt(b));
                part = values.join(",");
            }
        }
        updateCronPart(partIndex, part);
    };

    const handleStepChange = (partIndex: number, step: number) => {
        if (step <= 1) {
            updateCronPart(partIndex, "*");
        } else {
            updateCronPart(partIndex, `*/${step}`);
        }
    };

    const getStepValue = (partIndex: number) => {
        const part = cronParts[partIndex];
        if (part.startsWith("*/")) {
            return parseInt(part.split("/")[1]) || 1;
        }
        return 1;
    };

    const isValueSelected = (partIndex: number, value: number) => {
        const part = cronParts[partIndex];
        if (part === "*") return false;
        
        if (part.startsWith("*/")) {
            const step = parseInt(part.split("/")[1]);
            return value % step === 0;
        }

        const values = part.split(",");
        return values.includes(value.toString());
    };

    const currentTabConfig = useMemo(() => 
        TAB_CONFIG.find(t => t.id === activeTab)!, 
    [activeTab]);

    return (
        <div className="flex flex-col flex-1">
            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 flex-1 w-full pb-28 lg:pb-6 animate-in fade-in duration-500">
                {/* Tool Header */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Timer className="size-5" />
                            Cron Visualizer
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Translate crontab syntax into human language and build schedules visually.
                        </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 bg-muted p-1 rounded-lg border w-fit">
                        <Button 
                            variant={!isUtc ? "secondary" : "ghost"} 
                            size="sm" 
                            className="h-7 px-3 text-xs font-medium"
                            onClick={() => setIsUtc(false)}
                        >
                            Local
                        </Button>
                        <Button 
                            variant={isUtc ? "secondary" : "ghost"} 
                            size="sm" 
                            className="h-7 px-3 text-xs font-medium"
                            onClick={() => setIsUtc(true)}
                        >
                            UTC
                        </Button>
                    </div>
                </div>

                {/* Translation Hero */}
                <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Clock className="size-24 rotate-12" />
                    </div>
                    <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4 relative z-10 px-6">
                        <div className="space-y-3 max-w-2xl">
                            <h2 className={cn(
                                "text-lg sm:text-xl font-semibold tracking-tight leading-snug transition-colors",
                                error ? "text-destructive" : "text-foreground"
                            )}>
                                {humanReadable}
                            </h2>
                            <div className="flex items-center justify-center gap-2">
                                <Badge variant="secondary" className="font-mono text-xs py-1 px-4 border border-primary/10">
                                    {cron}
                                </Badge>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="size-8 bg-background/50 hover:bg-background" 
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                                </Button>
                            </div>
                        </div>
                        {/* Timezone offset label */}
                        <div className="absolute bottom-2 right-3 flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-default select-none">
                            <div className="size-1 rounded-full bg-primary" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">
                                {isUtc ? "UTC" : `UTC${new Date().getTimezoneOffset() > 0 ? "-" : "+"}${Math.abs(Math.floor(new Date().getTimezoneOffset() / 60))}`}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {/* Visual Token Builder */}
                        <div className="grid grid-cols-5 gap-2">
                            {TAB_CONFIG.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all h-16",
                                        activeTab === tab.id 
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                            : "bg-card border-border hover:border-primary/40 text-muted-foreground hover:bg-muted/30"
                                    )}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 mb-1">{tab.label}</span>
                                    <span className="text-sm font-mono font-bold truncate w-full text-center">
                                        {cronParts[tab.index]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                        <Settings2 className="size-4" />
                                        Configure {currentTabConfig.label}
                                    </CardTitle>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => updateCronPart(currentTabConfig.index, "*")}
                                    >
                                        <RotateCcw className="size-3 mr-1" />
                                        Reset
                                    </Button>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="pt-0">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    {TAB_CONFIG.map((tab) => (
                                        <TabsContent key={tab.id} value={tab.id} className="mt-0 animate-in fade-in duration-300">
                                            <Accordion type="multiple" defaultValue={["quick"]} className="w-full">
                                                <AccordionItem value="quick" className="border-b">
                                                    <AccordionTrigger className="py-4 hover:no-underline">
                                                        <div className="flex items-center gap-3">
                                                            <Zap className="size-4 text-primary" />
                                                            <span className="text-sm font-medium">Pattern Preset</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2 pb-6">
                                                        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Every X {tab.label.toLowerCase()}</label>
                                                                <Badge variant="secondary" className="font-mono text-[10px]">
                                                                    {getStepValue(tab.index) === 1 ? "Custom" : `*/${getStepValue(tab.index)}`}
                                                                </Badge>
                                                            </div>
                                                            <Slider
                                                                value={[getStepValue(tab.index)]}
                                                                min={1}
                                                                max={tab.id === 'dow' ? 7 : Math.floor(tab.max / 2)}
                                                                step={1}
                                                                onValueChange={([val]) => handleStepChange(tab.index, val)}
                                                                className="py-2"
                                                            />
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                <AccordionItem value="advanced" className="border-none">
                                                    <AccordionTrigger className="py-4 hover:no-underline">
                                                        <div className="flex items-center gap-3">
                                                            <MousePointer2 className="size-4 text-muted-foreground" />
                                                            <span className="text-sm font-medium">Manual Selection</span>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2">
                                                        <div className="grid gap-1.5 grid-cols-6 sm:grid-cols-10">
                                                            {Array.from({ length: tab.max - tab.min + 1 }, (_, i) => tab.min + i).map((val) => (
                                                                <Button
                                                                    key={val}
                                                                    variant={isValueSelected(tab.index, val) ? "default" : "outline"}
                                                                    size="sm"
                                                                    className={cn(
                                                                        "h-8 p-0 text-[10px] font-medium transition-all",
                                                                        isValueSelected(tab.index, val) ? "shadow-sm" : "hover:border-primary/40 hover:bg-primary/5"
                                                                    )}
                                                                    onClick={() => toggleValue(tab.index, val)}
                                                                >
                                                                    {tab.id === 'months' ? MONTH_LABELS[val] : 
                                                                     tab.id === 'dow' ? DAY_LABELS[val] : val}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                    <Play className="size-3 text-primary fill-primary" />
                                    Upcoming Times
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {nextOccurrences.length > 0 ? (
                                        nextOccurrences.map((date, i) => (
                                            <div key={i} className="flex flex-col p-2.5 rounded-lg border bg-muted/10">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CalendarDays className="size-3 text-muted-foreground" />
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-mono font-bold tracking-tight">
                                                    {date.toLocaleTimeString(undefined, { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit',
                                                        hour12: true,
                                                    })}
                                                    <span className="text-[10px] ml-1 opacity-40 font-bold uppercase">
                                                        {isUtc ? "UTC" : date.toLocaleTimeString(undefined, { timeZoneName: 'short' }).split(' ').pop()}
                                                    </span>
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-xs text-muted-foreground italic">No upcoming executions</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                    <List className="size-3 text-primary" />
                                    Common Schedules
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2">
                                    {PRESETS.map((preset) => (
                                        <Button
                                            key={preset.value}
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-auto py-2 px-3 justify-start text-left transition-all",
                                                cron === preset.value 
                                                    ? "border-primary bg-primary/5" 
                                                    : "hover:border-primary/30"
                                            )}
                                            onClick={() => {
                                                setCron(preset.value);
                                                sendEvent('cron_expression_parsed', { preset: preset.label });
                                            }}
                                        >
                                            <div className="space-y-0.5">
                                                <div className="text-[11px] font-bold">{preset.label}</div>
                                                <code className="text-[10px] text-muted-foreground tracking-tighter block">{preset.value}</code>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
