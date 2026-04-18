/* ========================================
   server.js — LYDHAS Nails Studio Backend
   ======================================== */

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const path       = require('path');
const db         = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));   // sert index.html, style.css, app.js

/* ==========================================
   COMMANDES / RÉSERVATIONS
   ========================================== */

/* POST /api/orders — créer une réservation */
app.post('/api/orders', async (req, res) => {
  const { num, name, service, date, time, email, phone, model_notes, message } = req.body;

  if (!num || !name || !service || !email) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (num, name, service, email).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  try {
    const order = await db.insertOrder({ num, name, service, date, time, email, phone, model_notes, message });

    sendOrderConfirmation({ num, name, service, date, time, email }).catch(err =>
      console.error('[Email] Erreur confirmation :', err.message)
    );

    res.status(201).json({ success: true, num: order.num });
  } catch (err) {
    if (err.code === 'UNIQUE') {
      return res.status(409).json({ error: 'Ce numéro de commande existe déjà.' });
    }
    console.error('[Orders] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* GET /api/orders/:num — suivi d'une commande */
app.get('/api/orders/:num', async (req, res) => {
  const num   = req.params.num.trim().toUpperCase();
  const order = await db.getOrder(num);

  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable.' });
  }

  res.json({
    num:         order.num,
    name:        order.name,
    service:     order.service,
    date:        order.date || null,
    time:        order.time,
    email:       order.email,
    status:      order.status,
    statusLabel: order.status_label,
    steps:       [!!order.step1, !!order.step2, !!order.step3, !!order.step4]
  });
});

/* ==========================================
   AVIS
   ========================================== */

/* GET /api/reviews — liste des avis */
app.get('/api/reviews', async (req, res) => {
  const reviewsData = await db.getReviews();

  const reviews = reviewsData.map(r => ({
    id:      r.id,
    name:    r.name,
    service: r.service,
    rating:  r.rating,
    text:    r.text,
    date:    relativeDate(r.created_at)
  }));

  res.json(reviews);
});

/* POST /api/reviews — soumettre un avis */
app.post('/api/reviews', async (req, res) => {
  const { name, service, rating, text } = req.body;

  if (!name || !text || !rating) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (name, rating, text).' });
  }
  const r = parseInt(rating);
  if (isNaN(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'La note doit être comprise entre 1 et 5.' });
  }
  if (text.trim().length < 10) {
    return res.status(400).json({ error: "L'avis est trop court (minimum 10 caractères)." });
  }

  const review = await db.insertReview({
    name:    name.trim(),
    service: service?.trim() || 'Cliente LuxNails',
    rating:  r,
    text:    text.trim()
  });

  res.status(201).json({
    success: true,
    review:  { ...review, date: "À l'instant" }
  });
});

/* ==========================================
   FORMULAIRE DE CONTACT
   ========================================== */

/* POST /api/contact */
app.post('/api/contact', async (req, res) => {
  const { name, email, sujet, msg } = req.body;

  if (!name || !email || !msg) {
    return res.status(400).json({ error: 'Champs obligatoires manquants (name, email, msg).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  await db.insertContact({ name: name.trim(), email: email.trim(), subject: sujet ?? 'Autre', message: msg.trim() });

  sendContactNotification({ name, email, sujet, msg }).catch(err =>
    console.error('[Email] Erreur notification contact :', err.message)
  );

  res.json({ success: true });
});

/* ==========================================
   NEWSLETTER
   ========================================== */

/* POST /api/newsletter */
app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }

  try {
    await db.insertNewsletter(email.trim());
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'UNIQUE') {
      return res.json({ success: true, already: true });   // silencieux côté client
    }
    console.error('[Newsletter] Erreur :', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
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
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return _transporter;
}

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const MONTHS_FULL = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

async function sendOrderConfirmation({ num, name, service, date, time, email }) {
  const t = createTransporter();
  if (!t) {
    console.log(`[Email] SMTP non configuré — email de confirmation non envoyé pour ${num}`);
    return;
  }

  const dateStr     = date ? `${date.day} ${MONTHS_FULL[date.month]} ${date.year}` : '—';
  const dateStrShort = date ? `${date.day} ${MONTHS[date.month]} ${date.year}` : '—';

  /* ── Email à la cliente ── */
  await t.sendMail({
    from:    `"LYDHAS_Nails Studio" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: `Votre rendez-vous chez LYDHAS_Nails est bien enregistré — ${num}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf0f8;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:2rem auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(233,30,140,0.10)">

    <!-- En-tête -->
    <div style="background:linear-gradient(135deg,#e91e8c,#ff6ec7);padding:2rem 2.5rem;text-align:center">
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:0.9rem;letter-spacing:2px;text-transform:uppercase">LYDHAS_Nails Studio</p>
      <h1 style="margin:0.5rem 0 0;color:#fff;font-size:1.8rem;font-weight:700">💅 Rendez-vous enregistré !</h1>
    </div>

    <!-- Corps -->
    <div style="padding:2rem 2.5rem">
      <p style="font-size:1rem;color:#4a2040;margin-top:0">Bonjour <strong>${escapeHtml(name)}</strong>,</p>

      <p style="color:#4a2040;line-height:1.7">
        Nous avons bien reçu votre demande de rendez-vous.
        <strong>Un retour vous sera fait très prochainement</strong> pour confirmer votre créneau et vous donner toutes les informations nécessaires.
      </p>

      <!-- Récapitulatif -->
      <div style="background:#fff0f8;border-radius:12px;padding:1.25rem 1.5rem;margin:1.5rem 0">
        <p style="margin:0 0 0.75rem;font-weight:700;color:#e91e8c;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px">Récapitulatif de votre demande</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.92rem">
          <tr>
            <td style="padding:0.45rem 0;color:#8a6080;font-weight:600;width:140px">N° de suivi</td>
            <td style="padding:0.45rem 0"><strong style="color:#e91e8c">${num}</strong></td>
          </tr>
          <tr>
            <td style="padding:0.45rem 0;color:#8a6080;font-weight:600">Prestation</td>
            <td style="padding:0.45rem 0;color:#4a2040">${escapeHtml(service)}</td>
          </tr>
          <tr>
            <td style="padding:0.45rem 0;color:#8a6080;font-weight:600">Date souhaitée</td>
            <td style="padding:0.45rem 0;color:#4a2040">${dateStr} à ${time ?? '—'}</td>
          </tr>
        </table>
      </div>

      <p style="color:#4a2040;line-height:1.7">
        Vous pouvez suivre l'état de votre réservation à tout moment en utilisant votre numéro de suivi sur notre site.
      </p>

      <p style="color:#4a2040;margin-bottom:0">
        À très bientôt,<br>
        <strong style="color:#e91e8c">Lydie — LYDHAS_Nails Studio</strong>
      </p>
    </div>

    <!-- Pied de page -->
    <div style="background:#fdf0f8;padding:1rem 2.5rem;text-align:center;font-size:0.78rem;color:#8a6080">
      Cet email a été envoyé depuis <strong>metorlenz2@gmail.com</strong> suite à votre demande de rendez-vous.
    </div>
  </div>
</body>
</html>`
  });

  /* ── Notification au salon ── */
  await t.sendMail({
    from:    `"LYDHAS_Nails Studio" <${process.env.SMTP_USER}>`,
    to:      process.env.OWNER_EMAIL,
    subject: `📅 Nouvelle réservation — ${escapeHtml(name)} — ${dateStrShort}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fdf0f8;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:2rem auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(233,30,140,0.10)">

    <div style="background:linear-gradient(135deg,#1a0a14,#6b1548);padding:1.5rem 2.5rem">
      <p style="margin:0;color:rgba(255,255,255,0.6);font-size:0.8rem;text-transform:uppercase;letter-spacing:2px">LYDHAS_Nails Studio</p>
      <h2 style="margin:0.4rem 0 0;color:#fff;font-size:1.4rem">📅 Nouvelle demande de rendez-vous</h2>
    </div>

    <div style="padding:2rem 2.5rem">
      <table style="width:100%;border-collapse:collapse;font-size:0.93rem">
        <tr style="border-bottom:1px solid #f0e0e8">
          <td style="padding:0.6rem 0;color:#8a6080;font-weight:600;width:160px">N° de commande</td>
          <td style="padding:0.6rem 0"><strong style="color:#e91e8c">${num}</strong></td>
        </tr>
        <tr style="border-bottom:1px solid #f0e0e8">
          <td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Cliente</td>
          <td style="padding:0.6rem 0"><strong>${escapeHtml(name)}</strong></td>
        </tr>
        <tr style="border-bottom:1px solid #f0e0e8">
          <td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Email</td>
          <td style="padding:0.6rem 0"><a href="mailto:${escapeHtml(email)}" style="color:#e91e8c">${escapeHtml(email)}</a></td>
        </tr>
        <tr style="border-bottom:1px solid #f0e0e8">
          <td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Prestation</td>
          <td style="padding:0.6rem 0">${escapeHtml(service)}</td>
        </tr>
        <tr>
          <td style="padding:0.6rem 0;color:#8a6080;font-weight:600">Date souhaitée</td>
          <td style="padding:0.6rem 0"><strong>${dateStr} à ${time ?? '—'}</strong></td>
        </tr>
      </table>

      <div style="margin-top:1.5rem;padding:1rem;background:#fff0f8;border-radius:8px;font-size:0.85rem;color:#8a6080">
        Répondez directement à cet email ou contactez la cliente à <a href="mailto:${escapeHtml(email)}" style="color:#e91e8c">${escapeHtml(email)}</a> pour confirmer le rendez-vous.
      </div>
    </div>
  </div>
</body>
</html>`
  });

  console.log(`[Email] Confirmation envoyée à ${email} + notification à ${process.env.OWNER_EMAIL}`);
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
      <p>${escapeHtml(msg).replace(/\n/g, '<br>')}</p>`
  });
}

/* ==========================================
   UTILITAIRES
   ========================================== */

function relativeDate(iso) {
  if (!iso) return 'Récemment';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0)  return "Aujourd'hui";
  if (days === 1)  return 'Il y a 1 jour';
  if (days < 7)   return `Il y a ${days} jours`;
  if (days < 14)  return 'Il y a 1 semaine';
  if (days < 30)  return `Il y a ${Math.floor(days / 7)} semaines`;
  if (days < 60)  return 'Il y a 1 mois';
  return `Il y a ${Math.floor(days / 30)} mois`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* SPA fallback */
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

/* ==========================================
   DÉMARRAGE
   ========================================== */
const server = app.listen(PORT, () => {
  console.log(`\n✅  LYDHAS_Nails Studio — serveur démarré`);
  console.log(`🌐  http://localhost:${PORT}\n`);
  if (!process.env.SMTP_HOST) {
    console.log('📧  Email désactivé (SMTP_HOST non configuré dans .env)\n');
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Le port ${PORT} est déjà utilisé.`);
    console.error(`   Fermez l'autre serveur ou changez PORT dans .env\n`);
    console.error(`   Windows : netstat -ano | findstr :${PORT}  puis  taskkill /PID <id> /F\n`);
  } else {
    console.error('Erreur serveur :', err.message);
  }
  process.exit(1);
});
