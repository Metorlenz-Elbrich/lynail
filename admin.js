/* ==========================================
   LYDHAS Admin — admin.js
   ========================================== */

const API = '';
// sessionStorage : vidé à la fermeture de l'onglet (plus sûr que localStorage)
let TOKEN = sessionStorage.getItem('admin_token') || '';

/* ==========================================
   AUTHENTIFICATION
   ========================================== */
async function doLogin() {
  const pwd = document.getElementById('loginPwd').value;
  if (!pwd) return;

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Connexion…';
  document.getElementById('loginError').style.display = 'none';

  try {
    const res  = await fetch(`${API}/api/admin/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur');

    TOKEN = data.token;
    sessionStorage.setItem('admin_token', TOKEN);
    document.getElementById('loginPwd').value = '';
    showDashboard();
  } catch {
    document.getElementById('loginError').style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

async function doLogout() {
  try {
    await fetch(`${API}/api/admin/logout`, { method: 'POST', headers: { 'x-admin-token': TOKEN } });
  } catch { /* silencieux */ }
  sessionStorage.removeItem('admin_token');
  TOKEN = '';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

document.getElementById('loginPwd').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

/* Vérifier le token au chargement */
if (TOKEN) {
  fetch(`${API}/api/gallery`, { headers: { 'x-admin-token': TOKEN } })
    .then(r => { if (r.status === 401) { sessionStorage.removeItem('admin_token'); TOKEN = ''; } else { showDashboard(); } })
    .catch(() => showDashboard());
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display   = 'block';
  loadAllData();
}

/* ==========================================
   TABS
   ========================================== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

function loadAllData() {
  loadGallery();
  loadServices();
  loadTutorials();
  loadPrestations();
}

/* ==========================================
   GALERIE
   ========================================== */

/* Drag & drop + preview sur la zone d'upload */
const fileInput  = document.getElementById('g-file');
const uploadDrop = document.getElementById('uploadDrop');
const fileLabel  = document.getElementById('fileChosenName');

fileInput.addEventListener('change', () => {
  fileLabel.textContent = fileInput.files[0] ? `✅ ${fileInput.files[0].name}` : '';
});

uploadDrop.addEventListener('dragover',  e => { e.preventDefault(); uploadDrop.classList.add('drag-over'); });
uploadDrop.addEventListener('dragleave', () => uploadDrop.classList.remove('drag-over'));
uploadDrop.addEventListener('drop', e => {
  e.preventDefault();
  uploadDrop.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) {
    fileInput.files = e.dataTransfer.files;
    fileLabel.textContent = `✅ ${e.dataTransfer.files[0].name}`;
  }
});

async function loadGallery() {
  try {
    const res   = await fetch(`${API}/api/gallery`);
    const items = await res.json();
    renderGallery(items);
  } catch { showToast('Erreur chargement galerie', 'error'); }
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderGallery(items) {
  const container = document.getElementById('galleryPreview');
  if (!items.length) { container.innerHTML = '<p class="empty-state">Aucune photo dans la galerie.</p>'; return; }
  container.innerHTML = items.map(item => {
    const bgStyle = item.imageUrl
      ? `background-image:url('${esc(item.imageUrl)}');background-size:cover;background-position:center`
      : `background:${esc(item.gradient)}`;
    return `
      <div class="gal-item">
        <div class="gal-bg" style="${bgStyle}"></div>
        <div class="gal-info">${esc(item.title)}<br><em>${esc(categoryLabel(item.category))}</em></div>
        <button class="gal-del" title="Supprimer" data-id="${esc(item._id)}">✕</button>
      </div>`;
  }).join('');

  container.querySelectorAll('.gal-del').forEach(btn => {
    btn.addEventListener('click', () => deleteGalleryItem(btn.dataset.id));
  });
}

async function addGalleryItem() {
  const title    = document.getElementById('g-title').value.trim();
  const category = document.getElementById('g-cat').value;
  const imageUrl = document.getElementById('g-url').value.trim();
  const file     = fileInput.files[0];

  if (!title) { showToast('Titre requis', 'error'); return; }

  const btn = document.getElementById('g-submit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Ajout…';

  try {
    const formData = new FormData();
    formData.append('title',    title);
    formData.append('category', category);
    if (file) {
      formData.append('image', file);
    } else if (imageUrl) {
      formData.append('imageUrl', imageUrl);
    }

    const res = await fetch(`${API}/api/admin/gallery`, {
      method:  'POST',
      headers: { 'x-admin-token': TOKEN },  // PAS de Content-Type pour FormData
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    document.getElementById('g-title').value = '';
    document.getElementById('g-url').value   = '';
    fileInput.value = '';
    fileLabel.textContent = '';
    showToast('Photo ajoutée !');
    loadGallery();
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Ajouter à la galerie'; }
}

async function deleteGalleryItem(id) {
  if (!confirm('Supprimer cette photo de la galerie ?')) return;
  try {
    const res = await fetch(`${API}/api/admin/gallery/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { 'x-admin-token': TOKEN },
    });
    if (!res.ok) throw new Error((await res.json()).error);
    showToast('Photo supprimée');
    loadGallery();
  } catch(e) { showToast(e.message || 'Erreur suppression', 'error'); }
}

