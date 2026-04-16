/* ========================================
   LuxNails — app.js
   ======================================== */

/* ---- NAVBAR SCROLL ---- */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('backTop').classList.toggle('visible', window.scrollY > 400);
});

navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

document.getElementById('backTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---- PARTICLES HERO ---- */
const particlesContainer = document.getElementById('particles');
const emojis = ['💅', '✨', '🌸', '💎', '⭐', '🫁', '💕'];
for (let i = 0; i < 22; i++) {
  const p = document.createElement('span');
  p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  p.style.cssText = `
    position:absolute;
    left:${Math.random() * 100}%;
    top:${Math.random() * 100}%;
    font-size:${Math.random() * 1.5 + 0.7}rem;
    opacity:${Math.random() * 0.4 + 0.1};
    animation: float ${Math.random() * 4 + 3}s ease-in-out ${Math.random() * 3}s infinite;
    pointer-events:none;
  `;
  particlesContainer.appendChild(p);
}

/* ---- COUNTER ANIMATION ---- */
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = +el.dataset.target;
    const step = target / 60;
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current);
      if (current >= target) clearInterval(interval);
    }, 25);
  });
}
const heroObserver = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) { animateCounters(); heroObserver.disconnect(); }
}, { threshold: 0.5 });
heroObserver.observe(document.querySelector('.hero-stats'));

/* ---- REVEAL ON SCROLL ---- */
document.querySelectorAll('.section-header, .service-card, .tuto-card, .contact-item').forEach(el => el.classList.add('reveal'));
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ---- GALLERY DATA ---- */
const galleryData = [
  { title: 'Rose Quartz', category: 'gel', gradient: 'linear-gradient(135deg,#f8c8e0,#fbe4ef)' },
  { title: 'Midnight Blue', category: 'nail-art', gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { title: 'Natural Glow', category: 'naturel', gradient: 'linear-gradient(135deg,#ffd89b,#19547b)' },
  { title: 'French Classic', category: 'french', gradient: 'linear-gradient(135deg,#f8f9fa,#e9ecef)' },
  { title: 'Holographic', category: 'nail-art', gradient: 'linear-gradient(135deg,#c471f5,#fa71cd)' },
  { title: 'Nude Stiletto', category: 'acrylique', gradient: 'linear-gradient(135deg,#f7971e,#ffd200)' },
  { title: 'Cherry Blossom', category: 'nail-art', gradient: 'linear-gradient(135deg,#ff9a9e,#fad0c4)' },
  { title: 'Midnight Gel', category: 'gel', gradient: 'linear-gradient(135deg,#2c3e50,#3498db)' },
  { title: 'Gold French', category: 'french', gradient: 'linear-gradient(135deg,#f6d365,#fda085)' },
  { title: 'Nude Acryl', category: 'acrylique', gradient: 'linear-gradient(135deg,#e0c3fc,#8ec5fc)' },
  { title: 'Marble Effect', category: 'nail-art', gradient: 'linear-gradient(135deg,#e9defa,#fbfcdb)' },
  { title: 'Baby Pink Gel', category: 'gel', gradient: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)' },
  { title: 'Green Naturel', category: 'naturel', gradient: 'linear-gradient(135deg,#d4fc79,#96e6a1)' },
  { title: 'Coffin Acryl', category: 'acrylique', gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { title: 'Red French', category: 'french', gradient: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { title: 'Galaxy Art', category: 'nail-art', gradient: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' },
];

const galleryGrid = document.getElementById('galleryGrid');
let lightboxIndex = 0;
let currentFilteredItems = [];

function renderGallery(filter = 'all') {
  currentFilteredItems = filter === 'all' ? galleryData : galleryData.filter(i => i.category === filter);
  galleryGrid.innerHTML = '';
  currentFilteredItems.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.idx = idx;
    div.innerHTML = `
      <div class="gallery-bg" style="background:${item.gradient}"></div>
      <div class="gallery-overlay">
        <span>${item.title}</span>
        <em>${categoryLabel(item.category)}</em>
      </div>`;
    div.addEventListener('click', () => openLightbox(idx));
    galleryGrid.appendChild(div);
  });
}

function categoryLabel(c) {
  const labels = { gel: 'Pose Gel', 'nail-art': 'Nail Art', acrylique: 'Acrylique', naturel: 'Naturel', french: 'French' };
  return labels[c] || c;
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGallery(btn.dataset.filter);
  });
});

