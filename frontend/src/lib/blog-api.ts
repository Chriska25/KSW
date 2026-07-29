import apiClient from '@/lib/api-client';

export interface BlogPost {
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

export async function fetchPublicBlogPosts(): Promise<BlogPost[]> {
  const res = await apiClient.get(`/blog?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map(normalizePost);
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const res = await apiClient.get(`/blog/${encodeURIComponent(slug)}?t=${Date.now()}`);
  if (!res.data?.data) return null;
  return normalizePost(res.data.data);
}

function normalizePost(raw: Record<string, unknown>): BlogPost {
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
    readTime: String(raw.readTime || '5 min'),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    isPublished: raw.isPublished !== false,
  };
}
