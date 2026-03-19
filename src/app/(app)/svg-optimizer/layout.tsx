import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SVG Nano-Optimizer | bylouis.io",
    description: "Aggressively minify SVGs while keeping visual quality. Fast, browser-based, and private.",
    keywords: ["svg optimizer", "svg minifier", "minify svg", "svgo browser"],
    alternates: {
        canonical: "/svg-optimizer",
    },
};

export default function SvgOptimizerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "SVG Optimizer",
        "description": "Aggressively minify SVGs while keeping visual quality. Fast, browser-based, and private.",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "featureList": [
            "SVGO-powered optimization",
            "Visual side-by-side comparison",
            "Configurable optimization plugins",
            "Privacy-focused, no uploads"
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
