/* ==========================================
   LYDHAS Admin — admin.js
   ========================================== */

const API = '';
let TOKEN = sessionStorage.getItem('admin_token') || '';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast-adm';
  el.style.borderLeft = `4px solid ${type === 'success' ? '#4caf50' : '#f44336'}`;
  el.textContent = `${type === 'success' ? '✅' : '❌'} ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function categoryLabel(c) {
  const m = { gel:'Pose Gel','nail-art':'Nail Art',acrylique:'Acrylique',naturel:'Naturel',french:'French' };
  return m[c] || c;
}

/* ==========================================
   DOM READY
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================
     AUTHENTIFICATION
     ========================================== */
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginPwd  = document.getElementById('loginPwd');
  const loginErr  = document.getElementById('loginError');

  async function doLogin() {
    const pwd = loginPwd.value;
    if (!pwd) return;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner"></span>Connexion…';
    loginErr.style.display = 'none';
    try {
      const res  = await fetch(`${API}/api/admin/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      TOKEN = data.token;
      sessionStorage.setItem('admin_token', TOKEN);
      loginPwd.value = '';
      showDashboard();
    } catch {
      loginErr.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Se connecter';
    }
  }

  async function doLogout() {
    try { await fetch(`${API}/api/admin/logout`, { method:'POST', headers:{'x-admin-token':TOKEN} }); } catch {}
    sessionStorage.removeItem('admin_token');
    TOKEN = '';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
  }

  loginBtn.addEventListener('click', doLogin);
  logoutBtn.addEventListener('click', doLogout);
  loginPwd.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  if (TOKEN) {
    fetch(`${API}/api/gallery`, { headers:{'x-admin-token':TOKEN} })
      .then(r => { if (r.status === 401) { sessionStorage.removeItem('admin_token'); TOKEN=''; } else { showDashboard(); } })
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

  function loadAllData() { loadGallery(); loadServices(); loadTutorials(); loadPrestations(); loadOrders(); }

  /* ==========================================
     GALERIE — ajout
     ========================================== */
  const fileInput  = document.getElementById('g-file');
  const uploadDrop = document.getElementById('uploadDrop');
  const fileLabel  = document.getElementById('fileChosenName');

  fileInput.addEventListener('change', () => {
    fileLabel.textContent = fileInput.files[0] ? `✅ ${fileInput.files[0].name}` : '';
  });
  uploadDrop.addEventListener('dragover',  e => { e.preventDefault(); uploadDrop.classList.add('drag-over'); });
  uploadDrop.addEventListener('dragleave', () => uploadDrop.classList.remove('drag-over'));
  uploadDrop.addEventListener('drop', e => {
    e.preventDefault(); uploadDrop.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) { const dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files; fileLabel.textContent = `✅ ${f.name}`; }
  });

  document.getElementById('g-submit').addEventListener('click', addGalleryItem);

  async function loadGallery() {
    try { renderGallery(await (await fetch(`${API}/api/gallery`)).json()); }
    catch { showToast('Erreur chargement galerie', 'error'); }
  }

  function renderGallery(items) {
    const c = document.getElementById('galleryPreview');
    if (!items.length) { c.innerHTML = '<p class="empty-state">Aucune photo dans la galerie.</p>'; updateBulkBar('g'); return; }
    c.innerHTML = items.map(item => {
      const bg = (item.imageUrl && !item.isVideo)
        ? `background-image:url('${esc(item.imageUrl)}');background-size:cover;background-position:center`
        : `background:${esc(item.gradient || 'linear-gradient(135deg,#667eea,#764ba2)')}`;
      return `
        <div class="gal-item${item.isVideo?' is-video':''}">
          <input type="checkbox" class="gal-check" value="${esc(String(item._id))}">
          <div class="gal-bg" style="${bg}"></div>
          <div class="gal-info">${esc(item.title)}<br><em>${esc(categoryLabel(item.category))}</em></div>
          <button class="gal-edt" title="Modifier" data-id="${esc(String(item._id))}" data-title="${esc(item.title)}" data-cat="${esc(item.category)}">✏</button>
          <button class="gal-del" title="Supprimer" data-id="${esc(String(item._id))}">✕</button>
        </div>`;
    }).join('');
    c.querySelectorAll('.gal-del').forEach(b => b.addEventListener('click', () => deleteGalleryItem(b.dataset.id)));
    c.querySelectorAll('.gal-edt').forEach(b => b.addEventListener('click', () => openGalEdit(b.dataset.id, b.dataset.title, b.dataset.cat)));
    c.querySelectorAll('.gal-check').forEach(cb => cb.addEventListener('change', () => updateBulkBar('g')));
    updateBulkBar('g');
  }

  async function addGalleryItem() {
    const title = document.getElementById('g-title').value.trim();
    const category = document.getElementById('g-cat').value;
    const imageUrl = document.getElementById('g-url').value.trim();
    const file = fileInput.files[0];
    if (!title) { showToast('Titre requis', 'error'); return; }
    const btn = document.getElementById('g-submit');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Ajout…';
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('category', category);
      if (file) fd.append('media', file);
      else if (imageUrl) fd.append('imageUrl', imageUrl);
      const res = await fetch(`${API}/api/admin/gallery`, { method:'POST', headers:{'x-admin-token':TOKEN}, body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      document.getElementById('g-title').value = '';
      document.getElementById('g-url').value   = '';
      fileInput.value = ''; fileLabel.textContent = '';
      showToast('Ajouté à la galerie !');
      loadGallery();
    } catch(e) { showToast(e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Ajouter à la galerie'; }
  }

  async function deleteGalleryItem(id) {
    if (!confirm('Supprimer cette photo / vidéo ?')) return;
    try {
      const res = await fetch(`${API}/api/admin/gallery/${encodeURIComponent(id)}`, { method:'DELETE', headers:{'x-admin-token':TOKEN} });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Supprimé'); loadGallery();
    } catch(e) { showToast(e.message||'Erreur suppression','error'); }
  }

  /* ── Édition d'un item galerie ── */
  const galEditOverlay = document.getElementById('galEditOverlay');
  const editGId        = document.getElementById('edit-g-id');
  const editGTitle     = document.getElementById('edit-g-title');
  const editGCat       = document.getElementById('edit-g-cat');
  const editGSave      = document.getElementById('edit-g-save');
  const editGCancel    = document.getElementById('edit-g-cancel');

  function openGalEdit(id, title, cat) {
    editGId.value    = id;
    editGTitle.value = title;
    editGCat.value   = cat;
    galEditOverlay.classList.add('open');
  }

  editGCancel.addEventListener('click', () => galEditOverlay.classList.remove('open'));
  galEditOverlay.addEventListener('click', e => { if (e.target === galEditOverlay) galEditOverlay.classList.remove('open'); });

  editGSave.addEventListener('click', async () => {
    const id       = editGId.value;
    const title    = editGTitle.value.trim();
    const category = editGCat.value;
    if (!title) { showToast('Titre requis', 'error'); return; }
    editGSave.disabled = true; editGSave.innerHTML = '<span class="spinner"></span>Sauvegarde…';
    try {
      const res  = await fetch(`${API}/api/admin/gallery/${encodeURIComponent(id)}`, {
        method:'PUT', headers:{'Content-Type':'application/json','x-admin-token':TOKEN},
        body: JSON.stringify({ title, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      galEditOverlay.classList.remove('open');
      showToast('Galerie mise à jour !');
      loadGallery();
    } catch(e) { showToast(e.message,'error'); }
    finally { editGSave.disabled = false; editGSave.textContent = 'Sauvegarder'; }
  });

  /* ── Sélection tout + bulk delete galerie ── */
  document.getElementById('g-select-all').addEventListener('change', function() {
    document.querySelectorAll('#galleryPreview .gal-check').forEach(cb => cb.checked = this.checked);
    updateBulkBar('g');
  });
  document.getElementById('g-bulk-del').addEventListener('click', () => bulkDelete('gallery'));

  /* ==========================================
     SERVICES
     ========================================== */
  document.getElementById('s-submit').addEventListener('click', addService);

  async function loadServices() {
    try { renderServices(await (await fetch(`${API}/api/services`)).json()); }
    catch { showToast('Erreur chargement services','error'); }
  }

  function renderServices(services) {
    const list = document.getElementById('servicesList');
    if (!services.length) { list.innerHTML = '<p class="empty-state">Aucun service.</p>'; updateBulkBar('s'); return; }
    list.innerHTML = services.map(s => `
      <div class="item-row">
        <input type="checkbox" class="item-check" value="${esc(String(s._id))}" style="width:16px;height:16px">
        <div class="item-thumb" style="background:var(--pink-pale);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${esc(s.icon)}</div>
        <div class="item-info"><strong>${esc(s.title)}</strong><small>${esc(s.description)}</small></div>
        ${s.featured ? '<span class="item-badge featured">⭐ Populaire</span>' : ''}
        <span class="item-badge">${esc(s.price)}</span>
        <button class="btn-del" data-id="${esc(String(s._id))}">Supprimer</button>
      </div>`).join('');
    list.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deleteService(b.dataset.id)));
    list.querySelectorAll('.item-check').forEach(cb => cb.addEventListener('change', () => updateBulkBar('s')));
    updateBulkBar('s');
  }

  async function addService() {
    const icon = document.getElementById('s-icon').value.trim() || '💅';
    const title = document.getElementById('s-title').value.trim();
    const description = document.getElementById('s-desc').value.trim();
    const price = document.getElementById('s-price').value.trim();
    const featured = document.getElementById('s-featured').checked;
    if (!title || !price) { showToast('Titre et prix requis','error'); return; }
    const btn = document.getElementById('s-submit');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Ajout…';
    try {
      const res = await fetch(`${API}/api/admin/services`, { method:'POST', headers:{'Content-Type':'application/json','x-admin-token':TOKEN}, body:JSON.stringify({icon,title,description,price,featured}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      ['s-icon','s-title','s-desc','s-price'].forEach(id => document.getElementById(id).value='');
      document.getElementById('s-featured').checked = false;
      showToast('Service ajouté !'); loadServices();
    } catch(e) { showToast(e.message,'error'); }
    finally { btn.disabled = false; btn.textContent = 'Ajouter le service'; }
  }

  async function deleteService(id) {
    if (!confirm('Supprimer ce service ?')) return;
    try {
      const res = await fetch(`${API}/api/admin/services/${encodeURIComponent(id)}`, { method:'DELETE', headers:{'x-admin-token':TOKEN} });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Service supprimé'); loadServices();
    } catch(e) { showToast(e.message||'Erreur','error'); }
  }

  document.getElementById('s-select-all').addEventListener('change', function() {
    document.querySelectorAll('#servicesList .item-check').forEach(cb => cb.checked = this.checked);
    updateBulkBar('s');
  });
  document.getElementById('s-bulk-del').addEventListener('click', () => bulkDelete('services'));

  /* ==========================================
     TUTORIELS
     ========================================== */
  const videoFileInput = document.getElementById('t-video-file');
  const videoLabel     = document.getElementById('videoChosenName');
  const videoDropArea  = document.getElementById('videoUploadDrop');

  videoFileInput.addEventListener('change', () => { videoLabel.textContent = videoFileInput.files[0] ? `✅ ${videoFileInput.files[0].name}` : ''; });
  videoDropArea.addEventListener('dragover',  e => { e.preventDefault(); videoDropArea.classList.add('drag-over'); });
  videoDropArea.addEventListener('dragleave', () => videoDropArea.classList.remove('drag-over'));
  videoDropArea.addEventListener('drop', e => {
    e.preventDefault(); videoDropArea.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) { const dt = new DataTransfer(); dt.items.add(f); videoFileInput.files = dt.files; videoLabel.textContent = `✅ ${f.name}`; }
  });

  document.getElementById('t-submit').addEventListener('click', addTutorial);

  const levelColors = { 'Débutant':'#4caf50','Intermédiaire':'#ff9800','Avancé':'#f44336' };

  async function loadTutorials() {
    try { renderTutorials(await (await fetch(`${API}/api/tutorials`)).json()); }
    catch { showToast('Erreur chargement tutoriels','error'); }
  }

  function renderTutorials(tutorials) {
    const list = document.getElementById('tutorialsList');
    if (!tutorials.length) { list.innerHTML = '<p class="empty-state">Aucun tutoriel.</p>'; updateBulkBar('t'); return; }
    list.innerHTML = tutorials.map(t => `
      <div class="item-row">
        <input type="checkbox" class="item-check" value="${esc(String(t._id))}" style="width:16px;height:16px">
        <div class="item-thumb" style="background:linear-gradient(135deg,#fbc2eb,#a6c1ee);display:flex;align-items:center;justify-content:center;font-size:1.5rem">🎬</div>
        <div class="item-info"><strong>${esc(t.title)}</strong><small>${esc(t.shortDesc||'')}</small></div>
        <span class="item-badge" style="color:${levelColors[t.level]||'#555'}">${esc(t.level)}</span>
        <span class="item-badge">⏱ ${esc(t.duration)}</span>
        ${t.videoUrl ? `<span class="item-badge" style="background:#e8f5e9;color:#2e7d32">${t.videoUrl.startsWith('/api/videos/') ? '📁 Vidéo' : '▶ YouTube'}</span>` : ''}
        <button class="btn-del" data-id="${esc(String(t._id))}">Supprimer</button>
      </div>`).join('');
    list.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deleteTutorial(b.dataset.id)));
    list.querySelectorAll('.item-check').forEach(cb => cb.addEventListener('change', () => updateBulkBar('t')));
    updateBulkBar('t');
  }

  async function addTutorial() {
    const title = document.getElementById('t-title').value.trim();
    const level = document.getElementById('t-level').value;
    const duration = document.getElementById('t-duration').value.trim();
    const shortDesc = document.getElementById('t-short').value.trim();
    const description = document.getElementById('t-desc').value.trim();
    const videoUrl = document.getElementById('t-video').value.trim();
    const videoFile = videoFileInput.files[0];
    if (!title) { showToast('Titre requis','error'); return; }
    const btn = document.getElementById('t-submit');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Ajout…';
    try {
      const fd = new FormData();
      fd.append('title', title); fd.append('level', level);
      fd.append('duration', duration); fd.append('shortDesc', shortDesc);
      fd.append('description', description);
      fd.append('views', '0'); fd.append('rating', '5.0');
      if (videoFile) fd.append('video', videoFile);
      else if (videoUrl) fd.append('videoUrl', videoUrl);
      const res = await fetch(`${API}/api/admin/tutorials`, { method:'POST', headers:{'x-admin-token':TOKEN}, body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      ['t-title','t-duration','t-short','t-desc','t-video'].forEach(id => document.getElementById(id).value='');
      videoFileInput.value = ''; videoLabel.textContent = '';
      showToast('Tutoriel ajouté !'); loadTutorials();
    } catch(e) { showToast(e.message,'error'); }
    finally { btn.disabled = false; btn.textContent = 'Ajouter le tutoriel'; }
  }

  async function deleteTutorial(id) {
    if (!confirm('Supprimer ce tutoriel ?')) return;
    try {
      const res = await fetch(`${API}/api/admin/tutorials/${encodeURIComponent(id)}`, { method:'DELETE', headers:{'x-admin-token':TOKEN} });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Tutoriel supprimé'); loadTutorials();
    } catch(e) { showToast(e.message||'Erreur','error'); }
  }

  document.getElementById('t-select-all').addEventListener('change', function() {
    document.querySelectorAll('#tutorialsList .item-check').forEach(cb => cb.checked = this.checked);
    updateBulkBar('t');
  });
  document.getElementById('t-bulk-del').addEventListener('click', () => bulkDelete('tutorials'));

  /* ==========================================
     PRESTATIONS
     ========================================== */
  document.getElementById('p-submit').addEventListener('click', addPrestation);

  async function loadPrestations() {
    try { renderPrestations(await (await fetch(`${API}/api/prestations`)).json()); }
    catch { showToast('Erreur chargement prestations','error'); }
  }

  function renderPrestations(prestations) {
    const list = document.getElementById('prestationsList');
    if (!prestations.length) { list.innerHTML = '<p class="empty-state">Aucune prestation.</p>'; updateBulkBar('p'); return; }
    list.innerHTML = prestations.map(p => `
      <div class="item-row">
        <input type="checkbox" class="item-check" value="${esc(String(p._id))}" style="width:16px;height:16px">
        <div class="item-thumb" style="background:var(--pink-pale);display:flex;align-items:center;justify-content:center;font-size:1.5rem">${esc(p.icon)}</div>
        <div class="item-info"><strong>${esc(p.name)}</strong><small>Formulaire de réservation — Étape 1</small></div>
        <span class="item-badge">${esc(p.price)}</span>
        <button class="btn-del" data-id="${esc(String(p._id))}">Supprimer</button>
      </div>`).join('');
    list.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', () => deletePrestation(b.dataset.id)));
    list.querySelectorAll('.item-check').forEach(cb => cb.addEventListener('change', () => updateBulkBar('p')));
    updateBulkBar('p');
  }

  async function addPrestation() {
    const icon = document.getElementById('p-icon').value.trim() || '💅';
    const name = document.getElementById('p-name').value.trim();
    const price = document.getElementById('p-price').value.trim();
    if (!name || !price) { showToast('Nom et prix requis','error'); return; }
    const btn = document.getElementById('p-submit');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Ajout…';
    try {
      const res = await fetch(`${API}/api/admin/prestations`, { method:'POST', headers:{'Content-Type':'application/json','x-admin-token':TOKEN}, body:JSON.stringify({icon,name,price}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      ['p-icon','p-name','p-price'].forEach(id => document.getElementById(id).value='');
      showToast('Prestation ajoutée !'); loadPrestations();
    } catch(e) { showToast(e.message,'error'); }
    finally { btn.disabled = false; btn.textContent = 'Ajouter la prestation'; }
  }

  async function deletePrestation(id) {
    if (!confirm('Supprimer cette prestation ?')) return;
    try {
      const res = await fetch(`${API}/api/admin/prestations/${encodeURIComponent(id)}`, { method:'DELETE', headers:{'x-admin-token':TOKEN} });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('Prestation supprimée'); loadPrestations();
    } catch(e) { showToast(e.message||'Erreur','error'); }
  }

  document.getElementById('p-select-all').addEventListener('change', function() {
    document.querySelectorAll('#prestationsList .item-check').forEach(cb => cb.checked = this.checked);
    updateBulkBar('p');
  });
  document.getElementById('p-bulk-del').addEventListener('click', () => bulkDelete('prestations'));

  /* ==========================================
     COMMANDES — suivi
     ========================================== */
  let allOrders = [];

  const STATUS_MAP = {
    confirmed: { label:'Confirmé',                cls:'status-confirmed', steps:[true,false,false,false] },
    preparing: { label:'En cours de préparation', cls:'status-preparing', steps:[true,true,false,false]  },
    ready:     { label:'Prêt à récupérer',        cls:'status-ready',     steps:[true,true,true,false]   },
    completed: { label:'Terminé',                 cls:'status-completed', steps:[true,true,true,true]    },
    cancelled: { label:'Annulé',                  cls:'status-cancelled', steps:[true,false,false,false] },
  };
  const STEP_LABELS = ['Confirmé','En prépa.','Prêt','Terminé'];

  document.getElementById('ordersRefresh').addEventListener('click', loadOrders);
  document.getElementById('orderSearch').addEventListener('input', filterOrders);
  document.getElementById('orderFilter').addEventListener('change', filterOrders);

  async function loadOrders() {
    const btn = document.getElementById('ordersRefresh');
    btn.textContent = '⌛';
    try {
      const res = await fetch(`${API}/api/admin/orders`, { headers:{'x-admin-token':TOKEN} });
      if (!res.ok) throw new Error((await res.json()).error);
      allOrders = await res.json();
      filterOrders();
    } catch(e) { showToast(e.message||'Erreur chargement commandes','error'); }
    finally { btn.textContent = '↻ Actualiser'; }
  }

  function filterOrders() {
    const q      = document.getElementById('orderSearch').value.toLowerCase().trim();
    const status = document.getElementById('orderFilter').value;
    const filtered = allOrders.filter(o => {
      const matchQ = !q || o.num.toLowerCase().includes(q) || o.name.toLowerCase().includes(q) || (o.email||'').toLowerCase().includes(q);
      const matchS = status === 'all' || o.status === status;
      return matchQ && matchS;
    });
    document.getElementById('ordersCount').textContent = `${filtered.length} commande${filtered.length !== 1 ? 's' : ''}`;
    renderOrders(filtered);
  }

  function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!orders.length) {
      list.innerHTML = '<p class="empty-state">Aucune commande trouvée.</p>';
      return;
    }
    list.innerHTML = orders.map(o => {
      const st    = STATUS_MAP[o.status] || STATUS_MAP.confirmed;
      const steps = o.steps || [false,false,false,false];
      const doneCount = steps.filter(Boolean).length;

      const stepper = STEP_LABELS.map((lbl, i) => {
        const isDone = steps[i];
        const dotCls = isDone ? 'done' : (i === doneCount ? 'active' : '');
        const lineDone = steps[i] && steps[i+1] ? 'done' : '';
        const dot  = `<div class="step-dot ${dotCls}" title="${esc(lbl)}">${i+1}</div>`;
        const line = i < 3 ? `<div class="step-line ${lineDone}"></div>` : '';
        return dot + line;
      }).join('');

      const stepLbls = STEP_LABELS.map((lbl,i) =>
        `<span class="${steps[i]?'done':''}">${esc(lbl)}</span>`
      ).join('');

      return `
        <div class="order-card" id="ocard-${esc(o.num)}">
          <div class="order-card-head">
            <div>
              <div class="order-num">${esc(o.num)}</div>
              <div class="order-client">${esc(o.name)}</div>
              <div class="order-service">${esc(o.service)}</div>
            </div>
            <span class="status-badge ${st.cls}">${esc(st.label)}</span>
          </div>
          <div class="order-meta">
            <span>📅 ${esc(o.dateStr)} à ${esc(o.time)}</span>
            <span>📧 <a href="mailto:${esc(o.email)}" style="color:var(--pink)">${esc(o.email)}</a></span>
            ${o.phone ? `<span>📞 ${esc(o.phone)}</span>` : ''}
          </div>
          <div class="order-stepper">${stepper}</div>
          <div class="step-labels">${stepLbls}</div>
          <div class="order-actions">
            <select class="order-status-sel" data-num="${esc(o.num)}">
              <option value="confirmed" ${o.status==='confirmed'?'selected':''}>Confirmé</option>
              <option value="preparing" ${o.status==='preparing'?'selected':''}>En cours de préparation</option>
              <option value="ready"     ${o.status==='ready'?'selected':''}>Prêt à récupérer</option>
              <option value="completed" ${o.status==='completed'?'selected':''}>Terminé</option>
              <option value="cancelled" ${o.status==='cancelled'?'selected':''}>Annulé</option>
            </select>
            <button class="btn-order-save" data-num="${esc(o.num)}">Mettre à jour</button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.btn-order-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.dataset.num;
        const sel = list.querySelector(`.order-status-sel[data-num="${num}"]`);
        updateOrderStatus(num, sel.value, btn);
      });
    });
  }

  async function updateOrderStatus(num, status, btn) {
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>…';
    try {
      const res  = await fetch(`${API}/api/admin/orders/${encodeURIComponent(num)}`, {
        method:'PUT', headers:{'Content-Type':'application/json','x-admin-token':TOKEN},
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Commande ${num} mise à jour`);
      loadOrders();
    } catch(e) { showToast(e.message||'Erreur mise à jour','error'); }
    finally { btn.disabled = false; btn.textContent = 'Mettre à jour'; }
  }

  /* ==========================================
     BULK DELETE (commun)
     ========================================== */
  const bulkConfig = {
    g: { getChecked: () => [...document.querySelectorAll('#galleryPreview .gal-check:checked')],   endpoint: id => `/api/admin/gallery/${encodeURIComponent(id)}`,    selectAll:'g-select-all', reload:loadGallery    },
    s: { getChecked: () => [...document.querySelectorAll('#servicesList .item-check:checked')],    endpoint: id => `/api/admin/services/${encodeURIComponent(id)}`,   selectAll:'s-select-all', reload:loadServices   },
    t: { getChecked: () => [...document.querySelectorAll('#tutorialsList .item-check:checked')],   endpoint: id => `/api/admin/tutorials/${encodeURIComponent(id)}`,  selectAll:'t-select-all', reload:loadTutorials  },
    p: { getChecked: () => [...document.querySelectorAll('#prestationsList .item-check:checked')], endpoint: id => `/api/admin/prestations/${encodeURIComponent(id)}`,selectAll:'p-select-all', reload:loadPrestations},
  };
  const sectionLabel = { gallery:'photo(s)/vidéo(s)', services:'service(s)', tutorials:'tutoriel(s)', prestations:'prestation(s)' };

  async function bulkDelete(section) {
    const prefix = { gallery:'g', services:'s', tutorials:'t', prestations:'p' }[section];
    const cfg    = bulkConfig[prefix];
    const items  = cfg.getChecked();
    if (!items.length) return;
    if (!confirm(`Supprimer ${items.length} ${sectionLabel[section]} ?`)) return;
    const btn = document.getElementById(`${prefix}-bulk-del`);
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Suppression…';
    let errors = 0;
    for (const cb of items) {
      try {
        const res = await fetch(`${API}${cfg.endpoint(cb.value)}`, { method:'DELETE', headers:{'x-admin-token':TOKEN} });
        if (!res.ok) errors++;
      } catch { errors++; }
    }
    if (errors) showToast(`${errors} erreur(s)`, 'error');
    else showToast(`${items.length} élément(s) supprimé(s)`);
    document.getElementById(cfg.selectAll).checked = false;
    cfg.reload();
  }

  function updateBulkBar(prefix) {
    const selectors = { g:'#galleryPreview .gal-check:checked', s:'#servicesList .item-check:checked', t:'#tutorialsList .item-check:checked', p:'#prestationsList .item-check:checked' };
    const n   = document.querySelectorAll(selectors[prefix]).length;
    const btn = document.getElementById(`${prefix}-bulk-del`);
    const cnt = document.getElementById(`${prefix}-bulk-count`);
    if (!btn) return;
    btn.disabled = n === 0;
    if (cnt) cnt.textContent = n > 0 ? `(${n})` : '';
  }

}); // fin DOMContentLoaded
