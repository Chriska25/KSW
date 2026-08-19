'use client';

import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RevealPhotoCard, RevealPhotoImage } from '@/components/common/reveal-photo-card';
import type { BlogPost } from '@/lib/blog-api';

interface BlogArticleCardProps {
  article: BlogPost;
  index: number;
}

export function BlogArticleCard({ article, index }: BlogArticleCardProps) {
  const kenBurns = index % 3 === 0;

  return (
    <RevealPhotoCard
      index={index}
      kenBurns={kenBurns}
      withShine={false}
      className="rounded-2xl border border-border/80 bg-surface-muted/80 hover:border-primary/30 transition-colors"
    >
      <Link href={`/blog/${article.slug || article.id}`} className="block">
        <div className="aspect-[16/9] overflow-hidden relative">
          <RevealPhotoImage
            src={article.featuredImage ?? '/images/blog-placeholder.jpg'}
            alt={article.title}
          />
        </div>

        <CardHeader className="space-y-2 p-6 pb-0">
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            <span className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1 text-primary" /> {article.publishedAt}
            </span>
            <span>•</span>
            <span className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1 text-primary" /> {article.readTime || '5 min'}
            </span>
          </div>
          <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
            {article.title}
          </CardTitle>
          <CardDescription className="text-muted-foreground line-clamp-3">{article.excerpt}</CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-4">
          <span className="inline-flex items-center text-xs font-semibold text-primary group-hover:text-primary">
            Lire l&apos;Article Complet <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </CardContent>
      </Link>
    </RevealPhotoCard>
  );
}
