import apiClient from '@/lib/api-client';

export type BlogCommentStatus = 'pending' | 'approved' | 'rejected';

export interface AdminBlogComment {
  id: string;
  postId: string;
  postSlug?: string;
  postTitle?: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: BlogCommentStatus;
  createdAt: string;
}

function normalizeComment(raw: Record<string, unknown>): AdminBlogComment {
  return {
    id: String(raw.id || ''),
    postId: String(raw.postId || ''),
    postSlug: raw.postSlug ? String(raw.postSlug) : undefined,
    postTitle: raw.postTitle ? String(raw.postTitle) : undefined,
    authorName: String(raw.authorName || ''),
    authorEmail: String(raw.authorEmail || ''),
    content: String(raw.content || ''),
    status: (String(raw.status || 'pending') as BlogCommentStatus) || 'pending',
    createdAt: String(raw.createdAt || ''),
  };
}

export async function fetchAdminBlogComments(): Promise<AdminBlogComment[]> {
  const res = await apiClient.get(`/admin/blog/comments?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map((row: Record<string, unknown>) => normalizeComment(row));
}

export async function moderateBlogComment(
  id: string,
  status: BlogCommentStatus
): Promise<AdminBlogComment> {
  const res = await apiClient.patch(`/admin/blog/comments/${encodeURIComponent(id)}`, { status });
  return normalizeComment(res.data?.data || {});
}

export async function deleteBlogComment(id: string): Promise<void> {
  await apiClient.delete(`/admin/blog/comments/${encodeURIComponent(id)}`);
}
