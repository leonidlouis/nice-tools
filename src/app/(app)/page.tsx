import Link from "next/link";
import { ImageDown, Video, ArrowRight, Blocks } from "lucide-react";
import GradientText from "@/components/ui/gradient-text";

export default function HomePage() {
    const tools = [
        {
            title: "Image Compressor",
            description: "Compress images in your browser.",
            href: "/image-compressor",
            icon: ImageDown,
        },
        {
            title: "Video Converter",
            description: "Convert videos to GIF, WebP, GIFV, or WebM formats.",
            href: "/video-converter",
            icon: Video,
        },
    ];

    return (
        <div className="p-6 max-w-4xl mr-auto">
            {/* Hero */}
            <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight mb-3">
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
                <p className="text-muted-foreground text-base max-w-xl leading-relaxed">
                    A curated set of carefully made, useful tools.<br />
                    Free, private, and everything runs on your device — no uploads, no accounts.<br />
                    I use minimal, 100% anonymous telemetry to keep improving.
                </p>
            </div>

            {/* Tools Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
                {tools.map((tool) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-md hover:shadow-foreground/5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                                <tool.icon className="size-5" />
                            </div>
                            <h2 className="text-base font-semibold tracking-tight">
                                {tool.title}
                            </h2>
                            <ArrowRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {tool.description}
                        </p>
                    </Link>
                ))}

                {/* Coming Soon Card */}
                <div className="relative flex flex-col gap-3 rounded-xl border border-dashed border-border/60 bg-transparent p-5 opacity-60 transition-opacity hover:opacity-100 cursor-default">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Blocks className="size-5" />
                        </div>
                        <h2 className="text-base font-semibold tracking-tight">
                            More in the works
                        </h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        I'll add more tools every now and then. Check back later for new additions!<br />
                        Have an idea? <a href="mailto:louisleonid325@gmail.com" className="underline hover:text-foreground transition-colors">Email me here.</a>
                    </p>
                    <div className="flex gap-1.5 flex-wrap mt-auto">
                        <span className="rounded-full border border-border/40 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            coming soon
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
