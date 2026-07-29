<?php

namespace App\Domains\Invoicing\Services;

use App\Domains\Invoicing\Models\Invoice;

class PdfInvoiceGeneratorService
{
    /**
     * Génère le fichier PDF de la facture avec numéro séquentiel légal
     */
    public function generateInvoicePdf(Invoice $invoice): string
    {
        $filename = "factures/{$invoice->number}.pdf";
        
        // Emplacement simulé / S3
        $invoice->update(['pdf_path' => $filename]);

        return $filename;
    }
}
