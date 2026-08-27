'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  if (!content?.trim()) return null;

  return (
    <div
      className={`prose prose-invert max-w-none text-foreground leading-relaxed text-base ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{children}</h2>
          ),
          h2: ({ children }) => (
            <h3 className="text-xl font-bold text-foreground mt-6 mb-3">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h4>
          ),
          p: ({ children }) => <p className="text-foreground/90 mb-4">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1 text-foreground/90">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1 text-foreground/90">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4">
              {children}
            </blockquote>
          ),
          code: ({ className: codeClass, children }) => {
            const isBlock = codeClass?.includes('language-');
            if (isBlock) {
              return (
                <code className="block bg-surface-muted border border-border rounded-lg p-4 text-sm overflow-x-auto my-4">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-surface-muted px-1.5 py-0.5 rounded text-sm text-primary">
                {children}
              </code>
            );
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={alt || ''} className="rounded-xl border border-border my-4 w-full" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
