import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://tools.bylouis.io';
    const lastModified = new Date();

    const routes = [
        '',
        '/image-compressor',
        '/video-converter',
        '/password-generator',
        '/uuid-generator',
    ];

    return routes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: route === '' ? 1 : 0.8,
    }));
}
