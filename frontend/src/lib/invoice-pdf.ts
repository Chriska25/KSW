import type { InvoiceRow } from '@/lib/admin-dashboard';

export interface InvoiceStudioInfo {
  studioName?: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function statusLabel(status: InvoiceRow['status']): string {
  switch (status) {
    case 'paid':
      return 'Payée intégralement';
    case 'partially_paid':
      return 'Acompte réglé';
    default:
      return 'En attente de paiement';
  }
}

export function exportInvoiceToPdf(invoice: InvoiceRow, studio: InvoiceStudioInfo): void {
  if (typeof window === 'undefined') return;

  const studioName = escapeHtml(studio.studioName || 'KSW STUDIO');
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${escapeHtml(invoice.number)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 32px; }
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
    .totals { margin-left: auto; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .totals .grand { font-size: 18px; font-weight: bold; border-top: 2px solid #d4af37; padding-top: 12px; margin-top: 8px; }
    footer { margin-top: 48px; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${studioName.split(' ')[0] || 'KSW'} <span>${studioName.split(' ').slice(1).join(' ') || 'STUDIO'}</span></div>
      <div style="font-size:12px;color:#666;margin-top:4px;">Haute Photographie & Production</div>
    </div>
    <div class="meta">
      ${studio.address ? `<div>${escapeHtml(studio.address)}</div>` : ''}
      ${studio.phone ? `<div>${escapeHtml(studio.phone)}</div>` : ''}
      ${studio.contactEmail ? `<div>${escapeHtml(studio.contactEmail)}</div>` : ''}
    </div>
  </div>

  <h1>Facture ${escapeHtml(invoice.number)}</h1>
  <div class="badge">${statusLabel(invoice.status)}</div>

  <div class="grid" style="margin-top:24px;">
    <div class="box">
      <h3>Client</h3>
      <strong>${escapeHtml(invoice.clientName)}</strong>
    </div>
    <div class="box">
      <h3>Dates</h3>
      <div>Émission : ${escapeHtml(invoice.issueDate)}</div>
      <div>Échéance séance : ${escapeHtml(invoice.dueDate)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Prestation</th>
        <th>Montant TTC</th>
        <th>Encaissé</th>
        <th>Mode</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(invoice.serviceTitle)}</td>
        <td>${formatEuro(invoice.totalAmount)}</td>
        <td>${formatEuro(invoice.paidAmount)}</td>
        <td>${escapeHtml(invoice.paymentMethod)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div><span>Total TTC</span><strong>${formatEuro(invoice.totalAmount)}</strong></div>
    <div><span>Montant réglé</span><strong>${formatEuro(invoice.paidAmount)}</strong></div>
    <div class="grand"><span>Solde restant</span><strong>${formatEuro(Math.max(0, invoice.totalAmount - invoice.paidAmount))}</strong></div>
  </div>

  <footer>
    Document généré le ${new Date().toLocaleDateString('fr-FR')} — ${studioName}.
    TVA non applicable, art. 293 B du CGI (prestataire photographique).
  </footer>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) {
    alert('Autorisez les pop-ups pour télécharger la facture PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function exportAllInvoicesToPdf(invoices: InvoiceRow[], studio: InvoiceStudioInfo): void {
  invoices.forEach((inv, i) => {
    setTimeout(() => exportInvoiceToPdf(inv, studio), i * 800);
  });
}
