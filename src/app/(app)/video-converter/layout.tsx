import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Online Video to WebM/GIF/GIFV Converter | bylouis.io",
    description: "Convert videos to WebM, WebP, GIF, or GIFV in your browser. Fast, private, and no file uploads required.",
    keywords: ["browser video converter", "mp4 to webm", "mp4 to gif", "private video conversion"],
    alternates: {
        canonical: "/video-converter",
    },
};

export default function VideoConverterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Video Converter",
        "description": "Convert videos to WebM, WebP, GIF, or GIFV in your browser. Fast, private, and no file uploads required.",
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Any",
        "featureList": [
            "In-browser video conversion",
            "Privacy-focused, no uploads",
            "Convert to WebM, WebP, GIF, or GIFV",
            "Multi-threaded processing"
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
