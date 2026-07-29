# 📸 Studio Photo Pro - Plateforme Métier Photographe Professionnel

Plateforme web haut de gamme conçue pour les photographes professionnels. Elle regroupe la présentation des prestations, le portfolio interactif, la réservation en ligne avec acompte Stripe, la livraison de galeries privées HD, l'émission de devis/factures et un tableau de bord CRM administrateur.

---

## 🛠️ Stack Technique

### Frontend
- **Next.js 15** (App Router & Turbopack)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4** (Design System Glassmorphism & Doré)
- **Shadcn UI & Framer Motion**
- **TanStack Query (React Query) & Zustand**
- **ESLint & Prettier**

### Backend & BDD
- **Laravel 12 (PHP 8.4)** - Clean Architecture & DDD
- **Laravel Sanctum** (Authentification Cookie SPA)
- **PostgreSQL 17** (Base de données relationnelle 25 tables)
- **Redis 7** (Cache & Queues asynchrones)

### Infrastructure & Orchestration
- **Docker & Docker Compose**

---

## 🚀 Démarrage Rapide en Une Seule Commande

```bash
# Lancer l'intégralité de la plateforme (Next.js + Laravel + Postgres + Redis)
make up
```

Ou directement avec Docker Compose :

```bash
docker compose up -d --build
```

---

## 🌐 URLs d'Accès

- **Application Web (Next.js)** : [http://localhost:3000](http://localhost:3000)
- **API REST Backend (Laravel)** : [http://localhost:8000/api/v1](http://localhost:8000/api/v1)

---

## 📑 Commandes Utiles (Makefile)

| Commande | Description |
| :--- | :--- |
| `make up` | Démarrer toute la plateforme en arrière-plan avec build |
| `make down` | Arrêter l'ensemble des conteneurs Docker |
| `make logs` | Consulter les logs des conteneurs en temps réel |
| `make migrate` | Exécuter les migrations PostgreSQL |
| `make seed` | Injecter les données de test initiales |
| `make test` | Lancer la suite de tests (Pest PHP & Next.js Build) |
| `make dev` | Lancer uniquement le serveur de dev Next.js en local |

---

## 📐 Schéma d'Architecture & Documentation

- [architecture_blueprint.md](file:///Users/chriskabela/.gemini/antigravity-ide/brain/3fb384e3-42ac-473e-9e0d-b7b60956e526/architecture_blueprint.md) : Documentation d'architecture logicielle complète (Clean Architecture, DDD, 25 tables PostgreSQL, endpoints API).
- [walkthrough.md](file:///Users/chriskabela/.gemini/antigravity-ide/brain/3fb384e3-42ac-473e-9e0d-b7b60956e526/walkthrough.md) : Bilan de l'implémentation et vérifications.
