import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Bulk UUID v4 & v7 Generator | bylouis.io",
    description: "Generate UUID v4 and the new v7 (time-ordered) identifiers in bulk. Fast, browser-based, and private.",
    keywords: ["uuid v7 generator", "bulk uuid creator", "random uuid v4"],
    alternates: {
        canonical: "/uuid-generator",
    },
};

export default function UuidGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "UUID Generator",
        "description": "Generate UUID v4 and the new v7 (time-ordered) identifiers in bulk. Fast, browser-based, and private.",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "featureList": [
            "Bulk UUID generation",
            "Support for UUID v4 and v7",
            "Privacy-focused, local processing",
            "Download results as TXT"
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
