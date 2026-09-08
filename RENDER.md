# Déploiement sur Render — KSW Studio

## Erreur « open Dockerfile: no such file or directory »

Render cherche par défaut un **`Dockerfile` à la racine** du dépôt. Ce projet utilise :

| Service | Emplacement Dockerfile | Contexte |
|---------|------------------------|----------|
| **API (FastAPI)** | `./Dockerfile` (racine) ou `./docker/python/Dockerfile` | racine du repo |
| **Frontend (Next.js)** | `./frontend/Dockerfile` | dossier `frontend` |

### Correction rapide (dashboard Render)

**Service API :**
- **Environment** → Docker
- **Dockerfile Path** : `Dockerfile` (racine) **ou** `docker/python/Dockerfile`
- **Docker Context** : `.` (racine)
- **Branch** : `feat/security-audit` ou `main` (pas une branche sans Dockerfile racine)

**Service Frontend (2ᵉ Web Service) :**
- **Root Directory** : `frontend`
- **Dockerfile Path** : `Dockerfile`
- **Variable** `BACKEND_INTERNAL_URL` : `https://votre-api.onrender.com` (URL publique de l’API)

---

## Architecture recommandée (2 services)

```
[Navigateur] → ksw-web.onrender.com (Next.js)
                    ↓ proxy /api/v1/*
               ksw-api.onrender.com (FastAPI)
                    ↓
               PostgreSQL (Supabase ou Render Postgres)
```

### 1. Service API — `ksw-api`

| Paramètre | Valeur |
|-----------|--------|
| Runtime | Docker |
| Dockerfile | `Dockerfile` |
| Health check | `/api/v1/health` |
| Port | laissé à Render (`PORT` auto) |

**Variables obligatoires :**

```env
ENVIRONMENT=production
DATABASE_URL=postgresql://...   # Supabase pooler ou Render Postgres
JWT_SECRET_KEY=...              # openssl rand -hex 32
CORS_ALLOWED_ORIGINS=https://votre-frontend.onrender.com,https://kswstudio.fr
FRONTEND_URL=https://votre-frontend.onrender.com
```

**Optionnel :** `REDIS_URL`, Stripe, Gmail (`EMAIL_PROVIDER=gmail`), Supabase Storage.

### 2. Service Frontend — `ksw-web`

| Paramètre | Valeur |
|-----------|--------|
| Root Directory | `frontend` |
| Dockerfile | `Dockerfile` |
| Runtime | Docker |

**Variables (build + runtime) :**

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://votre-frontend.onrender.com
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_INTERNAL_URL=https://votre-api.onrender.com
```

> `BACKEND_INTERNAL_URL` doit être défini **avant le build** : Next.js proxifie `/api/v1` vers cette URL.

### 3. Base de données

- **Recommandé** : [Supabase](https://supabase.com) (déjà utilisé en prod pour les photos)
- **Alternative** : Postgres managé Render → copier `DATABASE_URL` dans l’API

---

## Déploiement via Blueprint

1. Pousser `render.yaml` + `Dockerfile` sur GitHub
2. Render → **New** → **Blueprint**
3. Connecter `Chriska25/KSW`, choisir la branche
4. Renseigner les variables marquées `sync: false` dans le dashboard

---

## Branche à déployer

L’erreur citait la branche `feat/audit-p0-p2` (commit `fe83caa`) qui **n’a pas** le `Dockerfile` racine.

Utilisez une branche à jour contenant :
- `Dockerfile` (racine)
- `render.yaml`
- `RENDER.md`

Ex. : `feat/security-audit` ou `main` après merge.

---

## Vérification

```bash
curl https://votre-api.onrender.com/api/v1/health
curl -I https://votre-frontend.onrender.com
```

Page diagnostic (si activée) : `https://votre-frontend.onrender.com/debug`
