/* ========================================
   server.js — LYDHAS Nails Studio Backend
   ======================================== */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const db         = require('./database');
const { ObjectId } = require('mongodb');

const app  = express();
const PORT = process.env.PORT || 3000;

/* Les images sont stockées dans MongoDB — pas de dossier uploads local */

/* ==========================================
   SÉCURITÉ — Headers (helmet)
   A05: Security Misconfiguration
   ========================================== */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],   // inline handlers admin
      styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:       ["'self'", "https://fonts.gstatic.com"],
      imgSrc:        ["'self'", "data:", "https:", "blob:"],
      connectSrc:    ["'self'"],
      frameSrc:      ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
      frameAncestors:["'self'"],
      objectSrc:     ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false, // nécessaire pour les iframes YouTube
}));

/* ==========================================
   CORS — même origine uniquement
   A05: Security Misconfiguration
   ========================================== */
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin, credentials: true } : { origin: false }));

/* ==========================================
   RATE LIMITING — protection brute force
   A07: Identification and Authentication Failures
   ========================================== */
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             10,              // 10 tentatives max
  message:         { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max:      60,           // 60 requêtes par minute
  standardHeaders: true,
  legacyHeaders:   false,
});

app.use('/api/', apiLimiter);

/* ==========================================
   MIDDLEWARE COMMUNS
   ========================================== */
app.use(express.json({ limit: '50kb' }));   // limite la taille du body JSON
app.use(express.static(path.join(__dirname)));

/* ==========================================
   SESSIONS ADMIN — tokens sécurisés
   A07: Identification and Authentication Failures
   ========================================== */
const sessions = new Map(); // token -> expiresAt (ms)
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 heures

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

// Nettoyage périodique des sessions expirées
setInterval(() => {
  const now = Date.now();
  for (const [tok, exp] of sessions) {
    if (now > exp) sessions.delete(tok);
  }
}, 60 * 60 * 1000);

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Non autorisé.' });
  const exp = sessions.get(token);
  if (!exp || Date.now() > exp) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
  }
  next();
}

/* ==========================================
   UTILITAIRE — validation ObjectId
   A03: Injection
   ========================================== */
function toObjectId(id) {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) return null;
  return new ObjectId(id);
}

/* ==========================================
   MULTER — upload d'images
   A08: Software and Data Integrity Failures
   ========================================== */
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const VIDEO_MIMES   = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
const VIDEO_EXTS    = new Set(['.mp4', '.webm', '.ogv', '.ogg', '.mov']);

/* Images uniquement (5 Mo) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIMES.has(file.mimetype) && ALLOWED_EXTS.has(ext)) cb(null, true);
    else cb(new Error('Seules les images jpg, png, gif, webp sont acceptées.'));
  },
});

/* Images + vidéos (50 Mo) */
const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImg = ALLOWED_MIMES.has(file.mimetype) && ALLOWED_EXTS.has(ext);
    const isVid = VIDEO_MIMES.has(file.mimetype) && VIDEO_EXTS.has(ext);
    if (isImg || isVid) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez jpg, png, gif, webp, mp4, webm ou mov.'));
  },
});

/* ==========================================
   COMMANDES / RÉSERVATIONS
   ========================================== */

