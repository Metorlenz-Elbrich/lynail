/* ========================================
   LuxNails — app.js  (avec backend API)
   ======================================== */

const API = '';   // même origine — laisser vide

/* ---- XSS PROTECTION — échapper toutes les données externes ---- */
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---- NAVBAR SCROLL ---- */
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('backTop').classList.toggle('visible', window.scrollY > 400);
});

navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
document.getElementById('backTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---- PARTICLES HERO ---- */
const particlesContainer = document.getElementById('particles');
const emojis = ['💅', '✨', '🌸', '💎', '⭐', '🩷', '💕'];
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

/* ---- GALLERY ---- */
let galleryData = [];

const galleryGrid = document.getElementById('galleryGrid');
let lightboxIndex = 0;
let currentFilteredItems = [];

async function loadGallery() {
  try {
    const res = await fetch(`${API}/api/gallery`);
    if (res.ok) galleryData = await res.json();
  } catch { /* silencieux */ }
  renderGallery();
}

function renderGallery(filter = 'all') {
  currentFilteredItems = filter === 'all' ? galleryData : galleryData.filter(i => i.category === filter);
  galleryGrid.innerHTML = '';
  if (currentFilteredItems.length === 0) {
    galleryGrid.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:2rem;width:100%">Aucune photo dans cette catégorie pour l\'instant.</p>';
    return;
  }
  currentFilteredItems.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.idx = idx;
    const bgStyle = (item.imageUrl && !item.isVideo)
      ? `background-image:url('${escHtml(item.imageUrl)}');background-size:cover;background-position:center`
      : `background:${item.gradient || 'linear-gradient(135deg,#667eea,#764ba2)'}`;
    div.innerHTML = `
      <div class="gallery-bg" style="${bgStyle}">
        ${item.isVideo ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2.5rem;pointer-events:none;text-shadow:0 2px 8px rgba(0,0,0,.5)">▶</div>' : ''}
      </div>
      <div class="gallery-overlay">
        <span>${escHtml(item.title)}</span>
        <em>${categoryLabel(item.category)}</em>
      </div>`;
    div.addEventListener('click', () => openLightbox(idx));
    galleryGrid.appendChild(div);
  });
}

function categoryLabel(c) {
  const labels = { gel:'Pose Gel', 'nail-art':'Nail Art', acrylique:'Acrylique', naturel:'Naturel', french:'French' };
  return labels[c] || c;
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGallery(btn.dataset.filter);
  });
});

/* LIGHTBOX */
const lightbox  = document.getElementById('lightbox');
const lbImg     = document.getElementById('lbImg');
const lbCaption = document.getElementById('lbCaption');

function openLightbox(idx) {
  lightboxIndex = idx;
  updateLightbox();
  lightbox.classList.add('open');
}
function updateLightbox() {
  const item = currentFilteredItems[lightboxIndex];
  /* Arrêter et supprimer toute vidéo précédente */
  lightbox.querySelectorAll('.lb-video').forEach(v => { v.pause(); v.remove(); });

  if (item.isVideo && item.imageUrl) {
    lbImg.style.display = 'none';
    const vid = document.createElement('video');
    vid.className = 'lb-video';
    vid.src       = item.imageUrl;
    vid.controls  = true;
    vid.autoplay  = true;
    vid.style.cssText = 'max-width:90vw;max-height:75vh;border-radius:8px;display:block';
    lbImg.parentNode.insertBefore(vid, lbImg);
  } else if (item.imageUrl) {
    lbImg.style.display = 'block';
    lbImg.src = item.imageUrl;
    lbImg.style.background = '';
    lbImg.style.width  = '';
    lbImg.style.height = '';
  } else {
    lbImg.style.display = 'block';
    lbImg.style.background = item.gradient;
    lbImg.style.width  = '400px';
    lbImg.style.height = '400px';
    lbImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
  lbCaption.textContent = `${item.title} — ${categoryLabel(item.category)}`;
}

document.getElementById('lbClose').onclick = () => lightbox.classList.remove('open');
document.getElementById('lbPrev').onclick  = () => { lightboxIndex = (lightboxIndex - 1 + currentFilteredItems.length) % currentFilteredItems.length; updateLightbox(); };
document.getElementById('lbNext').onclick  = () => { lightboxIndex = (lightboxIndex + 1) % currentFilteredItems.length; updateLightbox(); };
lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.classList.remove('open'); });
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'ArrowLeft')  document.getElementById('lbPrev').click();
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
  if (e.key === 'Escape')     lightbox.classList.remove('open');
});