renderGallery();

/* LIGHTBOX */
const lightbox = document.getElementById('lightbox');
const lbImg    = document.getElementById('lbImg');
const lbCaption= document.getElementById('lbCaption');

function openLightbox(idx) {
  lightboxIndex = idx;
  updateLightbox();
  lightbox.classList.add('open');
}
function updateLightbox() {
  const item = currentFilteredItems[lightboxIndex];
  lbImg.style.background = item.gradient;
  lbImg.style.width = '400px'; lbImg.style.height = '400px';
  lbImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // transparent
  lbImg.style.display = 'block';
  lbCaption.textContent = `${item.title} — ${categoryLabel(item.category)}`;
}

document.getElementById('lbClose').onclick = () => lightbox.classList.remove('open');
document.getElementById('lbPrev').onclick  = () => { lightboxIndex = (lightboxIndex - 1 + currentFilteredItems.length) % currentFilteredItems.length; updateLightbox(); };
document.getElementById('lbNext').onclick  = () => { lightboxIndex = (lightboxIndex + 1) % currentFilteredItems.length; updateLightbox(); };
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'ArrowLeft') document.getElementById('lbPrev').click();
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
  if (e.key === 'Escape') lightbox.classList.remove('open');
});

/* ---- TUTORIAL MODAL ---- */
const tutoData = {
  1: { title: 'Les bases de la pose gel', desc: 'Apprenez les fondamentaux de la manucure gel : préparation de l\'ongle, application base, couleur et top coat, séchage sous lampe UV/LED.', level: 'Débutant', duration: '12 min' },
  2: { title: 'Nail Art Floral Step by Step', desc: 'Création de motifs floraux détaillés avec dotting tools, pinceaux fins et stamping. Idéal pour les occasions spéciales.', level: 'Intermédiaire', duration: '24 min' },
  3: { title: 'Extensions acrylique pro', desc: 'Maîtrisez la pose d\'extensions en acrylique : préparation du lit unguéal, sculptage, formes coffin/stiletto/ballerine.', level: 'Avancé', duration: '38 min' },
  4: { title: 'Dégradé & Ombré Nails', desc: 'Cinq techniques pour réaliser des dégradés parfaits : éponge, pinceau fan, dégradé gel en biberon, airbrush simulation.', level: 'Intermédiaire', duration: '19 min' },
};

document.querySelectorAll('.tuto-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const d = tutoData[btn.dataset.id];
    document.getElementById('tutoModalTitle').textContent = d.title;
    document.getElementById('tutoModalInfo').innerHTML = `
      <h3>${d.title}</h3>
      <p style="color:var(--text-light);margin:0.5rem 0 1rem">${d.desc}</p>
      <div style="display:flex;gap:1rem;flex-wrap:wrap">
        <span style="background:var(--pink-pale);color:var(--pink);padding:0.3rem 0.75rem;border-radius:50px;font-size:0.8rem;font-weight:600">Niveau : ${d.level}</span>
        <span style="background:var(--pink-pale);color:var(--pink);padding:0.3rem 0.75rem;border-radius:50px;font-size:0.8rem;font-weight:600">⏱ ${d.duration}</span>
      </div>`;
    document.getElementById('tutoModal').classList.add('open');
  });
});
document.getElementById('tutoModalClose').onclick = () => document.getElementById('tutoModal').classList.remove('open');
document.getElementById('tutoModal').addEventListener('click', e => {
  if (e.target === document.getElementById('tutoModal')) document.getElementById('tutoModal').classList.remove('open');
});

/* ---- MINI CALENDAR ---- */
let calDate = new Date();
let selectedDate = null;
let selectedTime = null;

const takenSlots = { '15': ['10:00', '14:00'], '18': ['09:00', '15:30'], '20': ['11:00', '13:00', '16:00'] };
const allSlots   = ['09:00','10:00','10:30','11:00','12:00','13:00','14:00','14:30','15:00','15:30','16:00','17:00','18:00'];

