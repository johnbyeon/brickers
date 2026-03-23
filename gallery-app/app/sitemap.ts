import { MetadataRoute } from 'next';

type GalleryItem = {
    id: string;
    title: string;
    updatedAt?: string;
    createdAt: string;
}

type PageResponse<T> = {
    content: T[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const apiBase = process.env.API_BASE || 'http://backend:8080';
    const baseUrl = 'https://brickers.shop/gallery'; // 공개 접근용 기본 URL

    try {
        // 사이트맵용으로 최대 500개 항목 조회
        const res = await fetch(`${apiBase}/api/gallery?size=500&sort=latest`, {
            next: { revalidate: 3600 } // 1시간마다 재검증
        });

        if (!res.ok) {
            console.error('Failed to fetch gallery for sitemap');
            return [];
        }

        const data: PageResponse<GalleryItem> = await res.json();

        const items = data.content.map((item) => {
            // slug 생성 로직은 page.tsx와 일치해야 함
            const safeTitle = item.title.replace(/\s+/g, '-').replace(/[^\w\-\uAC00-\uD7A3]/g, '');
            const slug = `${safeTitle}-${item.id}`;

            return {
                url: `${baseUrl}/${slug}`,
                lastModified: new Date(item.updatedAt || item.createdAt),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            };
        });

        return [
            {
                url: 'https://brickers.shop/',
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1.0,
            },
            {
                url: 'https://brickers.shop/mypage',
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.5,
            },
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            },
            ...items,
        ];

    } catch (e) {
        console.error('Sitemap generation error:', e);
        // 빌드 중 오류가 발생해도 최소한의 사이트맵은 반환
        return [
            {
                url: 'https://brickers.shop/',
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 1.0,
            },
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'daily',
                priority: 0.9,
            },
        ];
    }
}