/* ---- SERVICES ---- */
async function loadServices() {
  try {
    const res = await fetch(`${API}/api/services`);
    if (!res.ok) return;
    const services = await res.json();
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;
    grid.innerHTML = services.map(s => {
      const isFormation = s.title === 'Formation';
      return `
      <div class="service-card${s.featured ? ' featured' : ''}">
        ${s.featured ? '<span class="badge">Populaire</span>' : ''}
        <div class="service-icon">${escHtml(s.icon)}</div>
        <h3>${escHtml(s.title)}</h3>
        <p>${escHtml(s.description)}</p>
        <div class="service-price">À partir de <strong>${escHtml(s.price)}</strong></div>
        <a href="${isFormation ? '#tutorat' : '#commande'}" class="btn btn-sm">${isFormation ? 'En savoir +' : 'Réserver'}</a>
      </div>`;
    }).join('');
  } catch { /* silencieux */ }
}

/* ---- TUTORIALS ---- */
let tutorialsMap = new Map();
const tutoGradients = {
  'Débutant':       'linear-gradient(135deg,#ff9a9e,#fecfef)',
  'Intermédiaire':  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'Avancé':         'linear-gradient(135deg,#fccb90,#d57eeb)',
};

function getYoutubeEmbed(url) {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

async function loadTutorials() {
  try {
    const res = await fetch(`${API}/api/tutorials`);
    if (!res.ok) return;
    const tutorials = await res.json();
    tutorialsMap.clear();
    tutorials.forEach(t => tutorialsMap.set(String(t._id), t));

    const grid = document.getElementById('tutoGrid');
    if (!grid) return;

    const levelClass = { 'Débutant':'niveau-debutant', 'Intermédiaire':'niveau-intermediaire', 'Avancé':'niveau-avance' };
    grid.innerHTML = tutorials.map(t => `
      <div class="tuto-card">
        <div class="tuto-thumb">
          <div class="tuto-play">▶</div>
          <div class="tuto-bg" style="background:${tutoGradients[t.level] || tutoGradients['Intermédiaire']}"></div>
          <span class="tuto-level ${levelClass[t.level] || ''}">${escHtml(t.level)}</span>
          <span class="tuto-duration">⏱ ${escHtml(t.duration)}</span>
        </div>
        <div class="tuto-body">
          <h3>${escHtml(t.title)}</h3>
          <p>${escHtml(t.shortDesc)}</p>
          <div class="tuto-meta">
            <span>👁 ${escHtml(t.views)} vues</span>
            <span>⭐ ${escHtml(t.rating)}</span>
          </div>
          <button class="btn btn-sm tuto-btn" data-id="${escHtml(String(t._id))}">Regarder</button>
        </div>
      </div>`).join('');
  } catch { /* silencieux */ }
}

/* ---- TUTORIAL MODAL ---- */
document.getElementById('tutoGrid').addEventListener('click', e => {
  const btn = e.target.closest('.tuto-btn');
  if (!btn) return;
  const t = tutorialsMap.get(btn.dataset.id);
  if (!t) return;

  const videoBox = document.querySelector('#tutoModal .modal-video');
  if (t.videoUrl?.startsWith('/api/videos/')) {
    videoBox.innerHTML = `<video src="${escHtml(t.videoUrl)}" controls style="width:100%;height:100%;min-height:280px;border-radius:12px 12px 0 0;background:#000;display:block"></video>`;
  } else {
    const embedUrl = getYoutubeEmbed(t.videoUrl);
    if (embedUrl) {
      videoBox.innerHTML = `<iframe src="${escHtml(embedUrl)}" frameborder="0" allowfullscreen style="width:100%;height:100%;border-radius:12px 12px 0 0;min-height:280px"></iframe>`;
    } else {
      videoBox.innerHTML = `<div class="video-placeholder"><span class="big-play">▶</span><p id="tutoModalTitle">${escHtml(t.title)}</p></div>`;
    }
  }

  document.getElementById('tutoModalInfo').innerHTML = `
    <h3>${escHtml(t.title)}</h3>
    <p style="color:var(--text-light);margin:0.5rem 0 1rem">${escHtml(t.description)}</p>
    <div style="display:flex;gap:1rem;flex-wrap:wrap">
      <span style="background:var(--pink-pale);color:var(--pink);padding:0.3rem 0.75rem;border-radius:50px;font-size:0.8rem;font-weight:600">Niveau : ${escHtml(t.level)}</span>
      <span style="background:var(--pink-pale);color:var(--pink);padding:0.3rem 0.75rem;border-radius:50px;font-size:0.8rem;font-weight:600">⏱ ${escHtml(t.duration)}</span>
    </div>`;
  document.getElementById('tutoModal').classList.add('open');
});

document.getElementById('tutoModalClose').onclick = () => {
  const modal = document.getElementById('tutoModal');
  modal.querySelectorAll('video').forEach(v => v.pause());
  modal.classList.remove('open');
};
document.getElementById('tutoModal').addEventListener('click', e => {
  if (e.target === document.getElementById('tutoModal')) document.getElementById('tutoModal').classList.remove('open');
});

/* ---- PRESTATIONS (formulaire réservation) ---- */
async function loadPrestations() {
  try {
    const res = await fetch(`${API}/api/prestations`);
    if (!res.ok) return;
    const prestations = await res.json();
    const container = document.getElementById('serviceChoices');
    if (!container) return;
    container.innerHTML = prestations.map((p, i) => `
      <label class="choice-card">
        <input type="radio" name="service" value="${escHtml(p.name)} (${escHtml(p.price)})"${i === 0 ? ' required' : ''}>
        <div class="choice-body"><span>${escHtml(p.icon)}</span><strong>${escHtml(p.name)}</strong><em>${escHtml(p.price)}</em></div>
      </label>`).join('');
  } catch { /* silencieux */ }
}

/* ---- MINI CALENDAR ---- */
let calDate      = new Date();
let selectedDate = null;
let selectedTime = null;

const takenSlots = { '15': ['10:00','14:00'], '18': ['09:00','15:30'], '20': ['11:00','13:00','16:00'] };
const allSlots   = ['09:00','10:00','10:30','11:00','12:00','13:00','14:00','14:30','15:00','15:30','16:00','17:00','18:00'];

function renderCalendar() {
  const cal = document.getElementById('miniCal');
  if (!cal) return;
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const days   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const today        = new Date();

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
    const isToday    = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isPast     = new Date(year, month, d) < new Date(today.toDateString());
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
    if (i + 1 < n)      s.classList.add('done');
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
  const months  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const service = document.querySelector('input[name="service"]:checked')?.value || '';
  const date    = selectedDate ? `${selectedDate.day} ${months[selectedDate.month]} ${selectedDate.year}` : '';
  const recap   = document.getElementById('recapBox');
  recap.innerHTML = `
    <div class="recap-row"><span>Prestation</span><span>${service}</span></div>
    <div class="recap-row"><span>Date</span><span>${date} à ${selectedTime}</span></div>
    <div class="recap-row"><span>Nom</span><span>${document.querySelector('[name="prenom"]').value} ${document.querySelector('[name="nom"]').value}</span></div>
    <div class="recap-row"><span>Email</span><span>${document.querySelector('[name="email"]').value}</span></div>
    <div class="recap-row"><span>Téléphone</span><span>${document.querySelector('[name="tel"]').value}</span></div>
  `;
}

/* ---- SOUMISSION DU FORMULAIRE → API ---- */
document.getElementById('orderForm').addEventListener('submit', async e => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Envoi en cours…';

  const num = 'LN-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900 + 100)).padStart(3, '0');

  const payload = {
    num,
    name:        `${document.querySelector('[name="prenom"]').value.trim()} ${document.querySelector('[name="nom"]').value.trim()}`,
    service:     document.querySelector('input[name="service"]:checked')?.value,
    date:        selectedDate,
    time:        selectedTime,
    email:       document.querySelector('[name="email"]').value.trim(),
    phone:       document.querySelector('[name="tel"]').value.trim(),
    model_notes: document.querySelector('[name="modele"]').value.trim(),
    message:     document.querySelector('[name="message"]').value.trim(),
  };

  try {
    const res = await fetch(`${API}/api/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    document.getElementById('trackingNum').textContent = data.num;
    document.getElementById('orderForm').style.display = 'none';
    document.getElementById('orderSuccess').style.display = 'block';
    showToast('Réservation confirmée ! 🎉', 'success');
  } catch (err) {
    showToast(`Erreur : ${err.message}`, 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmer la réservation ✓';
  }
});

/* ---- NOUVELLE RÉSERVATION ---- */
document.getElementById('newReservation').addEventListener('click', () => {
  document.getElementById('orderForm').reset();
  document.getElementById('orderForm').style.display = 'block';
  document.getElementById('orderSuccess').style.display = 'none';
  selectedDate = null;
  selectedTime = null;
  const submitBtn = document.querySelector('#orderForm [type="submit"]');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Confirmer la réservation ✓';
  goToStep(1);
});

/* ---- SUIVI DE COMMANDE → API ---- */
const stepLabels = [
  { icon: '✅', label: 'Confirmé' },
  { icon: '🔄', label: 'En préparation' },
  { icon: '💅', label: 'En cours' },
  { icon: '🎉', label: 'Terminé' }
];

async function searchOrder(num) {
  num = num.trim().toUpperCase();
  if (!num) return;

  const resultEl = document.getElementById('trackResult');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `<div style="text-align:center;padding:2rem">
    <p style="font-size:2rem;animation:float 1s ease-in-out infinite">⏳</p>
    <p>Recherche en cours…</p>
  </div>`;

  try {
    const res = await fetch(`${API}/api/orders/${encodeURIComponent(num)}`);

    if (res.status === 404) {
      resultEl.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--pink)">
        <p style="font-size:2rem">🔍</p>
        <p>Numéro de commande introuvable.</p>
        <p style="font-size:0.85rem;color:var(--text-light);margin-top:0.5rem">Vérifiez le numéro envoyé par email.</p>
      </div>`;
      return;
    }
    if (!res.ok) throw new Error('Erreur serveur');

    const order = await res.json();
    renderTrackResult(resultEl, num, order);
  } catch (err) {
    resultEl.innerHTML = `<div style="text-align:center;padding:2rem;color:#f44336">
      <p style="font-size:2rem">⚠️</p>
      <p>Impossible de contacter le serveur.</p>
      <p style="font-size:0.85rem;margin-top:0.5rem">${err.message}</p>
    </div>`;
  }
}

function renderTrackResult(resultEl, num, order) {
  const badgeClass = {
    confirmed:  'badge-confirmed',
    preparing:  'badge-preparing',
    ready:      'badge-ready',
    completed:  'badge-completed'
  }[order.status] || 'badge-confirmed';

  const MONTHS   = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  let dateStr    = order.date ? `${order.date.day} ${MONTHS[order.date.month]} ${order.date.year}` : '—';

  const stepsHTML = stepLabels.map((s, i) => {
    const done    = order.steps[i];
    const current = done && (i === order.steps.lastIndexOf(true));
    return `<div class="track-step ${done ? 'done' : ''} ${current ? 'current' : ''}">
      <div class="ts-circle">${done ? s.icon : ''}</div>
      <div class="ts-label">${s.label}</div>
    </div>`;
  }).join('');

  resultEl.innerHTML = `
    <div class="track-header">
      <div><h4>${escHtml(order.name)}</h4><p>${escHtml(order.service)}</p></div>
      <span class="track-badge ${escHtml(badgeClass)}">${escHtml(order.statusLabel || order.status)}</span>
    </div>
    <div class="track-steps">${stepsHTML}</div>
    <div class="track-details">
      <table>
        <tr><td>Numéro</td><td><strong>${escHtml(num)}</strong></td></tr>
        <tr><td>Date RDV</td><td>${escHtml(dateStr)} à ${escHtml(order.time || '—')}</td></tr>
        <tr><td>Prestation</td><td>${escHtml(order.service)}</td></tr>
        <tr><td>Email</td><td>${escHtml(order.email || '—')}</td></tr>
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

/* ---- AVIS → API ---- */
let allReviews    = [];
let reviewOffset  = 0;
const reviewsPerPage = 3;

async function loadReviews() {
  try {
    const res  = await fetch(`${API}/api/reviews`);
    if (!res.ok) throw new Error('Erreur serveur');
    allReviews = await res.json();
  } catch {
    // Fallback silencieux si le serveur n'est pas joignable
    allReviews = [];
  }
  renderReviews();
}

function renderReviews() {
  const track = document.getElementById('reviewsTrack');
  const slice = allReviews.slice(reviewOffset, reviewOffset + reviewsPerPage);

  if (slice.length === 0) {
    track.innerHTML = `<div style="color:rgba(255,255,255,0.5);padding:2rem;text-align:center">Aucun avis pour l'instant.</div>`;
    document.getElementById('reviewDots').innerHTML = '';
    return;
  }

  track.innerHTML = slice.map(r => `
    <div class="review-card">
      <div class="review-stars">${'★'.repeat(Math.min(5, Math.max(0, r.rating)))}${'☆'.repeat(5 - Math.min(5, Math.max(0, r.rating)))}</div>
      <p class="review-text">&ldquo;${escHtml(r.text)}&rdquo;</p>
      <div class="review-author">
        <div class="review-avatar">${escHtml((r.name || '?')[0])}</div>
        <div class="review-author-info">
          <strong>${escHtml(r.name)}</strong>
          <span>${escHtml(r.service)} · ${escHtml(r.date)}</span>
        </div>
      </div>
    </div>`).join('');
  renderDots();
}

