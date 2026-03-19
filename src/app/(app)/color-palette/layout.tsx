import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Accessibility-First Color Palette Generator | bylouis.io",
    description: "Generate accessible color palettes with WCAG AA/AAA contrast checks. Hex, RGB, and Tailwind export.",
    keywords: ["color palette generator", "accessible colors", "wcag contrast checker", "tailwind color generator"],
    alternates: {
        canonical: "/color-palette",
    },
};

export default function ColorPaletteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Color Palette Generator",
        "description": "Generate accessible color palettes with WCAG AA/AAA contrast checks. Hex, RGB, and Tailwind export.",
        "applicationCategory": "DesignApplication",
        "operatingSystem": "Any",
        "featureList": [
            "WCAG AA/AAA compliance checks",
            "Monochromatic, Analogous, Triadic generators",
            "Tailwind CSS configuration export",
            "Privacy-focused, local processing"
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
