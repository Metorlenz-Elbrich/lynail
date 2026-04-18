# Guide de déploiement — LYDHAS_Nails Studio

## Pourquoi pas Vercel seul ?

Vercel est fait pour les sites statiques et les fonctions serverless.  
Notre application a un serveur Express qui **écrit des fichiers JSON** dans le dossier `/data/`.  
Or sur Vercel, le système de fichiers est **en lecture seule** — impossible d'y écrire.

| Hébergeur | Backend Node.js | Écriture fichiers | Gratuit | Difficulté |
|-----------|:-:|:-:|:-:|:-:|
| **Render** | ✅ | ✅ (éphémère) | ✅ | ⭐ Facile |
| Vercel seul | ⚠️ Refactoring requis | ❌ | ✅ | ⭐⭐⭐ |
| Railway | ✅ | ✅ | ⚠️ $5/mois | ⭐ Facile |
| Fly.io | ✅ | ✅ persistant | ✅ | ⭐⭐ Moyen |

**Recommandation : Render.com** — fonctionne avec le code tel quel, zéro modification.

> ⚠️ **Note sur les données** : Sur le plan gratuit de Render, si le serveur redémarre
> (nouveau déploiement, maintenance), les fichiers JSON sont effacés. Les données de
> démo (3 commandes test, 6 avis par défaut) sont réinsérées automatiquement au
> redémarrage. Les vraies réservations et avis soumis par les clientes seront perdus.
> Pour un usage en production, voir la **Partie 2** de ce guide (MongoDB Atlas).

---

# PARTIE 1 — Déploiement rapide sur Render (gratuit, 30 min)

## Étape 1 — Préparer le code sur GitHub

### 1.1 — Vérifier le fichier .gitignore

Ouvrir `.gitignore` et vérifier qu'il contient exactement :

```
node_modules/
.env
*.db
*.db-shm
*.db-wal
```

Le dossier `data/` ne doit **pas** être dans `.gitignore` — Render en a besoin pour créer les fichiers au démarrage. ✅ C'est déjà le cas.

### 1.2 — Créer un compte GitHub

Si tu n'as pas de compte GitHub :
1. Aller sur **https://github.com**
2. Cliquer **Sign up**
3. Entrer ton email, un mot de passe, un nom d'utilisateur
4. Vérifier ton email
5. Choisir le plan **Free**

### 1.3 — Créer un nouveau dépôt GitHub

1. Sur GitHub, cliquer le **+** en haut à droite → **New repository**
2. **Repository name** : `lydhas-nails-studio`
3. Visibilité : **Private** (recommandé — le .env contient le mot de passe Gmail)
4. **Ne pas** cocher "Add a README file"
5. Cliquer **Create repository**
6. GitHub affiche une page avec des instructions — garder cette page ouverte

### 1.4 — Pousser le code sur GitHub

Ouvrir PowerShell dans le dossier du projet :

```powershell
cd "C:\Users\ntenk\Downloads\Telegram Desktop\NAILS ARTS AI\NAILS ARTS AI"
```

Initialiser Git et pousser (copier-coller les lignes une par une) :

```powershell
git add .
git commit -m "Préparation déploiement"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/lydhas-nails-studio.git
git push -u origin main
```

> Remplacer `TON-USERNAME` par ton nom d'utilisateur GitHub.  
> GitHub va demander ton nom d'utilisateur et mot de passe (ou token) la première fois.

Vérifier que le code est bien sur GitHub en rechargeant la page du dépôt.

---

## Étape 2 — Créer un compte Render

1. Aller sur **https://render.com**
2. Cliquer **Get Started for Free**
3. Choisir **Continue with GitHub** — c'est plus simple
4. Autoriser Render à accéder à GitHub
5. Ton compte Render est créé

---

## Étape 3 — Créer le service web sur Render

1. Sur le tableau de bord Render, cliquer **New +** en haut à droite
2. Sélectionner **Web Service**
3. Dans la section **Connect a repository**, cliquer **Connect** à côté de `lydhas-nails-studio`
4. Si le dépôt n'apparaît pas : cliquer **Configure account** → autoriser Render sur ce dépôt

---

## Étape 4 — Configurer le service

Remplir les champs comme suit, **ligne par ligne** :

