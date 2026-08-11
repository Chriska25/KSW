import apiClient from '@/lib/api-client';

export interface PublicFaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export async function fetchPublicFaq(): Promise<PublicFaqItem[]> {
  const res = await apiClient.get(`/faq?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map((row: Record<string, unknown>, idx: number) => ({
    id: String(row.id || `faq-${idx}`),
    question: String(row.question || ''),
    answer: String(row.answer || ''),
    order: Number(row.order ?? idx),
  }));
}
