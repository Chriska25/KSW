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
  contentFormat?: 'markdown' | 'plain';
}

export type AdminBlogPostInput = Omit<AdminBlogPost, 'id' | 'commentsCount' | 'publishedAt'> & {
  id?: string;
  commentsCount?: number;
  publishedAt?: string;
};

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
    contentFormat: raw.contentFormat === 'plain' ? 'plain' : 'markdown',
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

export async function createBlogPost(input: AdminBlogPostInput): Promise<AdminBlogPost> {
  const res = await apiClient.post('/admin/blog', input);
  return normalizeAdminPost(res.data?.data || {});
}

export async function updateBlogPost(id: string, input: Partial<AdminBlogPostInput>): Promise<AdminBlogPost> {
  const res = await apiClient.put(`/admin/blog/${encodeURIComponent(id)}`, input);
  return normalizeAdminPost(res.data?.data || {});
}

export async function deleteBlogPost(id: string): Promise<void> {
  await apiClient.delete(`/admin/blog/${encodeURIComponent(id)}`);
}

export async function duplicateBlogPost(post: AdminBlogPost): Promise<AdminBlogPost> {
  return createBlogPost({
    title: `${post.title} (copie)`,
    category: post.category,
    author: post.author,
    excerpt: post.excerpt,
    content: post.content,
    featuredImage: post.featuredImage,
    isPublished: false,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    readTime: post.readTime,
    tags: post.tags,
  });
}