| Champ | Valeur à entrer |
|-------|----------------|
| **Name** | `lydhas-nails-studio` |
| **Region** | `Frankfurt (EU Central)` — le plus proche de Paris |
| **Branch** | `main` |
| **Root Directory** | laisser vide |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` |

Cliquer sur **Advanced** pour ouvrir les options supplémentaires.

---

## Étape 5 — Ajouter les variables d'environnement

Toujours dans la page de configuration, section **Environment Variables**, cliquer **Add Environment Variable** et ajouter ces lignes **une par une** :

| Key (clé) | Value (valeur) |
|-----------|---------------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `metorlenz2@gmail.com` |
| `SMTP_PASS` | `qoadnjwckvkzxcva` *(ton mot de passe d'application Gmail)* |
| `OWNER_EMAIL` | `metorlenz2@gmail.com` |

> Ces valeurs viennent de ton fichier `.env` local.  
> Ne jamais mettre ces valeurs directement dans le code ou dans Git.

---

## Étape 6 — Lancer le déploiement

1. Faire défiler jusqu'en bas de la page
2. Cliquer **Create Web Service**
3. Render commence le déploiement — une console s'affiche en temps réel
4. Attendre de voir la ligne :

```
✅  LYDHAS_Nails Studio — serveur démarré
🌐  http://localhost:3000
```

Le déploiement prend environ **2 à 5 minutes** la première fois.

---

## Étape 7 — Accéder au site

1. En haut de la page du service, Render affiche l'URL de ton site :
   ```
   https://lydhas-nails-studio.onrender.com
   ```
2. Cliquer sur ce lien — ton site est en ligne !

---

## Étape 8 — Tester que tout fonctionne

Tester chaque fonctionnalité dans l'ordre :

**8.1 — Test de l'API**

Ouvrir un nouvel onglet et taper ces URLs :

```
https://lydhas-nails-studio.onrender.com/api/reviews
```
→ Doit afficher une liste JSON avec 6 avis

```
https://lydhas-nails-studio.onrender.com/api/orders/LN-2024-001
```
→ Doit afficher les infos de la commande démo

**8.2 — Test de la réservation + email**

1. Aller sur le site → section **Commander**
2. Remplir le formulaire complet (prestation, date, heure, ton email, prénom, nom, téléphone)
3. Cliquer **Confirmer la réservation**
4. Vérifier que le message de confirmation s'affiche avec un numéro de suivi
5. Vérifier ta boîte Gmail : tu dois recevoir deux emails
   - Un email de confirmation (celui envoyé à la cliente)
   - Un email de notification (celui envoyé au salon)

**8.3 — Test du suivi de commande**

1. Section **Suivi** → entrer `LN-2024-001`
2. Doit afficher la progression avec les étapes

**8.4 — Test des avis**

1. Section **Avis** → remplir le formulaire et soumettre
2. L'avis doit apparaître dans le carrousel

---

## Étape 9 — Déploiements suivants (mise à jour du site)

Chaque fois que tu modifies le code :

```powershell
git add .
git commit -m "Description de la modification"
git push
```

Render détecte automatiquement le push et redéploie le site en quelques minutes.

---

## Comportement du plan gratuit Render

| Situation | Ce qui se passe |
|-----------|----------------|
| Aucune visite pendant 15 min | Le serveur "dort" |
| Première visite après le sommeil | Démarrage en 30-60 secondes |
| Nouveau déploiement (git push) | Serveur redémarre, données JSON effacées |
| Données de démo | Toujours réinsérées automatiquement au démarrage |
| Vraies réservations / avis | Perdus si le serveur redémarre |

Pour ne pas perdre les vraies données → voir **Partie 2**.

---

# PARTIE 2 — Données persistantes avec MongoDB Atlas (gratuit à vie)

MongoDB Atlas offre un cluster gratuit (512 MB) qui ne expire jamais.  
En connectant l'application à MongoDB, les réservations, avis et messages sont  
sauvegardés dans le cloud même si Render redémarre.

## Étape 1 — Créer un compte MongoDB Atlas

1. Aller sur **https://mongodb.com/cloud/atlas**
2. Cliquer **Try Free**
3. Créer un compte avec ton email
4. Vérifier ton email

## Étape 2 — Créer un cluster gratuit

1. Après connexion, cliquer **Create a cluster**
2. Choisir **M0 Free** (la colonne gratuite)
3. **Provider** : AWS
4. **Region** : `eu-west-1 (Ireland)` — le plus proche de Paris
5. **Cluster Name** : `lydhas-nails`
6. Cliquer **Create Deployment**
7. Attendre 2-3 minutes que le cluster se crée

## Étape 3 — Créer un utilisateur de base de données

1. Dans l'assistant qui s'ouvre, section **Create a database user** :
   - **Username** : `lydhas_user`
   - **Password** : cliquer **Autogenerate Secure Password** → copier le mot de passe généré
2. Cliquer **Create Database User**

## Étape 4 — Autoriser les connexions depuis Render

1. Section **Where would you like to connect from?**
2. Sélectionner **Cloud Environment**
3. Dans le champ IP Address, entrer : `0.0.0.0/0` (autorise tout, simple pour commencer)
4. Cliquer **Add Entry**
5. Cliquer **Finish and Close**

## Étape 5 — Récupérer l'URL de connexion

1. Sur le tableau de bord Atlas, cliquer **Connect** sur ton cluster
2. Choisir **Drivers**
3. **Driver** : Node.js — **Version** : 5.5 or later
4. Copier l'URL qui ressemble à :
   ```
   mongodb+srv://lydhas_user:<password>@lydhas-nails.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Remplacer `<password>` par le mot de passe copié à l'étape 3

