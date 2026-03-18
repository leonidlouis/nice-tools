import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Free Private Image Compressor | bylouis.io",
    description: "Compress JPEG, PNG, and WebP images directly in your browser. No uploads, 100% private and fast.",
    keywords: ["private image compressor", "browser-based image compression", "bulk image optimizer"],
    alternates: {
        canonical: "/image-compressor",
    },
};

export default function ImageCompressorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Image Compressor",
        "description": "Compress JPEG, PNG, and WebP images directly in your browser. No uploads, 100% private and fast.",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Any",
        "featureList": [
            "Bulk image compression",
            "Browser-based processing",
            "Privacy-focused, no uploads",
            "Support for JPEG, PNG, and WebP"
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
