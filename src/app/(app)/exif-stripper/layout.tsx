import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Free Private EXIF & Metadata Stripper | bylouis.io",
    description: "Remove sensitive EXIF data, GPS coordinates, and camera info from your images directly in your browser. 100% private, no uploads.",
    keywords: ["private exif stripper", "browser-based metadata removal", "bulk exif cleaner", "image privacy tool"],
    alternates: {
        canonical: "/exif-stripper",
    },
};

export default function ExifStripperLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "EXIF & Metadata Stripper",
        "description": "Remove sensitive EXIF data, GPS coordinates, and camera info from your images directly in your browser. 100% private, no uploads.",
        "applicationCategory": "PrivacyApplication",
        "operatingSystem": "Any",
        "featureList": [
            "Bulk metadata stripping",
            "Browser-based local processing",
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