## Étape 6 — Installer le driver MongoDB

Dans le dossier du projet en local :

```powershell
npm install mongodb
```

## Étape 7 — Mettre à jour database.js

Remplacer le contenu de `database.js` par la version MongoDB :

```javascript
/* database.js — version MongoDB Atlas */
const { MongoClient } = require('mongodb');

const uri    = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let   _db    = null;

async function connect() {
  if (_db) return _db;
  await client.connect();
  _db = client.db('lydhas_nails');
  await seed(_db);
  console.log('[DB] Connecté à MongoDB Atlas');
  return _db;
}

const db = {
  async insertOrder(order) {
    const col = (await connect()).collection('orders');
    const exists = await col.findOne({ num: order.num });
    if (exists) throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
    const row = { ...order, status: 'confirmed', status_label: 'Confirmé',
      step1: 1, step2: 0, step3: 0, step4: 0, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async getOrder(num) {
    return (await connect()).collection('orders').findOne({ num });
  },
  async getReviews() {
    return (await connect()).collection('reviews')
      .find({ approved: true }).sort({ created_at: -1 }).toArray();
  },
  async insertReview(review) {
    const col = (await connect()).collection('reviews');
    const count = await col.countDocuments();
    const row = { id: count + 1, ...review, approved: true, created_at: new Date() };
    await col.insertOne(row);
    return row;
  },
  async insertContact(contact) {
    const col = (await connect()).collection('contacts');
    await col.insertOne({ ...contact, created_at: new Date() });
  },
  async insertNewsletter(email) {
    const col = (await connect()).collection('newsletter');
    const exists = await col.findOne({ email });
    if (exists) throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
    await col.insertOne({ email, created_at: new Date() });
  }
};

async function seed(database) {
  const orders = database.collection('orders');
  const demos = [
    { num: 'LN-2024-001', name: 'Sophie M.',  service: 'Nail Art Premium (55€)',     date: { day:20, month:0, year:2024 }, time:'14:00', email:'sophie@example.com',  status:'ready',      status_label:'Prêt à récupérer',           step1:1,step2:1,step3:1,step4:0 },
    { num: 'LN-2024-002', name: 'Camille L.', service: 'Pose Gel (35€)',              date: { day:22, month:0, year:2024 }, time:'10:30', email:'camille@example.com', status:'preparing',  status_label:'En cours de préparation',    step1:1,step2:1,step3:0,step4:0 },
    { num: 'LN-2024-003', name: 'Julie R.',   service: 'Extensions Acrylique (65€)', date: { day:18, month:0, year:2024 }, time:'16:00', email:'julie@example.com',   status:'completed',  status_label:'Terminé',                    step1:1,step2:1,step3:1,step4:1 },
  ];
  for (const d of demos) {
    await orders.updateOne({ num: d.num }, { $setOnInsert: { ...d, created_at: new Date('2024-01-15') } }, { upsert: true });
  }

  const reviews = database.collection('reviews');
  const count = await reviews.countDocuments();
  if (count === 0) {
    const now = Date.now();
    const defaults = [
      { name:'Sophie M.',  service:'Nail Art Premium',    rating:5, daysAgo:2,  text:"Absolument époustouflant ! Mes ongles sont devenus de vraies œuvres d'art." },
      { name:'Camille L.', service:'Pose Gel',             rating:5, daysAgo:5,  text:"Ma première pose gel ici et je suis conquise ! Tenue parfaite après 3 semaines." },
      { name:'Julie R.',   service:'Extensions Acrylique', rating:5, daysAgo:7,  text:"Je cherchais des extensions naturelles et c'est exactement ce que j'ai eu." },
      { name:'Marie T.',   service:'Formation',            rating:5, daysAgo:14, text:"La formation est très complète et bien expliquée. Merci infiniment !" },
      { name:'Léa D.',     service:'French Manucure',      rating:4, daysAgo:21, text:"Très satisfaite de ma French manucure. Je recommande à toutes mes amies." },
      { name:'Emma B.',    service:'Nail Art Floral',      rating:5, daysAgo:30, text:"Je voulais quelque chose d'unique pour mon mariage. Motifs floraux exquis !" },
    ];
    await reviews.insertMany(defaults.map((r, i) => ({
      id: i + 1, name: r.name, service: r.service, rating: r.rating,
      text: r.text, approved: true, created_at: new Date(now - r.daysAgo * 86400000)
    })));
  }
}

module.exports = db;
```

