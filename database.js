/* ========================================
   database.js — Store JSON (pur Node.js, sans dépendances natives)
   Les données sont persistées dans le dossier /data/
   ======================================== */

const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

/* ---------- Helpers ---------- */

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readCollection(name) {
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return [];
  }
}

function writeCollection(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf8');
}

/* ---------- API publique ---------- */

const db = {

  /* -- ORDERS -- */

  insertOrder(order) {
    const orders = readCollection('orders');
    if (orders.find(o => o.num === order.num)) {
      throw Object.assign(new Error('UNIQUE constraint failed'), { code: 'UNIQUE' });
    }
    const row = {
      ...order,
      status:       order.status      || 'confirmed',
      status_label: order.status_label || 'Confirmé',
      step1: 1, step2: 0, step3: 0, step4: 0,
      created_at: new Date().toISOString()
    };
    orders.push(row);
    writeCollection('orders', orders);
    return row;
  },

  getOrder(num) {
    return readCollection('orders').find(o => o.num === num.toUpperCase()) || null;
  },

  /* -- REVIEWS -- */

  getReviews() {
    return readCollection('reviews').filter(r => r.approved);
  },

  insertReview(review) {
    const reviews = readCollection('reviews');
    const row = {
      id:         reviews.length + 1,
      name:       review.name,
      service:    review.service || 'Cliente LuxNails',
      rating:     review.rating,
      text:       review.text,
      approved:   true,
      created_at: new Date().toISOString()
    };
    reviews.unshift(row);
    writeCollection('reviews', reviews);
    return row;
  },

  /* -- CONTACTS -- */

  insertContact(contact) {
    const contacts = readCollection('contacts');
    contacts.push({ ...contact, created_at: new Date().toISOString() });
    writeCollection('contacts', contacts);
  },

  /* -- NEWSLETTER -- */

  insertNewsletter(email) {
    const list = readCollection('newsletter');
    if (list.find(e => e.email === email.toLowerCase())) {
      throw Object.assign(new Error('UNIQUE constraint failed'), { code: 'UNIQUE' });
    }
    list.push({ email: email.toLowerCase(), created_at: new Date().toISOString() });
    writeCollection('newsletter', list);
  }
};

/* ---------- Seed initial ---------- */

function seed() {
  /* Commandes démo */
  const orders = readCollection('orders');
  const demos = [
    {
      num: 'LN-2024-001', name: 'Sophie M.', service: 'Nail Art Premium (80$ CAD)',
      date: { day: 20, month: 0, year: 2024 }, time: '14:00', email: 'sophie@example.com',
      status: 'ready', status_label: 'Prêt à récupérer',
      step1: 1, step2: 1, step3: 1, step4: 0
    },
    {
      num: 'LN-2024-002', name: 'Camille L.', service: 'Pose Gel (55$ CAD)',
      date: { day: 22, month: 0, year: 2024 }, time: '10:30', email: 'camille@example.com',
      status: 'preparing', status_label: 'En cours de préparation',
      step1: 1, step2: 1, step3: 0, step4: 0
    },
    {
      num: 'LN-2024-003', name: 'Julie R.', service: 'Extensions Acrylique (90$ CAD)',
      date: { day: 18, month: 0, year: 2024 }, time: '16:00', email: 'julie@example.com',
      status: 'completed', status_label: 'Terminé',
      step1: 1, step2: 1, step3: 1, step4: 1
    }
  ];
  for (const demo of demos) {
    if (!orders.find(o => o.num === demo.num)) {
      orders.push({ ...demo, created_at: new Date('2024-01-15').toISOString() });
    }
  }
  writeCollection('orders', orders);

  /* Avis par défaut */
  if (readCollection('reviews').length === 0) {
    const now = Date.now();
    const defaults = [
      { name: 'Sophie M.',  service: 'Nail Art Premium',    rating: 5, daysAgo: 2,  text: "Absolument époustouflant ! Mes ongles sont devenus de vraies œuvres d'art. L'accueil est chaleureux et le résultat dépasse toutes mes attentes." },
      { name: 'Camille L.', service: 'Pose Gel',             rating: 5, daysAgo: 5,  text: "Ma première pose gel ici et je suis conquise ! Tenue parfaite après 3 semaines, brillance incroyable. Je reviens sans hésiter." },
      { name: 'Julie R.',   service: 'Extensions Acrylique', rating: 5, daysAgo: 7,  text: "Je cherchais des extensions naturelles et c'est exactement ce que j'ai eu. Technique impeccable, résultat magnifique et très confortable." },
      { name: 'Marie T.',   service: 'Formation',            rating: 5, daysAgo: 14, text: "La formation est très complète et bien expliquée. En quelques heures, j'ai appris des techniques que je pensais impossibles. Merci infiniment !" },
      { name: 'Léa D.',     service: 'French Manucure',      rating: 4, daysAgo: 21, text: "Très satisfaite de ma French manucure. Propre, élégante, exactement ce que je voulais. Je recommande à toutes mes amies." },
      { name: 'Emma B.',    service: 'Nail Art Floral',      rating: 5, daysAgo: 30, text: "Je voulais quelque chose d'unique pour mon mariage et j'ai été gâtée ! Motifs floraux exquis, un vrai travail d'artiste. Merci LuxNails !" },
    ];
    const reviews = defaults.map((r, i) => ({
      id:         i + 1,
      name:       r.name,
      service:    r.service,
      rating:     r.rating,
      text:       r.text,
      approved:   true,
      created_at: new Date(now - r.daysAgo * 86400000).toISOString()
    }));
    writeCollection('reviews', reviews);
  }
}

seed();

module.exports = db;
