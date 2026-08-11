import { cache } from 'react';
import type { SystemSettings } from '@/lib/studio-defaults';
import { mergeSocialLinks } from '@/lib/social-links';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import type { ServiceItem } from '@/lib/service-types';
import { getBackendApiBase } from '@/lib/backend-url';
import { mergeSettingsFromApi } from '@/lib/settings-merge';

export interface BlogPostServer {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  publishedAt?: string;
  readTime?: string;
  tags?: string[];
  isPublished?: boolean;
}

function normalizeBlogPost(raw: Record<string, unknown>): BlogPostServer {
  const slug = String(raw.slug || raw.id || '');
  return {
    id: String(raw.id || slug),
    slug,
    title: String(raw.title || ''),
    category: String(raw.category || 'Journal'),
    author: String(raw.author || 'KSW Studio'),
    excerpt: String(raw.excerpt || ''),
    content: String(raw.content || ''),
    featuredImage: String(raw.featuredImage || raw.featured_image || ''),
    publishedAt: String(raw.publishedAt || raw.published_at || ''),
    readTime: String(raw.readTime || raw.read_time || ''),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    isPublished: raw.isPublished !== false && raw.is_published !== false,
  };
}

/** Settings SSR — cache 30 s (dedupe metadata + layout via React cache). */
export const fetchSettingsServer = cache(async (): Promise<SystemSettings> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${getBackendApiBase()}/settings`, {
      next: { revalidate: 30 },
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    if (!res.ok) return mergeSettingsFromApi(null);
    const json = await res.json();
    if (json?.data && Object.keys(json.data).length > 0) {
      return mergeSettingsFromApi(json.data);
    }
  } catch {
    // backend indisponible au build/SSR
  }
  return mergeSettingsFromApi(null);
});

export const fetchGalleriesServer = cache(async (): Promise<GalleryAdminItem[]> => {
  try {
    const res = await fetch(`${getBackendApiBase()}/galleries/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json?.data)) return json.data;
  } catch {
    // ignore
  }
  return [];
});

export const fetchServicesServer = cache(async (): Promise<ServiceItem[]> => {
  try {
    const res = await fetch(`${getBackendApiBase()}/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json?.data)) {
      return json.data.filter((s: ServiceItem) => s.isActive !== false);
    }
  } catch {
    // ignore
  }
  return [];
});

export const fetchBlogPostsServer = cache(async (): Promise<BlogPostServer[]> => {
  try {
    const res = await fetch(`${getBackendApiBase()}/blog`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json?.data)) return [];
    return json.data.map((row: Record<string, unknown>) => normalizeBlogPost(row));
  } catch {
    return [];
  }
});
