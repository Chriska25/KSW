import apiClient from '@/lib/api-client';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  excerpt?: string;
  content?: string;
  contentFormat?: 'markdown' | 'plain';
  featuredImage?: string;
  publishedAt?: string;
  readTime?: string;
  tags?: string[];
  isPublished?: boolean;
  commentsCount?: number;
}

export interface BlogComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
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
    commentsCount: Number(raw.commentsCount || 0),
    contentFormat: raw.contentFormat === 'plain' ? 'plain' : 'markdown',
  };
}

export async function fetchBlogComments(slug: string): Promise<BlogComment[]> {
  const res = await apiClient.get(`/blog/${encodeURIComponent(slug)}/comments?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map((raw: Record<string, unknown>) => ({
    id: String(raw.id || ''),
    authorName: String(raw.authorName || ''),
    content: String(raw.content || ''),
    createdAt: String(raw.createdAt || ''),
  }));
}

export async function submitBlogComment(
  slug: string,
  payload: { authorName: string; authorEmail: string; content: string }
): Promise<string> {
  const res = await apiClient.post(`/blog/${encodeURIComponent(slug)}/comments`, payload);
  return String(res.data?.message || 'Commentaire envoyé.');
}