## Étape 8 — Mettre à jour server.js pour MongoDB async

Comme MongoDB est asynchrone, ajouter `await` devant tous les appels `db.*` dans `server.js`.

Remplacer dans server.js chaque appel de db par sa version async.  
Par exemple :

```javascript
// Avant (JSON synchrone)
const order = db.insertOrder({ ... });

// Après (MongoDB async)
const order = await db.insertOrder({ ... });
```

Faire la même chose pour : `db.getOrder`, `db.getReviews`, `db.insertReview`, `db.insertContact`, `db.insertNewsletter`.

Chaque route qui utilise `db` doit avoir `async` devant `(req, res)` :

```javascript
app.post('/api/orders', async (req, res) => { ... });
app.get('/api/orders/:num', async (req, res) => { ... });
app.get('/api/reviews', async (req, res) => { ... });
app.post('/api/reviews', async (req, res) => { ... });
app.post('/api/contact', async (req, res) => { ... });
app.post('/api/newsletter', async (req, res) => { ... });
```

## Étape 9 — Ajouter MONGODB_URI sur Render

1. Aller sur **dashboard.render.com** → ton service
2. Onglet **Environment**
3. Cliquer **Add Environment Variable**
4. **Key** : `MONGODB_URI`
5. **Value** : coller l'URL MongoDB copiée à l'étape 5 (avec le vrai mot de passe)
6. Cliquer **Save Changes**
7. Render redéploie automatiquement

## Étape 10 — Pousser les changements

```powershell
git add .
git commit -m "Migration vers MongoDB Atlas"
git push
```

Render redéploie, se connecte à MongoDB Atlas.  
Toutes les réservations, avis, messages et abonnées newsletter sont maintenant **sauvegardés de façon permanente**.

---

# Récapitulatif des URLs importantes

| Service | URL |
|---------|-----|
| Ton site en ligne | `https://lydhas-nails-studio.onrender.com` |
| Tableau de bord Render | `https://dashboard.render.com` |
| Tableau de bord MongoDB | `https://cloud.mongodb.com` |
| Logs du serveur | Render → ton service → onglet **Logs** |

---

# Résumé visuel du déploiement final

```
Navigateur cliente
       │
       ▼
https://lydhas-nails-studio.onrender.com
       │
       ▼
┌─────────────────────────────┐
│   Render.com (gratuit)      │
│   Node.js + Express         │
│   server.js + database.js   │
└──────────────┬──────────────┘
               │ (si MongoDB activé)
               ▼
┌─────────────────────────────┐
│   MongoDB Atlas (gratuit)   │
│   orders / reviews          │
│   contacts / newsletter     │
└─────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│   Gmail SMTP                │
│   metorlenz2@gmail.com      │
│   Confirmation → cliente    │
│   Notification → salon      │
└─────────────────────────────┘
```

---

# En cas de problème

### Le site affiche "Service Unavailable"
→ Le serveur est en train de démarrer (plan gratuit, attendre 60 secondes)

### "Application error" dans les logs Render
→ Aller dans Render → ton service → onglet **Logs** → lire le message d'erreur

### Les emails ne partent pas
→ Vérifier que `SMTP_PASS` est bien renseigné dans les variables d'environnement Render  
→ Vérifier que le mot de passe d'application Gmail est correct (16 caractères, sans espaces)

### "Cannot find module 'mongodb'"
→ Lancer `npm install mongodb` puis `git add package.json package-lock.json && git push`

### Les données disparaissent à chaque redéploiement
→ Mettre en place MongoDB Atlas (Partie 2 de ce guide)
