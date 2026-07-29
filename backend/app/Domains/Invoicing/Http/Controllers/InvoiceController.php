<?php

namespace App\Domains\Invoicing\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class InvoiceController extends Controller
{
    public function listClientInvoices(): JsonResponse
    {
        return response()->json([
            'data' => [
                [
                    'id' => '1',
                    'number' => 'FAC-2026-0118',
                    'date' => '2026-07-15',
                    'amount' => '567.00',
                    'status' => 'paid',
                    'pdf_url' => '/invoices/FAC-2026-0118.pdf',
                ],
            ],
        ]);
    }

    public function listClientQuotes(): JsonResponse
    {
        return response()->json([
            'data' => [
                [
                    'id' => '1',
                    'number' => 'DEV-2026-0042',
                    'valid_until' => '2026-08-30',
                    'total_amount' => '1890.00',
                    'status' => 'sent',
                ],
            ],
        ]);
    }

    public function signContract(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'signature_data' => 'required|string',
        ]);

        return response()->json([
            'message' => 'Contrat signé électroniquement avec succès',
            'signed_at' => now()->toIso8601String(),
        ]);
    }
}
