import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Developer Unit Converter | bylouis.io",
    description: "Fast conversion for PX, REM, EM, VW, Colors, and Data Sizes. Private and local.",
    keywords: ["unit converter", "px to rem", "hex to rgb", "data size converter", "developer tools"],
    alternates: {
        canonical: "/unit-converter",
    },
};

export default function UnitConverterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Unit Converter",
        "description": "Fast conversion for PX, REM, EM, VW, Colors, and Data Sizes. Private and local.",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Any",
        "featureList": [
            "Typography unit conversion (PX, REM, EM, VW)",
            "Color space conversion (HEX, RGB, HSL)",
            "Data size conversion (Bits, Bytes, KiB, MiB, GiB)",
            "Bidirectional sync"
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
