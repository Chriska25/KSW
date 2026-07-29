<?php

namespace App\Domains\Shared\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AnalyticsAdminController extends Controller
{
    /**
     * Statistiques complètes du dashboard analytics
     */
    public function getAnalyticsData(): JsonResponse
    {
        return response()->json([
            'overview' => [
                'total_visitors' => 14250,
                'conversion_rate' => 3.82, // 3.82%
                'total_bookings' => 48,
                'total_revenue' => 28900.00,
            ],
            'top_pages' => [
                ['url' => '/prestations', 'views' => 5420, 'title' => 'Catalogue Prestations'],
                ['url' => '/portfolio', 'views' => 4180, 'title' => 'Portfolio Galeries'],
                ['url' => '/reservation', 'views' => 2950, 'title' => 'Tunnel de Réservation'],
                ['url' => '/blog/10-conseils-mariage', 'views' => 1680, 'title' => 'Article Conseils Mariage'],
            ],
            'monthly_revenue' => [
                ['month' => 'Jan', 'revenue' => 2400, 'bookings' => 4],
                ['month' => 'Fév', 'revenue' => 3200, 'bookings' => 5],
                ['month' => 'Mar', 'revenue' => 4100, 'bookings' => 7],
                ['month' => 'Avr', 'revenue' => 3800, 'bookings' => 6],
                ['month' => 'Mai', 'revenue' => 5200, 'bookings' => 9],
                ['month' => 'Juin', 'revenue' => 6400, 'bookings' => 11],
                ['month' => 'Juil', 'revenue' => 3800, 'bookings' => 6],
            ],
            'category_distribution' => [
                ['name' => 'Mariages', 'value' => 60],
                ['name' => 'Portraits Studio', 'value' => 25],
                ['name' => 'Corporate', 'value' => 15],
            ],
        ]);
    }

    /**
     * Exportation du rapport analytique au format CSV / Excel
     */
    public function exportCsv(): JsonResponse
    {
        return response()->json([
            'download_url' => '/api/v1/admin/analytics/download-csv',
            'filename' => 'rapport_analytics_studio_lumiere_2026.csv',
        ]);
    }

    /**
     * Exportation du rapport d'activité mensuel en PDF
     */
    public function exportPdf(): JsonResponse
    {
        return response()->json([
            'download_url' => '/api/v1/admin/analytics/download-pdf',
            'filename' => 'rapport_activite_studio_lumiere_2026.pdf',
        ]);
    }
}
