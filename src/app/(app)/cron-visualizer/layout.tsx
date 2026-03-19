import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Interactive Cron Visualizer & Generator | bylouis.io",
    description: "Build and understand crontab expressions visually. Human-readable descriptions and next execution times.",
    keywords: ["cron visualizer", "cron generator", "crontab helper", "cron schedule"],
    alternates: {
        canonical: "/cron-visualizer",
    },
};

export default function CronVisualizerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Cron Visualizer",
        "description": "Build and understand crontab expressions visually. Human-readable descriptions and next execution times.",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "featureList": [
            "Human-readable cron descriptions",
            "Next execution time calculator",
            "Interactive cron builder",
            "Common cron presets"
        ],
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "author": {
            "@type": "Person",
            "name": "Louis"
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}
