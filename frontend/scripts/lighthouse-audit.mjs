#!/usr/bin/env node
/**
 * Audit Lighthouse des pages publiques clés.
 * Usage: node scripts/lighthouse-audit.mjs [baseUrl]
 * Prérequis: serveur Next.js déjà lancé (npm run dev ou npm start)
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/portfolio', name: 'portfolio' },
  { path: '/contact', name: 'contact' },
  { path: '/prestations', name: 'prestations' },
  { path: '/blog', name: 'blog' },
];

const outDir = path.join(__dirname, '../.lighthouse');

function runLighthouse(url, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      'lighthouse',
      url,
      '--quiet',
      '--chrome-flags=--headless --no-sandbox --disable-gpu',
      '--only-categories=performance,accessibility,best-practices',
      '--output=json',
      `--output-path=${outputPath}`,
    ];

    const child = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Lighthouse exit ${code}`));
    });
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const rows = [];

  console.log(`\nAudit Lighthouse — ${baseUrl}\n`);

  for (const page of PAGES) {
    const url = `${baseUrl}${page.path}`;
    const jsonPath = path.join(outDir, `${page.name}.json`);
    process.stdout.write(`→ ${page.path} … `);

    try {
      await runLighthouse(url, jsonPath);
      const { readFile } = await import('node:fs/promises');
      const report = JSON.parse(await readFile(jsonPath, 'utf8'));
      const perf = Math.round((report.categories?.performance?.score ?? 0) * 100);
      const a11y = Math.round((report.categories?.accessibility?.score ?? 0) * 100);
      const bp = Math.round((report.categories?.['best-practices']?.score ?? 0) * 100);
      const lcp = report.audits?.['largest-contentful-paint']?.displayValue ?? '—';
      const cls = report.audits?.['cumulative-layout-shift']?.displayValue ?? '—';
      const tbt = report.audits?.['total-blocking-time']?.displayValue ?? '—';

      rows.push({ page: page.path, perf, a11y, bp, lcp, cls, tbt });
      console.log(`Perf ${perf} | LCP ${lcp}`);
    } catch (err) {
      console.log(`échec (${err.message?.slice(0, 80) || err})`);
      rows.push({ page: page.path, perf: '—', a11y: '—', bp: '—', lcp: '—', cls: '—', tbt: '—' });
    }
  }

  const md = [
    `# Audit Lighthouse — ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Base URL: \`${baseUrl}\``,
    '',
    '| Page | Perf | A11y | BP | LCP | CLS | TBT |',
    '|------|------|------|-----|-----|-----|-----|',
    ...rows.map(
      (r) =>
        `| ${r.page} | ${r.perf} | ${r.a11y} | ${r.bp} | ${r.lcp} | ${r.cls} | ${r.tbt} |`
    ),
    '',
  ].join('\n');

  const mdPath = path.join(outDir, 'summary.md');
  await writeFile(mdPath, md, 'utf8');
  console.log(`\nRésumé: ${mdPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
