import { fetchBlogPostsServer, fetchSettingsServer } from '@/lib/server-fetch';
import { BlogPageContent } from '@/app/(public)/blog/blog-page-content';

export const revalidate = 60;

export default async function BlogPage() {
  const [articles, settings] = await Promise.all([fetchBlogPostsServer(), fetchSettingsServer()]);
  const studioName = `${settings.studioNameFirstPart} ${settings.studioNameSecondPart}`.trim() || 'KSW Studio';

  return <BlogPageContent articles={articles} studioName={studioName} />;
}
