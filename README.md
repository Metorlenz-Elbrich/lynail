# LYDHAS_Nails Studio — Documentation complète

Site web professionnel pour un salon de nail art, avec frontend interactif et backend Node.js complet. Le site permet aux clientes de découvrir les services, réserver un rendez-vous, suivre leur commande, regarder des tutoriels et laisser des avis.

---

## Table des matières

1. [Architecture générale](#1-architecture-générale)
2. [Installation et démarrage](#2-installation-et-démarrage)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Fonctionnalités — Frontend](#4-fonctionnalités--frontend)
   - [Navigation](#41-navigation)
   - [Section Hero](#42-section-hero)
   - [Galerie avec filtres](#43-galerie-avec-filtres)
   - [Lightbox](#44-lightbox)
   - [Services](#45-services)
   - [Espace Tutorat](#46-espace-tutorat)
   - [Formulaire de réservation multi-étapes](#47-formulaire-de-réservation-multi-étapes)
   - [Suivi de commande](#48-suivi-de-commande)
   - [Avis clients](#49-avis-clients)
   - [Formulaire de contact](#410-formulaire-de-contact)
   - [Newsletter](#411-newsletter)
   - [Bouton retour en haut](#412-bouton-retour-en-haut)
   - [Notifications toast](#413-notifications-toast)
5. [Fonctionnalités — Backend (API REST)](#5-fonctionnalités--backend-api-rest)
   - [POST /api/orders](#51-post-apiorders)
   - [GET /api/orders/:num](#52-get-apiordersnum)
   - [GET /api/reviews](#53-get-apireviews)
   - [POST /api/reviews](#54-post-apireviews)
   - [POST /api/contact](#55-post-apicontact)
   - [POST /api/newsletter](#56-post-apinewsletter)
6. [Base de données](#6-base-de-données)
7. [Système d'emails](#7-système-demails)
8. [Configuration](#8-configuration)

---

## 1. Architecture générale

```
Cliente (navigateur)
        │
        │  HTTP / fetch()
        ▼
┌───────────────────────────────┐
│        Express (server.js)    │  ← sert index.html + API REST
│                               │
│  GET  /              → index.html
│  GET  /style.css     → style.css
│  GET  /app.js        → app.js
│                               │
│  POST /api/orders    → créer RDV
│  GET  /api/orders/:n → suivi
│  GET  /api/reviews   → liste avis
│  POST /api/reviews   → nouvel avis
│  POST /api/contact   → message
│  POST /api/newsletter→ inscription
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│       database.js             │  ← store JSON (Node.js natif)
│                               │
│  data/orders.json             │
│  data/reviews.json            │
│  data/contacts.json           │
│  data/newsletter.json         │
└───────────────────────────────┘
        │
        ▼ (optionnel)
┌───────────────────────────────┐
│        Nodemailer             │  ← emails SMTP
│  Confirmation réservation     │
│  Notification salon           │
│  Notification contact         │
└───────────────────────────────┘
```

Le serveur Express remplit deux rôles :
- **Serveur de fichiers statiques** : il sert `index.html`, `style.css` et `app.js` directement depuis la racine du projet.
- **API REST** : il expose 6 routes JSON que le frontend appelle via `fetch()`.

La persistance est assurée par des fichiers JSON dans le dossier `/data/`. Ces fichiers sont créés automatiquement au premier démarrage et pré-remplis avec des données de démonstration.

---

## 2. Installation et démarrage

### Prérequis

- Node.js v18 ou supérieur
- npm

### Étapes

```bash
# 1. Cloner ou télécharger le projet
cd "NAILS ARTS AI"

# 2. Installer les dépendances
npm install

# 3. (Optionnel) Configurer les emails dans .env
#    Voir section Configuration

# 4. Démarrer le serveur
npm start

# Le site est accessible sur :
# http://localhost:3000
```

### Mode développement (rechargement automatique)

```bash
npm run dev
```

### Si le port 3000 est déjà utilisé

```bash
# Windows — trouver le processus
netstat -ano | findstr :3000

# Tuer le processus (remplacer <PID> par le numéro trouvé)
taskkill /PID <PID> /F

# Ou changer le port dans .env
PORT=4000
```

---

## 3. Structure des fichiers

```
NAILS ARTS AI/
│
├── index.html          ← Page HTML unique (toutes les sections)
├── style.css           ← Styles (variables CSS, responsive, animations)
├── app.js              ← Logique frontend (galerie, formulaires, fetch API)
│
├── server.js           ← Serveur Express + toutes les routes API
├── database.js         ← Store JSON : lecture/écriture + seed initial
│
├── package.json        ← Dépendances npm
├── .env                ← Variables d'environnement (port, SMTP)
├── .gitignore          ← Exclut node_modules, .env, data/
│
└── data/               ← Créé automatiquement au démarrage
    ├── orders.json     ← Réservations (dont 3 commandes démo)
    ├── reviews.json    ← Avis clients (dont 6 avis par défaut)
    ├── contacts.json   ← Messages reçus via le formulaire contact
    └── newsletter.json ← Adresses email inscrites
```

### Dépendances npm

| Package | Rôle |
|---------|------|
| `express` | Serveur HTTP et routage API |
| `cors` | Autorise les requêtes cross-origin (utile en dev) |
| `dotenv` | Charge les variables depuis `.env` |
| `nodemailer` | Envoi d'emails via SMTP (optionnel) |
| `nodemon` *(dev)* | Redémarre le serveur à chaque modification |

---

## 4. Fonctionnalités — Frontend

### 4.1 Navigation

**Ce que c'est** : barre de navigation fixe en haut de page avec logo, liens et menu hamburger mobile.

**Comment ça fonctionne :**
- La navbar commence transparente sur le Hero. À partir de 60px de scroll, la classe `.scrolled` est ajoutée : le fond devient blanc, le texte passe en sombre.
- Sur mobile (< 700px), les liens sont masqués. Le bouton hamburger (☰) ajoute la classe `.open` qui les affiche en colonne.
- Chaque clic sur un lien déclenche un smooth scroll vers la section correspondante grâce à `scrollIntoView({ behavior: 'smooth' })`, en fermant le menu mobile si ouvert.

---

### 4.2 Section Hero

**Ce que c'est** : écran d'accueil plein-page avec titre animé, particules flottantes et compteurs statistiques.

**Comment ça fonctionne :**

**Particules** : à l'initialisation, 22 éléments `<span>` sont créés avec des emojis (💅 ✨ 🌸 💎 ⭐ 🩷 💕) positionnés aléatoirement en `position: absolute`. Chacun reçoit une animation CSS `float` avec une durée et un délai aléatoires.

**Compteurs** : un `IntersectionObserver` surveille la section des stats. Quand elle entre dans le viewport (seuil 50%), la fonction `animateCounters()` est déclenchée une seule fois. Elle lit la valeur cible dans `data-target` de chaque `.stat-num` et incrémente le compteur toutes les 25ms jusqu'à atteindre la cible :
- 1200+ clientes
- 350+ modèles
- 5 ans d'expérience

**Boutons** : "Prendre RDV" et "Voir la Galerie" font défiler vers les sections `#commande` et `#galerie`.

---

### 4.3 Galerie avec filtres

**Ce que c'est** : grille de 16 créations de nail art, filtrables par catégorie.

**Comment ça fonctionne :**

Les données de la galerie sont définies dans `app.js` sous forme d'un tableau d'objets `galleryData`, chaque objet ayant un titre, une catégorie et un dégradé CSS (simulant la photo).

Au chargement, `renderGallery('all')` génère toutes les cards en HTML dynamique et les injecte dans `#galleryGrid`. Chaque card est un `<div>` avec :
- Un fond dégradé CSS (`.gallery-bg`)
- Un overlay avec titre et catégorie qui apparaît au survol (`.gallery-overlay`)

**Filtres** : les boutons de filtre (Tous / Gel / Acrylique / Nail Art / Naturel / French) ont chacun un attribut `data-filter`. Au clic, la liste est filtrée avec `.filter()` et la galerie est ré-rendue. Le bouton actif reçoit la classe `.active`.

**Révélation au scroll** : un `IntersectionObserver` avec seuil de 15% ajoute la classe `.visible` sur chaque `.section-header`, `.service-card` et `.contact-item` quand ils entrent dans le viewport, déclenchant une animation `fadeUp`.

---

### 4.4 Lightbox

**Ce que c'est** : visionneuse plein écran qui s'ouvre au clic sur une card de galerie.

**Comment ça fonctionne :**

Un clic sur une card appelle `openLightbox(idx)` avec l'index de l'item dans la liste filtrée courante. La fonction `updateLightbox()` :
1. Applique le dégradé CSS de l'item comme `background` sur l'image
2. Met à jour la légende (`lbCaption`) avec le titre et la catégorie

Navigation :
- Boutons ‹ et › changent `lightboxIndex` et rappellent `updateLightbox()`
- Touches clavier `ArrowLeft`, `ArrowRight` simulent un clic sur les boutons
- Touche `Escape` ou clic sur le fond ferme la lightbox

---

### 4.5 Services

**Ce que c'est** : grille de 6 cartes présentant les prestations avec prix et bouton de réservation.

**Comment ça fonctionne :**

Section purement HTML/CSS. Chaque card "Réserver" est un lien `<a href="#commande">` qui fait défiler vers le formulaire de réservation. La card "Nail Art Premium" a la classe `.featured` qui lui donne une bordure rose et un badge "Populaire". Les animations d'apparition au scroll utilisent le même `IntersectionObserver` que la galerie.

---

### 4.6 Espace Tutorat

**Ce que c'est** : 4 cartes de tutoriels avec niveau, durée, et modal de détail.

**Comment ça fonctionne :**

**Cards** : chaque card affiche un fond coloré, un bouton lecture (▶), le niveau (Débutant / Intermédiaire / Avancé en badge coloré) et la durée.

**Modal** : un clic sur "Regarder" lit l'attribut `data-id` du bouton, cherche les données dans l'objet `tutoData`, puis :
1. Met à jour le titre dans le placeholder vidéo (`#tutoModalTitle`)
2. Injecte la description, le niveau et la durée dans `#tutoModalInfo`
3. Ajoute la classe `.open` au modal (`display: none` → `display: flex`)

Fermeture : bouton ✕, clic en dehors du modal, ou touche `Escape`.

---

### 4.7 Formulaire de réservation multi-étapes

**Ce que c'est** : formulaire en 4 étapes guidées pour réserver un rendez-vous, avec validation à chaque étape.

**Comment ça fonctionne de bout en bout :**

#### Étape 1 — Choix de la prestation
L'utilisatrice sélectionne un service parmi 6 options (cards cliquables avec `<input type="radio">` cachés). Au clic sur "Suivant", la validation vérifie qu'un radio est coché. Si non, un toast d'erreur s'affiche.

#### Étape 2 — Date & Heure
`renderCalendar()` génère un mini-calendrier HTML avec :
- Navigation mois précédent/suivant
- Jours passés désactivés (`.disabled`)
- Jour sélectionné surligné (`.selected`)

Au clic sur un jour, `renderTimeSlots(day)` génère les créneaux horaires (09:00 → 18:00). Certains créneaux sont marqués "pris" (`takenSlots`) et affichés barrés. Un clic sur un créneau disponible le sélectionne et stocke la valeur dans `selectedTime`.

Validation : les deux variables `selectedDate` et `selectedTime` doivent être définies pour continuer.

#### Étape 3 — Informations personnelles
Champs : prénom, nom, email, téléphone, message optionnel. Validation côté client : tous les champs obligatoires doivent être remplis.

#### Étape 4 — Récapitulatif
`buildRecap()` lit les valeurs de tous les inputs et les affiche dans une table de confirmation. L'utilisatrice peut revenir modifier ou confirmer.

#### Confirmation — Envoi à l'API
Au clic sur "Confirmer", un `fetch POST /api/orders` est déclenché avec :
```json
{
  "num": "LN-2026-437",
  "name": "Marie Dupont",
  "service": "Pose Gel (35€)",
  "date": { "day": 25, "month": 3, "year": 2026 },
  "time": "10:00",
  "email": "marie@example.com",
  "phone": "0612345678"
}
```
Le serveur valide, enregistre dans `data/orders.json`, envoie l'email de confirmation (si SMTP configuré) et retourne le numéro de suivi. Le formulaire est remplacé par le message de succès avec le numéro.

Le bouton "Nouvelle réservation" remet tout à zéro (reset du formulaire, réinitialisation des variables `selectedDate` / `selectedTime`, retour à l'étape 1).

---

### 4.8 Suivi de commande

**Ce que c'est** : outil de tracking qui affiche l'état d'avancement d'une réservation.

**Comment ça fonctionne de bout en bout :**

L'utilisatrice saisit son numéro de suivi (ex: `LN-2024-001`) et clique sur "Rechercher" ou appuie sur Entrée. Les boutons de démo pré-remplissent et lancent automatiquement la recherche.

La fonction `searchOrder()` est asynchrone :
1. Affiche un indicateur de chargement (⏳)
2. Envoie `GET /api/orders/LN-2024-001` au serveur
3. Si 404 : affiche "Numéro introuvable"
4. Si erreur réseau : affiche un message d'erreur de connexion
5. Si succès : appelle `renderTrackResult()` qui génère :
   - **En-tête** : nom de la cliente, prestation, badge de statut coloré
   - **Barre de progression** : 4 étapes (Confirmé / En préparation / En cours / Terminé) avec icônes et indicateur de l'étape active
   - **Tableau de détails** : numéro, date RDV, prestation, email

**Statuts disponibles** :
| Statut | Badge | Étapes actives |
|--------|-------|----------------|
| `confirmed` | Bleu — Confirmé | 1/4 |
| `preparing` | Orange — En cours de préparation | 2/4 |
| `ready` | Vert — Prêt à récupérer | 3/4 |
| `completed` | Violet — Terminé | 4/4 |

---

### 4.9 Avis clients

**Ce que c'est** : carrousel d'avis avec notation par étoiles et formulaire de dépôt d'avis.

**Comment ça fonctionne de bout en bout :**

**Chargement** : au démarrage, `loadReviews()` fait un `GET /api/reviews` asynchrone. Les avis retournés (avec dates relatives calculées côté serveur) remplacent `allReviews`. Si le serveur est inaccessible, le tableau reste vide.

**Affichage** : `renderReviews()` prend 3 avis à partir de `reviewOffset` et génère les cards HTML. Chaque card affiche les étoiles, le texte, l'avatar (initiale du prénom), le nom et le service.

**Navigation** : les flèches ‹ et › décrémentent/incrémentent `reviewOffset` par tranches de 3. Les points de pagination en bas permettent d'accéder directement à une page.

**Notation par étoiles** : survol des étoiles → surlignage jusqu'à la position survolée. Quitter la zone → retour à la notation sélectionnée. Clic → la valeur est stockée dans `selectedRating`.

**Soumettre un avis** : `POST /api/reviews` avec nom, service, note et texte. La validation serveur exige un texte d'au moins 10 caractères. Si succès, le nouvel avis est ajouté en tête de `allReviews` et la galerie est ré-rendue. Le formulaire est réinitialisé.

---

### 4.10 Formulaire de contact

**Ce que c'est** : formulaire permettant d'envoyer un message au salon.

**Comment ça fonctionne :**

Champs : nom, email, sujet (liste déroulante), message. Au clic sur "Envoyer", la fonction async :
1. Désactive le bouton (évite les doubles envois)
2. Envoie `POST /api/contact` avec les données
3. Le serveur enregistre le message dans `data/contacts.json` et envoie une notification email au salon (si SMTP configuré)
4. Toast de confirmation affiché, formulaire réinitialisé

---

### 4.11 Newsletter

**Ce que c'est** : champ email dans le footer pour s'inscrire aux offres exclusives.

**Comment ça fonctionne :**

Au clic sur "OK" (ou touche Entrée dans le champ), la validation locale vérifie le format email. Si valide, `POST /api/newsletter` est envoyé avec l'email. Le serveur :
- Enregistre l'email (en minuscules) dans `data/newsletter.json`
- Si l'email existe déjà → répond `{ success: true, already: true }` sans erreur
- Toast de confirmation affiché, champ vidé

---

### 4.12 Bouton retour en haut

**Ce que c'est** : bouton circulaire fixe en bas à droite qui apparaît après 400px de scroll.

**Comment ça fonctionne :** l'écouteur `scroll` ajoute la classe `.visible` (opacity 1, translateY 0) quand `scrollY > 400`. Un clic déclenche `window.scrollTo({ top: 0, behavior: 'smooth' })`.

---

### 4.13 Notifications toast

**Ce que c'est** : petites notifications qui apparaissent en bas à droite et disparaissent automatiquement.

**Comment ça fonctionne :** `showToast(message, type)` crée un `<div class="toast success|error|info">`, l'ajoute au `#toastContainer` et le supprime après 4 secondes. Une animation CSS `toastIn` le fait glisser depuis la droite. Utilisé partout : confirmation réservation, erreurs de validation, envoi d'avis, etc.

---

## 5. Fonctionnalités — Backend (API REST)

Toutes les routes retournent du JSON. Les erreurs retournent un objet `{ "error": "message" }` avec le code HTTP approprié.

### 5.1 POST /api/orders

Crée une nouvelle réservation.

**Corps de la requête :**
```json
{
  "num": "LN-2026-437",
  "name": "Marie Dupont",
  "service": "Pose Gel (35€)",
  "date": { "day": 25, "month": 3, "year": 2026 },
  "time": "10:00",
  "email": "marie@example.com",
  "phone": "0612345678",
  "model_notes": "Couleur rose nude",
  "message": "Allergie au latex"
}
```

**Validations :**
- `num`, `name`, `service`, `email` obligatoires
- Format email vérifié par regex
- Numéro de commande unique (409 si doublon)

**Réponse succès (201) :**
```json
{ "success": true, "num": "LN-2026-437" }
```

**Effets** : enregistrement dans `data/orders.json`, email de confirmation envoyé à la cliente et notification au salon (si SMTP configuré).

---

### 5.2 GET /api/orders/:num

Récupère l'état d'une commande par son numéro de suivi.

**Exemple :** `GET /api/orders/LN-2024-001`

**Réponse succès (200) :**
```json
{
  "num": "LN-2024-001",
  "name": "Sophie M.",
  "service": "Nail Art Premium (55€)",
  "date": { "day": 20, "month": 0, "year": 2024 },
  "time": "14:00",
  "email": "sophie@example.com",
  "status": "ready",
  "statusLabel": "Prêt à récupérer",
  "steps": [true, true, true, false]
}
```

**Codes** : 200 OK, 404 si introuvable.

---

### 5.3 GET /api/reviews

Retourne tous les avis approuvés, du plus récent au plus ancien.

**Réponse (200) :**
```json
[
  {
    "id": 1,
    "name": "Sophie M.",
    "service": "Nail Art Premium",
    "rating": 5,
    "text": "Absolument époustouflant !",
    "date": "Il y a 2 jours"
  },
  ...
]
```

Les dates sont calculées dynamiquement côté serveur (ex: "Il y a 2 jours", "Il y a 1 semaine").

---

### 5.4 POST /api/reviews

Soumet un nouvel avis. Les avis sont approuvés automatiquement.

**Corps :**
```json
{
  "name": "Clara B.",
  "service": "Pose Gel",
  "rating": 5,
  "text": "Service exceptionnel, je reviendrai !"
}
```

**Validations :** `name`, `rating`, `text` obligatoires. Note entre 1 et 5. Texte minimum 10 caractères.

**Réponse (201) :**
```json
{
  "success": true,
  "review": {
    "id": 8,
    "name": "Clara B.",
    "service": "Pose Gel",
    "rating": 5,
    "text": "Service exceptionnel, je reviendrai !",
    "date": "À l'instant"
  }
}
```

---

### 5.5 POST /api/contact

Enregistre un message de contact.

**Corps :**
```json
{
  "name": "Julie Martin",
  "email": "julie@example.com",
  "sujet": "Question sur une prestation",
  "msg": "Bonjour, puis-je venir sans rendez-vous ?"
}
```

**Validations :** `name`, `email`, `msg` obligatoires. Format email vérifié.

**Réponse (200) :** `{ "success": true }`

**Effets :** enregistrement dans `data/contacts.json`, notification email au salon avec `Reply-To` pointant vers l'email de l'expéditrice.

---

### 5.6 POST /api/newsletter

Inscrit une adresse email à la newsletter.

**Corps :** `{ "email": "abonnee@example.com" }`

**Réponse (200) :** `{ "success": true }` (même si l'email était déjà inscrit — pas d'erreur affichée).

**Effets :** enregistrement dans `data/newsletter.json` (en minuscules, dédoublonnage automatique).

---

## 6. Base de données

Le projet utilise un store JSON maison (aucune dépendance externe) implémenté dans `database.js`. Chaque collection est un fichier JSON dans le dossier `/data/`.

### Fonctionnement

- **Lecture** : `JSON.parse(fs.readFileSync(...))` — synchrone, simple
- **Écriture** : `fs.writeFileSync(...)` après modification du tableau en mémoire
- **Unicité** : vérifiée en cherchant dans le tableau avant insertion
- **Erreurs** : une exception avec `code: 'UNIQUE'` est levée si doublon

### Données de démonstration (seed)

Au premier démarrage, si les fichiers sont vides, `database.js` insère automatiquement :

**Commandes démo :**
| Numéro | Cliente | Service | Statut |
|--------|---------|---------|--------|
| LN-2024-001 | Sophie M. | Nail Art Premium (55€) | Prêt à récupérer |
| LN-2024-002 | Camille L. | Pose Gel (35€) | En cours de préparation |
| LN-2024-003 | Julie R. | Extensions Acrylique (65€) | Terminé |

**Avis par défaut :** 6 avis avec des dates échelonnées (2 jours, 5 jours, 1 semaine, 2 semaines, 3 semaines, 1 mois).

### Structure d'un ordre dans orders.json

```json
{
  "num": "LN-2026-437",
  "name": "Marie Dupont",
  "service": "Pose Gel (35€)",
  "date": { "day": 25, "month": 3, "year": 2026 },
  "time": "10:00",
  "email": "marie@example.com",
  "phone": "0612345678",
  "status": "confirmed",
  "status_label": "Confirmé",
  "step1": 1,
  "step2": 0,
  "step3": 0,
  "step4": 0,
  "created_at": "2026-04-18T10:30:00.000Z"
}
```

---

## 7. Système d'emails

Les emails sont gérés par **Nodemailer** et sont **entièrement optionnels**. Si `SMTP_HOST` n'est pas renseigné dans `.env`, les emails sont simplement ignorés sans erreur.

### Emails envoyés

**1. Confirmation de réservation** (à la cliente)
- Déclencheur : `POST /api/orders` succès
- Contenu : numéro de suivi, prestation, date/heure, signature salon
- Format : HTML responsive

**2. Notification au salon** (à `OWNER_EMAIL`)
- Déclencheur : `POST /api/orders` succès
- Contenu : nom et email de la cliente, prestation, date/heure, numéro de commande

**3. Notification de contact** (à `OWNER_EMAIL`)
- Déclencheur : `POST /api/contact` succès
- Contenu : nom, email de l'expéditrice, sujet, message
- Header `Reply-To` : email de l'expéditrice (répondre directement possible)

### Configuration SMTP

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.adresse@gmail.com
SMTP_PASS=votre-mot-de-passe-application
OWNER_EMAIL=lydieyah28@gmail.com
```

> **Gmail** : utiliser un "mot de passe d'application" (Compte Google → Sécurité → Authentification 2 facteurs → Mots de passe des applications).

---

## 8. Configuration

Toutes les options se trouvent dans le fichier `.env` à la racine :

```env
# Port du serveur (défaut : 3000)
PORT=3000

# SMTP — laisser vide pour désactiver les emails
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# Email du salon (notifications réservations + contact)
OWNER_EMAIL=contact@luxnails.fr
```

---

## Design et responsive

Le site est entièrement responsive grâce aux breakpoints CSS :

| Taille | Comportement |
|--------|-------------|
| > 900px | Grille contact 2 colonnes, 3 avis par page |
| 700px–900px | Grille contact 1 colonne, 2 avis par page |
| < 700px | Menu hamburger, formulaire 1 colonne, 1 avis par page, flèches carousel cachées |

La palette de couleurs est définie en variables CSS dans `:root` (`--pink`, `--dark`, `--gold`, etc.) ce qui permet de modifier l'ensemble du design depuis un seul endroit.
