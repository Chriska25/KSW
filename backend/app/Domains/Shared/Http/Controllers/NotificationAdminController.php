<?php

namespace App\Domains\Shared\Http\Controllers;

use App\Domains\Shared\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class NotificationAdminController extends Controller
{
    /**
     * Liste des notifications de l'utilisateur ou de l'administrateur
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()?->id;

        $notifications = Notification::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhereNull('user_id');
        })
        ->orderBy('created_at', 'desc')
        ->take(30)
        ->get();

        $unreadCount = $notifications->where('is_read', false)->count();

        return response()->json([
            'data' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Marquer une notification comme lue
     */
    public function markAsRead(string $id): JsonResponse
    {
        $notification = Notification::findOrFail($id);
        $notification->update(['is_read' => true]);

        return response()->json(['message' => 'Notification marquée comme lue']);
    }

    /**
     * Marquer toutes les notifications comme lues
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        Notification::where('is_read', false)->update(['is_read' => true]);
        return response()->json(['message' => 'Toutes les notifications ont été marquées comme lues']);
    }
}
