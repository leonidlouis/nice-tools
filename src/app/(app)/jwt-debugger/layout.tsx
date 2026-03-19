import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Local JWT Debugger & Visualizer | bylouis.io",
    description: "Decode and analyze JSON Web Tokens locally in your browser. Fast, secure, and zero-upload.",
    keywords: ["jwt debugger", "jwt visualizer", "decode jwt", "local jwt analysis"],
    alternates: {
        canonical: "/jwt-debugger",
    },
};

export default function JwtDebuggerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "JWT Debugger",
        "description": "Decode and analyze JSON Web Tokens locally in your browser. Fast, secure, and zero-upload.",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "featureList": [
            "Live JWT decoding",
            "Human-readable timestamps",
            "Privacy-focused, no uploads",
            "Header and Payload visualization"
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
