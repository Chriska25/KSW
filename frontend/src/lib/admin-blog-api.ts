import apiClient from '@/lib/api-client';

export interface AdminBlogPost {
  id: string;
  slug?: string;
  title: string;
  category: string;
  author: string;
  isPublished: boolean;
  publishedAt: string;
  commentsCount: number;
  featuredImage: string;
  excerpt?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  readTime?: string;
  tags?: string[];
}

function normalizeAdminPost(raw: Record<string, unknown>): AdminBlogPost {
  return {
    id: String(raw.id || Date.now()),
    slug: raw.slug ? String(raw.slug) : undefined,
    title: String(raw.title || ''),
    category: String(raw.category || 'Journal'),
    author: String(raw.author || 'KSW Studio'),
    isPublished: raw.isPublished !== false,
    publishedAt: String(raw.publishedAt || ''),
    commentsCount: Number(raw.commentsCount || 0),
    featuredImage: String(raw.featuredImage || raw.featured_image || ''),
    excerpt: String(raw.excerpt || ''),
    content: String(raw.content || ''),
    seoTitle: raw.seoTitle ? String(raw.seoTitle) : undefined,
    seoDescription: raw.seoDescription ? String(raw.seoDescription) : undefined,
    readTime: raw.readTime ? String(raw.readTime) : undefined,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
  };
}

export async function fetchAdminBlogPosts(): Promise<AdminBlogPost[]> {
  const res = await apiClient.get(`/admin/blog?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map((row: Record<string, unknown>) => normalizeAdminPost(row));
}

export async function saveAllBlogPosts(posts: AdminBlogPost[]): Promise<AdminBlogPost[]> {
  const res = await apiClient.post('/admin/blog/save-all', { posts });
  if (Array.isArray(res.data?.data)) {
    return res.data.data.map((row: Record<string, unknown>) => normalizeAdminPost(row));
  }
  return posts;
}
