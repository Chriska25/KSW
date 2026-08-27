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
import { fetchBlogPostBySlug, fetchBlogComments, type BlogComment } from '@/lib/blog-api';
import { LoadingState } from '@/components/common/loading-state';
import { RevealPhotoCard, RevealPhotoImage } from '@/components/common/reveal-photo-card';
import { MarkdownContent } from '@/components/blog/markdown-content';
import { BlogCommentSection } from '@/components/blog/blog-comment-section';

export default function BlogDetailPage() {
  const params = useParams();
  const slug = String(params.slug || '');
  const [article, setArticle] = useState<Awaited<ReturnType<typeof fetchBlogPostBySlug>>>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      try {
        const [post, postComments] = await Promise.all([
          fetchBlogPostBySlug(slug),
          fetchBlogComments(slug).catch(() => []),
        ]);
        if (!post) {
          setNotFound(true);
        } else {
          setArticle(post);
          setComments(postComments);
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
      <div className="pt-8 sm:pt-12 pb-20">
        <LoadingState message="Chargement de l'article…" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="pt-32 pb-20 max-w-4xl mx-auto px-4 text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Article introuvable</h1>
        <Link href="/blog">
          <Button variant="outline">Retour au journal</Button>
        </Link>
      </div>
    );
  }

  const body = article.content || article.excerpt || '';

  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      <Link href="/blog">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour aux articles
        </Button>
      </Link>

      <div className="space-y-4">
        <Badge variant="primary">{article.category}</Badge>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-b border-border pb-6">
          <span className="flex items-center text-foreground font-medium">
            <User className="h-4 w-4 mr-1.5 text-primary" /> {article.author}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Calendar className="h-4 w-4 mr-1.5 text-primary" /> {article.publishedAt}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1.5 text-primary" /> {article.readTime || '5 min'}
          </span>
        </div>
      </div>

      {article.featuredImage && (
        <RevealPhotoCard kenBurns withShine={false} className="aspect-[16/9] rounded-3xl border border-border">
          <RevealPhotoImage src={article.featuredImage} alt={article.title} />
        </RevealPhotoCard>
      )}

      {article.contentFormat === 'plain' ? (
        <div className="prose prose-invert max-w-none text-foreground leading-relaxed text-base space-y-6">
          {body
            .split('\n\n')
            .filter(Boolean)
            .map((paragraph, idx) => (
              <p key={idx}>{paragraph.trim()}</p>
            ))}
        </div>
      ) : (
        <MarkdownContent content={body} />
      )}

      {(article.tags || []).length > 0 && (
        <div className="flex items-center space-x-2 pt-4 border-t border-border">
          <Tag className="h-4 w-4 text-primary shrink-0" />
          <div className="flex flex-wrap gap-2">
            {(article.tags || []).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <BlogCommentSection slug={slug} initialComments={comments} />
    </div>
  );
}
