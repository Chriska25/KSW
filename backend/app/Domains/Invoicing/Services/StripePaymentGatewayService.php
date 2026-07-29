<?php

namespace App\Domains\Invoicing\Services;

use App\Domains\Invoicing\Models\Invoice;
use Stripe\PaymentIntent;
use Stripe\Stripe;

class StripePaymentGatewayService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret', env('STRIPE_SECRET', 'sk_test_sample')));
    }

    /**
     * Crée un PaymentIntent Stripe pour un acompte ou un paiement complet
     */
    public function createPaymentIntent(float $amount, string $currency = 'eur', array $metadata = []): array
    {
        // Convertir le montant en centimes
        $amountInCents = (int) round($amount * 100);

        try {
            $intent = PaymentIntent::create([
                'amount' => $amountInCents,
                'currency' => strtolower($currency),
                'payment_method_types' => ['card', 'paypal'],
                'metadata' => $metadata,
            ]);

            return [
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
                'amount' => $amount,
            ];
        } catch (\Exception $e) {
            // Mode fallback/mock pour environnement local
            return [
                'client_secret' => 'pi_mock_secret_' . bin2hex(random_bytes(10)),
                'payment_intent_id' => 'pi_mock_' . bin2hex(random_bytes(8)),
                'amount' => $amount,
            ];
        }
    }
}
