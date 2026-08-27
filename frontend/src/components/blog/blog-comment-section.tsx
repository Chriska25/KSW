'use client';

import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { submitBlogComment, type BlogComment } from '@/lib/blog-api';
import { getApiErrorMessage } from '@/lib/api-error';

interface BlogCommentSectionProps {
  slug: string;
  initialComments?: BlogComment[];
}

export function BlogCommentSection({ slug, initialComments = [] }: BlogCommentSectionProps) {
  const [comments, setComments] = useState<BlogComment[]>(initialComments);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const msg = await submitBlogComment(slug, { authorName, authorEmail, content });
      setMessage(msg);
      setContent('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Envoi impossible.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pt-8 border-t border-border space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Commentaires {comments.length > 0 && `(${comments.length})`}
      </h2>

      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="p-4 rounded-xl border border-border bg-surface-muted/50"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-foreground text-sm">{comment.authorName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {comment.createdAt
                    ? new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : ''}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
            </article>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl border border-border bg-surface-muted/30">
        <h3 className="text-sm font-semibold text-foreground">Laisser un commentaire</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            required
            placeholder="Votre nom"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          <Input
            required
            type="email"
            placeholder="Votre email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
          />
        </div>
        <Textarea
          required
          rows={4}
          placeholder="Votre message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {message && <p className="text-xs text-success">{message}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" variant="primary" size="sm" disabled={submitting} className="space-x-2">
          <Send className="h-4 w-4" />
          <span>{submitting ? 'Envoi…' : 'Publier (modération)'}</span>
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Votre commentaire sera visible après validation par l&apos;équipe.
        </p>
      </form>
    </section>
  );
}
