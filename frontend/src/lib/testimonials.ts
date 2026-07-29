import apiClient from '@/lib/api-client';

export interface TestimonialItem {
  id: string;
  clientName: string;
  clientRole: string;
  rating: number;
  content: string;
  avatarUrl: string;
  isPublished: boolean;
  createdAt: string;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop';

export async function submitTestimonial(input: {
  clientName: string;
  clientRole: string;
  rating: number;
  content: string;
}): Promise<TestimonialItem> {
  const res = await apiClient.post('/testimonials', {
    client_name: input.clientName.trim(),
    client_role: input.clientRole.trim() || 'Client Studio',
    rating: input.rating,
    content: input.content.trim(),
    avatar_url: DEFAULT_AVATAR,
    is_published: false,
  });

  const data = res.data?.data;
  if (data?.clientName || data?.client_name) {
    return normalizeTestimonial(data);
  }

  return {
    id: String(Date.now()),
    clientName: input.clientName,
    clientRole: input.clientRole,
    rating: input.rating,
    content: input.content,
    avatarUrl: DEFAULT_AVATAR,
    isPublished: false,
    createdAt: new Date().toLocaleDateString('fr-FR'),
  };
}

export async function fetchAdminTestimonials(): Promise<TestimonialItem[]> {
  const res = await apiClient.get(`/admin/testimonials?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map(normalizeTestimonial);
}

function normalizeTestimonial(raw: Record<string, unknown>): TestimonialItem {
  return {
    id: String(raw.id ?? Date.now()),
    clientName: String(raw.clientName ?? raw.client_name ?? 'Client'),
    clientRole: String(raw.clientRole ?? raw.client_role ?? 'Client Studio'),
    rating: Number(raw.rating ?? 5),
    content: String(raw.content ?? ''),
    avatarUrl: String(raw.avatarUrl ?? raw.avatar_url ?? DEFAULT_AVATAR),
    isPublished: Boolean(raw.isPublished ?? raw.is_published ?? false),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
  };
}