/* ==========================================
   SERVICES
   ========================================== */
async function loadServices() {
  try {
    const res      = await fetch(`${API}/api/services`);
    const services = await res.json();
    renderServices(services);
  } catch { showToast('Erreur chargement services', 'error'); }
}

function renderServices(services) {
  const list = document.getElementById('servicesList');
  if (!services.length) { list.innerHTML = '<p class="empty-state">Aucun service.</p>'; return; }
  list.innerHTML = services.map(s => `
    <div class="item-row">
      <div class="item-thumb" style="background:var(--pink-pale);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${esc(s.icon)}</div>
      <div class="item-info">
        <strong>${esc(s.title)}</strong>
        <small>${esc(s.description)}</small>
      </div>
      ${s.featured ? '<span class="item-badge featured">⭐ Populaire</span>' : ''}
      <span class="item-badge">${esc(s.price)}</span>
      <button class="btn-del" data-id="${esc(s._id)}">Supprimer</button>
    </div>`).join('');

  list.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteService(btn.dataset.id));
  });
}

async function addService() {
  const icon        = document.getElementById('s-icon').value.trim()  || '💅';
  const title       = document.getElementById('s-title').value.trim();
  const description = document.getElementById('s-desc').value.trim();
  const price       = document.getElementById('s-price').value.trim();
  const featured    = document.getElementById('s-featured').checked;

  if (!title || !price) { showToast('Titre et prix requis', 'error'); return; }

  const btn = document.getElementById('s-submit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Ajout…';

  try {
    const res = await fetch(`${API}/api/admin/services`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': TOKEN },
      body:    JSON.stringify({ icon, title, description, price, featured }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    ['s-icon','s-title','s-desc','s-price'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('s-featured').checked = false;
    showToast('Service ajouté !');
    loadServices();
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Ajouter le service'; }
}

async function deleteService(id) {
  if (!confirm('Supprimer ce service ?')) return;
  try {
    const res = await fetch(`${API}/api/admin/services/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { 'x-admin-token': TOKEN },
    });
    if (!res.ok) throw new Error((await res.json()).error);
    showToast('Service supprimé');
    loadServices();
  } catch(e) { showToast(e.message || 'Erreur', 'error'); }
}

/* ==========================================
   TUTORIELS
   ========================================== */
async function loadTutorials() {
  try {
    const res       = await fetch(`${API}/api/tutorials`);
    const tutorials = await res.json();
    renderTutorials(tutorials);
  } catch { showToast('Erreur chargement tutoriels', 'error'); }
}

const levelColors = { 'Débutant':'#4caf50', 'Intermédiaire':'#ff9800', 'Avancé':'#f44336' };

function renderTutorials(tutorials) {
  const list = document.getElementById('tutorialsList');
  if (!tutorials.length) { list.innerHTML = '<p class="empty-state">Aucun tutoriel.</p>'; return; }
  list.innerHTML = tutorials.map(t => `
    <div class="item-row">
      <div class="item-thumb" style="background:linear-gradient(135deg,#fbc2eb,#a6c1ee);display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎬</div>
      <div class="item-info">
        <strong>${esc(t.title)}</strong>
        <small>${esc(t.shortDesc || '')}</small>
      </div>
      <span class="item-badge" style="color:${levelColors[t.level] || '#555'}">${esc(t.level)}</span>
      <span class="item-badge">⏱ ${esc(t.duration)}</span>
      ${t.videoUrl ? '<span class="item-badge" style="background:#e8f5e9;color:#2e7d32">▶ Vidéo</span>' : ''}
      <button class="btn-del" data-id="${esc(t._id)}">Supprimer</button>
    </div>`).join('');

  list.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deleteTutorial(btn.dataset.id));
  });
}

async function addTutorial() {
  const title       = document.getElementById('t-title').value.trim();
  const level       = document.getElementById('t-level').value;
  const duration    = document.getElementById('t-duration').value.trim();
  const shortDesc   = document.getElementById('t-short').value.trim();
  const description = document.getElementById('t-desc').value.trim();
  const videoUrl    = document.getElementById('t-video').value.trim();

  if (!title) { showToast('Titre requis', 'error'); return; }

  const btn = document.getElementById('t-submit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Ajout…';

  try {
    const res = await fetch(`${API}/api/admin/tutorials`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': TOKEN },
      body:    JSON.stringify({ title, level, duration, shortDesc, description, videoUrl, views: '0', rating: '5.0' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    ['t-title','t-duration','t-short','t-desc','t-video'].forEach(id => document.getElementById(id).value = '');
    showToast('Tutoriel ajouté !');
    loadTutorials();
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Ajouter le tutoriel'; }
}

async function deleteTutorial(id) {
  if (!confirm('Supprimer ce tutoriel ?')) return;
  try {
    const res = await fetch(`${API}/api/admin/tutorials/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { 'x-admin-token': TOKEN },
    });
    if (!res.ok) throw new Error((await res.json()).error);
    showToast('Tutoriel supprimé');
    loadTutorials();
  } catch(e) { showToast(e.message || 'Erreur', 'error'); }
}

/* ==========================================
   PRESTATIONS
   ========================================== */
async function loadPrestations() {
  try {
    const res        = await fetch(`${API}/api/prestations`);
    const prestations = await res.json();
    renderPrestations(prestations);
  } catch { showToast('Erreur chargement prestations', 'error'); }
}

function renderPrestations(prestations) {
  const list = document.getElementById('prestationsList');
  if (!prestations.length) { list.innerHTML = '<p class="empty-state">Aucune prestation.</p>'; return; }
  list.innerHTML = prestations.map(p => `
    <div class="item-row">
      <div class="item-thumb" style="background:var(--pink-pale);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${esc(p.icon)}</div>
      <div class="item-info">
        <strong>${esc(p.name)}</strong>
        <small>Formulaire de réservation — Étape 1</small>
      </div>
      <span class="item-badge">${esc(p.price)}</span>
      <button class="btn-del" data-id="${esc(p._id)}">Supprimer</button>
    </div>`).join('');

  list.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => deletePrestation(btn.dataset.id));
  });
}

async function addPrestation() {
  const icon  = document.getElementById('p-icon').value.trim()  || '💅';
  const name  = document.getElementById('p-name').value.trim();
  const price = document.getElementById('p-price').value.trim();

  if (!name || !price) { showToast('Nom et prix requis', 'error'); return; }

  const btn = document.getElementById('p-submit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Ajout…';

  try {
    const res = await fetch(`${API}/api/admin/prestations`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': TOKEN },
      body:    JSON.stringify({ icon, name, price }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    ['p-icon','p-name','p-price'].forEach(id => document.getElementById(id).value = '');
    showToast('Prestation ajoutée !');
    loadPrestations();
  } catch(e) { showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Ajouter la prestation'; }
}

async function deletePrestation(id) {
  if (!confirm('Supprimer cette prestation ?')) return;
  try {
    const res = await fetch(`${API}/api/admin/prestations/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { 'x-admin-token': TOKEN },
    });
    if (!res.ok) throw new Error((await res.json()).error);
    showToast('Prestation supprimée');
    loadPrestations();
  } catch(e) { showToast(e.message || 'Erreur', 'error'); }
}

/* ==========================================
   UTILITAIRES
   ========================================== */
function categoryLabel(c) {
  const labels = { gel:'Pose Gel', 'nail-art':'Nail Art', acrylique:'Acrylique', naturel:'Naturel', french:'French' };
  return labels[c] || c;
}

function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast-adm';
  el.style.borderLeft = `4px solid ${type === 'success' ? '#4caf50' : '#f44336'}`;
  el.textContent = `${type === 'success' ? '✅' : '❌'} ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
