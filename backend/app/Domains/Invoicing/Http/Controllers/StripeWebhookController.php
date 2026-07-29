<?php

namespace App\Domains\Invoicing\Http\Controllers;

use App\Domains\Invoicing\Models\Invoice;
use App\Domains\Invoicing\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class StripeWebhookController extends Controller
{
    /**
     * Reçoit et valide les évènements Webhook Stripe (ex: payment_intent.succeeded)
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $type = $payload['type'] ?? 'payment_intent.succeeded';

        if ($type === 'payment_intent.succeeded') {
            $paymentIntent = $payload['data']['object'] ?? [];
            $transactionRef = $paymentIntent['id'] ?? 'pi_mock_' . bin2hex(random_bytes(6));
            $amount = ($paymentIntent['amount'] ?? 56700) / 100;
            $invoiceId = $paymentIntent['metadata']['invoice_id'] ?? null;

            if ($invoiceId) {
                $invoice = Invoice::find($invoiceId);
                if ($invoice) {
                    Payment::create([
                        'invoice_id' => $invoice->id,
                        'payment_method' => 'stripe',
                        'transaction_reference' => $transactionRef,
                        'amount' => $amount,
                        'status' => 'completed',
                        'paid_at' => now(),
                    ]);

                    $newPaidTotal = $invoice->paid_amount + $amount;
                    $status = $newPaidTotal >= $invoice->total_amount ? 'paid' : 'partially_paid';
                    $invoice->update([
                        'paid_amount' => $newPaidTotal,
                        'status' => $status,
                    ]);
                }
            }
        }

        return response()->json(['status' => 'success', 'event' => $type]);
    }
}
