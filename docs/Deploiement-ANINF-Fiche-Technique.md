# Fiche technique de déploiement — Plateforme Allô Eau sur infrastructure ANINF

> **Destinataire** — Équipe technique ANINF, Direction du Système d'Information du Ministère de l'Accès Universel à l'Eau et à l'Énergie
> **Éditeur** — Milliminds, partenaire technologique
> **Objet** — Spécifications de déploiement souverain de la plateforme numérique Allô Eau
> **Version** — 1.0
> **Date** — Juillet 2026
> **Confidentialité** — Diffusion restreinte

---

## Sommaire

1. [Synthèse exécutive](#1-synthèse-exécutive)
2. [Vue d'ensemble de la plateforme](#2-vue-densemble-de-la-plateforme)
3. [Architecture cible](#3-architecture-cible)
4. [Inventaire matériel et virtualisation](#4-inventaire-matériel-et-virtualisation)
5. [Système d'exploitation et prérequis de base](#5-système-dexploitation-et-prérequis-de-base)
6. [Stack logicielle par rôle de machine](#6-stack-logicielle-par-rôle-de-machine)
7. [Déploiement Supabase self-hosted](#7-déploiement-supabase-self-hosted)
8. [Réseau et topologie](#8-réseau-et-topologie)
9. [Sécurité](#9-sécurité)
10. [Sauvegardes et Plan de Reprise d'Activité](#10-sauvegardes-et-plan-de-reprise-dactivité)
11. [Monitoring et observabilité](#11-monitoring-et-observabilité)
12. [Auto-scaling et gestion de la charge](#12-auto-scaling-et-gestion-de-la-charge)
13. [Chaîne de déploiement continu (CI/CD)](#13-chaîne-de-déploiement-continu-cicd)
14. [Environnements](#14-environnements)
15. [Procédure de migration cloud → ANINF](#15-procédure-de-migration-cloud--aninf)
16. [Checklist de recette technique](#16-checklist-de-recette-technique)
17. [Runbooks d'exploitation](#17-runbooks-dexploitation)
18. [Contacts et gouvernance](#18-contacts-et-gouvernance)
19. [Annexes](#19-annexes)

---

## 1. Synthèse exécutive

La plateforme **Allô Eau** est un service numérique de commande et de livraison d'eau potable, mis en œuvre dans le cadre du dispositif d'urgence hydrique du Grand Libreville. Elle est composée de trois applications web, d'une base de données PostGIS, d'un service temps réel, d'une couche d'authentification, d'un stockage objet et d'automatisations métier.

Cette fiche technique décrit le déploiement de cette plateforme sur l'infrastructure souveraine mise à disposition par l'**ANINF**. Le déploiement cible :

- Une **architecture Kubernetes légère (K3s)** distribuée sur plusieurs machines virtuelles
- Une **base de données Postgres 17 en haute disponibilité** via Patroni
- Une **suite Supabase self-hostée** pour préserver la compatibilité applicative sans réécriture
- Un **stockage objet MinIO** compatible S3
- Un **modèle d'auto-scaling par pods** dimensionné pour trois paliers de charge (5 000, 20 000 et 50 000 commandes par jour)
- Une **sécurité en profondeur** couvrant les accès, l'applicatif, les données, le réseau et les opérations

**Délai indicatif de mise en œuvre** : 4 à 6 semaines à compter de la mise à disposition des ressources par l'ANINF, incluant la migration des données depuis l'environnement de préproduction.

---

## 2. Vue d'ensemble de la plateforme

### 2.1 Composants applicatifs

| Application | Domaine cible | Rôle |
|---|---|---|
| Portail public | `allo-eau.ga` | Prise de commande citoyenne, suivi de commande |
| Backoffice | `admin.allo-eau.ga` | Pilotage Centre d'Opérations, gestion sociétés/zones/tarifs/livreurs, dashboard ministériel |
| Application livreur | `livreur.allo-eau.ga` | PWA installable, tournée, statuts, géolocalisation temps réel |

Toutes trois construites sur **Next.js 15 App Router + React 19 + TypeScript strict**, packagées en containers Docker.

### 2.2 Composants d'infrastructure

- **PostgreSQL 17** avec extensions `postgis`, `pgcrypto`, `pg_cron`, `uuid-ossp`, `pgsodium`, `pg_stat_statements`
- **Suite Supabase self-hostée** : Auth (GoTrue), Realtime, Storage, PostgREST, Kong, Studio
- **MinIO** compatible S3 pour le stockage objet
- **Redis** (optionnel palier 1, requis palier 2+) pour le cache et le rate limiting
- **Passerelle SMS Wirepick** (externe, existante) pour l'envoi d'OTP et de notifications

### 2.3 Volumétrie de service ciblée

| Palier | Commandes / jour | Livreurs actifs | Connexions concurrentes | Traffic HTTP |
|---|---|---|---|---|
| **1 — Lancement** | jusqu'à 5 000 | ~170 | ~500 | ~50 req/s pic |
| **2 — Montée en charge** | 5 000 à 20 000 | ~700 | ~2 000 | ~200 req/s pic |
| **3 — Crise plein régime** | 20 000 à 50 000 | ~1 700 | ~7 000 | ~500 req/s pic |

---

## 3. Architecture cible

### 3.1 Vue d'ensemble

```
                                Internet
                                    │
                                    ▼
                    ┌──────────────────────────────────┐
                    │   Firewall périmétrique ANINF    │
                    │   DDoS protection + IP publique  │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │   VLAN DMZ                       │
                    │                                  │
                    │   ┌────────────┐  ┌────────────┐│
                    │   │  lb-01     │  │  lb-02     ││
                    │   │  HAProxy + │  │  HAProxy + ││
                    │   │  keepalived│  │  keepalived││
                    │   │  (VIP actif)  (VIP secours) ││
                    │   └──────┬─────┘  └──────┬─────┘│
                    └──────────┼────────────────┼─────┘
                               │                │
                    ┌──────────▼────────────────▼─────┐
                    │   VLAN applicatif                │
                    │                                  │
                    │   Cluster K3s                    │
                    │   ┌─────────┐ ┌─────────┐        │
                    │   │ app-01  │ │ app-02  │  ...   │
                    │   │         │ │         │        │
                    │   │ Client, │ │ Admin,  │        │
                    │   │ Admin,  │ │ Client, │        │
                    │   │ Driver, │ │ Driver, │        │
                    │   │ Supabase│ │ Supabase│        │
                    │   │ pods    │ │ pods    │        │
                    │   └─────────┘ └─────────┘        │
                    └───────────────┬──────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │   VLAN données (isolé)           │
                    │                                  │
                    │   ┌─────────┐ ┌─────────┐        │
                    │   │  db-01  │ │  db-02  │        │
                    │   │ Postgres│ │ Postgres│        │
                    │   │ primary │ │ replica │        │
                    │   │ Patroni │ │ Patroni │        │
                    │   └─────────┘ └─────────┘        │
                    │                                  │
                    │   ┌─────────┐ ┌─────────┐        │
                    │   │storage-01│ │ cache-01│       │
                    │   │  MinIO   │ │  Redis  │       │
                    │   └─────────┘ └─────────┘        │
                    └──────────────────────────────────┘
                                    │
                    ┌───────────────▼──────────────────┐
                    │   bastion-01                     │
                    │   K3s control plane, Prometheus, │
                    │   Grafana, Loki, Vault, WireGuard│
                    └──────────────────────────────────┘
```

### 3.2 Flux principaux

1. **Requête citoyen** : Internet → LB → Pod applicatif → Supabase (Auth/DB) → Réponse
2. **Requête livreur temps réel** : PWA → LB → Pod Realtime → notification WebSocket
3. **Requête administrateur** : VPN WireGuard → Bastion → K3s API → Pod Admin → Supabase
4. **Cron planifié** : pg_cron dans Postgres → tâche interne (purge, auto-arrivée)
5. **Push GPS livreur** : PWA → LB → Pod applicatif → Postgres (update `drivers.current_location`)

---

## 4. Inventaire matériel et virtualisation

### 4.1 Palier 1 — Mise en service

| Rôle | Hostname | vCPU | RAM | Disque système | Disque data | VLAN |
|---|---|---|---|---|---|---|
| Load balancer principal | `lb-01` | 2 | 4 Go | 20 Go SSD | — | DMZ |
| Load balancer secours | `lb-02` | 2 | 4 Go | 20 Go SSD | — | DMZ |
| Application node 1 | `app-01` | 4 | 8 Go | 40 Go SSD | — | applicatif |
| Application node 2 | `app-02` | 4 | 8 Go | 40 Go SSD | — | applicatif |
| Postgres primary | `db-01` | 8 | 32 Go | 40 Go SSD | 500 Go **NVMe** | données |
| Postgres replica | `db-02` | 8 | 32 Go | 40 Go SSD | 500 Go **NVMe** | données |
| Stockage objet MinIO | `storage-01` | 4 | 8 Go | 40 Go SSD | 2 To | données |
| Bastion + observabilité | `bastion-01` | 4 | 16 Go | 40 Go SSD | 200 Go SSD | admin |

**Total palier 1** : 8 VMs · 36 vCPU · 112 Go RAM · 3 To de stockage utile.

### 4.2 Palier 2 — Montée en charge

**Ajouts** :

| Rôle | Hostname | vCPU | RAM | Disque système | Disque data | VLAN |
|---|---|---|---|---|---|---|
| Application node 3 | `app-03` | 4 | 8 Go | 40 Go SSD | — | applicatif |
| Application node 4 | `app-04` | 4 | 8 Go | 40 Go SSD | — | applicatif |
| Cache Redis principal | `cache-01` | 2 | 4 Go | 40 Go SSD | — | données |

### 4.3 Palier 3 — Crise plein régime

**Ajouts** :

| Rôle | Hostname | vCPU | RAM | Disque système | Disque data | VLAN |
|---|---|---|---|---|---|---|
| Application node 5 | `app-05` | 4 | 16 Go | 40 Go SSD | — | applicatif |
| Application node 6 | `app-06` | 4 | 16 Go | 40 Go SSD | — | applicatif |
| Postgres replica 2 | `db-03` | 8 | 32 Go | 40 Go SSD | 500 Go NVMe | données |
| Cache Redis secours | `cache-02` | 2 | 4 Go | 40 Go SSD | — | données |

**Recommandation** : l'ANINF réserve dès l'origine la capacité des paliers 2 et 3, activée à la demande selon la charge effective.

### 4.4 Adresses IP à provisionner par l'ANINF

- **2 adresses IPv4 publiques statiques** (LB actif + secours)
- **1 adresse IPv4 publique** pour le bastion (accès SSH restreint)
- **Blocs privés RFC 1918** pour chaque VLAN (par exemple `10.100.0.0/24` DMZ, `10.100.1.0/24` applicatif, `10.100.2.0/24` données, `10.100.3.0/24` admin)

---

## 5. Système d'exploitation et prérequis de base

### 5.1 Choix de l'OS

**Ubuntu Server 24.04 LTS** est recommandé pour toutes les VMs. Alternative acceptable : **Rocky Linux 9**.

Justification : cycle de support LTS sur 5 ans, communauté large, images cloud immédiatement disponibles, écosystème Docker et Kubernetes matures.

### 5.2 Configuration commune à toutes les VMs

À appliquer immédiatement après provisioning :

```bash
# Timezone et locale
timedatectl set-timezone Africa/Libreville
locale-gen fr_FR.UTF-8
update-locale LANG=fr_FR.UTF-8

# Synchronisation NTP
apt install -y chrony
systemctl enable --now chrony

# Firewall local
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow from 10.100.3.0/24 to any port 22 proto tcp   # SSH depuis bastion uniquement
ufw enable

# Sécurisation SSH
sed -i 's/^#Port 22/Port 2222/' /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# fail2ban
apt install -y fail2ban
systemctl enable --now fail2ban

# Journalisation
mkdir -p /var/log/allo-eau
echo '/var/log/allo-eau/*.log { daily rotate 30 compress delaycompress missingok notifempty }' > /etc/logrotate.d/allo-eau
```

### 5.3 Utilisateurs et accès

- Utilisateur `deploy` sur toutes les VMs, membre des groupes `docker` et `sudo`
- Aucune authentification par mot de passe, uniquement par clé publique `ed25519`
- Les clés publiques des administrateurs sont centralisées et propagées via Ansible

---

## 6. Stack logicielle par rôle de machine

### 6.1 VMs applicatives `app-01` à `app-06`

Chaque VM applicative rejoint le cluster K3s comme worker et exécute des pods.

**Logiciels de base** :

```bash
# Docker Engine
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# K3s worker (rejoint le cluster déclaré sur bastion-01)
curl -sfL https://get.k3s.io | K3S_URL=https://bastion-01:6443 \
  K3S_TOKEN=<TOKEN> sh -s - agent

# Kubectl et Helm (pour opérations ponctuelles)
snap install kubectl --classic
snap install helm --classic
```

**Composants Kubernetes déployés dessus** :

- Pods des 3 applications Next.js (client, admin, driver)
- Pods Supabase self-hosted (auth, realtime, storage, postgrest, kong, studio, imgproxy, meta)
- Traefik (ingress, déjà inclus dans K3s)
- cert-manager (renouvellement automatique des certificats TLS)
- Longhorn (stockage persistant distribué entre nœuds)

### 6.2 VMs base de données `db-01`, `db-02` (et `db-03` au palier 3)

**Logiciels installés en natif** (pas dans le cluster K3s) :

```bash
# Repository officiel PostgreSQL
sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update

# Postgres 17 + extensions
apt install -y postgresql-17 postgresql-17-postgis-3 postgresql-17-cron \
  postgresql-17-pg-stat-statements pgbouncer

# Patroni + etcd
apt install -y patroni etcd

# Backup et PITR
apt install -y wal-g pgbackrest

# Extension Supabase
apt install -y postgresql-17-pgsodium postgresql-17-pgjwt
```

**Configuration des extensions Postgres à charger** :

```ini
# /etc/postgresql/17/main/postgresql.conf
shared_preload_libraries = 'pg_cron,pg_stat_statements,pgsodium'
cron.database_name = 'postgres'
max_connections = 500
```

**Cluster Patroni** : la configuration `patroni.yml` déclare `db-01` primary, `db-02` replica synchrone, `db-03` replica asynchrone. La bascule automatique en cas de panne du primary est gérée par etcd.

**PgBouncer** : pool de connexions en mode `transaction`, écoute sur `6432`. Les applications se connectent à PgBouncer, pas directement à Postgres — ce qui permet d'absorber plusieurs milliers de connexions concurrentes avec seulement 100 connexions Postgres actives.

### 6.3 VM stockage objet `storage-01`

**Logiciels installés** :

```bash
# MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio_20260701_amd64.deb
dpkg -i minio_20260701_amd64.deb

# Client MinIO
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && mv mc /usr/local/bin/
```

**Configuration** :

```bash
# /etc/default/minio
MINIO_ROOT_USER=<login-admin-généré>
MINIO_ROOT_PASSWORD=<mot-de-passe-fort-généré>
MINIO_VOLUMES="/data/minio"
MINIO_OPTS="--console-address :9001 --address :9000"
```

**Buckets créés** :

- `allo-eau-backups` — sauvegardes Postgres PITR
- `allo-eau-uploads` — pièces jointes applicatives (preuves de livraison à venir)
- `allo-eau-logs` — archives des logs Loki plus anciens que 30 jours

**Chiffrement** : SSE-S3 (chiffrement au repos) activé sur tous les buckets.

### 6.4 VM bastion et observabilité `bastion-01`

Cette VM concentre l'ensemble des outils d'administration et de supervision.

**Logiciels installés** :

```bash
# K3s server (control-plane)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --disable=traefik --cluster-init" sh -

# Outils Kubernetes
snap install kubectl --classic
snap install helm --classic
wget https://github.com/derailed/k9s/releases/download/v0.32.5/k9s_Linux_amd64.tar.gz
tar xf k9s_Linux_amd64.tar.gz -C /usr/local/bin/

# Node.js 24 LTS (pour scripts et outillage)
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Stack observabilité (déployée dans le cluster via Helm plus tard)

# Vault
wget -O - https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
  > /etc/apt/sources.list.d/hashicorp.list
apt update && apt install -y vault

# WireGuard
apt install -y wireguard

# Ansible pour l'administration
apt install -y ansible

# Backup et sync
apt install -y restic rsync
```

**Composants déployés dans le cluster K3s depuis le bastion** (Helm) :

```bash
# Prometheus + Grafana + Loki
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace
helm install loki grafana/loki-stack --namespace monitoring

# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager --namespace cert-manager \
  --create-namespace --set installCRDs=true

# Longhorn (stockage distribué)
helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn --namespace longhorn-system --create-namespace

# ArgoCD (GitOps)
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd --namespace argocd --create-namespace
```

### 6.5 VMs load balancer `lb-01`, `lb-02`

**Logiciels installés** :

```bash
apt install -y haproxy keepalived
```

**Configuration haproxy simplifiée** :

```
frontend allo-eau-http
    bind *:80
    redirect scheme https code 301

frontend allo-eau-https
    bind *:443 ssl crt /etc/haproxy/certs/allo-eau.pem
    use_backend k3s-ingress-client if { hdr(host) -i allo-eau.ga }
    use_backend k3s-ingress-admin if { hdr(host) -i admin.allo-eau.ga }
    use_backend k3s-ingress-driver if { hdr(host) -i livreur.allo-eau.ga }

backend k3s-ingress-client
    balance roundrobin
    server app-01 10.100.1.11:8080 check
    server app-02 10.100.1.12:8080 check
    # (app-03 à app-06 ajoutés selon palier)
```

**keepalived** : VIP flottante `10.100.0.10` bascule automatiquement entre `lb-01` et `lb-02` en cas de panne.

### 6.6 VMs cache Redis (paliers 2 et 3)

```bash
apt install -y redis-server redis-sentinel
```

Configuration Redis en mode Sentinel avec 3 sentinelles pour l'élection de failover.

---

## 7. Déploiement Supabase self-hosted

### 7.1 Justification du choix

L'application Allô Eau utilise aujourd'hui Supabase en tant que service managé. Toute la stack Supabase étant open source et self-hostable, nous conservons **exactement le même code applicatif** en le pointant vers une instance Supabase déployée sur les serveurs ANINF.

**Bénéfices** :

- **Zéro modification du code** applicatif Next.js
- Migration triviale par `pg_dump`
- Fonctionnalités identiques : RLS, Auth, Realtime, Storage
- Réversibilité si retour en cloud un jour

### 7.2 Namespaces et pods Kubernetes

Tout le déploiement Supabase est dans le namespace `supabase`, séparé des applications métier dans le namespace `allo-eau`.

| Pod | Image Docker | Réplicas palier 1 | Réplicas palier 3 |
|---|---|---|---|
| `supabase-auth` (GoTrue) | `supabase/gotrue:v2.170.0` | 2 | 4 |
| `supabase-realtime` | `supabase/realtime:v2.30.0` | 2 | 4 |
| `supabase-postgrest` | `postgrest/postgrest:v12.2` | 3 | 6 |
| `supabase-storage` | `supabase/storage-api:v1.12` | 2 | 3 |
| `supabase-kong` | `kong:3.6` | 2 | 3 |
| `supabase-studio` | `supabase/studio:v0.99.0` | 1 | 1 |
| `supabase-imgproxy` | `darthsim/imgproxy:v3.24` | 2 | 3 |
| `supabase-meta` | `supabase/postgres-meta:v0.83` | 1 | 1 |

**Postgres n'est pas dans le cluster** — il tourne en natif sur `db-01`/`db-02`/`db-03` avec Patroni, et les pods Supabase le contactent via son adresse interne.

### 7.3 Configuration Supabase Auth (GoTrue)

Extraits du ConfigMap Kubernetes :

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: supabase-auth-config
  namespace: supabase
data:
  GOTRUE_API_HOST: "0.0.0.0"
  GOTRUE_API_PORT: "9999"
  GOTRUE_DB_DRIVER: postgres
  GOTRUE_DB_DATABASE_URL: "postgres://supabase_auth_admin:<pwd>@10.100.2.11:6432/postgres"
  GOTRUE_SITE_URL: "https://allo-eau.ga"
  GOTRUE_URI_ALLOW_LIST: "https://allo-eau.ga,https://admin.allo-eau.ga,https://livreur.allo-eau.ga"
  GOTRUE_JWT_EXP: "3600"
  GOTRUE_JWT_DEFAULT_GROUP_NAME: "authenticated"
  GOTRUE_JWT_ADMIN_ROLES: "service_role"
  GOTRUE_JWT_AUD: "authenticated"
  GOTRUE_JWT_SECRET: "<64-caractères-générés-vault>"
  GOTRUE_DISABLE_SIGNUP: "false"
  GOTRUE_MAILER_AUTOCONFIRM: "false"
  GOTRUE_SMS_AUTOCONFIRM: "true"
```

### 7.4 Configuration Supabase Realtime

Realtime écoute les changements Postgres via la réplication logique. Le rôle `supabase_admin` doit avoir accès aux publications et slots de réplication.

```yaml
env:
  - name: DB_HOST
    value: "10.100.2.11"
  - name: DB_PORT
    value: "6432"
  - name: DB_NAME
    value: "postgres"
  - name: DB_USER
    value: "supabase_admin"
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: supabase-db-secret
        key: password
  - name: DB_AFTER_CONNECT_QUERY
    value: "SET search_path TO _realtime"
  - name: DB_ENC_KEY
    valueFrom:
      secretKeyRef:
        name: supabase-realtime-secret
        key: enc_key
  - name: SECRET_KEY_BASE
    valueFrom:
      secretKeyRef:
        name: supabase-realtime-secret
        key: secret_key_base
  - name: PORT
    value: "4000"
```

### 7.5 Configuration Supabase Storage

Storage est configuré pour utiliser **MinIO** comme backend S3 :

```yaml
env:
  - name: STORAGE_BACKEND
    value: "s3"
  - name: GLOBAL_S3_ENDPOINT
    value: "http://storage-01.allo-eau.internal:9000"
  - name: GLOBAL_S3_BUCKET
    value: "allo-eau-uploads"
  - name: GLOBAL_S3_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: minio-credentials
        key: access-key
  - name: GLOBAL_S3_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: minio-credentials
        key: secret-key
  - name: FILE_STORAGE_BACKEND_PATH
    value: "/var/lib/storage"
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: supabase-db-secret
        key: url
```

### 7.6 Passerelle Kong

Kong sert de reverse proxy interne devant tous les services Supabase. Les applications Next.js appellent Kong (`https://api.allo-eau.ga`) et Kong route vers le bon backend Supabase selon le chemin (`/auth/`, `/rest/`, `/storage/`, `/realtime/`).

### 7.7 Variables d'environnement applicatives à réémettre

Les 3 apps Next.js changent uniquement 4 variables :

```
NEXT_PUBLIC_SUPABASE_URL=https://api.allo-eau.ga
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé JWT ANON émise à l'installation>
SUPABASE_SERVICE_ROLE_KEY=<clé JWT service_role émise à l'installation>
DATABASE_URL=postgres://postgres:<pwd>@pgbouncer.allo-eau.internal:6432/postgres
```

Aucune ligne de code applicatif n'est à modifier.

---

## 8. Réseau et topologie

### 8.1 VLAN et plages IP

| VLAN | Plage | Hôtes | Rôle |
|---|---|---|---|
| DMZ | `10.100.0.0/24` | `lb-01`, `lb-02` (+ VIP `10.100.0.10`) | Exposition publique |
| Applicatif | `10.100.1.0/24` | `app-01` à `app-06` | Traitement métier |
| Données | `10.100.2.0/24` | `db-01` à `db-03`, `storage-01`, `cache-01`, `cache-02` | Persistance |
| Administration | `10.100.3.0/24` | `bastion-01` | Ops et supervision |

### 8.2 Matrice de flux

| Origine | Destination | Ports | Protocole | Motif |
|---|---|---|---|---|
| Internet | VIP LB | 80, 443 | TCP | Trafic public |
| LB | app-* | 8080, 8443 | TCP | Reverse proxy vers K3s ingress |
| app-* | db-* | 6432 | TCP | Postgres via PgBouncer |
| app-* | storage-01 | 9000 | TCP | MinIO API |
| app-* | cache-* | 6379 | TCP | Redis |
| app-* ↔ app-* | 6443, 10250, 8472/udp | TCP/UDP | Communication cluster K3s |
| db-* ↔ db-* | 2380, 5432 | TCP | Réplication Patroni, etcd |
| Bastion | Tous VLAN | selon rôle | TCP | Administration |
| Internet | Bastion (via VPN) | 51820 | UDP | WireGuard |
| VPN | Bastion | 22 (SSH), 6443 (kubectl) | TCP | Ops |

Toutes les autres origines et destinations sont refusées par défaut.

### 8.3 DNS et certificats

**Sous-domaines à créer** (pointés sur la VIP LB `10.100.0.10` publique via NAT sortant ANINF) :

- `allo-eau.ga` — portail public
- `admin.allo-eau.ga` — backoffice
- `livreur.allo-eau.ga` — PWA livreur
- `api.allo-eau.ga` — API Supabase (Kong)
- `staging.allo-eau.ga` — recette
- `dev.allo-eau.ga` — développement (accès interne)

**Certificat wildcard `*.allo-eau.ga`** :

- Option A : Let's Encrypt DNS-01 challenge automatisé par cert-manager (nécessite un token API DNS)
- Option B : Certificat commercial fourni par l'ANINF, importé manuellement dans le cluster

---

## 9. Sécurité

### 9.1 Sécurité des accès

- **Authentification SSH** : clés `ed25519` uniquement, mots de passe désactivés
- **Port SSH** : 2222 (non standard)
- **fail2ban** : blocage automatique après 5 tentatives sur 10 minutes
- **VPN WireGuard** : obligatoire pour toute connexion administrative
- **Bastion unique** : les autres VMs ne sont accessibles qu'à partir du bastion
- **MFA (TOTP)** obligatoire dans l'application pour les rôles `super_admin` et `admin`
- **Rotation des mots de passe** de service tous les 90 jours (Vault)
- **Revue trimestrielle** des comptes actifs

### 9.2 Sécurité applicative

- **TLS 1.3** exclusif sur toutes les entrées publiques
- **HSTS** : `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- **En-têtes de sécurité** :

  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(), microphone=()
  ```

- **WAF** : ModSecurity + règles OWASP CRS niveau paranoïa 2 sur les LB
- **Rate limiting** : Traefik middleware, 100 requêtes/minute par IP par défaut, plus strict sur `/auth/*` (10 req/min)
- **CSRF** : protection intégrée à Next.js Server Actions
- **XSS** : échappement automatique React + CSP

### 9.3 Sécurité base de données

- **Row-Level Security (RLS)** : 56 policies actives, une par table sensible, granulaire par rôle
- **Trigger anti-escalade de privilège** : empêche un utilisateur de modifier son propre rôle, sa société, son statut
- **Journalisation d'audit** : table `logs` avec colonne `is_sensitive` sur les actions critiques (modification de tarif, création de livreur, dispatch forcé, etc.)
- **Chiffrement colonne** via `pgsodium` pour les données personnelles au repos (téléphones, coordonnées) — à activer en Phase 2
- **Anonymisation à l'affichage** : la plateforme n'expose publiquement que le numéro de ticket et le MSISDN masqué (`077 XX XX XX`)
- **Purges programmées** via `pg_cron` : historiques GPS et vérifications téléphoniques purgées quotidiennement

### 9.4 Sécurité des données au repos

- **Disques VM chiffrés** par LUKS (activation à demander à l'ANINF)
- **Sauvegardes Postgres chiffrées AES-256** avant transfert vers MinIO (via wal-g)
- **Objets MinIO chiffrés au repos** (SSE-S3)
- **Secrets applicatifs dans HashiCorp Vault** — jamais dans les fichiers `.env` en clair
- **Clés maîtres Vault** sauvegardées en coffre physique séparé (procédure de scellement Shamir)

### 9.5 Sécurité réseau

- **VLAN données strictement isolé** — aucune route vers internet
- **Firewall périmétrique** ANINF avec règles explicites (matrice de flux ci-dessus)
- **Détection d'intrusion** : **Wazuh** déployé, agents sur toutes les VMs
- **Analyse de vulnérabilités** : scan **OpenVAS** mensuel automatisé
- **Protection DDoS** : capacité ANINF d'absorber au moins 1 Gbps de flood — capacité niveau 3 souhaitable
- **Pare-feu applicatif** : ModSecurity en frontal

### 9.6 Sécurité opérationnelle

- **Patch management** : cycle mensuel des mises à jour de sécurité OS
- **Journal centralisé** : Loki collecte tous les logs applicatifs et système, rétention 12 mois
- **Alertes SIEM** : Wazuh notifie l'astreinte sur les événements suspects
- **Test de restauration** : vérification mensuelle qu'un backup Postgres est restaurable
- **Test de bascule** : trimestriel, simulation panne primary Postgres et bascule Patroni
- **Runbooks** : procédures écrites (voir section 17)

### 9.7 Sécurité contractuelle

- **DPA (Data Processing Agreement)** signé entre ANINF, Milliminds et le Ministère
- **NDA** avec tous les intervenants disposant d'un accès système
- **Revue trimestrielle des accès** — liste des comptes actifs, suppression des inactifs
- **Journalisation immutable** des actions administrateurs (mode write-once)

---

## 10. Sauvegardes et Plan de Reprise d'Activité

### 10.1 Stratégie de sauvegarde Postgres

- **PITR continu** via `wal-g` : archivage des WAL toutes les 5 minutes vers MinIO
- **Snapshots quotidiens** de base à 03 h, rétention 30 jours
- **Snapshots hebdomadaires** archivés hors site, rétention 12 mois
- **Test de restauration** : mensuel automatisé, alerte si échec

### 10.2 Stratégie de sauvegarde MinIO

- **Réplication asynchrone** vers un site secondaire si l'ANINF le permet
- Sinon : `mc mirror` quotidien vers un stockage tiers chiffré

### 10.3 Sauvegarde de configuration

- **Manifests Kubernetes** versionnés dans un dépôt Git dédié
- **Playbooks Ansible** versionnés dans le même dépôt
- **Secrets Vault** exportés chiffrés et stockés hors ligne

### 10.4 Objectifs de reprise

| Indicateur | Cible |
|---|---|
| RPO (perte de données acceptable) | 15 minutes |
| RTO (temps d'indisponibilité acceptable) | 4 heures |
| MTBF applicatif visé | 720 heures (30 jours) |

### 10.5 Scénarios de PRA testés et documentés

| Scénario | Procédure | Durée de bascule |
|---|---|---|
| Perte du primary Postgres | Bascule Patroni automatique | ~ 30 s |
| Perte du LB principal | Bascule keepalived → `lb-02` | ~ 5 s |
| Perte d'un nœud K3s applicatif | Redéploiement des pods sur un autre nœud | ~ 60 s |
| Perte totale du site | Restauration depuis backups hors site | ~ 4 h |
| Corruption de la base | Restauration PITR à un point antérieur | ~ 1 h |

---

## 11. Monitoring et observabilité

### 11.0 Choix de la stack de logs

Deux options sont possibles pour la collecte et l'analyse des logs. Nous préconisons **Grafana + Loki** par défaut, avec **ELK** en alternative si l'ANINF exige un standard plus institutionnel.

#### Option A — Grafana + Loki (recommandée)

- **Léger** : consommation RAM 5 à 10 fois inférieure à ELK
- **Natif Kubernetes** : intégration directe avec les labels des pods
- **Requêtes en LogQL** — proche de PromQL, courbe d'apprentissage rapide
- **Rétention configurable** : 30 jours chaud + 12 mois froid vers MinIO
- **Coût opérationnel réduit** : maintien assuré par 1 ingénieur

Utilisation type : filtrage temps réel des logs applicatifs, corrélation métriques ↔ logs dans un même dashboard Grafana.

#### Option B — Elastic Stack (ELK / OpenSearch)

- **Standard historique** connu des DSI publiques
- **Recherche full-text puissante** et agrégations complexes
- **Machine learning** pour la détection d'anomalies
- **Ressources exigeantes** : minimum 32 Go RAM pour Elasticsearch en production
- **Version open source recommandée : OpenSearch** (fork Amazon d'Elasticsearch, licence Apache 2.0, sans limite commerciale)

Utilisation type : analyse forensique, audit sécurité, exploration approfondie de gros volumes.

**Décision** :

- Palier 1 et 2 → Loki suffit largement
- Palier 3 (> 20 000 commandes/jour, > 100 Go de logs par mois) → considérer OpenSearch en complément

Les deux options sont détaillées dans la partie déploiement (Jour 9).

### 11.1 Stack déployée (option A par défaut)

- **Prometheus** : scrape des métriques toutes les 15 secondes
- **Grafana** : 5 dashboards prédéfinis (voir plus bas)
- **Loki** : agrégation des logs applicatifs et système
- **Promtail** : agent de collecte de logs sur chaque VM et pod
- **Alertmanager** : routage des alertes vers SMS, email, Slack

### 11.2 Métriques clés surveillées

**Infrastructure** :

- CPU, RAM, disque, réseau par VM
- Statut des nœuds K3s
- Statut des pods (redémarrages, OOMKilled, CrashLoopBackOff)
- Latence réseau inter-VM

**Postgres** :

- Nombre de connexions actives et en attente
- Latence des requêtes
- Taille des tables et index
- Statut de la réplication Patroni
- Latence de bascule PITR

**Application** :

- Requêtes HTTP par seconde par endpoint
- Latence P50, P95, P99
- Codes de réponse (2xx, 4xx, 5xx)
- Nombre de commandes créées, dispatchées, livrées
- Connexions Realtime actives
- Erreurs applicatives (log level `error`)

### 11.3 Dashboards Grafana prédéfinis

1. **Vue d'ensemble santé plateforme** — statut global, alertes actives
2. **Métriques applicatives** — commandes/min, dispatch, livraisons
3. **Métriques Postgres** — connexions, latence, réplication
4. **Métriques réseau et sécurité** — trafic, WAF, fail2ban
5. **SLA temps réel** — disponibilité par service, respect des seuils

### 11.4 Alertes définies

| Alerte | Condition | Canal | Sévérité |
|---|---|---|---|
| Disque > 85 % | pendant 5 min | SMS + email | Critique |
| CPU > 90 % sur un nœud | pendant 10 min | Email | Warning |
| Pod en `CrashLoopBackOff` | 3 redémarrages | SMS + email | Critique |
| Latence P95 > 2 s | pendant 5 min | Email | Warning |
| Postgres primary indisponible | immédiat | SMS + email + Slack | Critique |
| Certificat TLS expire < 15 j | quotidien | Email | Warning |
| Backup PITR échoué | immédiat | SMS + email | Critique |
| Tentatives d'accès anormales | seuil Wazuh | SMS + email | Critique |

### 11.5 Astreinte

- **Rotation 24/7** définie contractuellement
- **Numéros dédiés** à l'astreinte, notifiés par Alertmanager via passerelle SMS
- **Runbooks** accessibles au bastion pour les 10 incidents les plus probables

---

## 12. Auto-scaling et gestion de la charge

### 12.1 Auto-scaling au niveau pod (HPA)

Chaque Deployment Kubernetes est doté d'un **Horizontal Pod Autoscaler**.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: allo-eau-client-hpa
  namespace: allo-eau
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: allo-eau-client
  minReplicas: 2
  maxReplicas: 12
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

**Comportement** :

- Toutes les 15 s, Prometheus fournit les métriques CPU/RAM des pods
- Si le CPU moyen dépasse 70 %, le HPA double le nombre de pods (dans les 30 s)
- Quand la charge redescend, il attend 5 min de stabilité avant de réduire — évite l'effet ping-pong
- Bornes strictes : jamais moins de 2 pods, jamais plus de 12

### 12.2 Auto-scaling événementiel (KEDA)

**KEDA** est déployé pour permettre le scaling sur des signaux métier :

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: allo-eau-dispatcher-scaler
  namespace: allo-eau
spec:
  scaleTargetRef:
    name: allo-eau-worker
  minReplicaCount: 1
  maxReplicaCount: 8
  triggers:
    - type: postgresql
      metadata:
        connectionFromEnv: DATABASE_URL
        query: "SELECT count(*) FROM orders WHERE order_status IN ('pending','accepted')"
        targetQueryValue: "50"
```

Ainsi le worker de dispatch se met à l'échelle en fonction de la file d'attente réelle, pas seulement du CPU.

### 12.3 Stratégies par palier

| Palier | Nombre de nœuds K3s | HPA client | HPA admin | HPA driver-api |
|---|---|---|---|---|
| 1 | 2 (`app-01`, `app-02`) | 2–6 | 1–3 | 2–4 |
| 2 | 4 | 3–10 | 2–5 | 3–8 |
| 3 | 6 | 6–20 | 3–10 | 6–15 |

**Le passage entre paliers se fait par ajout de VMs applicatives dans le cluster K3s**, ce qui augmente la capacité totale disponible pour les pods.

### 12.4 Cluster Autoscaler (optionnel)

Si l'ANINF fournit une API de provisioning à chaud, on peut brancher le **Cluster Autoscaler** qui ajoute automatiquement des VMs quand le cluster manque de ressources. Sinon, le passage entre paliers reste une opération manuelle programmée.

---

## 13. Chaîne de déploiement continu (CI/CD)

### 13.1 Chaîne cible

```
Code (GitHub) ──► CI (GitHub Actions) ──► Registry (Harbor)
                                              │
                                              ▼
                                       Manifests Git ──► ArgoCD ──► K3s cluster
```

### 13.2 Étapes CI

Sur chaque push vers `main` :

1. **Lint** (ESLint + TypeScript strict)
2. **Tests** unitaires et d'intégration
3. **Build Docker** — images taggées `git SHA`
4. **Push vers registry** privé (Harbor auto-hébergé chez ANINF, ou registry MinIO)
5. **Mise à jour du dépôt de manifests** — le tag de l'image est mis à jour

### 13.3 Déploiement CD via ArgoCD

- ArgoCD surveille le dépôt de manifests
- Détecte le nouveau tag d'image
- Applique le manifest sur le cluster (rolling update)
- Rollback en un clic si un problème est détecté

### 13.4 Environnement de test obligatoire

Aucune mise en production sans passage préalable par `staging.allo-eau.ga`.

Le workflow standard :

```
Développement local → PR sur main
                       ↓
                    Merge → déploiement automatique sur staging
                       ↓
                    Validation manuelle
                       ↓
                    Promotion vers production (approbation dans ArgoCD)
```

---

## 14. Environnements

**Trois environnements strictement isolés** :

| Environnement | Domaine | Dimensionnement | Rôle | Données |
|---|---|---|---|---|
| **Développement** | `dev.allo-eau.ga` | 1 VM app + 1 VM DB compacts | Tests équipe technique | Factices, seedées par script |
| **Recette (staging)** | `staging.allo-eau.ga` | 50 % du palier 1 | Validation avant production | Factices, jeu de test représentatif |
| **Production** | `allo-eau.ga` | Palier 1/2/3 selon charge | Service réel | Réelles, sensibles |

**Aucune donnée réelle ne transite en dev ou staging.**

Les données de test sont générées par le script `/scripts/seed-demo-data.sql` (déjà utilisé pour la démo ministérielle).

---

## 15. Procédure de migration cloud → ANINF

Migration depuis l'environnement Supabase cloud actuel vers ANINF.

### 15.1 Étapes

1. **Provisioning cluster ANINF** — VMs, K3s, Postgres HA, Supabase self-hosted opérationnels
2. **Configuration réseau et DNS** — sous-domaines pointent temporairement vers le nouvel environnement en staging
3. **Dump complet** du Postgres Supabase cloud :

   ```bash
   pg_dumpall -h db.qsuqefomknkvrlzordkj.supabase.co -U postgres \
     --no-role-passwords > allo-eau-full-dump.sql
   ```

4. **Restauration** sur `db-01` ANINF :

   ```bash
   psql -h 10.100.2.11 -U postgres < allo-eau-full-dump.sql
   ```

5. **Migration Auth users** — export via API admin Supabase, import via API GoTrue self-hostée
6. **Migration Storage** — `rclone` des objets Supabase Storage vers MinIO
7. **Émission des nouvelles clés** JWT (`anon`, `service_role`) avec le secret Vault
8. **Bascule staging** — les env vars des 3 apps pointent vers `https://api.allo-eau.ga`
9. **Tests de recette** sur staging pendant 48h
10. **Bascule production** — modification DNS de `allo-eau.ga`, `admin.allo-eau.ga`, `livreur.allo-eau.ga`
11. **Suivi 72h post-bascule** — surveillance renforcée, astreinte activée

### 15.2 Fenêtre de coupure

**Estimation : moins de 30 minutes** en mode maintenance programmée annoncée 48h à l'avance.

### 15.3 Plan de retour arrière

Si un incident bloquant survient dans les 24h post-bascule :

- Rebascule DNS vers Supabase cloud (TTL DNS abaissé à 60 s la veille de la bascule)
- Écriture des données créées pendant la fenêtre ANINF : conservées et rejouées après diagnostic

---

## 16. Checklist de recette technique

À valider avant ouverture du service au public :

**Infrastructure**

- [ ] 8 VMs du palier 1 provisionnées et accessibles par SSH depuis le bastion
- [ ] Cluster K3s en état `Ready` sur tous les nœuds
- [ ] Cluster Patroni en état `running` avec primary identifié
- [ ] MinIO répond, buckets créés et chiffrés
- [ ] Redis (si palier 2+) répond avec sentinelles configurées
- [ ] Certificat wildcard `*.allo-eau.ga` actif et renouvellement automatique testé

**Supabase self-hosted**

- [ ] Tous les pods Supabase démarrés et `Ready`
- [ ] Auth (GoTrue) crée un utilisateur test avec succès
- [ ] Realtime pousse un événement `postgres_changes` avec succès
- [ ] Storage upload/download d'un fichier test avec succès
- [ ] PostgREST répond aux appels REST via Kong

**Applications**

- [ ] Les 3 apps déployées via ArgoCD
- [ ] Portail public affiche la landing page à `https://allo-eau.ga`
- [ ] Backoffice accessible à `https://admin.allo-eau.ga` avec MFA
- [ ] PWA livreur installable à `https://livreur.allo-eau.ga`

**Sécurité**

- [ ] WAF ModSecurity actif, test OWASP ZAP sans faille critique
- [ ] Wazuh SIEM déployé, agents opérationnels
- [ ] Fail2ban actif sur toutes les VMs
- [ ] VPN WireGuard fonctionnel pour l'équipe technique
- [ ] Vault initialisé, secrets applicatifs chargés

**Observabilité et alerting**

- [ ] Prometheus scrape tous les nœuds, aucune métrique manquante
- [ ] Grafana affiche les 5 dashboards
- [ ] Loki collecte les logs de tous les pods
- [ ] Une alerte de test remonte par SMS et email

**Résilience**

- [ ] Bascule LB testée avec succès (`lb-01` → `lb-02`)
- [ ] Bascule Postgres testée avec succès (Patroni primary → replica)
- [ ] Restauration d'un backup Postgres testée
- [ ] Test de charge à 500 req/s passé sans dégradation

**Documentation**

- [ ] Runbooks des 10 incidents principaux documentés
- [ ] Astreinte nommée et canal d'alerte fonctionnel
- [ ] Documentation d'exploitation remise à l'équipe ANINF
- [ ] Convention d'hébergement et DPA signés

---

## 17. Runbooks d'exploitation

### 17.1 Panne du primary Postgres

**Symptôme** : les applications remontent des erreurs `connection refused` sur `10.100.2.11:6432`.

**Vérification** :

```bash
patronictl -c /etc/patroni.yml list
```

**Action** : Patroni bascule automatiquement en < 30 s. Si non, forcer manuellement :

```bash
patronictl -c /etc/patroni.yml failover
```

**Suivi** : vérifier la réplication en cours après bascule, prévenir l'astreinte pour analyse post-mortem.

### 17.2 Pod applicatif en `CrashLoopBackOff`

**Vérification** :

```bash
kubectl logs -n allo-eau <pod-name> --previous
kubectl describe pod -n allo-eau <pod-name>
```

**Action commune** : erreur env var, rollback via ArgoCD sur la version précédente.

### 17.3 Disque plein sur une VM

**Vérification** :

```bash
df -h
du -sh /var/log/* | sort -h
```

**Action** :

- Purger les logs Loki plus anciens que 30 j
- Purger les images Docker obsolètes : `docker system prune -a`
- Étendre le volume si systémique (demande ANINF)

### 17.4 Perte du LB principal

**Symptôme** : timeout sur les requêtes publiques.

**Vérification** : `ping 10.100.0.10`, `systemctl status keepalived` sur `lb-01`.

**Action** : keepalived bascule automatiquement en 5 s vers `lb-02`. Sinon, redémarrage manuel `systemctl restart keepalived`.

### 17.5 Attaque DDoS détectée

**Symptôme** : afflux massif de requêtes, alerte Wazuh.

**Action immédiate** : escalade vers le FAI ANINF pour activation du scrubbing. Activation du blocage temporaire côté LB HAProxy si l'origine est identifiable.

### 17.6 Certificat TLS expire dans < 15 jours

**Vérification** :

```bash
kubectl get certificate -A
```

**Action** : forcer le renouvellement cert-manager :

```bash
kubectl annotate certificate <name> -n <ns> \
  cert-manager.io/renew-before-expiry=true
```

### 17.7 Base Postgres corrompue

**Action** :

- Isoler l'application (mode maintenance)
- Restaurer PITR sur `db-02` à un point antérieur à la corruption
- Basculer les applications sur `db-02` comme nouveau primary
- Diagnostiquer la cause avant remise en service

### 17.8 Fuite de secret suspectée

**Action immédiate** :

- Rotation immédiate des clés JWT (`anon`, `service_role`) via Vault
- Rotation des mots de passe base de données
- Rotation des tokens d'API externes
- Audit des logs Wazuh pour identifier la source

### 17.9 Charge anormale — palier 3 dépassé

**Symptôme** : HPA au maximum, latence P95 > 3 s.

**Action** :

- Provisionner d'urgence 2 VMs supplémentaires côté ANINF
- Rejoindre le cluster K3s
- Le HPA absorbera automatiquement la surcharge

### 17.10 Mise à jour de sécurité critique

**Procédure** :

- Déployer en `staging` d'abord
- Tests de non-régression
- Mise à jour en production en dehors des heures de pointe
- Suivi renforcé 24h post-mise à jour

---

## 18. Contacts et gouvernance

### 18.1 Interlocuteurs à nommer

| Rôle | Organisation | Nom | Email | Téléphone |
|---|---|---|---|---|
| Directeur du projet | Ministère | à compléter | | |
| Chef de projet ANINF | ANINF | à compléter | | |
| Chef de projet Milliminds | Milliminds | à compléter | | |
| Astreinte technique N1 | ANINF | à compléter | | |
| Astreinte technique N2 | Milliminds | à compléter | | |
| Responsable sécurité | à définir | à compléter | | |

### 18.2 Gouvernance de projet

- **Comité technique bi-hebdomadaire** entre ANINF et Milliminds
- **Comité de pilotage mensuel** incluant le Ministère
- **Point de bascule** avant chaque montée en palier
- **Revue trimestrielle** de sécurité

---

## 19. Annexes

### 19.1 Commandes rapides de diagnostic

```bash
# Santé cluster K3s
kubectl get nodes
kubectl get pods -A --field-selector=status.phase!=Running

# Santé Patroni Postgres
patronictl -c /etc/patroni.yml list

# Santé Supabase
kubectl get pods -n supabase

# Statut MinIO
mc admin info local

# Certificats TLS
kubectl get certificate -A

# Logs applicatifs live
kubectl logs -f -l app=allo-eau-client -n allo-eau
kubectl logs -f -l app=supabase-auth -n supabase

# Métriques rapides Postgres
psql -c "SELECT * FROM pg_stat_activity WHERE state='active'"

# Test de restauration WAL
wal-g backup-list

# Test connexion Redis
redis-cli -h 10.100.2.20 ping
```

### 19.2 Ports utilisés

| Service | Port | Protocole |
|---|---|---|
| HTTP public | 80 | TCP |
| HTTPS public | 443 | TCP |
| SSH (interne) | 2222 | TCP |
| WireGuard VPN | 51820 | UDP |
| K3s API | 6443 | TCP |
| Kubelet | 10250 | TCP |
| Flannel VXLAN | 8472 | UDP |
| Postgres direct | 5432 | TCP |
| PgBouncer | 6432 | TCP |
| Patroni REST | 8008 | TCP |
| etcd | 2379, 2380 | TCP |
| MinIO API | 9000 | TCP |
| MinIO Console | 9001 | TCP |
| Redis | 6379 | TCP |
| Prometheus | 9090 | TCP |
| Grafana | 3000 | TCP |
| Loki | 3100 | TCP |
| Alertmanager | 9093 | TCP |
| Vault | 8200 | TCP |
| ArgoCD | 8080 | TCP |

### 19.3 Références documentaires

- Documentation K3s : https://docs.k3s.io
- Documentation Supabase self-hosted : https://supabase.com/docs/guides/self-hosting
- Documentation Patroni : https://patroni.readthedocs.io
- Documentation Traefik : https://doc.traefik.io/traefik
- Documentation cert-manager : https://cert-manager.io/docs
- Documentation Wazuh : https://documentation.wazuh.com
- Documentation MinIO : https://min.io/docs/minio/linux/
- Documentation Vault : https://developer.hashicorp.com/vault/docs

### 19.4 Glossaire

- **HPA** — Horizontal Pod Autoscaler, mécanisme Kubernetes d'auto-scaling
- **PITR** — Point-In-Time Recovery, restauration à un instant précis
- **RLS** — Row-Level Security, sécurité au niveau ligne dans Postgres
- **RPO / RTO** — Recovery Point Objective / Recovery Time Objective
- **SIEM** — Security Information and Event Management
- **SLA** — Service Level Agreement, engagement de service
- **VLAN** — Virtual LAN, segmentation réseau logique
- **VIP** — Virtual IP, adresse IP flottante partagée entre plusieurs machines
- **WAF** — Web Application Firewall
- **JWT** — JSON Web Token, format de token d'authentification

---

---

# PARTIE II — GUIDE DE DÉPLOIEMENT PAS À PAS

Cette partie détaille l'ensemble des opérations de déploiement, de la mise à disposition des VMs par l'ANINF jusqu'à la mise en service publique. Le déploiement est structuré en **14 jours ouvrés** organisés en phases.

**Convention** : toutes les commandes sont à exécuter en tant qu'utilisateur `deploy` (avec `sudo` explicite quand nécessaire), sauf mention contraire. Les IPs et mots de passe sont symboliques — à remplacer par les valeurs réelles fournies par l'ANINF.

## Vue d'ensemble du planning

| Jour | Phase | Objectif principal |
|---|---|---|
| J1 | Prérequis ANINF | Réception des VMs, vérification, accès SSH |
| J2 | Base OS | Configuration système, sécurisation SSH, réseau interne |
| J3 | Bastion + VPN | Bastion opérationnel, VPN WireGuard actif |
| J4 | Cluster K3s | Control-plane + workers |
| J5 | Postgres HA | Cluster Patroni avec réplication |
| J6 | Supabase | Suite Supabase self-hostée dans K3s |
| J7 | MinIO | Stockage objet compatible S3 |
| J8 | Applications | Déploiement client, admin, driver |
| J9 | Observabilité | Prometheus + Grafana + Loki (ou OpenSearch) |
| J10 | Sécurité | WAF, Wazuh SIEM, hardening |
| J11 | CI/CD | GitHub Actions, Harbor, ArgoCD |
| J12 | Tests de charge | Simulation palier 2 |
| J13 | Tests de PRA | Bascule Postgres, LB, restauration |
| J14 | Go-live | Bascule DNS, ouverture publique, astreinte |

---

## Jour 1 — Réception et prérequis ANINF

### 1.1 Livrables attendus de l'ANINF

À vérifier à la réception :

- [ ] Provisioning effectif des 8 VMs du palier 1
- [ ] Adresses IP publiques allouées (2 pour LB + 1 pour bastion)
- [ ] Accès SSH initial par clé publique
- [ ] Configuration réseau documentée (VLAN, plages, gateways)
- [ ] Coordonnées de l'astreinte ANINF
- [ ] Convention d'hébergement signée
- [ ] DPA signé

### 1.2 Vérification de la connectivité

Depuis un poste équipé de la clé privée fournie :

```bash
# Test connexion sur toutes les VMs (via IPs privées, depuis bastion attendu)
for vm in lb-01 lb-02 app-01 app-02 db-01 db-02 storage-01 bastion-01; do
  ssh -o StrictHostKeyChecking=no deploy@$vm-ip "hostname && uptime"
done
```

### 1.3 Vérification des ressources

Sur chaque VM :

```bash
# CPU
nproc

# Mémoire
free -h

# Stockage
lsblk
df -h

# Réseau
ip addr
ip route
```

### 1.4 Récupération des identifiants réseau

Consigner dans un fichier chiffré (Vault ou pass-manager) :

```
lb-01           : 10.100.0.1  (VIP: 10.100.0.10)
lb-02           : 10.100.0.2
app-01          : 10.100.1.11
app-02          : 10.100.1.12
db-01           : 10.100.2.11  (primary)
db-02           : 10.100.2.12  (replica)
storage-01      : 10.100.2.21
bastion-01      : 10.100.3.1   (public: <IP publique>)

VPN WireGuard   : port 51820 UDP sur bastion-01
DNS interne     : <serveur DNS ANINF>
NTP interne     : <serveur NTP ANINF>
```

### 1.5 Livrables Jour 1

- Liste des VMs vérifiées et documentées
- Fichier `hosts.yml` Ansible avec les IPs
- Confirmation écrite ANINF de bonne réception

---

## Jour 2 — Configuration système commune

### 2.1 Préparation du playbook Ansible

Sur le poste de bootstrap (portable de l'équipe) :

```bash
mkdir -p ~/allo-eau-deploy/{inventories,playbooks,roles,vars}
cd ~/allo-eau-deploy

cat > inventories/production.yml <<'YAML'
all:
  vars:
    ansible_user: deploy
    ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
  children:
    load_balancers:
      hosts:
        lb-01: { ansible_host: 10.100.0.1 }
        lb-02: { ansible_host: 10.100.0.2 }
    application:
      hosts:
        app-01: { ansible_host: 10.100.1.11 }
        app-02: { ansible_host: 10.100.1.12 }
    database:
      hosts:
        db-01: { ansible_host: 10.100.2.11, patroni_role: primary }
        db-02: { ansible_host: 10.100.2.12, patroni_role: replica }
    storage:
      hosts:
        storage-01: { ansible_host: 10.100.2.21 }
    bastion:
      hosts:
        bastion-01: { ansible_host: 10.100.3.1 }
YAML
```

### 2.2 Playbook de base — toutes les VMs

```bash
cat > playbooks/common.yml <<'YAML'
- hosts: all
  become: yes
  tasks:
    - name: Set timezone
      timezone: { name: Africa/Libreville }

    - name: Install base packages
      apt:
        name:
          - curl
          - wget
          - vim
          - htop
          - iotop
          - jq
          - git
          - chrony
          - ufw
          - fail2ban
          - unattended-upgrades
          - net-tools
        state: present
        update_cache: yes

    - name: Enable NTP
      systemd: { name: chrony, enabled: yes, state: started }

    - name: Configure SSH port 2222
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?Port '
        line: 'Port 2222'
      notify: restart ssh

    - name: Disable password authentication
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PasswordAuthentication '
        line: 'PasswordAuthentication no'
      notify: restart ssh

    - name: Disable root login
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PermitRootLogin '
        line: 'PermitRootLogin no'
      notify: restart ssh

    - name: Enable UFW
      ufw:
        state: enabled
        policy: deny

    - name: Allow SSH from admin VLAN
      ufw:
        rule: allow
        port: '2222'
        proto: tcp
        src: '10.100.3.0/24'

    - name: Configure automatic security updates
      copy:
        dest: /etc/apt/apt.conf.d/20auto-upgrades
        content: |
          APT::Periodic::Update-Package-Lists "1";
          APT::Periodic::Unattended-Upgrade "1";

    - name: Enable fail2ban
      systemd: { name: fail2ban, enabled: yes, state: started }

  handlers:
    - name: restart ssh
      systemd: { name: ssh, state: restarted }
YAML

# Exécution
ansible-playbook -i inventories/production.yml playbooks/common.yml
```

### 2.3 Vérifications post-installation

```bash
ansible all -i inventories/production.yml -m shell -a 'timedatectl && systemctl status chrony fail2ban ufw | head -20'
```

---

## Jour 3 — Bastion et VPN

### 3.1 Installation Docker sur le bastion

```bash
ssh -p 2222 deploy@bastion-01
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
exit  # relogin pour prendre le groupe docker en compte
```

### 3.2 Installation K3s control-plane

```bash
# Sur bastion-01
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="v1.30.6+k3s1" \
  INSTALL_K3S_EXEC="server --disable=traefik --write-kubeconfig-mode=644 --cluster-init --tls-san=bastion-01" sh -

# Récupération du token pour joindre les workers
sudo cat /var/lib/rancher/k3s/server/node-token
# À conserver en secret (Vault) : sera utilisé J4

# Vérification
sudo k3s kubectl get nodes
```

### 3.3 Installation de kubectl, helm, k9s en natif

```bash
# kubectl (utilisation sans sudo)
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown deploy:deploy ~/.kube/config

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# k9s
KV="v0.32.5"
wget https://github.com/derailed/k9s/releases/download/${KV}/k9s_Linux_amd64.tar.gz
tar xf k9s_Linux_amd64.tar.gz && sudo mv k9s /usr/local/bin/
```

### 3.4 Installation WireGuard

```bash
sudo apt install -y wireguard qrencode

# Génération de la paire de clés serveur
sudo mkdir -p /etc/wireguard
cd /etc/wireguard
sudo umask 077
wg genkey | sudo tee server_priv.key | wg pubkey | sudo tee server_pub.key

# Configuration serveur
sudo cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = $(sudo cat /etc/wireguard/server_priv.key)
PostUp = ufw route allow in on wg0 out on eth0
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = ufw route delete allow in on wg0 out on eth0
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Chaque admin aura son [Peer]
EOF

# Ouvrir port UDP 51820
sudo ufw allow 51820/udp

# Activer
sudo systemctl enable --now wg-quick@wg0
```

### 3.5 Ajout d'un premier admin au VPN

Sur le poste de l'admin :

```bash
wg genkey | tee admin1_priv.key | wg pubkey > admin1_pub.key
```

Transmettre `admin1_pub.key` au bastion. Sur le bastion :

```bash
sudo cat >> /etc/wireguard/wg0.conf <<EOF

[Peer]
# admin1
PublicKey = <contenu admin1_pub.key>
AllowedIPs = 10.200.0.10/32
EOF

sudo systemctl restart wg-quick@wg0
```

### 3.6 Installation HashiCorp Vault

```bash
# Repository
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install -y vault

# Configuration
sudo cat > /etc/vault.d/vault.hcl <<'EOF'
storage "raft" {
  path    = "/opt/vault/data"
  node_id = "bastion-01"
}
listener "tcp" {
  address       = "127.0.0.1:8200"
  tls_disable   = "true"
}
api_addr = "http://127.0.0.1:8200"
cluster_addr = "https://127.0.0.1:8201"
ui = true
EOF

sudo systemctl enable --now vault

# Initialisation (à faire UNE SEULE FOIS, conserver les clés en sécurité extrême)
export VAULT_ADDR='http://127.0.0.1:8200'
vault operator init -key-shares=5 -key-threshold=3
```

**IMPORTANT** : Les 5 clés Shamir doivent être conservées séparément par 5 personnes différentes. La récupération nécessite au moins 3 des 5 clés. Le `Initial Root Token` doit être stocké dans un coffre physique.

### 3.7 Test complet Jour 3

```bash
# Depuis un poste admin avec le VPN configuré
sudo wg-quick up admin-config.conf

# Test SSH via VPN
ssh -p 2222 deploy@10.100.3.1  # bastion via IP interne

# Test Kubernetes
export KUBECONFIG=~/.kube/allo-eau-config  # copie depuis bastion
kubectl get nodes  # doit afficher bastion-01 en Ready

# Test Vault
vault status
```

---

## Jour 4 — Cluster K3s complet

### 4.1 Ajout des workers `app-01` et `app-02`

```bash
# Sur bastion-01, récupérer le token
K3S_TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)

# Depuis un shell ansible, propager le token comme variable secrète
# et lancer :

ansible application -i inventories/production.yml -b -m shell -a "
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION='v1.30.6+k3s1' \
  K3S_URL='https://10.100.3.1:6443' \
  K3S_TOKEN='${K3S_TOKEN}' sh -s - agent
"

# Vérification depuis le bastion
kubectl get nodes
# Doit afficher : bastion-01, app-01, app-02 — tous Ready
```

### 4.2 Étiquettes des nœuds

```bash
kubectl label node app-01 role=worker workload=applications
kubectl label node app-02 role=worker workload=applications
kubectl label node bastion-01 role=control-plane
```

### 4.3 Installation cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --version v1.15.0

# Vérification
kubectl get pods -n cert-manager
```

### 4.4 Installation Traefik (ingress)

K3s inclut Traefik par défaut mais nous l'avons désactivé (`--disable=traefik`) pour installer notre propre version configurable.

```bash
helm repo add traefik https://helm.traefik.io/traefik
helm repo update

cat > /tmp/traefik-values.yaml <<'YAML'
deployment:
  replicas: 2
service:
  type: LoadBalancer
  annotations:
    # Traefik écoute sur les IPs privées, HAProxy sur les LB fait le NAT public
    metallb.io/loadBalancerIPs: 10.100.1.100
ports:
  web:
    port: 8080
    exposedPort: 8080
  websecure:
    port: 8443
    exposedPort: 8443
    tls:
      enabled: true
additionalArguments:
  - --entrypoints.web.http.redirections.entrypoint.to=websecure
  - --entrypoints.web.http.redirections.entrypoint.scheme=https
  - --serverstransport.insecureskipverify=false
providers:
  kubernetesIngress:
    publishedService:
      enabled: true
YAML

helm install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --values /tmp/traefik-values.yaml \
  --version 30.0.0
```

### 4.5 Installation Longhorn (stockage distribué)

```bash
# Prérequis sur les workers
ansible application -i inventories/production.yml -b -m shell -a "
apt install -y open-iscsi nfs-common
systemctl enable --now iscsid
"

helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultReplicaCount=2 \
  --set defaultSettings.backupTarget=s3://allo-eau-backups@libreville/ \
  --version 1.7.0

# Vérification (peut prendre 3-5 min)
kubectl -n longhorn-system get pods
```

### 4.6 Configuration MetalLB (optionnel si l'ANINF ne fournit pas de LB natif)

MetalLB assure les IPs des services de type `LoadBalancer` sur bare metal.

```bash
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb --namespace metallb-system --create-namespace

cat > /tmp/metallb-pool.yaml <<'YAML'
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.100.1.100-10.100.1.110
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2
  namespace: metallb-system
YAML
kubectl apply -f /tmp/metallb-pool.yaml
```

### 4.7 Namespaces applicatifs

```bash
kubectl create namespace allo-eau
kubectl create namespace supabase
kubectl create namespace monitoring
kubectl create namespace logging
```

---

## Jour 5 — Cluster Postgres haute disponibilité

### 5.1 Installation Postgres 17 sur `db-01` et `db-02`

```bash
# Ansible playbook dédié
cat > playbooks/postgres.yml <<'YAML'
- hosts: database
  become: yes
  vars:
    pg_version: 17
  tasks:
    - name: Add PGDG repository
      shell: |
        sh -c "echo 'deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main' > /etc/apt/sources.list.d/pgdg.list"
        curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
        apt update

    - name: Install PostgreSQL {{ pg_version }} + extensions
      apt:
        name:
          - postgresql-{{ pg_version }}
          - postgresql-{{ pg_version }}-postgis-3
          - postgresql-{{ pg_version }}-cron
          - postgresql-contrib-{{ pg_version }}
          - postgresql-{{ pg_version }}-pgsodium
          - pgbouncer
          - patroni
          - etcd-server
        state: present

    - name: Stop postgres (Patroni va le gérer)
      systemd: { name: postgresql, state: stopped, enabled: no }
YAML

ansible-playbook -i inventories/production.yml playbooks/postgres.yml
```

### 5.2 Configuration etcd (backend Patroni)

```bash
# Sur db-01 ET db-02, configurer etcd
sudo cat > /etc/default/etcd <<EOF
ETCD_NAME="db-01"                      # à personnaliser par host
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_LISTEN_PEER_URLS="http://10.100.2.11:2380"
ETCD_LISTEN_CLIENT_URLS="http://10.100.2.11:2379,http://127.0.0.1:2379"
ETCD_INITIAL_ADVERTISE_PEER_URLS="http://10.100.2.11:2380"
ETCD_ADVERTISE_CLIENT_URLS="http://10.100.2.11:2379"
ETCD_INITIAL_CLUSTER="db-01=http://10.100.2.11:2380,db-02=http://10.100.2.12:2380"
ETCD_INITIAL_CLUSTER_TOKEN="allo-eau-etcd-token"
ETCD_INITIAL_CLUSTER_STATE="new"
EOF

sudo systemctl enable --now etcd
etcdctl --endpoints=http://10.100.2.11:2379 member list
```

### 5.3 Configuration Patroni

```bash
# Sur db-01
sudo cat > /etc/patroni/config.yml <<'EOF'
scope: allo-eau-cluster
name: db-01

restapi:
  listen: 10.100.2.11:8008
  connect_address: 10.100.2.11:8008

etcd:
  hosts: 10.100.2.11:2379,10.100.2.12:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        wal_level: replica
        hot_standby: 'on'
        wal_keep_size: 512
        max_wal_senders: 10
        max_replication_slots: 10
        max_connections: 500
        shared_preload_libraries: 'pg_cron,pg_stat_statements,pgsodium'
        cron.database_name: 'postgres'

  initdb:
    - encoding: UTF8
    - data-checksums

  pg_hba:
    - host replication replicator 10.100.2.0/24 md5
    - host all all 10.100.1.0/24 md5      # depuis VLAN applicatif
    - host all all 10.100.3.0/24 md5      # depuis bastion

  users:
    admin:
      password: <mdp_admin_généré>
      options:
        - createrole
        - createdb
    replicator:
      password: <mdp_replicator_généré>
      options:
        - replication

postgresql:
  listen: 10.100.2.11:5432
  connect_address: 10.100.2.11:5432
  data_dir: /var/lib/postgresql/17/main
  bin_dir: /usr/lib/postgresql/17/bin
  authentication:
    replication:
      username: replicator
      password: <mdp_replicator_généré>
    superuser:
      username: postgres
      password: <mdp_postgres_généré>

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
EOF

# Fichier identique sur db-02 avec nom "db-02" et IP correspondante
sudo systemctl enable --now patroni
```

### 5.4 Vérification cluster Patroni

```bash
patronictl -c /etc/patroni/config.yml list
# +-----------+-----------+---------------+---------+---------+----+-----------+
# | Member    | Host      | Role          | State   | TL | Lag in MB |
# +-----------+-----------+---------------+---------+---------+----+-----------+
# | db-01     | 10.100.2.11 | Leader      | running |  1 |         0 |
# | db-02     | 10.100.2.12 | Replica     | running |  1 |         0 |
# +-----------+-----------+---------------+---------+---------+----+-----------+
```

### 5.5 Installation PgBouncer

```bash
sudo cat > /etc/pgbouncer/pgbouncer.ini <<'EOF'
[databases]
* = host=10.100.2.11 port=5432

[pgbouncer]
listen_addr = 10.100.2.11
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
server_lifetime = 3600
server_idle_timeout = 600
log_connections = 1
log_disconnections = 1
EOF

sudo systemctl enable --now pgbouncer
```

### 5.6 Initialisation du schéma applicatif

```bash
# Récupérer les migrations depuis le repo Git
git clone git@github.com:roddagod/allo-eau.git /tmp/allo-eau
cd /tmp/allo-eau/supabase/migrations

# Appliquer dans l'ordre alphabétique
for f in *.sql; do
  PGPASSWORD=<mdp_postgres_généré> psql -h 10.100.2.11 -U postgres < $f
done
```

### 5.7 Configuration des sauvegardes wal-g

```bash
# Sur db-01 uniquement
sudo apt install -y wal-g

sudo cat > /etc/wal-g/wal-g.json <<'EOF'
{
  "AWS_ACCESS_KEY_ID": "<minio_access_key>",
  "AWS_SECRET_ACCESS_KEY": "<minio_secret_key>",
  "AWS_ENDPOINT": "http://storage-01.allo-eau.internal:9000",
  "WALG_S3_PREFIX": "s3://allo-eau-backups/postgres",
  "PGHOST": "/var/run/postgresql",
  "PGUSER": "postgres"
}
EOF

# Backup complet initial
sudo -u postgres wal-g backup-push /var/lib/postgresql/17/main

# Cron quotidien
echo "0 3 * * * postgres wal-g backup-push /var/lib/postgresql/17/main" \
  | sudo tee /etc/cron.d/wal-g-backup
```

---

## Jour 6 — Suite Supabase self-hostée

### 6.1 Génération des secrets JWT

```bash
# Génération des clés JWT nécessaires (Supabase utilise HMAC SHA256)
JWT_SECRET=$(openssl rand -base64 64)

# Génération des tokens anon et service_role
docker run --rm -e JWT_SECRET="$JWT_SECRET" -e ROLE=anon -e EXP=1893456000 \
  supabase/gotrue:v2.170.0 gotrue jwt encode --json '{"role":"anon"}'

docker run --rm -e JWT_SECRET="$JWT_SECRET" -e ROLE=service_role -e EXP=1893456000 \
  supabase/gotrue:v2.170.0 gotrue jwt encode --json '{"role":"service_role"}'

# Stocker JWT_SECRET, ANON_KEY et SERVICE_ROLE_KEY dans Vault
vault kv put secret/allo-eau/supabase jwt=$JWT_SECRET anon=$ANON_KEY sr=$SR_KEY
```

### 6.2 ConfigMap et Secrets Kubernetes

```bash
# Secret contenant les identifiants DB et JWT
kubectl create secret generic supabase-db-secret \
  --namespace supabase \
  --from-literal=host=10.100.2.11 \
  --from-literal=port=6432 \
  --from-literal=database=postgres \
  --from-literal=user=postgres \
  --from-literal=password="<mdp_postgres>"

kubectl create secret generic supabase-jwt \
  --namespace supabase \
  --from-literal=secret="$JWT_SECRET" \
  --from-literal=anon-key="$ANON_KEY" \
  --from-literal=service-role-key="$SR_KEY"
```

### 6.3 Déploiement de la stack Supabase

Repo de manifests dédié (à créer sur GitHub ou Gitea auto-hébergé). Structure :

```
allo-eau-manifests/
├── supabase/
│   ├── auth.yaml              # GoTrue
│   ├── realtime.yaml
│   ├── storage.yaml
│   ├── postgrest.yaml
│   ├── kong.yaml
│   ├── studio.yaml
│   ├── imgproxy.yaml
│   └── meta.yaml
├── allo-eau/
│   ├── client.yaml
│   ├── admin.yaml
│   └── driver.yaml
└── ingress/
    └── allo-eau-ingress.yaml
```

Exemple `supabase/auth.yaml` :

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: supabase-auth
  namespace: supabase
spec:
  replicas: 2
  selector:
    matchLabels: { app: supabase-auth }
  template:
    metadata:
      labels: { app: supabase-auth }
    spec:
      containers:
        - name: gotrue
          image: supabase/gotrue:v2.170.0
          ports:
            - containerPort: 9999
          env:
            - name: GOTRUE_API_HOST
              value: "0.0.0.0"
            - name: GOTRUE_API_PORT
              value: "9999"
            - name: GOTRUE_DB_DRIVER
              value: postgres
            - name: GOTRUE_DB_DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: supabase-db-secret
                  key: url
            - name: GOTRUE_SITE_URL
              value: "https://allo-eau.ga"
            - name: GOTRUE_URI_ALLOW_LIST
              value: "https://allo-eau.ga,https://admin.allo-eau.ga,https://livreur.allo-eau.ga"
            - name: GOTRUE_JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: supabase-jwt
                  key: secret
            - name: GOTRUE_JWT_EXP
              value: "3600"
            - name: GOTRUE_JWT_DEFAULT_GROUP_NAME
              value: "authenticated"
            - name: GOTRUE_DISABLE_SIGNUP
              value: "false"
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits: { cpu: 500m, memory: 512Mi }
          livenessProbe:
            httpGet: { path: /health, port: 9999 }
            initialDelaySeconds: 30
          readinessProbe:
            httpGet: { path: /health, port: 9999 }
---
apiVersion: v1
kind: Service
metadata:
  name: supabase-auth
  namespace: supabase
spec:
  selector: { app: supabase-auth }
  ports:
    - port: 9999
      targetPort: 9999
```

### 6.4 Application des manifests

```bash
kubectl apply -f supabase/
kubectl -n supabase get pods -w
```

### 6.5 Vérification Supabase

```bash
# Test Auth
curl -X POST https://api.allo-eau.ga/auth/v1/signup \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@allo-eau.ga","password":"TestPass2026!"}'

# Test PostgREST
curl "https://api.allo-eau.ga/rest/v1/zones?select=name" \
  -H "apikey: $ANON_KEY"

# Test Realtime (avec un client WebSocket)
wscat -c "wss://api.allo-eau.ga/realtime/v1/websocket?apikey=$ANON_KEY&vsn=1.0.0"
```

---

## Jour 7 — Stockage objet MinIO

### 7.1 Installation MinIO sur `storage-01`

```bash
# Sur storage-01
sudo useradd -r minio-user -s /sbin/nologin
sudo mkdir -p /data/minio && sudo chown minio-user:minio-user /data/minio

wget https://dl.min.io/server/minio/release/linux-amd64/minio.deb
sudo dpkg -i minio.deb

sudo cat > /etc/default/minio <<'EOF'
MINIO_ROOT_USER=admin-minio-allo
MINIO_ROOT_PASSWORD=<mdp_très_fort_généré>
MINIO_VOLUMES="/data/minio"
MINIO_OPTS="--console-address :9001 --address :9000"
EOF

sudo systemctl enable --now minio
```

### 7.2 Création des buckets

```bash
# Sur bastion-01
mc alias set aninf http://storage-01:9000 admin-minio-allo <mdp>

mc mb aninf/allo-eau-backups
mc mb aninf/allo-eau-uploads
mc mb aninf/allo-eau-logs

# Chiffrement au repos
mc encrypt set sse-s3 aninf/allo-eau-backups
mc encrypt set sse-s3 aninf/allo-eau-uploads
mc encrypt set sse-s3 aninf/allo-eau-logs

# Politique de rétention
mc ilm add --expiry-days 90 aninf/allo-eau-logs
```

### 7.3 Création d'un compte de service pour les apps

```bash
mc admin user add aninf app-storage-user <mdp_généré>
mc admin policy create aninf allo-eau-storage-policy - <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:*"], "Resource": ["arn:aws:s3:::allo-eau-uploads/*"] },
    { "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": ["arn:aws:s3:::allo-eau-uploads"] }
  ]
}
JSON
mc admin policy attach aninf allo-eau-storage-policy --user app-storage-user
```

### 7.4 Injection des credentials dans Kubernetes

```bash
kubectl create secret generic minio-credentials \
  --namespace supabase \
  --from-literal=access-key=app-storage-user \
  --from-literal=secret-key=<mdp>
```

---

## Jour 8 — Déploiement des 3 applications

### 8.1 Build des images Docker

Dans le repo Git, chaque app a un `Dockerfile`. GitHub Actions builde et pousse dans Harbor à chaque commit sur `main`.

```dockerfile
# apps/client/Dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter client build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/client/.next/standalone ./
COPY --from=builder /app/apps/client/.next/static ./apps/client/.next/static
COPY --from=builder /app/apps/client/public ./apps/client/public
EXPOSE 3000
CMD ["node", "apps/client/server.js"]
```

### 8.2 Deployment client

```yaml
# manifests/allo-eau/client.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: allo-eau-client
  namespace: allo-eau
spec:
  replicas: 2
  selector:
    matchLabels: { app: allo-eau-client }
  template:
    metadata:
      labels: { app: allo-eau-client }
    spec:
      containers:
        - name: client
          image: harbor.allo-eau.internal/allo-eau/client:latest
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_SUPABASE_URL
              value: "https://api.allo-eau.ga"
            - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
              valueFrom: { secretKeyRef: { name: supabase-jwt, key: anon-key } }
            - name: SUPABASE_SERVICE_ROLE_KEY
              valueFrom: { secretKeyRef: { name: supabase-jwt, key: service-role-key } }
            - name: DATABASE_URL
              value: "postgres://postgres:<pwd>@10.100.2.11:6432/postgres"
            - name: NEXT_PUBLIC_CLIENT_URL
              value: "https://allo-eau.ga"
            - name: NEXT_PUBLIC_ADMIN_URL
              value: "https://admin.allo-eau.ga"
            - name: NEXT_PUBLIC_DRIVER_URL
              value: "https://livreur.allo-eau.ga"
            - name: WIREPICK_CLIENT
              valueFrom: { secretKeyRef: { name: wirepick, key: client } }
            - name: WIREPICK_PASSWORD
              valueFrom: { secretKeyRef: { name: wirepick, key: password } }
            - name: WIREPICK_FROM
              value: "ALLO-EAU"
          resources:
            requests: { cpu: 100m, memory: 256Mi }
            limits: { cpu: 1000m, memory: 1Gi }
          livenessProbe:
            httpGet: { path: /api/health, port: 3000 }
            initialDelaySeconds: 30
          readinessProbe:
            httpGet: { path: /api/health, port: 3000 }
---
apiVersion: v1
kind: Service
metadata:
  name: allo-eau-client
  namespace: allo-eau
spec:
  selector: { app: allo-eau-client }
  ports: [{ port: 80, targetPort: 3000 }]
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: allo-eau-client-hpa
  namespace: allo-eau
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: allo-eau-client
  minReplicas: 2
  maxReplicas: 12
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

Reproduire pour `admin` et `driver` avec noms et sous-domaines correspondants.

### 8.3 Ingress (routage HTTP)

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata: { name: letsencrypt-prod }
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@allo-eau.ga
    privateKeySecretRef: { name: letsencrypt-prod }
    solvers:
      - http01:
          ingress: { class: traefik }
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: allo-eau-ingress
  namespace: allo-eau
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.tls: "true"
spec:
  tls:
    - hosts:
        - allo-eau.ga
        - admin.allo-eau.ga
        - livreur.allo-eau.ga
      secretName: allo-eau-tls
  rules:
    - host: allo-eau.ga
      http:
        paths: [{ path: /, pathType: Prefix, backend: { service: { name: allo-eau-client, port: { number: 80 } } } }]
    - host: admin.allo-eau.ga
      http:
        paths: [{ path: /, pathType: Prefix, backend: { service: { name: allo-eau-admin, port: { number: 80 } } } }]
    - host: livreur.allo-eau.ga
      http:
        paths: [{ path: /, pathType: Prefix, backend: { service: { name: allo-eau-driver, port: { number: 80 } } } }]
```

---

## Jour 9 — Observabilité et logs

### Choix : Grafana + Loki OU OpenSearch (ELK)

#### Option A — Grafana + Loki (recommandée palier 1 et 2)

```bash
# Prometheus + Grafana via kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

cat > /tmp/prom-values.yaml <<'YAML'
grafana:
  adminPassword: <mdp_grafana>
  persistence:
    enabled: true
    storageClassName: longhorn
    size: 10Gi
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: longhorn
          resources: { requests: { storage: 100Gi } }
alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: longhorn
          resources: { requests: { storage: 10Gi } }
YAML

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values /tmp/prom-values.yaml \
  --version 62.0.0

# Loki
helm repo add grafana https://grafana.github.io/helm-charts

cat > /tmp/loki-values.yaml <<'YAML'
loki:
  auth_enabled: false
  storage:
    type: s3
    s3:
      endpoint: storage-01.allo-eau.internal:9000
      bucketNames:
        chunks: allo-eau-logs
        ruler: allo-eau-logs
      accessKeyId: <minio_key>
      secretAccessKey: <minio_secret>
      s3ForcePathStyle: true
      insecure: true
  schema_config:
    configs:
      - from: 2026-07-01
        store: boltdb-shipper
        object_store: s3
        schema: v12
        index:
          prefix: index_
          period: 24h
YAML

helm install loki grafana/loki --namespace logging --values /tmp/loki-values.yaml

# Promtail (DaemonSet — 1 pod par nœud)
helm install promtail grafana/promtail \
  --namespace logging \
  --set config.clients[0].url=http://loki.logging.svc.cluster.local:3100/loki/api/v1/push
```

**Dashboards Grafana à importer** (via UI ou provisioning) :

- `Node Exporter Full` — ID 1860
- `Kubernetes Cluster` — ID 15757
- `Postgres Overview` — ID 9628
- `Loki Explore` — natif
- Dashboard maison "Allô Eau — Commandes / Livreurs" (à créer)

#### Option B — OpenSearch (ELK) — palier 3 ou exigence institutionnelle

```bash
helm repo add opensearch https://opensearch-project.github.io/helm-charts

# Cluster OpenSearch (3 nœuds pour la HA)
cat > /tmp/opensearch-values.yaml <<'YAML'
clusterName: "allo-eau-logs"
nodeGroup: "master"
replicas: 3
resources:
  requests: { cpu: 1000m, memory: 4Gi }
  limits: { cpu: 2000m, memory: 8Gi }
persistence:
  enabled: true
  storageClass: longhorn
  size: 200Gi
extraEnvs:
  - name: OPENSEARCH_INITIAL_ADMIN_PASSWORD
    value: <mdp_fort>
YAML

helm install opensearch opensearch/opensearch \
  --namespace logging \
  --values /tmp/opensearch-values.yaml

# OpenSearch Dashboards (Kibana-like)
helm install opensearch-dashboards opensearch/opensearch-dashboards \
  --namespace logging

# Fluent Bit pour collecter les logs
helm repo add fluent https://fluent.github.io/helm-charts

cat > /tmp/fluentbit-values.yaml <<'YAML'
config:
  outputs: |
    [OUTPUT]
        Name  opensearch
        Match kube.*
        Host  opensearch-cluster-master.logging.svc.cluster.local
        Port  9200
        Index allo-eau-kube
        Type  _doc
        Suppress_Type_Name On
        HTTP_User admin
        HTTP_Passwd <mdp>
        tls On
        tls.verify Off
YAML

helm install fluent-bit fluent/fluent-bit --namespace logging --values /tmp/fluentbit-values.yaml
```

**Avantages OpenSearch** :

- Recherche full-text sur 30+ jours de logs
- ML anomaly detection (paquet Security)
- Alerting complexe (SLA breach, tendances)

**Coût** : ~30 Go de RAM et 600 Go de stockage pour un usage confortable.

### 9.2 Configuration Alertmanager

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yaml: |
    route:
      group_by: ['alertname', 'severity']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'default'
      routes:
        - match: { severity: critical }
          receiver: 'oncall-sms'
        - match: { severity: warning }
          receiver: 'email-ops'
    receivers:
      - name: 'default'
        email_configs:
          - to: 'ops@allo-eau.ga'
      - name: 'oncall-sms'
        webhook_configs:
          - url: 'http://wirepick-webhook.allo-eau.svc.cluster.local/sms'
        email_configs:
          - to: 'astreinte@allo-eau.ga'
      - name: 'email-ops'
        email_configs:
          - to: 'ops@allo-eau.ga'
```

### 9.3 Règles d'alerte

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: allo-eau-rules
  namespace: monitoring
spec:
  groups:
    - name: infrastructure
      rules:
        - alert: DiskFillingUp
          expr: (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes) < 0.15
          for: 5m
          labels: { severity: critical }
          annotations: { summary: "Disque {{ $labels.mountpoint }} < 15% libre" }

        - alert: HighCPU
          expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
          for: 10m
          labels: { severity: warning }

        - alert: PodCrashLooping
          expr: rate(kube_pod_container_status_restarts_total[15m]) * 60 * 15 > 3
          for: 5m
          labels: { severity: critical }

        - alert: PostgresPrimaryDown
          expr: pg_up{role="primary"} == 0
          for: 1m
          labels: { severity: critical }
```

---

## Jour 10 — Sécurité renforcée

### 10.1 WAF ModSecurity

```bash
# Sur les LB, en frontal HAProxy
sudo apt install -y libmodsecurity3 modsecurity-crs

sudo cat >> /etc/haproxy/haproxy.cfg <<'EOF'
frontend allo-eau-https
    bind *:443 ssl crt /etc/haproxy/certs/
    filter spoe engine modsecurity config /etc/haproxy/spoe-modsec.conf
    http-request deny if { var(txn.modsec.code) -m int gt 0 }
    default_backend k3s-workers
EOF
```

### 10.2 Wazuh SIEM

```bash
# Manager sur bastion-01
docker run -d --name wazuh-manager \
  -p 1514:1514 -p 1515:1515 -p 55000:55000 \
  wazuh/wazuh-manager:4.9.0

# Agent sur toutes les autres VMs (via Ansible)
ansible-playbook -i inventories/production.yml playbooks/wazuh-agents.yml
```

### 10.3 Scan de vulnérabilités OpenVAS

```bash
# Sur bastion-01
docker run -d --name openvas -p 8443:9392 immauss/openvas
# Configuration : cibles = toutes les IPs internes, scan mensuel programmé
```

### 10.4 Rotation automatique des secrets

Script Vault + Ansible programmé tous les 90 jours pour :
- Régénération des mots de passe Postgres
- Régénération des tokens JWT
- Régénération des clés MinIO
- Redéploiement rolling des pods concernés

---

## Jour 11 — CI/CD

### 11.1 Harbor registry auto-hébergé

```bash
# Sur bastion-01 (ou VM dédiée si volume important)
helm repo add harbor https://helm.goharbor.io

cat > /tmp/harbor-values.yaml <<'YAML'
expose:
  type: ingress
  ingress:
    hosts: { core: harbor.allo-eau.internal }
  tls: { enabled: true }
harborAdminPassword: <mdp>
persistence:
  persistentVolumeClaim:
    registry: { storageClass: longhorn, size: 200Gi }
    database: { storageClass: longhorn, size: 20Gi }
YAML

helm install harbor harbor/harbor --namespace harbor --create-namespace --values /tmp/harbor-values.yaml
```

### 11.2 GitHub Actions CI

`.github/workflows/deploy.yml` :

```yaml
name: Build and deploy
on: { push: { branches: [main] } }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint && pnpm run test && pnpm run build

      - uses: docker/login-action@v3
        with:
          registry: harbor.allo-eau.internal
          username: ci-user
          password: ${{ secrets.HARBOR_CI_PASSWORD }}

      - run: |
          for app in client admin driver; do
            docker build -f apps/$app/Dockerfile \
              -t harbor.allo-eau.internal/allo-eau/$app:${GITHUB_SHA::7} \
              -t harbor.allo-eau.internal/allo-eau/$app:latest .
            docker push harbor.allo-eau.internal/allo-eau/$app:${GITHUB_SHA::7}
            docker push harbor.allo-eau.internal/allo-eau/$app:latest
          done

      - name: Update manifests repo
        run: |
          git clone git@github.com:roddagod/allo-eau-manifests.git
          cd allo-eau-manifests
          for app in client admin driver; do
            yq -i ".spec.template.spec.containers[0].image = \"harbor.allo-eau.internal/allo-eau/$app:${GITHUB_SHA::7}\"" allo-eau/$app.yaml
          done
          git commit -am "deploy: ${GITHUB_SHA::7}"
          git push
```

### 11.3 ArgoCD GitOps

```bash
helm install argocd argo/argo-cd --namespace argocd --create-namespace

# Application ArgoCD
cat > /tmp/argocd-app.yaml <<'YAML'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: allo-eau
  namespace: argocd
spec:
  project: default
  source:
    repoURL: git@github.com:roddagod/allo-eau-manifests.git
    targetRevision: HEAD
    path: allo-eau
  destination:
    server: https://kubernetes.default.svc
    namespace: allo-eau
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true]
YAML
kubectl apply -f /tmp/argocd-app.yaml
```

---

## Jour 12 — Tests de charge

### 12.1 Outillage k6

```bash
docker run --rm -i grafana/k6 run - <<'JS'
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },   // palier 2 = 200 req/s
    { duration: '3m', target: 1000 },  // palier 3 = 500 req/s + marge
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  http.get('https://allo-eau.ga/');
  http.get('https://allo-eau.ga/commander');
  sleep(1);
}
JS
```

### 12.2 Critères de succès

- P95 latence < 500 ms sur endpoints publics
- Aucune erreur 5xx
- HPA scale up sans dépasser 12 réplicas
- Postgres reste à < 60 % de charge CPU

---

## Jour 13 — Tests de PRA

### 13.1 Bascule LB

```bash
# Depuis un poste externe
watch -n 1 'curl -s -o /dev/null -w "%{http_code}\n" https://allo-eau.ga'

# Sur lb-01, arrêter keepalived
sudo systemctl stop keepalived
# → l'IP flottante bascule sur lb-02 en < 5 s
```

### 13.2 Bascule Postgres

```bash
# Sur db-01, arrêt du service Patroni
sudo systemctl stop patroni

# Vérifier depuis bastion-01
patronictl -c /etc/patroni/config.yml list
# → db-02 devient Leader
```

### 13.3 Restauration PITR

```bash
# Simulation : suppression accidentelle d'une table
psql -h 10.100.2.11 -U postgres -c "DROP TABLE orders CASCADE;"

# Restauration à un point antérieur
sudo -u postgres wal-g backup-fetch /var/lib/postgresql/17/main LATEST
# + application des WAL jusqu'au timestamp souhaité
sudo systemctl restart patroni
```

### 13.4 Panne applicative

```bash
# Killer un pod, vérifier redéploiement automatique
kubectl -n allo-eau delete pod -l app=allo-eau-client --grace-period=0 --force
kubectl -n allo-eau get pods -w
# → K8s redéploie en < 30 s
```

---

## Jour 14 — Go-live

### 14.1 Checklist finale

Passage en revue de la [checklist de recette technique](#16-checklist-de-recette-technique) — 100 % des cases cochées.

### 14.2 Bascule DNS

Modification chez le registrar de `allo-eau.ga` :

```
allo-eau.ga.        A     <IP_publique_ANINF>
admin.allo-eau.ga.  A     <IP_publique_ANINF>
livreur.allo-eau.ga. A    <IP_publique_ANINF>
api.allo-eau.ga.    A     <IP_publique_ANINF>
```

TTL abaissé à 60 secondes 24h avant, remonté à 3600 s 48h après stabilisation.

### 14.3 Communication

- SMS et email d'annonce au Ministère, aux sociétés opératrices, et au Centre d'Opérations
- Communiqué de presse ministériel
- Formation Live des équipes Centre d'Opérations

### 14.4 Surveillance renforcée H+72

- Astreinte niveau 1 activée jour et nuit
- Point de situation toutes les 4h
- Rollback ready si incident majeur (bascule DNS vers Supabase cloud en fallback)

---

## Ressources et outillage nécessaires

### Compétences humaines requises

| Rôle | ETP durant déploiement | ETP en régime nominal |
|---|---|---|
| Ingénieur SRE / DevOps senior | 1,0 | 0,3 |
| Développeur Next.js / TypeScript | 0,5 | 0,2 |
| Administrateur système Linux | 0,5 | 0,2 |
| Ingénieur sécurité | 0,3 | 0,1 |
| Chef de projet technique | 0,5 | 0,2 |

### Outillage à approvisionner

- 1 licence Harbor Enterprise (optionnel, open source suffit)
- 1 compte Wirepick avec quota SMS ajusté
- 1 compte GitHub Enterprise ou GitLab self-hosted
- Postes de travail pour l'équipe de déploiement avec accès VPN

---

## Documents à produire durant le déploiement

À la fin des 14 jours, doivent exister :

1. **Dossier d'exploitation** — architecture cible, procédures, runbooks
2. **PSSI-A** (Politique de Sécurité du Système d'Information Applicative)
3. **PRA/PCA** documenté et testé
4. **Rapport de recette** signé par les 3 parties (ANINF, Milliminds, Ministère)
5. **Convention SLA** avec engagements et pénalités
6. **Registre des traitements** RGPD-compatible
7. **Rapport de tests de charge** consolidé
8. **Rapport de tests de PRA** consolidé
9. **Cartographie des accès** — matrice qui a accès à quoi
10. **Documentation d'exploitation** — remise à l'équipe ANINF

---

## Annexe C — Modèle de fichier `.env` production

À stocker dans Vault, jamais en clair :

```
# Base de données
DATABASE_URL=postgres://postgres:<pwd>@10.100.2.11:6432/postgres
DIRECT_URL=postgres://postgres:<pwd>@10.100.2.11:5432/postgres

# Supabase (self-hosted)
NEXT_PUBLIC_SUPABASE_URL=https://api.allo-eau.ga
NEXT_PUBLIC_SUPABASE_ANON_KEY=<jwt-anon>
SUPABASE_SERVICE_ROLE_KEY=<jwt-service>
SUPABASE_JWT_SECRET=<jwt-secret>

# URLs applicatives
NEXT_PUBLIC_CLIENT_URL=https://allo-eau.ga
NEXT_PUBLIC_ADMIN_URL=https://admin.allo-eau.ga
NEXT_PUBLIC_DRIVER_URL=https://livreur.allo-eau.ga

# SMS (Wirepick)
WIREPICK_CLIENT=<login>
WIREPICK_PASSWORD=<mdp>
WIREPICK_FROM=ALLO-EAU

# MinIO
S3_ENDPOINT=http://storage-01.allo-eau.internal:9000
S3_ACCESS_KEY=<access>
S3_SECRET_KEY=<secret>
S3_BUCKET=allo-eau-uploads

# Sécurité
SESSION_SECRET=<random-64-chars>
COOKIE_DOMAIN=.allo-eau.ga
NODE_ENV=production
```

---

*Fin du document — Fiche technique et guide de déploiement Allô Eau sur infrastructure ANINF*
*Version 1.0 — Juillet 2026 — Milliminds pour le Ministère de l'Accès Universel à l'Eau et à l'Énergie*
