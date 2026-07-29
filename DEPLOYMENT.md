# Guide de Déploiement en Production - Studio Lumière

Ce guide détaille les étapes d'installation et d'exploitation en production pour la plateforme web **Studio Lumière**.

---

## 📋 Prérequis Serveur (VPS / Cloud)

- **OS** : Ubuntu 22.04 LTS ou Debian 12
- **Docker** : v24.0+ et Docker Compose v2.20+
- **Nom de Domaine** : Pointant vers l'IP du serveur (`studiolumiere.fr`)

---

## 🚀 Étapes d'Installation Rapide (1-Command Launch)

### 1. Cloner le Dépôt
```bash
git clone https://github.com/studiolumiere/platform.git
cd platform
```

### 2. Configurer les Variables d'Environnement
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Démarrer le Projet en Mode Production
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Exécuter les Migrations et Seeders de Base de Données
```bash
docker compose exec backend php artisan migrate:fresh --seed
```

---

## 🛡️ Monitoring & Maintenance

- **Health Check API** : `GET https://studiolumiere.fr/api/v1/health`
- **Sauvegarde DB & Médias** : `./scripts/backup.sh`
- **Logs Nginx & App** : `docker compose logs -f`
