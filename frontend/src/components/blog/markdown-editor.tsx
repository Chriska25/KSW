'use client';

import React, { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Quote,
  Eye,
  PenLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownContent } from '@/components/blog/markdown-content';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const replacement = `${before}${selected || 'texte'}${after}`;
  const next = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
  return { next, cursor: start + before.length + (selected || 'texte').length + after.length };
}

function insertLinePrefix(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
  const next =
    textarea.value.slice(0, lineStart) + prefix + textarea.value.slice(lineStart);
  return { next, cursor: start + prefix.length };
}

export function MarkdownEditor({
  value,
  onChange,
  rows = 10,
  placeholder,
  required,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyTransform = (fn: (el: HTMLTextAreaElement) => { next: string; cursor: number }) => {
    const el = textareaRef.current;
    if (!el) return;
    const { next, cursor } = fn(el);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const toolbar = [
    {
      icon: Bold,
      label: 'Gras',
      action: () => applyTransform((el) => wrapSelection(el, '**', '**')),
    },
    {
      icon: Italic,
      label: 'Italique',
      action: () => applyTransform((el) => wrapSelection(el, '_', '_')),
    },
    {
      icon: Heading2,
      label: 'Titre',
      action: () => applyTransform((el) => insertLinePrefix(el, '## ')),
    },
    {
      icon: List,
      label: 'Liste',
      action: () => applyTransform((el) => insertLinePrefix(el, '- ')),
    },
    {
      icon: ListOrdered,
      label: 'Liste numérotée',
      action: () => applyTransform((el) => insertLinePrefix(el, '1. ')),
    },
    {
      icon: Link2,
      label: 'Lien',
      action: () => applyTransform((el) => wrapSelection(el, '[', '](https://)')),
    },
    {
      icon: Quote,
      label: 'Citation',
      action: () => applyTransform((el) => insertLinePrefix(el, '> ')),
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-border rounded-lg bg-surface-muted p-2">
        <div className="flex flex-wrap items-center gap-1">
          {toolbar.map(({ icon: Icon, label, action }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={action}
              title={label}
              aria-label={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={mode === 'write' ? 'primary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setMode('write')}
          >
            <PenLine className="h-3.5 w-3.5 mr-1" />
            Écrire
          </Button>
          <Button
            type="button"
            variant={mode === 'preview' ? 'primary' : 'ghost'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setMode('preview')}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Aperçu
          </Button>
        </div>
      </div>

      {mode === 'write' ? (
        <Textarea
          ref={textareaRef}
          required={required}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm min-h-[220px]"
        />
      ) : (
        <div className="min-h-[220px] rounded-lg border border-border bg-surface-muted p-4">
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-muted-foreground italic">Rien à prévisualiser pour l&apos;instant.</p>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Markdown supporté : **gras**, _italique_, ## titres, listes, [liens](url), &gt; citations
      </p>
    </div>
  );
}
