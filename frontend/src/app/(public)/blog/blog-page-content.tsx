'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { BlogPost } from '@/lib/blog-api';
import { BlogArticleCard } from '@/components/blog/blog-article-card';

export function BlogPageContent({
  articles,
  studioName,
}: {
  articles: BlogPost[];
  studioName: string;
}) {
  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="gold">Journal & Inspirations</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Conseils & <span className="gold-gradient-text">Coulisses du Studio</span>
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Inspirations pour votre mariage, astuces de pose et guides pratiques par {studioName}.
        </p>
      </div>

      {articles.length === 0 ? (
        <p className="text-center text-zinc-500 text-sm">Aucun article publié pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {articles.map((art, index) => (
            <BlogArticleCard key={art.id} article={art} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
