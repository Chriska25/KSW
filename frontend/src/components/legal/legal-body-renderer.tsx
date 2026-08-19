'use client';

import React from 'react';
import Link from 'next/link';
import { applyLegalTemplate, type LegalTemplateVars } from '@/lib/legal-page-content';

const INTERNAL_LINK_RE = /\(\/(legal|privacy|contact)\)/g;
const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const URL_RE = /(https?:\/\/[^\s)]+)/g;

function renderInlineText(text: string, vars: LegalTemplateVars): React.ReactNode[] {
  const resolved = applyLegalTemplate(text, vars);
  const parts: React.ReactNode[] = [];
  let remaining = resolved;
  let key = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(INTERNAL_LINK_RE);
    const emailMatch = remaining.match(EMAIL_RE);
    const urlMatch = remaining.match(URL_RE);

    type MatchKind = 'link' | 'email' | 'url';
    let kind: MatchKind | null = null;
    let matchText = '';
    let matchIndex = remaining.length;

    if (linkMatch && linkMatch.index !== undefined && linkMatch.index < matchIndex) {
      kind = 'link';
      matchText = linkMatch[0];
      matchIndex = linkMatch.index;
    }
    const emailTry = remaining.match(EMAIL_RE);
    if (emailTry && emailTry.index !== undefined && emailTry.index < matchIndex) {
      kind = 'email';
      matchText = emailTry[0];
      matchIndex = emailTry.index;
    }
    const urlTry = remaining.match(URL_RE);
    if (urlTry && urlTry.index !== undefined && urlTry.index < matchIndex) {
      kind = 'url';
      matchText = urlTry[0];
      matchIndex = urlTry.index;
    }

    if (!kind) {
      parts.push(remaining);
      break;
    }

    if (matchIndex > 0) {
      parts.push(remaining.slice(0, matchIndex));
    }

    if (kind === 'link') {
      const path = matchText.slice(1, -1);
      const label =
        path === '/legal' ? 'Mentions légales' : path === '/privacy' ? 'Politique de confidentialité' : 'Contact';
      parts.push(
        <Link key={`link-${key++}`} href={path} className="text-primary hover:underline">
          {label}
        </Link>
      );
    } else if (kind === 'email') {
      parts.push(
        <a key={`mail-${key++}`} href={`mailto:${matchText}`} className="text-primary hover:underline">
          {matchText}
        </a>
      );
    } else {
      parts.push(
        <a
          key={`url-${key++}`}
          href={matchText}
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {matchText.replace(/^https?:\/\//, '')}
        </a>
      );
    }

    remaining = remaining.slice(matchIndex + matchText.length);
  }

  return parts;
}

function renderBlock(block: string, vars: LegalTemplateVars): React.ReactNode {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const isList = lines.length > 0 && lines.every((line) => line.startsWith('- '));

  if (isList) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {lines.map((line, i) => (
          <li key={i}>{renderInlineText(line.replace(/^-+\s*/, ''), vars)}</li>
        ))}
      </ul>
    );
  }

  return <p>{renderInlineText(lines.join(' '), vars)}</p>;
}

export function LegalBodyRenderer({ body, vars }: { body: string; vars: LegalTemplateVars }) {
  const blocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((block, index) => (
        <React.Fragment key={index}>{renderBlock(block, vars)}</React.Fragment>
      ))}
    </>
  );
}
