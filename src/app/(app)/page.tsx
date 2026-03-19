import Link from "next/link";
import { ImageDown, Video, ArrowRight, Blocks, KeyRound, Fingerprint, ShieldCheck, Clock, Zap, Palette, ShieldOff, Ruler } from "lucide-react";
import GradientText from "@/components/ui/gradient-text";

export default function HomePage() {
    const toolGroups = [
        {
            name: "Media",
            tools: [
                {
                    title: "Image Compressor",
                    description: "Compress images in your browser.",
                    href: "/image-compressor",
                    icon: ImageDown,
                },
                {
                    title: "Video Converter",
                    description: "Convert videos to WebM, WebP, GIFV, or GIF formats.",
                    href: "/video-converter",
                    icon: Video,
                },
                /* {
                    title: "SVG Optimizer",
                    description: "Aggressively minify SVGs while keeping visual quality.",
                    href: "/svg-optimizer",
                    icon: Zap,
                },
                {
                    title: "EXIF Stripper",
                    description: "Surgically strip sensitive metadata from your images.",
                    href: "/exif-stripper",
                    icon: ShieldOff,
                },
                {
                    title: "Color Palette",
                    description: "Accessibility-first palette generator with contrast checking.",
                    href: "/color-palette",
                    icon: Palette,
                }, */
            ]
        },
        {
            name: "Misc",
            tools: [
                {
                    title: "Password Generator",
                    description: "Generate secure, high-entropy passwords.",
                    href: "/password-generator",
                    icon: KeyRound,
                },
            ]
        },
        {
            name: "Devtools",
            tools: [
                {
                    title: "Cron Visualizer",
                    description: "Build and understand crontab expressions visually.",
                    href: "/cron-visualizer",
                    icon: Clock,
                },
                /* {
                    title: "Unit Converter",
                    description: "Fast, multi-directional converter for dev-specific units.",
                    href: "/unit-converter",
                    icon: Ruler,
                },
                {
                    title: "JWT Debugger",
                    description: "Decode and analyze JSON Web Tokens locally.",
                    href: "/jwt-debugger",
                    icon: ShieldCheck,
                }, */
                {
                    title: "UUID Generator",
                    description: "Generate v4 and v7 UUIDs in bulk.",
                    href: "/uuid-generator",
                    icon: Fingerprint,
                },
            ]
        }
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-10 w-full animate-in fade-in duration-500">
            {/* Hero */}
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                    <span>pleasant to use tools,&nbsp;</span>
                    <a href="https://bylouis.io" target="_blank" rel="noopener noreferrer">
                        <GradientText
                            colors={["#6366f1", "#a855f7", "#ec4899", "#a855f7", "#6366f1"]}
                            animationSpeed={6}
                            className="inline-flex"
                        >
                            bylouis.io
                        </GradientText>
                    </a>
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed">
                    A curated set of carefully made, useful tools.<br />
                    Free, private, and everything runs on your device — no uploads, no accounts.<br />
                    I use minimal, 100% anonymous telemetry to keep improving.
                </p>
            </div>

            {/* Tools Grid */}
            <div className="space-y-10">
                {toolGroups.map((group) => (
                    <div key={group.name} className="space-y-4">
                        <h2 className="text-xl font-semibold tracking-tight">{group.name}</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {group.tools.map((tool) => (
                                <Link
                                    key={tool.href}
                                    href={tool.href}
                                    className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-md hover:shadow-foreground/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                                            <tool.icon className="size-5" />
                                        </div>
                                        <h3 className="text-base font-semibold tracking-tight">
                                            {tool.title}
                                        </h3>
                                        <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {tool.description}
                                    </p>
                                </Link>
                            ))}
                            {group.name === "Devtools" && (
                                <div className="group relative flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-transparent p-5 opacity-60 transition-opacity hover:opacity-100 cursor-default">
                                    {/* Coming Soon Card */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                            <Blocks className="size-5" />
                                        </div>
                                        <h3 className="text-base font-semibold tracking-tight">
                                            More in the works
                                        </h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        New tools added regularly. Have an idea? <a href="mailto:louisleonid325@gmail.com" className="underline hover:text-foreground transition-colors">Email me.</a>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