function renderCalendar() {
  const cal = document.getElementById('miniCal');
  if (!cal) return;
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const days   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  let html = `<div class="cal-header">
    <button id="calPrev">‹</button>
    <h4>${months[month]} ${year}</h4>
    <button id="calNext">›</button>
  </div>
  <div class="cal-grid">
    ${days.map(d => `<div class="cal-day-name">${d}</div>`).join('')}`;

  const start = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < start; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isPast  = new Date(year, month, d) < new Date(today.toDateString());
    const isSelected = selectedDate && selectedDate.day === d && selectedDate.month === month && selectedDate.year === year;
    const cls = ['cal-day', isToday && 'today', isSelected && 'selected', isPast && 'disabled'].filter(Boolean).join(' ');
    html += `<div class="${cls}" data-day="${d}" data-month="${month}" data-year="${year}">${d}</div>`;
  }
  html += `</div>`;
  cal.innerHTML = html;

  cal.querySelector('#calPrev').onclick = () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); };
  cal.querySelector('#calNext').onclick = () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); };
  cal.querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach(day => {
    day.addEventListener('click', () => {
      selectedDate = { day: +day.dataset.day, month: +day.dataset.month, year: +day.dataset.year };
      selectedTime = null;
      renderCalendar();
      renderTimeSlots(+day.dataset.day);
    });
  });
}

function renderTimeSlots(day) {
  const container = document.getElementById('timeSlots');
  const taken = takenSlots[String(day)] || [];
  container.innerHTML = allSlots.map(t => {
    const isTaken = taken.includes(t);
    return `<div class="time-slot${isTaken ? ' taken' : ''}" data-time="${t}">${t}</div>`;
  }).join('');
  container.querySelectorAll('.time-slot:not(.taken)').forEach(slot => {
    slot.addEventListener('click', () => {
      container.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      selectedTime = slot.dataset.time;
    });
  });
}

/* ---- ORDER FORM STEPS ---- */
let currentStep = 1;

function goToStep(n) {
  document.querySelectorAll('.form-page').forEach((p, i) => p.classList.toggle('active', i === n - 1));
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 < n) s.classList.add('done');
    else if (i + 1 === n) s.classList.add('active');
  });
  currentStep = n;
  if (n === 2) renderCalendar();
  if (n === 4) buildRecap();
}

document.querySelectorAll('.next-step').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentStep === 1) {
      if (!document.querySelector('input[name="service"]:checked')) { showToast('Veuillez choisir une prestation', 'error'); return; }
    }
    if (currentStep === 2) {
      if (!selectedDate) { showToast('Veuillez choisir une date', 'error'); return; }
      if (!selectedTime) { showToast('Veuillez choisir un horaire', 'error'); return; }
    }
    if (currentStep === 3) {
      const prenom = document.querySelector('[name="prenom"]').value.trim();
      const nom    = document.querySelector('[name="nom"]').value.trim();
      const email  = document.querySelector('[name="email"]').value.trim();
      const tel    = document.querySelector('[name="tel"]').value.trim();
      if (!prenom || !nom || !email || !tel) { showToast('Veuillez remplir tous les champs obligatoires', 'error'); return; }
    }
    goToStep(currentStep + 1);
  });
});

document.querySelectorAll('.prev-step').forEach(btn => {
  btn.addEventListener('click', () => goToStep(currentStep - 1));
});

function buildRecap() {
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const service = document.querySelector('input[name="service"]:checked')?.value || '';
  const date = selectedDate ? `${selectedDate.day} ${months[selectedDate.month]} ${selectedDate.year}` : '';
  const recap = document.getElementById('recapBox');
  recap.innerHTML = `
    <div class="recap-row"><span>Prestation</span><span>${service}</span></div>
    <div class="recap-row"><span>Date</span><span>${date} à ${selectedTime}</span></div>
    <div class="recap-row"><span>Nom</span><span>${document.querySelector('[name="prenom"]').value} ${document.querySelector('[name="nom"]').value}</span></div>
    <div class="recap-row"><span>Email</span><span>${document.querySelector('[name="email"]').value}</span></div>
    <div class="recap-row"><span>Téléphone</span><span>${document.querySelector('[name="tel"]').value}</span></div>
  `;
}

document.getElementById('orderForm').addEventListener('submit', e => {
  e.preventDefault();
  const num = 'LN-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900 + 100)).padStart(3, '0');
  document.getElementById('trackingNum').textContent = num;

  // Sauvegarder dans localStorage
  const orders = JSON.parse(localStorage.getItem('luxnails_orders') || '[]');
  orders.push({
    num,
    name: `${document.querySelector('[name="prenom"]').value} ${document.querySelector('[name="nom"]').value}`,
    service: document.querySelector('input[name="service"]:checked')?.value,
    date: selectedDate, time: selectedTime,
    email: document.querySelector('[name="email"]').value,
    status: 'confirmed',
    steps: [true, false, false, false],
    timestamp: Date.now()
  });
  localStorage.setItem('luxnails_orders', JSON.stringify(orders));

  document.getElementById('orderForm').style.display = 'none';
  document.getElementById('orderSuccess').style.display = 'block';
  showToast('Réservation confirmée ! 🎉', 'success');
});

