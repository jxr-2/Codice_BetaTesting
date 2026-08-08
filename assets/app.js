/* app.js — Orquestación: navegación entre vistas, home dashboard, bootstrap. */
/* ========================= NAV ========================= */
(function setupNav(){
  const trigger = document.getElementById('navEdgeBtn');
  const scrim   = document.getElementById('navScrim');
  const menu    = document.getElementById('navMenu');

  function openNav(){
    menu.classList.add('open');
    scrim.classList.add('open');
    trigger.classList.add('open');
    trigger.setAttribute('aria-expanded','true');
  }
  function closeNav(){
    menu.classList.remove('open');
    scrim.classList.remove('open');
    trigger.classList.remove('open');
    trigger.setAttribute('aria-expanded','false');
  }
  function toggleNav(){ menu.classList.contains('open') ? closeNav() : openNav(); }

  trigger.addEventListener('click', (e)=>{ e.stopPropagation(); toggleNav(); });
  scrim.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeNav(); });

  menu.querySelectorAll('button[data-view]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      closeNav();
      await navigateTo(btn.dataset.view);
      menu.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b===btn));
    });
  });
})();

document.getElementById('railToggleBtn').addEventListener('click', ()=>{
  const rail = document.querySelector('.view.active .rail');
  if(rail) rail.classList.toggle('open');
});
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id === 'view-'+view));
  if(view === 'canvas' && !canvasLoaded) initCanvas();
  if(view === 'mapas' && !mapsLoaded) initMapas();
  if(view === 'grimorio' && !grimorioInited) initGrimorio();
}
async function navigateTo(view){
  const leavingFichasEditor = document.getElementById('view-fichas').classList.contains('active') && fichasMode==='editor' && view !== 'fichas';
  if(leavingFichasEditor && wsDirty){
    openUnsavedGuard(document.getElementById('wsName').value,
      async ()=>{ await saveCurrentWorkspace(); switchView(view); },
      async ()=>{ wsDirty=false; setFichasMode('grid'); switchView(view); });
    return;
  }
  switchView(view);
}

async function renderHomeDashboard(){
  const previewText = document.getElementById('homePreviewText');
  const previewMeta = document.getElementById('homePreviewMeta');
  const recentList = document.getElementById('homeRecentList');
  const mapPreview = document.getElementById('homeMapPreview');
  if(entriesIndex.length === 0){
    previewText.textContent = 'Creá una ficha y aparecerá aquí una vista previa instantánea.';
    const previewNameEl = document.getElementById('homePreviewName');
    if(previewNameEl) previewNameEl.textContent = 'Última carta editada';
    previewMeta.innerHTML = '';
    recentList.innerHTML = '<div class="home-recent-item"><span>No hay fichas aún.</span></div>';
  } else {
    const latest = entriesIndex.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    const previewName = document.getElementById('homePreviewName');
    if(previewName) previewName.textContent = latest.name || 'Sin nombre';
    previewText.textContent = latest.summary || 'Seleccioná una ficha para ver sus detalles.';
    const typeLabel = TYPES[latest.type] ? `${TYPES[latest.type].glyph} ${TYPES[latest.type].label}` : 'Ficha';
    const folderName = latest.folderId ? (worldMeta.folders.find(f=>f.id===latest.folderId)?.name || 'Carpeta') : 'Sin carpeta';
    previewMeta.innerHTML = `<span>${escapeHtml(typeLabel)}</span><span>${escapeHtml(folderName)}</span>`;
    const recent = entriesIndex.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,5);
    recentList.innerHTML = recent.map(item=>`<div class="home-recent-item" data-id="${item.id}"><span>${escapeHtml(item.name||'Sin nombre')}</span><span>${TYPES[item.type].glyph}</span></div>`).join('');
    recentList.querySelectorAll('.home-recent-item').forEach(item=> item.addEventListener('click', ()=> openFichaEditor(item.dataset.id)));
  }
  if(currentMap){
    mapPreview.innerHTML = `<img src="${currentMap.image}" alt="${escapeHtml(currentMap.name)}"><div class="map-info"><strong>${escapeHtml(currentMap.name)}</strong></div>`;
  } else if(mapsIndex.length){
    mapPreview.innerHTML = `<div class="map-empty">Hay ${mapsIndex.length} mapa(s) guardado(s). Abrí la pestaña Mapas.</div>`;
  } else {
    mapPreview.innerHTML = `<div class="map-empty">No hay mapa cargado todavía.</div>`;
  }
}

async function loadWorld(){
  const meta = await storeGet('world-meta');
  const metaExisted = !!meta;
  if(meta) worldMeta = meta;
  worldMeta.folders = worldMeta.folders || [];
  worldMeta.settings = worldMeta.settings || {};
  document.getElementById('worldName').value = worldMeta.worldName;
  applyTheme();

  const idx = await storeGet('entries-index');
  entriesIndex = idx || [];
  const mapsIdx = await storeGet('maps-index');
  mapsIndex = mapsIdx || [];

  if(worldMeta.lastMapId && mapsIndex.some(m=>m.id===worldMeta.lastMapId)){
    await loadMap(worldMeta.lastMapId);
  } else {
    currentMap = null;
    document.getElementById('mapEmpty').style.display = 'block';
    document.getElementById('mapWorkspace').style.display = 'none';
  }

  renderFolderList(); renderTypeFilterList(); renderFichasGrid(); renderHomeDashboard();
  renderWsFolderOptions(null);

  updateHomeGreeting();

  if(!metaExisted && entriesIndex.length === 0 && !dirHandle){
    showWelcomeScreen();
  } else if(worldMeta.userName){
    // returning user — show a warm toast, no interruption
    showToast('Bienvenido de vuelta, ' + worldMeta.userName + ' ✦', 3000);
  }
}
document.getElementById('worldName').addEventListener('change', async (e)=>{
  worldMeta.worldName = e.target.value.trim() || 'Mundo sin nombre';
  await storeSet('world-meta', worldMeta); markDirty();
});
document.getElementById('newFolderBtn').addEventListener('click', ()=>{
  openModal({
    title:'Nueva carpeta', fields:[{ key:'name', label:'Nombre', placeholder:'ej: Reino del Norte' }], submitLabel:'Crear',
    onSubmit: async (v) => {
      if(!v.name.trim()) return;
      worldMeta.folders.push({ id: uid(), name: v.name.trim() });
      await storeSet('world-meta', worldMeta); markDirty();
      renderFolderList(); renderWsFolderOptions(document.getElementById('wsFolder').value);
    }
  });
});