app.post('/api/orders', async (req, res) => {
  const { num, name, service, date, time, email, phone, model_notes, message } = req.body;

  if (!num || !name || !service || !email)
    return res.status(400).json({ error: 'Champs obligatoires manquants (num, name, service, email).' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Adresse email invalide.' });
  if (String(name).length > 100 || String(service).length > 200)
    return res.status(400).json({ error: 'Données trop longues.' });

  try {
    const order = await db.insertOrder({ num, name, service, date, time, email, phone, model_notes, message });
    sendOrderConfirmation({ num, name, service, date, time, email }).catch(err =>
      console.error('[Email] Erreur confirmation :', err.message)
    );
    res.status(201).json({ success: true, num: order.num });
  } catch (err) {
    if (err.code === 'UNIQUE') return res.status(409).json({ error: 'Ce numéro de commande existe déjà.' });
    console.error('[Orders] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.get('/api/orders/:num', async (req, res) => {
  try {
    const num   = req.params.num.trim().toUpperCase().slice(0, 30);
    const order = await db.getOrder(num);
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    res.json({
      num:         order.num,
      name:        order.name,
      service:     order.service,
      date:        order.date || null,
      time:        order.time,
      email:       order.email,
      status:      order.status,
      statusLabel: order.status_label,
      steps:       [!!order.step1, !!order.step2, !!order.step3, !!order.step4],
    });
  } catch (err) {
    console.error('[Orders] Erreur getOrder :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   AVIS
   ========================================== */

app.get('/api/reviews', async (_req, res) => {
  try {
    const reviewsData = await db.getReviews();
    res.json(reviewsData.map(r => ({
      id:      r.id,
      name:    r.name,
      service: r.service,
      rating:  r.rating,
      text:    r.text,
      date:    relativeDate(r.created_at),
    })));
  } catch (err) {
    console.error('[Reviews] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { name, service, rating, text } = req.body;
  if (!name || !text || !rating) return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  const r = parseInt(rating);
  if (isNaN(r) || r < 1 || r > 5) return res.status(400).json({ error: 'Note entre 1 et 5.' });
  if (String(text).trim().length < 10) return res.status(400).json({ error: 'Avis trop court (10 car. min).' });
  if (String(name).length > 80 || String(text).length > 1000) return res.status(400).json({ error: 'Données trop longues.' });
  try {
    const review = await db.insertReview({ name: name.trim(), service: service?.trim() || 'Cliente LYDHAS', rating: r, text: text.trim() });
    res.status(201).json({ success: true, review: { ...review, date: "À l'instant" } });
  } catch (err) {
    console.error('[Reviews] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   CONTACT
   ========================================== */

app.post('/api/contact', async (req, res) => {
  const { name, email, sujet, msg } = req.body;
  if (!name || !email || !msg) return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email invalide.' });
  if (String(msg).length > 2000) return res.status(400).json({ error: 'Message trop long.' });
  try {
    await db.insertContact({ name: name.trim(), email: email.trim(), subject: sujet ?? 'Autre', message: msg.trim() });
  } catch (err) {
    console.error('[Contact] Erreur :', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
  sendContactNotification({ name, email, sujet, msg }).catch(err =>
    console.error('[Email] Erreur contact :', err.message)
  );
  res.json({ success: true });
});

/* ==========================================
   NEWSLETTER
   ========================================== */

app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Email invalide.' });
  try {
    await db.insertNewsletter(email.trim());
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'UNIQUE') return res.json({ success: true, already: true });
    console.error('[Newsletter] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   CONTENU PUBLIC
   ========================================== */

/* Servir une image stockée dans MongoDB */
app.get('/api/images/:id', async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).send('ID invalide');
  try {
    const img = await db.getImage(oid);
    if (!img) return res.status(404).send('Image introuvable');
    res.set('Content-Type', img.mimetype);
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); // cache navigateur 1 an
    res.send(img.data.buffer ?? img.data);
  } catch (err) {
    console.error('[Images] :', err.message);
    res.status(500).send('Erreur serveur');
  }
});

/* Streaming vidéo depuis GridFS avec support Range (lecture navigateur) */
app.get('/api/videos/:id', async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).send('ID invalide');
  try {
    const info = await db.getVideoInfo(oid);
    if (!info) return res.status(404).send('Vidéo introuvable');
    const contentType = info.contentType || 'video/mp4';
    const total = info.length;
    const range = req.headers.range;
    if (range) {
      const [s, e] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(s, 10);
      const end   = e ? parseInt(e, 10) : total - 1;
      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${total}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': end - start + 1,
        'Content-Type':   contentType,
      });
      (await db.openVideoDownloadStream(oid, { start, end: end + 1 })).pipe(res);
    } else {
      res.set({ 'Content-Type': contentType, 'Content-Length': total, 'Accept-Ranges': 'bytes' });
      (await db.openVideoDownloadStream(oid)).pipe(res);
    }
  } catch (err) {
    console.error('[Videos] :', err.message);
    if (!res.headersSent) res.status(500).send('Erreur serveur');
  }
});

app.get('/api/gallery',     async (_req, res) => { try { res.json(await db.getGallery());     } catch { res.status(500).json({ error: 'Erreur serveur.' }); } });
app.get('/api/services',    async (_req, res) => { try { res.json(await db.getServices());    } catch { res.status(500).json({ error: 'Erreur serveur.' }); } });
app.get('/api/tutorials',   async (_req, res) => { try { res.json(await db.getTutorials());   } catch { res.status(500).json({ error: 'Erreur serveur.' }); } });
app.get('/api/prestations', async (_req, res) => { try { res.json(await db.getPrestations()); } catch { res.status(500).json({ error: 'Erreur serveur.' }); } });

/* ==========================================
   ADMIN — authentification
   ========================================== */

/* ==========================================
   ADMIN — Commandes (suivi)
   ========================================== */

const ALLOWED_STATUSES = new Set(['confirmed', 'preparing', 'ready', 'completed', 'cancelled']);
const STATUS_STEPS = {
  confirmed:  { label: 'Confirmé',                step1:1, step2:0, step3:0, step4:0 },
  preparing:  { label: 'En cours de préparation', step1:1, step2:1, step3:0, step4:0 },
  ready:      { label: 'Prêt à récupérer',        step1:1, step2:1, step3:1, step4:0 },
  completed:  { label: 'Terminé',                 step1:1, step2:1, step3:1, step4:1 },
  cancelled:  { label: 'Annulé',                  step1:1, step2:0, step3:0, step4:0 },
};

app.get('/api/admin/orders', adminAuth, async (_req, res) => {
  try {
    const orders = await db.getOrders();
    const MONTHS = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
    res.json(orders.map(o => ({
      num:         o.num,
      name:        o.name,
      service:     o.service,
      dateStr:     o.date ? `${o.date.day} ${MONTHS[o.date.month]} ${o.date.year}` : '—',
      time:        o.time || '—',
      email:       o.email,
      phone:       o.phone || '',
      status:      o.status,
      statusLabel: o.status_label,
      steps:       [!!o.step1, !!o.step2, !!o.step3, !!o.step4],
      created_at:  o.created_at,
    })));
  } catch (err) {
    console.error('[Admin/Orders] :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/orders/:num', adminAuth, async (req, res) => {
  const num = req.params.num.trim().toUpperCase().slice(0, 30);
  if (!num) return res.status(400).json({ error: 'Numéro de commande requis.' });

  const { status } = req.body;
  if (!status || !ALLOWED_STATUSES.has(status))
    return res.status(400).json({ error: 'Statut invalide.' });

  const preset = STATUS_STEPS[status];
  try {
    const result = await db.updateOrder(num, {
      status,
      status_label: preset.label,
      step1: preset.step1,
      step2: preset.step2,
      step3: preset.step3,
      step4: preset.step4,
    });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Commande introuvable.' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Orders] Update :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   ADMIN — Gallery CRUD (update)
   ========================================== */

app.put('/api/admin/gallery/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });

  const { title, category } = req.body;
  const updates = {};

  if (title !== undefined) {
    if (String(title).trim().length === 0 || String(title).length > 100)
      return res.status(400).json({ error: 'Titre invalide (1–100 caractères).' });
    updates.title = title.trim();
  }
  if (category !== undefined) {
    const cats = await db.getGalleryCategories();
    const validCat = cats.find(c => c.slug === category);
    if (!validCat) return res.status(400).json({ error: 'Catégorie invalide.' });
    updates.category = category;
    updates.gradient = validCat.gradient;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });

  try {
    await db.updateGalleryItem(oid, updates);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Gallery] Update :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    console.warn(`[Admin] Tentative de connexion échouée depuis ${req.ip}`);
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  const token = createSession();
  res.json({ success: true, token });
});

app.post('/api/admin/logout', adminAuth, (req, res) => {
  const token = req.headers['x-admin-token'];
  sessions.delete(token);
  res.json({ success: true });
});

/* ==========================================
   ADMIN — Gallery CRUD
   ========================================== */

app.post('/api/admin/gallery', adminAuth, uploadMedia.single('media'), async (req, res) => {
  const { title, category, imageUrl } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'title et category requis.' });
  if (String(title).length > 100) return res.status(400).json({ error: 'Titre trop long.' });

  const cats = await db.getGalleryCategories();
  const validCat = cats.find(c => c.slug === category);
  if (!validCat) return res.status(400).json({ error: 'Catégorie invalide.' });

  let finalUrl = '';
  let isVideo  = false;
  try {
    if (req.file) {
      if (VIDEO_MIMES.has(req.file.mimetype)) {
        const videoId = await db.uploadVideo(req.file.buffer, req.file.originalname, req.file.mimetype);
        finalUrl = `/api/videos/${videoId}`;
        isVideo = true;
      } else {
        const imageId = await db.insertImage(req.file.buffer, req.file.mimetype);
        finalUrl = `/api/images/${imageId}`;
      }
    } else if (imageUrl?.trim()) {
      const u = new URL(imageUrl.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('protocole invalide');
      finalUrl = imageUrl.trim();
    }
    const item = await db.insertGalleryItem({ title: title.trim(), category, imageUrl: finalUrl, isVideo, gradient: validCat.gradient });
    res.status(201).json(item);
  } catch (err) {
    if (err.message.includes('invalide')) return res.status(400).json({ error: 'URL invalide. Utilisez une URL http ou https.' });
    console.error('[Admin/Gallery] :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/gallery/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  try {
    const item = await db.getGalleryItem(oid);
    if (item?.imageUrl?.startsWith('/api/images/')) {
      const imgOid = toObjectId(item.imageUrl.replace('/api/images/', ''));
      if (imgOid) await db.deleteImage(imgOid).catch(() => {});
    } else if (item?.imageUrl?.startsWith('/api/videos/')) {
      const vidOid = toObjectId(item.imageUrl.replace('/api/videos/', ''));
      if (vidOid) await db.deleteVideo(vidOid).catch(() => {});
    }
    await db.deleteGalleryItem(oid);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Gallery] Delete :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   ADMIN — Services CRUD
   ========================================== */

app.post('/api/admin/services', adminAuth, async (req, res) => {
  const { icon, title, description, price, featured } = req.body;
  if (!title || !price) return res.status(400).json({ error: 'title et price requis.' });
  if (String(title).length > 100 || String(price).length > 50) return res.status(400).json({ error: 'Données trop longues.' });
  try {
    const s = await db.insertService({
      icon:        (icon?.trim() || '💅').slice(0, 4),
      title:       title.trim(),
      description: String(description || '').trim().slice(0, 500),
      price:       price.trim(),
      featured:    !!featured,
    });
    res.status(201).json(s);
  } catch (err) {
    console.error('[Admin/Services] :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/services/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  const { icon, title, description, price, featured } = req.body;
  const updates = {};
  if (icon  !== undefined) updates.icon  = String(icon).trim().slice(0, 4) || '💅';
  if (title !== undefined) {
    if (!String(title).trim() || String(title).length > 100) return res.status(400).json({ error: 'Titre invalide.' });
    updates.title = title.trim();
  }
  if (description !== undefined) updates.description = String(description).trim().slice(0, 500);
  if (price !== undefined) {
    if (!String(price).trim() || String(price).length > 50) return res.status(400).json({ error: 'Prix invalide.' });
    updates.price = price.trim();
  }
  if (featured !== undefined) updates.featured = !!featured;
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à modifier.' });
  try {
    await db.updateService(oid, updates);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Services] Update :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/services/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  try {
    await db.deleteService(oid);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Services] Delete :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   ADMIN — Tutorials CRUD
   ========================================== */

app.post('/api/admin/tutorials', adminAuth, uploadMedia.single('video'), async (req, res) => {
  const { title, shortDesc, description, level, duration, videoUrl, views, rating } = req.body;
  if (!title || !level) return res.status(400).json({ error: 'title et level requis.' });

  const allowedLevels = new Set(['Débutant', 'Intermédiaire', 'Avancé']);
  if (!allowedLevels.has(level)) return res.status(400).json({ error: 'Niveau invalide.' });

  let safeVideoUrl = '';
  if (req.file) {
    const videoId = await db.uploadVideo(req.file.buffer, req.file.originalname, req.file.mimetype);
    safeVideoUrl = `/api/videos/${videoId}`;
  } else if (videoUrl?.trim()) {
    try {
      const u = new URL(videoUrl.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
      safeVideoUrl = videoUrl.trim();
    } catch {
      return res.status(400).json({ error: 'URL vidéo invalide.' });
    }
  }

  try {
    const t = await db.insertTutorial({
      title:       title.trim().slice(0, 200),
      shortDesc:   String(shortDesc || '').trim().slice(0, 300),
      description: String(description || '').trim().slice(0, 2000),
      level,
      duration:    String(duration || '').trim().slice(0, 20),
      videoUrl:    safeVideoUrl,
      views:       String(views || '0').trim().slice(0, 20),
      rating:      String(rating || '5.0').trim().slice(0, 5),
    });
    res.status(201).json(t);
  } catch (err) {
    console.error('[Admin/Tutorials] :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/tutorials/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  const { title, shortDesc, description, level, duration, videoUrl } = req.body;
  const allowedLevels = new Set(['Débutant', 'Intermédiaire', 'Avancé']);
  const updates = {};
  if (title !== undefined) {
    if (!String(title).trim() || String(title).length > 200) return res.status(400).json({ error: 'Titre invalide.' });
    updates.title = title.trim();
  }
  if (shortDesc   !== undefined) updates.shortDesc   = String(shortDesc).trim().slice(0, 300);
  if (description !== undefined) updates.description = String(description).trim().slice(0, 2000);
  if (level !== undefined) {
    if (!allowedLevels.has(level)) return res.status(400).json({ error: 'Niveau invalide.' });
    updates.level = level;
  }
  if (duration !== undefined) updates.duration = String(duration).trim().slice(0, 20);
  if (videoUrl !== undefined) {
    if (videoUrl.trim()) {
      try {
        const u = new URL(videoUrl.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
        updates.videoUrl = videoUrl.trim();
      } catch { return res.status(400).json({ error: 'URL vidéo invalide.' }); }
    } else {
      /* L'admin efface la vidéo : nettoyer le fichier GridFS si uploadé */
      const current = await db.getTutorial(oid);
      if (current?.videoUrl?.startsWith('/api/videos/')) {
        const vidOid = toObjectId(current.videoUrl.replace('/api/videos/', ''));
        if (vidOid) await db.deleteVideo(vidOid).catch(() => {});
      }
      updates.videoUrl = '';
    }
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à modifier.' });
  try {
    await db.updateTutorial(oid, updates);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Tutorials] Update :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/tutorials/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  try {
    const tuto = await db.getTutorial(oid);
    if (tuto?.videoUrl?.startsWith('/api/videos/')) {
      const vidOid = toObjectId(tuto.videoUrl.replace('/api/videos/', ''));
      if (vidOid) await db.deleteVideo(vidOid).catch(() => {});
    }
    await db.deleteTutorial(oid);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Tutorials] Delete :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   ADMIN — Prestations CRUD
   ========================================== */

app.post('/api/admin/prestations', adminAuth, async (req, res) => {
  const { icon, name, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name et price requis.' });
  if (String(name).length > 100 || String(price).length > 50) return res.status(400).json({ error: 'Données trop longues.' });
  try {
    const p = await db.insertPrestation({
      icon:  (icon?.trim() || '💅').slice(0, 4),
      name:  name.trim(),
      price: price.trim(),
    });
    res.status(201).json(p);
  } catch (err) {
    console.error('[Admin/Prestations] :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/prestations/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  const { icon, name, price } = req.body;
  const updates = {};
  if (icon  !== undefined) updates.icon  = String(icon).trim().slice(0, 4) || '💅';
  if (name  !== undefined) {
    if (!String(name).trim() || String(name).length > 100) return res.status(400).json({ error: 'Nom invalide.' });
    updates.name = name.trim();
  }
  if (price !== undefined) {
    if (!String(price).trim() || String(price).length > 50) return res.status(400).json({ error: 'Prix invalide.' });
    updates.price = price.trim();
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à modifier.' });
  try {
    await db.updatePrestation(oid, updates);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Prestations] Update :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/prestations/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  try {
    await db.deletePrestation(oid);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Prestations] Delete :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   GALLERY CATEGORIES — public + admin CRUD
   ========================================== */

const GRADIENT_PRESETS = new Set([
  'linear-gradient(135deg,#fbc2eb,#a6c1ee)',
  'linear-gradient(135deg,#c471f5,#fa71cd)',
  'linear-gradient(135deg,#f7971e,#ffd200)',
  'linear-gradient(135deg,#d4fc79,#96e6a1)',
  'linear-gradient(135deg,#f8f9fa,#e9ecef)',
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#30cfd0,#330867)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
]);

function slugify(str) {
  return str.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

app.get('/api/gallery/categories', async (_req, res) => {
  try {
    const cats = await db.getGalleryCategories();
    console.log(`[GalCats] GET /api/gallery/categories → ${cats.length} catégorie(s)`);
    res.json(cats);
  } catch (err) {
    console.error('[GalCats] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/admin/gallery/categories', adminAuth, async (req, res) => {
  const { label, gradient } = req.body;
  if (!label?.trim() || label.length > 60) return res.status(400).json({ error: 'Label invalide (1–60 car.).' });
  if (!gradient || !GRADIENT_PRESETS.has(gradient)) return res.status(400).json({ error: 'Dégradé invalide.' });
  const slug = slugify(label);
  if (!slug) return res.status(400).json({ error: 'Label ne peut pas former un identifiant.' });
  try {
    const existing = (await db.getGalleryCategories()).find(c => c.slug === slug);
    if (existing) return res.status(409).json({ error: 'Une catégorie avec ce nom existe déjà.' });
    const cat = await db.insertGalleryCategory({ slug, label: label.trim(), gradient });
    res.status(201).json(cat);
  } catch (err) {
    console.error('[Admin/GalCats] :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/admin/gallery/categories/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  const { label, gradient } = req.body;
  const updates = {};
  if (label !== undefined) {
    if (!label.trim() || label.length > 60) return res.status(400).json({ error: 'Label invalide.' });
    const slug = slugify(label);
    if (!slug) return res.status(400).json({ error: 'Label invalide.' });
    updates.label = label.trim();
    updates.slug  = slug;
  }
  if (gradient !== undefined) {
    if (!GRADIENT_PRESETS.has(gradient)) return res.status(400).json({ error: 'Dégradé invalide.' });
    updates.gradient = gradient;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Aucun champ à modifier.' });
  try {
    await db.updateGalleryCategory(oid, updates);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/GalCats] Update :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/gallery/categories/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  try {
    await db.deleteGalleryCategory(oid);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/GalCats] Delete :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   ADMIN — Avis (reviews)
   ========================================== */

app.get('/api/admin/reviews', adminAuth, async (_req, res) => {
  try {
    const reviews = await db.getAllReviews();
    res.json(reviews.map(r => ({
      _id:     r._id,
      name:    r.name,
      service: r.service,
      rating:  r.rating,
      text:    r.text,
      approved: r.approved,
      created_at: r.created_at,
    })));
  } catch (err) {
    console.error('[Admin/Reviews] :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/reviews/:id', adminAuth, async (req, res) => {
  const oid = toObjectId(req.params.id);
  if (!oid) return res.status(400).json({ error: 'ID invalide.' });
  try {
    await db.deleteReview(oid);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin/Reviews] Delete :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ==========================================
   MULTER — gestion des erreurs d'upload
   ========================================== */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('image') || err.message?.includes('vidéo') || err.message?.includes('Format')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

/* ==========================================
   EMAILS (Nodemailer — optionnel)
   ========================================== */

let _transporter = null;
function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transporter;
}

const MONTHS      = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const MONTHS_FULL = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

async function sendOrderConfirmation({ num, name, service, date, time, email }) {
  const t = createTransporter();
  if (!t) { console.log(`[Email] SMTP non configuré — ${num}`); return; }

  const dateStr      = date ? `${date.day} ${MONTHS_FULL[date.month]} ${date.year}` : '—';
  const dateStrShort = date ? `${date.day} ${MONTHS[date.month]} ${date.year}` : '—';

  await t.sendMail({
    from:    `"LYDHAS_Nails Studio" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Votre rendez-vous chez LYDHAS_Nails est bien enregistré — ${num}`,
    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf0f8;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:2rem auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(233,30,140,0.10)">
    <div style="background:linear-gradient(135deg,#e91e8c,#ff6ec7);padding:2rem 2.5rem;text-align:center">
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:0.9rem;letter-spacing:2px;text-transform:uppercase">LYDHAS_Nails Studio</p>
      <h1 style="margin:0.5rem 0 0;color:#fff;font-size:1.8rem;font-weight:700">💅 Rendez-vous enregistré !</h1>
    </div>
    <div style="padding:2rem 2.5rem">
      <p style="font-size:1rem;color:#4a2040;margin-top:0">Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p style="color:#4a2040;line-height:1.7">Nous avons bien reçu votre demande. <strong>Un retour vous sera fait très prochainement.</strong></p>
      <div style="background:#fff0f8;border-radius:12px;padding:1.25rem 1.5rem;margin:1.5rem 0">
        <p style="margin:0 0 0.75rem;font-weight:700;color:#e91e8c;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px">Récapitulatif</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.92rem">
          <tr><td style="padding:0.45rem 0;color:#8a6080;font-weight:600;width:140px">N° de suivi</td><td><strong style="color:#e91e8c">${num}</strong></td></tr>
          <tr><td style="padding:0.45rem 0;color:#8a6080;font-weight:600">Prestation</td><td style="color:#4a2040">${escapeHtml(service)}</td></tr>
          <tr><td style="padding:0.45rem 0;color:#8a6080;font-weight:600">Date souhaitée</td><td style="color:#4a2040">${dateStr} à ${time ?? '—'}</td></tr>
        </table>
      </div>
      <p style="color:#4a2040;margin-bottom:0">À très bientôt,<br><strong style="color:#e91e8c">Lydie — LYDHAS_Nails Studio</strong></p>
    </div>
    <div style="background:#fdf0f8;padding:1rem 2.5rem;text-align:center;font-size:0.78rem;color:#8a6080">
      Email envoyé suite à votre demande de rendez-vous.
    </div>
  </div>
</body></html>`,
  });

  await t.sendMail({
    from:    `"LYDHAS_Nails Studio" <${process.env.SMTP_USER}>`,
    to:      process.env.OWNER_EMAIL,
    subject: `📅 Nouvelle réservation — ${escapeHtml(name)} — ${dateStrShort}`,
    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf0f8;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:2rem auto;background:#fff;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#1a0a14,#6b1548);padding:1.5rem 2.5rem">
      <h2 style="margin:0;color:#fff;font-size:1.4rem">📅 Nouvelle demande de rendez-vous</h2>
    </div>
    <div style="padding:2rem 2.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.93rem">
        <tr style="border-bottom:1px solid #f0e0e8"><td style="padding:0.6rem 0;color:#8a6080;font-weight:600;width:160px">N° commande</td><td><strong style="color:#e91e8c">${num}</strong></td></tr>
        <tr style="border-bottom:1px solid #f0e0e8"><td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Cliente</td><td><strong>${escapeHtml(name)}</strong></td></tr>
        <tr style="border-bottom:1px solid #f0e0e8"><td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:#e91e8c">${escapeHtml(email)}</a></td></tr>
        <tr style="border-bottom:1px solid #f0e0e8"><td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Prestation</td><td>${escapeHtml(service)}</td></tr>
        <tr><td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Date souhaitée</td><td><strong>${dateStr} à ${time ?? '—'}</strong></td></tr>
      </table>
    </div>
  </div>
</body></html>`,
  });

  console.log(`[Email] Confirmation → ${email}`);
}

async function sendContactNotification({ name, email, sujet, msg }) {
  const t = createTransporter();
  if (!t || !process.env.OWNER_EMAIL) return;
  await t.sendMail({
    from:    `"LYDHAS_Nails Studio" <${process.env.SMTP_USER}>`,
    to:      process.env.OWNER_EMAIL,
    replyTo: email,
    subject: `📩 Contact — ${sujet}`,
    html:    `<h3>Nouveau message</h3>
      <p><strong>De :</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p><strong>Sujet :</strong> ${escapeHtml(sujet)}</p>
      <hr>
      <p>${escapeHtml(msg).replace(/\n/g, '<br>')}</p>`,
  });
}

/* ==========================================
   UTILITAIRES
   ========================================== */

function relativeDate(iso) {
  if (!iso) return 'Récemment';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Il y a 1 jour';
  if (days < 7)  return `Il y a ${days} jours`;
  if (days < 14) return 'Il y a 1 semaine';
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
  if (days < 60) return 'Il y a 1 mois';
  return `Il y a ${Math.floor(days / 30)} mois`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/* Route admin page */
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

/* SPA fallback */
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

/* ==========================================
   DÉMARRAGE
   ========================================== */
const server = app.listen(PORT, () => {
  console.log(`\n✅  LYDHAS_Nails Studio — serveur démarré`);
  console.log(`🌐  http://localhost:${PORT}`);
  console.log(`🔐  Admin : http://localhost:${PORT}/admin\n`);
  if (!process.env.SMTP_HOST) console.log('📧  Email désactivé (SMTP_HOST non configuré)\n');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} déjà utilisé.`);
    console.error(`   Windows : netstat -ano | findstr :${PORT}  puis  taskkill /PID <id> /F\n`);
  } else {
    console.error('Erreur serveur :', err.message);
  }
  process.exit(1);
});
