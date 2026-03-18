import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Secure Password Generator | bylouis.io",
    description: "Generate strong, secure passwords with custom settings. Completely local, no data leaves your device.",
    keywords: ["secure password generator", "high complexity passwords", "offline password creator"],
    alternates: {
        canonical: "/password-generator",
    },
};

export default function PasswordGeneratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Password Generator",
        "description": "Generate strong, secure passwords with custom settings. Completely local, no data leaves your device.",
        "applicationCategory": "SecurityApplication",
        "operatingSystem": "Any",
        "featureList": [
            "Secure entropy-based generation",
            "Browser-based, 100% private",
            "Customizable complexity settings",
            "Password strength indicator"
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
