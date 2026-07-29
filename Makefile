.PHONY: up down restart build logs migrate seed test dev clean

# -------------------------------------------------------------------
# Commande Unique pour démarrer toute la stack (Next.js + Laravel + PostgreSQL + Redis)
# -------------------------------------------------------------------
up:
	@echo "🚀 Démarrage de la plateforme Studio Photo (Docker)..."
	@if [ ! -f .env ]; then cp .env.example .env; fi
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
	@if [ ! -f frontend/.env.local ]; then cp frontend/.env.example frontend/.env.local; fi
	docker compose up -d --build
	@echo "✅ Plateforme démarrée !"
	@echo "🌐 Local      : http://localhost:3000"
	@echo "🌐 Réseau LAN : http://$$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $$1}'):3000"
	@echo "⚡ API (proxy): http://localhost:3000/api/v1"
	@echo "📋 Diagnostic : http://localhost:3000/debug"

# Arréter les conteneurs
down:
	@echo "🛑 Arrêt des conteneurs..."
	docker compose down

# Reconstruire les images Docker
build:
	docker compose build --no-cache

# Afficher les logs en direct
logs:
	docker compose logs -f

# Exécuter les migrations PostgreSQL
migrate:
	docker compose exec backend php artisan migrate --force

# Seeders base de données
seed:
	docker compose exec backend php artisan db:seed --force

# Exécuter les tests unitaires et E2E
test:
	docker compose exec backend php artisan test
	cd frontend && npm run build

# Démarrage local Next.js seul
dev:
	cd frontend && npm run dev

# Nettoyage
clean:
	docker compose down -v
	rm -rf frontend/.next frontend/node_modules backend/vendor