function renderDots() {
  const total   = Math.ceil(allReviews.length / reviewsPerPage);
  const current = Math.floor(reviewOffset / reviewsPerPage);
  document.getElementById('reviewDots').innerHTML = Array.from({ length: total }, (_, i) =>
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
document.getElementById('starSelect').addEventListener('mouseleave', () => {
  document.querySelectorAll('#starSelect span').forEach((s, i) => s.classList.toggle('active', i < selectedRating));
});

/* SOUMETTRE UN AVIS → API */
document.getElementById('reviewForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form       = e.target;
  const submitBtn  = form.querySelector('[type="submit"]');
  submitBtn.disabled  = true;
  submitBtn.textContent = 'Publication…';

  const payload = {
    name:    form.reviewer.value.trim(),
    service: 'Cliente LuxNails',
    rating:  selectedRating,
    text:    form.comment.value.trim()
  };

  try {
    const res  = await fetch(`${API}/api/reviews`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    allReviews = [data.review, ...allReviews];
    reviewOffset = 0;
    renderReviews();
    form.reset();
    selectedRating = 5;
    document.querySelectorAll('#starSelect span').forEach((s, i) => s.classList.toggle('active', i < 5));
    showToast('Merci pour votre avis ! ⭐', 'success');
  } catch (err) {
    showToast(`Erreur : ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publier mon avis';
  }
});

/* ---- FORMULAIRE CONTACT → API ---- */
document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form      = e.target;
  const submitBtn = form.querySelector('[type="submit"]');
  submitBtn.disabled  = true;
  submitBtn.textContent = 'Envoi…';

  const payload = {
    name:  form.name.value.trim(),
    email: form.email.value.trim(),
    sujet: form.sujet.value,
    msg:   form.msg.value.trim()
  };

  try {
    const res  = await fetch(`${API}/api/contact`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    showToast('Message envoyé ! Nous vous répondrons rapidement. 📩', 'success');
    form.reset();
  } catch (err) {
    showToast(`Erreur : ${err.message}`, 'error');
  } finally {
    submitBtn.disabled  = false;
    submitBtn.textContent = 'Envoyer le message';
  }
});

/* ---- NEWSLETTER → API ---- */
document.getElementById('newsletterBtn').addEventListener('click', async () => {
  const input = document.getElementById('newsletterEmail');
  const email = input.value.trim();

  if (!email || !email.includes('@') || !email.includes('.')) {
    showToast('Veuillez entrer une adresse email valide', 'error');
    return;
  }

  const btn = document.getElementById('newsletterBtn');
  btn.disabled  = true;
  btn.textContent = '…';

  try {
    const res  = await fetch(`${API}/api/newsletter`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur serveur');

    showToast('Merci ! Vous êtes inscrit(e) à notre newsletter 🎉', 'success');
    input.value = '';
  } catch (err) {
    showToast(`Erreur : ${err.message}`, 'error');
  } finally {
    btn.disabled  = false;
    btn.textContent = 'OK';
  }
});
document.getElementById('newsletterEmail').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('newsletterBtn').click();
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

/* ==========================================
   INITIALISATION ASYNCHRONE
   ========================================== */
loadGallery();
loadServices();
loadTutorials();
loadPrestations();
loadReviews();
