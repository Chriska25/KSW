/** Parse une liste d'invités depuis un fichier CSV (côté client). */
export function parseGuestListCsv(text: string): string[] {
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (!normalized) return [];

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const delimiter = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  };

  let rows = lines.map(parseRow);
  const header = rows[0].map((c) => c.toLowerCase());
  let nameIdx = 0;
  const headerLabels = new Set(['nom', 'name', 'invité', 'invite', 'invites', 'guest', 'full_name', 'fullname']);
  for (let i = 0; i < header.length; i += 1) {
    if (headerLabels.has(header[i])) {
      nameIdx = i;
      rows = rows.slice(1);
      break;
    }
  }

  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of rows) {
    const value = (row[nameIdx] ?? row[0] ?? '').trim();
    const key = normalizeGuestName(value);
    if (!value || !key || seen.has(key)) continue;
    seen.add(key);
    names.push(value);
  }
  return names;
}

export function normalizeGuestName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function mergeGuestNames(existing: string[], imported: string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...existing, ...imported]) {
    const clean = raw.trim();
    const key = normalizeGuestName(clean);
    if (!clean || !key || seen.has(key)) continue;
    seen.add(key);
    merged.push(clean);
  }
  return merged;
}

export function guestListTemplateCsv(): string {
  return 'Nom\nSophie Dupont\nAlexandre Marc\nMarie Lambert\n';
}

export function downloadGuestListTemplate(): void {
  const blob = new Blob([guestListTemplateCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modele-liste-invites.csv';
  a.click();
  URL.revokeObjectURL(url);
}
