import apiClient from '@/lib/api-client';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
}

function normalizeFaqItem(raw: Record<string, unknown>, index: number): FaqItem {
  return {
    id: String(raw.id || `faq-${index}`),
    question: String(raw.question || ''),
    answer: String(raw.answer || ''),
    order: Number(raw.order ?? index),
    isPublished: raw.isPublished !== false,
  };
}

export async function fetchAdminFaqItems(): Promise<FaqItem[]> {
  const res = await apiClient.get(`/admin/faq?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map((row: Record<string, unknown>, idx: number) => normalizeFaqItem(row, idx));
}

export async function saveAllFaqItems(items: FaqItem[]): Promise<FaqItem[]> {
  const res = await apiClient.post('/admin/faq/save-all', { items });
  if (Array.isArray(res.data?.data)) {
    return res.data.data.map((row: Record<string, unknown>, idx: number) => normalizeFaqItem(row, idx));
  }
  return items;
}
