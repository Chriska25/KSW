import type { InvoiceRow } from '@/lib/invoice-utils';
import { formatMoneyAmount, resolveStudioCurrency } from '@/lib/currency';
import { resolveInvoiceLogoUrl, type InvoiceStudioInfo } from '@/lib/invoice-studio-info';

export type { InvoiceStudioInfo } from '@/lib/invoice-studio-info';

function escapeAttr(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEuro(amount: unknown, currency?: string): string {
  return formatMoneyAmount(amount, currency);
}

function statusLabel(status: InvoiceRow['status']): string {
  switch (status) {
    case 'paid':
      return 'Payée intégralement';
    case 'partially_paid':
      return 'Acompte réglé — solde en attente';
    default:
      return 'En attente de paiement';
  }
}

function paymentLinesHtml(invoice: InvoiceRow, currency: string): string {
  const lines = invoice.paymentLines || [];
  if (lines.length === 0) {
    return `<tr>
      <td colspan="4" style="color:#888;">Aucun encaissement enregistré</td>
    </tr>`;
  }
  return lines
    .map(
      (line) => `<tr>
        <td>${escapeHtml(line.label)}</td>
        <td>${formatEuro(line.amount, currency)}</td>
        <td>${escapeHtml(line.method)}</td>
        <td>${escapeHtml(line.paidAt || '—')}${line.reference ? `<br/><span style="font-size:11px;color:#666;">Réf. ${escapeHtml(line.reference)}</span>` : ''}</td>
      </tr>`
    )
    .join('');
}

function brandHeaderHtml(studio: InvoiceStudioInfo): string {
  const studioNameRaw = studio.studioName || 'KSW STUDIO';
  const studioName = escapeHtml(studioNameRaw);
  const nameParts = studioNameRaw.split(' ');
  const subtitle = escapeHtml(studio.studioSubtitle || 'Haute Photographie & Production');
  const logoSrc =
    studio.showLogoOnInvoice !== false && studio.invoiceLogoUrl
      ? resolveInvoiceLogoUrl(studio.invoiceLogoUrl)
      : undefined;

  const textBrand = `<div class="brand">${escapeHtml(nameParts[0] || 'KSW')} <span>${escapeHtml(nameParts.slice(1).join(' ') || 'STUDIO')}</span></div>
      <div style="font-size:12px;color:#666;margin-top:4px;">${subtitle}</div>`;

  if (logoSrc) {
    return `<div class="brand-block">
      <img src="${escapeAttr(logoSrc)}" alt="${studioName}" class="logo" />
      <div>${textBrand}</div>
    </div>`;
  }

  return `<div>${textBrand}</div>`;
}

function buildInvoiceHtml(invoice: InvoiceRow, studio: InvoiceStudioInfo): string {
  const currency = resolveStudioCurrency(invoice.currency || studio.currency);
  const studioNameRaw = studio.studioName || 'KSW STUDIO';
  const studioName = escapeHtml(studioNameRaw);
  const remaining =
    invoice.remainingAmount ?? Math.max(0, (Number(invoice.totalAmount) || 0) - (Number(invoice.paidAmount) || 0));
  const paymentSummary = escapeHtml(invoice.paymentSummary || invoice.paymentMethod || 'En attente');
  const sessionDate = escapeHtml(invoice.sessionDate || invoice.dueDate || '—');
  const sessionTime = invoice.sessionTime ? ` à ${escapeHtml(invoice.sessionTime)}` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${escapeHtml(invoice.number)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 32px; }
    .brand-block { display: flex; align-items: center; gap: 16px; }
    .logo { max-height: 72px; max-width: 200px; object-fit: contain; display: block; }
    .brand { font-size: 24px; font-weight: bold; letter-spacing: 0.08em; }
    .brand span { color: #b8860b; }
    .meta { text-align: right; font-size: 13px; line-height: 1.6; color: #444; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    .badge { display: inline-block; padding: 4px 10px; border: 1px solid #d4af37; border-radius: 4px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .box { background: #fafafa; border: 1px solid #e5e5e5; padding: 16px; border-radius: 8px; }
    .box h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
    th { background: #fafafa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; }
    .totals { margin-left: auto; width: 320px; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals .grand { font-size: 18px; font-weight: bold; border-top: 2px solid #d4af37; padding-top: 12px; margin-top: 8px; }
    .summary { margin-top: 16px; padding: 12px 16px; background: #fffbeb; border: 1px solid #f0d878; border-radius: 8px; font-size: 13px; }
    footer { margin-top: 48px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    ${brandHeaderHtml(studio)}
    <div class="meta">
      ${studio.address ? `<div>${escapeHtml(studio.address)}</div>` : ''}
      ${studio.phone ? `<div>${escapeHtml(studio.phone)}</div>` : ''}
      ${studio.contactEmail ? `<div>${escapeHtml(studio.contactEmail)}</div>` : ''}
    </div>
  </div>

  <h1>Facture ${escapeHtml(invoice.number)}</h1>
  <div class="badge">${statusLabel(invoice.status)}</div>
  ${invoice.reference ? `<div style="font-size:12px;color:#666;margin-top:8px;">Réf. réservation : ${escapeHtml(invoice.reference)}</div>` : ''}

  <div class="grid" style="margin-top:24px;">
    <div class="box">
      <h3>Client</h3>
      <strong>${escapeHtml(invoice.clientName)}</strong>
    </div>
    <div class="box">
      <h3>Séance</h3>
      <div>Émission : ${escapeHtml(invoice.issueDate || '—')}</div>
      <div>Date séance : ${sessionDate}${sessionTime}</div>
      ${invoice.location ? `<div>Lieu : ${escapeHtml(invoice.location)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Prestation</th>
        <th>Montant TTC</th>
        <th>Acompte prévu</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(invoice.serviceTitle)}</td>
        <td>${formatEuro(invoice.totalAmount, currency)}</td>
        <td>${formatEuro(invoice.depositAmount ?? 0, currency)}</td>
        <td>${statusLabel(invoice.status)}</td>
      </tr>
    </tbody>
  </table>

  <h2 style="font-size:16px;margin:32px 0 12px;">Détail des encaissements</h2>
  <table>
    <thead>
      <tr>
        <th>Libellé</th>
        <th>Montant</th>
        <th>Mode de paiement</th>
        <th>Date / Référence</th>
      </tr>
    </thead>
    <tbody>
      ${paymentLinesHtml(invoice, currency)}
    </tbody>
  </table>

  <div class="summary">
    <strong>Modes de règlement :</strong> ${paymentSummary}
  </div>

  <div class="totals">
    <div><span>Total TTC</span><strong>${formatEuro(invoice.totalAmount, currency)}</strong></div>
    <div><span>Total encaissé</span><strong>${formatEuro(invoice.paidAmount, currency)}</strong></div>
    <div class="grand"><span>Solde restant</span><strong>${formatEuro(remaining, currency)}</strong></div>
  </div>

  <footer>
    Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${studioName}.
    TVA non applicable, art. 293 B du CGI (prestataire photographique).
  </footer>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

function openPrintWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');

  if (win) {
    win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return true;
  }

  const fallback = window.open('', '_blank');
  if (!fallback) return false;

  fallback.document.open();
  fallback.document.write(html);
  fallback.document.close();
  URL.revokeObjectURL(url);
  return true;
}

export function exportInvoiceToPdf(invoice: InvoiceRow, studio: InvoiceStudioInfo): void {
  if (typeof window === 'undefined') return;

  try {
    const html = buildInvoiceHtml(invoice, studio);
    const opened = openPrintWindow(html);
    if (!opened) {
      alert('Autorisez les pop-ups pour ouvrir et imprimer la facture.');
    }
  } catch (error) {
    console.error('Erreur génération facture:', error);
    alert('Impossible de générer la facture. Vérifiez les données de la réservation.');
  }
}

export function exportAllInvoicesToPdf(invoices: InvoiceRow[], studio: InvoiceStudioInfo): void {
  invoices.forEach((inv, i) => {
    setTimeout(() => exportInvoiceToPdf(inv, studio), i * 800);
  });
}
