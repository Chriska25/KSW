'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchBlogPostBySlug } from '@/lib/blog-api';
import { LoadingState } from '@/components/common/loading-state';

export default function BlogDetailPage() {
  const params = useParams();
  const slug = String(params.slug || '');
  const [article, setArticle] = useState<Awaited<ReturnType<typeof fetchBlogPostBySlug>>>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      try {
        const post = await fetchBlogPostBySlug(slug);
        if (!post) {
          setNotFound(true);
        } else {
          setArticle(post);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-20">
        <LoadingState message="Chargement de l'article…" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">Article introuvable</h1>
        <Link href="/blog">
          <Button variant="outline">Retour au journal</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <Link href="/blog">
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux articles
        </Button>
      </Link>

      <div className="space-y-4">
        <Badge variant="gold">{article.category}</Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 border-b border-zinc-800 pb-6">
          <span className="flex items-center text-white font-medium">
            <User className="h-4 w-4 mr-1.5 text-amber-400" /> {article.author}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Calendar className="h-4 w-4 mr-1.5 text-amber-400" /> {article.publishedAt}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1.5 text-amber-400" /> {article.readTime || '5 min'}
          </span>
        </div>
      </div>

      {article.featuredImage && (
        <div className="aspect-[16/9] rounded-3xl overflow-hidden glass-panel border-zinc-800">
          <img src={article.featuredImage} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-base space-y-6">
        {(article.content || article.excerpt || '')
          .split('\n\n')
          .filter(Boolean)
          .map((paragraph, idx) => (
            <p key={idx}>{paragraph.trim()}</p>
          ))}
      </div>

      {(article.tags || []).length > 0 && (
        <div className="flex items-center space-x-2 pt-4 border-t border-zinc-800">
          <Tag className="h-4 w-4 text-amber-400 shrink-0" />
          <div className="flex flex-wrap gap-2">
            {(article.tags || []).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
