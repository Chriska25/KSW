<?php

namespace App\Domains\Invoicing\Http\Controllers;

use App\Domains\Invoicing\Models\Invoice;
use App\Domains\Invoicing\Models\Quote;
use App\Domains\Invoicing\Services\PdfInvoiceGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class InvoiceAdminController extends Controller
{
    public function __construct(
        protected PdfInvoiceGeneratorService $pdfService
    ) {}

    public function index(): JsonResponse
    {
        $invoices = Invoice::with(['client', 'booking', 'payments'])->orderBy('created_at', 'desc')->get();
        $quotes = Quote::with('client')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'invoices' => $invoices,
            'quotes' => $quotes,
        ]);
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|uuid',
            'booking_id' => 'nullable|uuid',
            'subtotal' => 'required|numeric',
            'tax_amount' => 'required|numeric',
            'due_date' => 'required|date',
        ]);

        $total = $validated['subtotal'] + $validated['tax_amount'];

        $invoice = Invoice::create([
            'number' => 'FAC-' . date('Y') . '-' . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT),
            'client_id' => $validated['client_id'],
            'booking_id' => $validated['booking_id'] ?? null,
            'status' => 'unpaid',
            'issue_date' => now()->toDateString(),
            'due_date' => $validated['due_date'],
            'subtotal' => $validated['subtotal'],
            'tax_amount' => $validated['tax_amount'],
            'total_amount' => $total,
            'paid_amount' => 0.00,
        ]);

        $this->pdfService->generateInvoicePdf($invoice);

        return response()->json(['message' => 'Facture générée avec succès', 'data' => $invoice], 201);
    }
}