/* ---- TRACKING ---- */
const demoOrders = {
  'LN-2024-001': { name: 'Sophie M.', service: 'Nail Art Premium (55€)', date: '20 Jan 2024', time: '14:00', status: 'ready', steps: [true, true, true, false], statusLabel: 'Prêt à récupérer' },
  'LN-2024-002': { name: 'Camille L.', service: 'Pose Gel (35€)', date: '22 Jan 2024', time: '10:30', status: 'preparing', steps: [true, true, false, false], statusLabel: 'En cours de préparation' },
  'LN-2024-003': { name: 'Julie R.', service: 'Extensions Acrylique (65€)', date: '18 Jan 2024', time: '16:00', status: 'completed', steps: [true, true, true, true], statusLabel: 'Terminé' },
};

const stepLabels = [
  { icon: '✅', label: 'Confirmé' },
  { icon: '🔄', label: 'En préparation' },
  { icon: '💅', label: 'En cours' },
  { icon: '🎉', label: 'Terminé' }
];

function searchOrder(num) {
  num = num.trim().toUpperCase();
  const localOrders = JSON.parse(localStorage.getItem('luxnails_orders') || '[]');
  let order = localOrders.find(o => o.num === num);
  if (!order) order = demoOrders[num];

  const resultEl = document.getElementById('trackResult');
  if (!order) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--pink)"><p style="font-size:2rem">🔍</p><p>Numéro de commande introuvable.</p><p style="font-size:0.85rem;color:var(--text-light);margin-top:0.5rem">Vérifiez le numéro envoyé par email.</p></div>`;
    return;
  }

  const badgeClass = { confirmed:'badge-confirmed', preparing:'badge-preparing', ready:'badge-ready', completed:'badge-completed' }[order.status] || 'badge-confirmed';
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  let dateStr = order.date;
  if (order.date && typeof order.date === 'object') {
    dateStr = `${order.date.day} ${months[order.date.month]} ${order.date.year}`;
  }

  const stepsHTML = stepLabels.map((s, i) => {
    const done = order.steps[i];
    const current = done && (i === order.steps.lastIndexOf(true));
    return `<div class="track-step ${done ? 'done' : ''} ${current ? 'current' : ''}">
      <div class="ts-circle">${done ? s.icon : ''}</div>
      <div class="ts-label">${s.label}</div>
    </div>`;
  }).join('');

  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="track-header">
      <div><h4>${order.name}</h4><p>${order.service}</p></div>
      <span class="track-badge ${badgeClass}">${order.statusLabel || order.status}</span>
    </div>
    <div class="track-steps">${stepsHTML}</div>
    <div class="track-details">
      <table>
        <tr><td>Numéro</td><td><strong>${num}</strong></td></tr>
        <tr><td>Date RDV</td><td>${dateStr} à ${order.time}</td></tr>
        <tr><td>Prestation</td><td>${order.service}</td></tr>
        <tr><td>Email</td><td>${order.email || '—'}</td></tr>
      </table>
    </div>`;
}

document.getElementById('trackBtn').addEventListener('click', () => searchOrder(document.getElementById('trackInput').value));
document.getElementById('trackInput').addEventListener('keydown', e => { if (e.key === 'Enter') searchOrder(e.target.value); });
document.querySelectorAll('.demo-num').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('trackInput').value = btn.dataset.num;
    searchOrder(btn.dataset.num);
  });
});

/* ---- REVIEWS ---- */
const defaultReviews = [
  { name: 'Sophie M.', service: 'Nail Art Premium', rating: 5, text: 'Absolument époustouflant ! Mes ongles sont devenus de vraies œuvres d\'art. L\'accueil est chaleureux et le résultat dépasse toutes mes attentes.', date: 'Il y a 2 jours' },
  { name: 'Camille L.', service: 'Pose Gel', rating: 5, text: 'Ma première pose gel ici et je suis conquise ! Tenue parfaite après 3 semaines, brillance incroyable. Je reviens sans hésiter.', date: 'Il y a 5 jours' },
  { name: 'Julie R.', service: 'Extensions Acrylique', rating: 5, text: 'Je cherchais des extensions naturelles et c\'est exactement ce que j\'ai eu. Technique impeccable, résultat magnifique et très confortable.', date: 'Il y a 1 semaine' },
  { name: 'Marie T.', service: 'Formation', rating: 5, text: 'La formation est très complète et bien expliquée. En quelques heures, j\'ai appris des techniques que je pensais impossibles. Merci infiniment !', date: 'Il y a 2 semaines' },
  { name: 'Léa D.', service: 'French Manucure', rating: 4, text: 'Très satisfaite de ma French manucure. Propre, élégante, exactement ce que je voulais. Je recommande à toutes mes amies.', date: 'Il y a 3 semaines' },
  { name: 'Emma B.', service: 'Nail Art Floral', rating: 5, text: 'Je voulais quelque chose d\'unique pour mon mariage et j\'ai été gâtée ! Motifs floraux exquis, un vrai travail d\'artiste. Merci LuxNails !', date: 'Il y a 1 mois' },
];

let allReviews = [...defaultReviews, ...JSON.parse(localStorage.getItem('luxnails_reviews') || '[]')];
let reviewOffset = 0;
const reviewsPerPage = 3;

function renderReviews() {
  const track = document.getElementById('reviewsTrack');
  track.innerHTML = allReviews.slice(reviewOffset, reviewOffset + reviewsPerPage).map(r => `
    <div class="review-card">
      <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <p class="review-text">"${r.text}"</p>
      <div class="review-author">
        <div class="review-avatar">${r.name[0]}</div>
        <div class="review-author-info">
          <strong>${r.name}</strong>
          <span>${r.service} · ${r.date}</span>
        </div>
      </div>
    </div>`).join('');
  renderDots();
}

function renderDots() {
  const total = Math.ceil(allReviews.length / reviewsPerPage);
  const current = Math.floor(reviewOffset / reviewsPerPage);
  document.getElementById('reviewDots').innerHTML = Array.from({length: total}, (_, i) =>
    `<div class="review-dot ${i === current ? 'active' : ''}" data-i="${i}"></div>`
  ).join('');
  document.querySelectorAll('.review-dot').forEach(dot => {
    dot.addEventListener('click', () => { reviewOffset = +dot.dataset.i * reviewsPerPage; renderReviews(); });
  });
}

document.getElementById('revPrev').onclick = () => {
  reviewOffset = Math.max(0, reviewOffset - reviewsPerPage);
  renderReviews();
};
document.getElementById('revNext').onclick = () => {
  reviewOffset = Math.min((Math.ceil(allReviews.length / reviewsPerPage) - 1) * reviewsPerPage, reviewOffset + reviewsPerPage);
  renderReviews();
};

renderReviews();

/* STAR RATING */
let selectedRating = 5;
document.querySelectorAll('#starSelect span').forEach(star => {
  star.addEventListener('mouseover', () => {
    document.querySelectorAll('#starSelect span').forEach((s, i) => s.classList.toggle('active', i < +star.dataset.v));
  });
  star.addEventListener('click', () => {
    selectedRating = +star.dataset.v;
    document.querySelectorAll('#starSelect span').forEach((s, i) => s.classList.toggle('active', i < selectedRating));
  });
});
document.querySelectorAll('#starSelect span').forEach((s, i) => { if (i < 5) s.classList.add('active'); });

document.getElementById('reviewForm').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  const review = {
    name: form.reviewer.value.trim(),
    service: 'Cliente LuxNails',
    rating: selectedRating,
    text: form.comment.value.trim(),
    date: "À l'instant"
  };
  allReviews = [review, ...allReviews];
  const saved = JSON.parse(localStorage.getItem('luxnails_reviews') || '[]');
  saved.unshift(review);
  localStorage.setItem('luxnails_reviews', JSON.stringify(saved));
  reviewOffset = 0;
  renderReviews();
  form.reset();
  showToast('Merci pour votre avis ! ⭐', 'success');
});

/* ---- CONTACT FORM ---- */
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  showToast('Message envoyé avec succès ! Nous vous répondrons rapidement.', 'success');
  e.target.reset();
});

/* ---- TOAST ---- */
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><p>${msg}</p>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ---- SMOOTH NAV LINKS ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});