function updateClock(){
  const now = new Date();
  document.getElementById('topbarClock').textContent = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}
updateClock(); setInterval(updateClock, 30000);

/* ========================= MANIFEST (PWA best-effort) ========================= */
try{
  const manifest = { name:'Códice', short_name:'Códice', start_url:'.', display:'standalone', background_color:'#0d0906', theme_color:'#0d0906' };
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type:'application/json' });
  document.getElementById('manifestLink').setAttribute('href', URL.createObjectURL(manifestBlob));
}catch(e){}

async function loadExtras(){
  const jr = await storeGet('journal-entries'); journalEntries = jr || [];
  const sl = await storeGet('session-log'); sessionLog = sl || [];
  renderJournalList(); renderSessionList();
}

/* ========================= GREETING & WELCOME ========================= */
const GREET_PROMPTS = [
  n => `¿Qué ideas tenés para hoy, ${n}?`,
  n => `Bienvenido de vuelta, ${n}.`,
  n => `¿Listos para seguir construyendo, ${n}?`,
  n => `El mundo te espera, ${n}.`,
  n => `Que fluyan las ideas, ${n}.`,
];

function updateHomeGreeting(){
  const name = worldMeta.userName;
  const titleEl = document.getElementById('homeGreetTitle');
  const textEl  = document.getElementById('homeGreetText');
  const overEl  = document.getElementById('homeOverline');
  if(!titleEl || !textEl) return;
  if(name){
    if(overEl) overEl.textContent = 'TU TALLER PERSONAL';
    const prompt = GREET_PROMPTS[Math.floor(Math.random() * GREET_PROMPTS.length)](name);
    titleEl.textContent = prompt;
    textEl.textContent  = 'Tus cartas, mapas y capítulos te esperan donde los dejaste.';
  } else {
    if(overEl) overEl.textContent = 'TU LABORATORIO';
    titleEl.textContent = 'Escribe, conecta y explora tu mundo.';
    textEl.textContent  = 'Tus cartas aparecen aquí cuando volvés al proyecto.';
  }
}

function showWelcomeScreen(){
  const overlay = document.getElementById('modalOverlay');
  const box     = document.getElementById('modalBox');
  box.style.width = 'min(500px, 92vw)';
  box.innerHTML = `
    <div class="modal-title" style="font-size:22px;">✦ Bienvenido a Códice</div>
    <div class="modal-message" style="font-size:14px; line-height:1.7;">
      Tu taller personal de creación de mundos. Acá podés organizar fichas de personajes, lugares y objetos, dibujar mapas, conectar relaciones y llevar un diario de campaña.<br><br>
      <strong>Para no perder tus datos:</strong><br>
      • Usá el botón <strong>Exportar</strong> seguido para bajar una copia.<br>
      • Conectá una carpeta local (📁) si querés sincronizar entre computadoras.<br>
      • Evitá borrar los datos del navegador sin exportar antes.<br><br>
      <em>¿Cómo te llamamos?</em>
    </div>
    <div class="modal-fields">
      <div class="field">
        <label>Tu nombre</label>
        <input type="text" id="welcomeName" placeholder="ej. Jere" autocomplete="off">
      </div>
    </div>
    <div class="modal-actions">
      <div><button class="btn-ghost" id="welcomeConnectFolder" type="button">📁 Conectar carpeta</button></div>
      <div><button class="btn-brass" id="welcomeStart" type="button">Empezar ✦</button></div>
    </div>`;
  overlay.classList.add('open');

  document.getElementById('welcomeStart').onclick = async () => {
    const name = (document.getElementById('welcomeName').value || '').trim();
    worldMeta.userName = name || null;
    await storeSet('world-meta', worldMeta);
    closeModal();
    updateHomeGreeting();
    if(name) showToast('¡Bienvenido/a, ' + name + '! El taller está listo. ✦', 3500);
  };
  document.getElementById('welcomeConnectFolder').onclick = async () => {
    const name = (document.getElementById('welcomeName').value || '').trim();
    worldMeta.userName = name || null;
    await storeSet('world-meta', worldMeta);
    closeModal();
    await connectFolder();
    updateHomeGreeting();
  };
  setTimeout(() => {
    const inp = document.getElementById('welcomeName');
    if(inp) inp.focus();
  }, 80);
}

/* ========================= TOAST ========================= */
let _toastTimer = null;
function showToast(msg, duration, type){
  const el = document.getElementById('codice-toast');
  if(!el) return;
  el.textContent = msg;
  el.className = 'visible' + (type ? ' '+type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(()=>{ el.className = ''; }, duration || 2500);
}
