'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { fetchPublicBlogPosts, type BlogPost } from '@/lib/blog-api';
import { LoadingState } from '@/components/common/loading-state';

export default function BlogPage() {
  const { settings } = useSettings();
  const [articles, setArticles] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const posts = await fetchPublicBlogPosts();
        setArticles(posts);
      } catch (e) {
        console.error('Erreur chargement blog public:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="gold">Journal & Inspirations</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Conseils & <span className="gold-gradient-text">Coulisses du Studio</span>
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Inspirations pour votre mariage, astuces de pose et guides pratiques par {settings.studioName}.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Chargement des articles…" />
      ) : articles.length === 0 ? (
        <p className="text-center text-zinc-500 text-sm">Aucun article publié pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {articles.map((art) => (
            <Card key={art.id} className="glass-panel overflow-hidden group hover:border-amber-400/50">
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={art.featuredImage}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <CardHeader className="space-y-2">
                <div className="flex items-center space-x-3 text-xs text-zinc-400">
                  <span className="flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1 text-amber-400" /> {art.publishedAt}
                  </span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Clock className="h-3.5 w-3.5 mr-1 text-amber-400" /> {art.readTime || '5 min'}
                  </span>
                </div>
                <CardTitle className="text-xl font-bold group-hover:text-amber-400 transition-colors">
                  {art.title}
                </CardTitle>
                <CardDescription className="text-zinc-400">{art.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/blog/${art.slug || art.id}`}>
                  <span className="inline-flex items-center text-xs font-semibold text-amber-400 hover:text-amber-300">
                    Lire l&apos;Article Complet <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
