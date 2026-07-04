# 🏫 Application de Gestion des Absences Scolaires

Cette application complète vous permet de gérer les absences, les emplois du temps, les classes et les élèves d'un établissement scolaire. Elle comporte un **Frontend en React/Vite (TailwindCSS)** et un **Backend en NestJS (TypeORM)**.

---

## 📋 Prérequis

Pour installer et exécuter l'application, vous aurez besoin de :
- [Node.js](https://nodejs.org/) (v20 ou plus récent)
- [NPM](https://www.npmjs.com/) (généralement fourni avec Node)
- [Docker](https://www.docker.com/) et [Docker Compose](https://docs.docker.com/compose/) (pour l'hébergement conteneurisé avec PostgreSQL)

---

## 🐳 📦 Hébergement Local avec Docker & PostgreSQL (Recommandé)

Cette méthode est idéale pour simuler ou mettre en production l'environnement exact avec une base de données **PostgreSQL** persistante et un gestionnaire de base de données visuel (**Adminer**).

Un fichier `docker-compose.yml` et un `Dockerfile` multi-stage optimisé sont fournis à la racine.

### 1. Démarrage Rapide

Lancez la commande suivante à la racine du projet :
```bash
docker compose up --build -d
```

*Cette commande va :*
1. Configurer une base de données **PostgreSQL 15** saine et sécurisée.
2. Lancer la compilation de l'image de l'application via le `Dockerfile` (multi-stage d'environ 150 Mo).
3. Exécuter le script de seeding automatique au premier démarrage pour injecter les données de test (élèves, enseignants, classes, directeurs, etc.).
4. Lancer l'outil **Adminer** pour vous permettre de naviguer graphiquement dans vos tables.

---

### 2. Accès aux Services Locaux

Une fois les conteneurs démarrés :

| Service | URL locale | Description / Identifiants |
| :--- | :--- | :--- |
| **Interface Web (App)** | **[http://localhost:3000](http://localhost:3000)** | L'application complète en production (Frontend + API). |
| **Gestionnaire de BDD (Adminer)** | **[http://localhost:8080](http://localhost:8080)** | Système: `PostgreSQL` | Serveur: `postgres` <br>Utilisateur: `admin` <br>Mot de passe: `password123` <br>Base de données: `school_absences` |

---

### 3. Commandes utiles de maintenance

* **Voir l'état et les logs en temps réel** :
  ```bash
  docker compose logs -f app
  ```
* **Arrêter la pile Docker sans perdre les données** :
  ```bash
  docker compose down
  ```
* **Arrêter et nettoyer complètement (supprimer volumes de données PostgreSQL)** :
  ```bash
  docker compose down -v
  ```

---

## 🛠️ Exécuter en mode Développement local (via NPM & SQLite)

Si vous préférez exécuter l'application directement en local pour le développement et la modification de code sans exécuter Docker :

### 1. Installer toutes les dépendances
À la racine du projet, cette commande installe automatiquement les dépendances du frontend et du backend :
```bash
npm install
```

### 2. Démarrer en mode développement (avec SQLite auto-configuré)
```bash
npm run dev
```
* Ce script génère une base SQLite locale (`school.sqlite` à la racine de `backend`), injecte les données de tests, lance le backend sur le port `2999` et le frontend en mode HMR (Vite) sur le port `5173`.
* Accédez à l'application de développement sur : **[http://localhost:5173/](http://localhost:5173/)**

### 3. Créer un build de production manuel
```bash
npm run build
npm start
```
* Accédez à l'application construite sur : **[http://localhost:3000/](http://localhost:3000/)**

---

## 🔐 Identifiants de connexion par défaut (Seeding inclus)

La base de données Docker ou locale est automatiquement amorcée (seedée) avec les comptes de démonstration suivants :

* **Administrateur (Admin & Censeur)** :
  * **Email**: `jdupont@school.fr`  
  * **Mot de passe**: `admin123`
  
* **Cadre Administratif** :
  * **Email**: `mleroi@school.fr`  
  * **Mot de passe**: `admin123`

* **Enseignant** :
  * **Email**: `martin.luc@school.fr`  
  * **Mot de passe**: `admin123`

* **Parent d'élève** :
  * **Email**: `p.dubois@mail.fr`  
  * **Mot de passe**: `admin123`

---

## ⚙️ Détails de la Configuration de l'environnement (`.env`)

Vos configurations sont centralisées dans le fichier `.env.example` à la racine. Pour définir des configurations personnalisées hors docker-compose, vous pouvez copier ce fichier en `.env` :
- **DB_TYPE** : `postgres` ou `sqlite`
- **DB_SYNC** : `true` pour que TypeORM synchronise votre schéma d'entités avec PostgreSQL au démarrage.
- **JWT_SECRET** & **JWT_REFRESH_SECRET** : Indispensables d'être définis (et sécurisés) lorsque `NODE_ENV=production` est actif.
