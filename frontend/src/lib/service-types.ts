export interface ServiceItem {
  id: string;
  title: string;
  category: string;
  price: number;
  depositPercentage: number;
  durationMinutes: number;
  photosCount: number;
  coverImage: string;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
}
