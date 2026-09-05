/* modules/grimorio.js — Grimorio: lista de hechizos + agregar a ficha.
   NOTA: acopla con fichas.js vía currentEntryId/fichasMode/#wsSpells (documentado). */
let GRIMOIRE = [];
let grimorioLoadState = 'idle';
let grimorioLoadPromise = null;

function normalizeSpell(rawSpell, index){
  const description = (Array.isArray(rawSpell.descripcion) ? rawSpell.descripcion : [rawSpell.descripcion])
    .filter(Boolean);
  const blurb = String(description[0] || '')
    .replace(/<br\s*\/?>(\s*)/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    id: index,
    name: rawSpell.nombre || 'Sin nombre',
    blurb,
    description,
    level: Number.isFinite(Number(rawSpell.nivel)) ? Number(rawSpell.nivel) : 0,
    school: rawSpell.escuela || 'Sin escuela',
    classes: Array.isArray(rawSpell.clases) ? rawSpell.clases : [],
    castingTime: rawSpell.tiempo_de_lanzamiento || '',
    ritual: Boolean(rawSpell.ritual),
    range: rawSpell.alcance || '',
    components: Array.isArray(rawSpell.componentes) ? rawSpell.componentes : [],
    concentration: Boolean(rawSpell.concentracion),
    duration: rawSpell.duracion || '',
    materials: rawSpell.materiales || null,
    savingThrow: rawSpell.tirada_de_salvacion || '',
    requiresAttack: Boolean(rawSpell.requiere_ataque),
    visible: Boolean(rawSpell.visible)
  };
}

async function loadSpellsDB(){
  if(grimorioLoadState === 'loaded') return GRIMOIRE;
  if(grimorioLoadState === 'loading') return grimorioLoadPromise;
  grimorioLoadState = 'loading';
  grimorioLoadPromise = fetch('./data/all.json')
    .then(response => {
      if(!response.ok) throw new Error(`No se pudo cargar all.json (HTTP ${response.status})`);
      return response.json();
    })
    .then(data => {
      if(!Array.isArray(data)) throw new Error('all.json no contiene una lista de hechizos válida');
      GRIMOIRE = data.map(normalizeSpell);
      grimorioLoadState = 'loaded';
      return GRIMOIRE;
    })
    .catch(error => {
      console.error('Error cargando grimorio desde data/all.json:', error);
      GRIMOIRE = [];
      grimorioLoadState = 'error';
      return GRIMOIRE;
    });
  return grimorioLoadPromise;
}


/* ========================= GRIMORIO (tab dedicado) ========================= */
async function initGrimorio(){
  grimorioInited = true;
  await loadSpellsDB();
  refreshGrimoireFilters();
  renderGrimoireBasicList();
}
function refreshGrimoireFilters(){
  const classFilter = document.getElementById('grimoireClassFilter');
  const schoolFilter = document.getElementById('grimoireSchoolFilter');
  const selectedClass = classFilter.value;
  const selectedSchool = schoolFilter.value;
  const classes = [...new Set(GRIMOIRE.flatMap(spell => spell.classes))].sort((a, b) => a.localeCompare(b, 'es'));
  const schools = [...new Set(GRIMOIRE.map(spell => spell.school))].sort((a, b) => a.localeCompare(b, 'es'));
  classFilter.innerHTML = '<option value="">Todas las clases</option>' + classes.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  schoolFilter.innerHTML = '<option value="">Todas las escuelas</option>' + schools.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  classFilter.value = selectedClass;
  schoolFilter.value = selectedSchool;
}
function formatSpellValue(value){
  if(Array.isArray(value)) return value.join(' / ');
  return value || '—';
}
function formatSpellDescription(descriptions){
  return descriptions.map(description => escapeHtml(String(description)
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim())
    .replace(/\n/g, '<br>'))
    .join('<br><br>');
}
function spellMetaHtml(spell){
  return `
    <span><strong>Clases</strong>${escapeHtml(formatSpellValue(spell.classes))}</span>
    <span><strong>Lanzamiento</strong>${escapeHtml(formatSpellValue(spell.castingTime))}</span>
    <span><strong>Alcance</strong>${escapeHtml(formatSpellValue(spell.range))}</span>
    <span><strong>Componentes</strong>${escapeHtml(formatSpellValue(spell.components))}</span>
    <span><strong>Duración</strong>${escapeHtml(formatSpellValue(spell.duration))}</span>
    <span><strong>Ritual</strong>${spell.ritual ? 'Sí' : 'No'}</span>
    <span><strong>Concentración</strong>${spell.concentration ? 'Sí' : 'No'}</span>
    ${spell.materials ? `<span class="grimoire-meta-wide"><strong>Materiales</strong>${escapeHtml(spell.materials)}</span>` : ''}
    ${spell.savingThrow ? `<span><strong>Salvación</strong>${escapeHtml(spell.savingThrow)}</span>` : ''}
    ${spell.requiresAttack ? '<span><strong>Requiere ataque</strong>Sí</span>' : ''}
    <span><strong>Visible</strong>${spell.visible ? 'Sí' : 'No'}</span>`;
}
function spellLine(spell){
  return `${spell.name} (${spell.level===0?'Truco':'Nv '+spell.level}, ${spell.school}) — ${spell.blurb}`;
}
function openSpellTargetPicker(spellId){
  const spell = GRIMOIRE.find(item => item.id === Number(spellId));
  if(!spell) return;
  openSpellTargetPickerForLine(spell.name, spellLine(spell));
}
function openSpellTargetPickerForLine(spellName, line){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const entries = entriesIndex.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
  box.style.width = 'min(480px,92vw)';
  if(!entries.length){
    box.innerHTML = `<div class="modal-title">Agregar ${escapeHtml(spellName)}</div><div class="modal-message">Todavía no hay fichas disponibles para recibir este hechizo.</div><div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button></div></div>`;
    overlay.classList.add('open');
    document.getElementById('modalCancel').onclick = closeModal;
    return;
  }
  box.innerHTML = `
    <div class="modal-title">Agregar ${escapeHtml(spellName)}</div>
    <div class="modal-message">Elegí la ficha donde querés guardar este hechizo.</div>
    <div class="modal-fields"><div class="field"><label>Ficha destino</label><select id="spellTargetEntry">${entries.map(entry => `<option value="${entry.id}">${escapeHtml(entry.name || 'Sin nombre')}</option>`).join('')}</select></div></div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cancelar</button><button class="btn-brass" id="spellTargetConfirm">Agregar hechizo</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('spellTargetConfirm').onclick = async ()=>{
    await addSpellLineToEntry(document.getElementById('spellTargetEntry').value, line);
    closeModal();
  };
}
function openSpellDetail(spellId){
  const spell = GRIMOIRE.find(item => item.id === Number(spellId));
  if(!spell) return;
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = 'min(760px,94vw)';
  box.innerHTML = `
    <div class="spell-detail-heading">
      <div class="ficha-type">${spell.level===0?'Truco':'Nivel '+spell.level} · ${escapeHtml(spell.school)}</div>
      <div class="modal-title">${escapeHtml(spell.name)}</div>
    </div>
    <div class="grimoire-metadata spell-detail-metadata">${spellMetaHtml(spell)}</div>
    <div class="spell-detail-description">${formatSpellDescription(spell.description)}</div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button><button class="btn-brass" id="spellDetailAdd" data-add-spell="${spell.id}">+ Agregar a ficha</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('spellDetailAdd').onclick = ()=> openSpellTargetPicker(spell.id);
}
function renderGrimoireBasicList(q=''){
  const el = document.getElementById('grimoireBasicList');
  if(grimorioLoadState === 'loading' || grimorioLoadState === 'idle'){
    el.innerHTML = '<div class="hint">Cargando hechizos…</div>';
    return;
  }
  if(grimorioLoadState === 'error'){
    el.innerHTML = '<div class="hint">No se pudieron cargar los hechizos de Códice. Revisá la consola y comprobá que data/all.json esté disponible.</div>';
    return;
  }
  const selectedClass = document.getElementById('grimoireClassFilter').value;
  const selectedSchool = document.getElementById('grimoireSchoolFilter').value;
  const normalizedQuery = q.trim().toLowerCase();
  const filtered = GRIMOIRE.filter(s =>
    (!normalizedQuery || s.name.toLowerCase().includes(normalizedQuery)) &&
    (!selectedClass || s.classes.includes(selectedClass)) &&
    (!selectedSchool || s.school === selectedSchool)
  );
  el.innerHTML = filtered.map(s=>`
    <article class="ficha-card grimoire-spell-card" data-spell-detail="${s.id}" tabindex="0" role="button" aria-label="Ver detalles de ${escapeHtml(s.name)}">
      <div class="ficha-body">
        <div class="ficha-type">${s.level===0?'Truco':'Nivel '+s.level} · ${escapeHtml(s.school)}</div>
        <div class="ficha-name" style="font-size:15px;">${escapeHtml(s.name)}</div>
        <div class="grimoire-metadata">${spellMetaHtml(s)}</div>
        <div class="grimoire-card-footer"><span>Ver detalle completo</span><button class="rail-btn" data-add-basic="${s.id}" type="button">+ Agregar</button></div>
      </div>
    </article>`).join('') || '<div class="hint">Sin resultados.</div>';
  el.querySelectorAll('[data-spell-detail]').forEach(card=>{
    const openDetail = ()=> openSpellDetail(card.dataset.spellDetail);
    card.addEventListener('click', openDetail);
    card.addEventListener('keydown', event=>{ if(event.key==='Enter' || event.key===' '){ event.preventDefault(); openDetail(); } });
  });
  el.querySelectorAll('[data-add-basic]').forEach(btn=>{
    btn.addEventListener('click', event=>{ event.stopPropagation(); openSpellTargetPicker(btn.dataset.addBasic); });
  });
}
document.getElementById('grimoireBasicSearch').addEventListener('input', (e)=> renderGrimoireBasicList(e.target.value));
document.getElementById('grimoireClassFilter').addEventListener('change', ()=> renderGrimoireBasicList(document.getElementById('grimoireBasicSearch').value));
document.getElementById('grimoireSchoolFilter').addEventListener('change', ()=> renderGrimoireBasicList(document.getElementById('grimoireBasicSearch').value));
async function addSpellLineToEntry(entryId, line){
  const full = await storeGet('entry:'+entryId);
  if(!full) return;
  full.spells = full.spells ? full.spells + '\n' + line : line;
  await storeSet('entry:'+entryId, full);
  markDirty();
  if(currentEntryId === entryId && fichasMode==='editor'){ document.getElementById('wsSpells').value = full.spells; }
}
document.getElementById('grimoireApiSearchBtn').addEventListener('click', async ()=>{
  const q = document.getElementById('grimoireApiSearch').value.trim();
  const results = document.getElementById('grimoireApiResults');
  results.innerHTML = '<div class="hint">Buscando…</div>';
  try{
    const res = await fetch('https://www.dnd5eapi.co/api/spells' + (q ? '?name='+encodeURIComponent(q) : ''));
    if(!res.ok) throw new Error('API error');
    const data = await res.json();
    const items = data.results || [];
    if(items.length===0){ results.innerHTML = '<div class="hint">Sin resultados.</div>'; return; }
    results.innerHTML = items.slice(0,30).map(it=>`
      <div class="grimoire-row" style="margin-bottom:8px;">
        <div><strong>${escapeHtml(it.name)}</strong></div>
        <button class="rail-btn" data-api-spell="${escapeHtml(it.url)}" type="button">+ Agregar</button>
      </div>`).join('');
    results.querySelectorAll('[data-api-spell]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        try{
          const detailRes = await fetch('https://www.dnd5eapi.co'+btn.dataset.apiSpell);
          const detail = await detailRes.json();
          const desc = Array.isArray(detail.desc) ? detail.desc.join(' ') : '';
          const shortDesc = desc.slice(0,180) + (desc.length>180?'…':'');
          const line = `${detail.name} (Nv ${detail.level}, ${detail.school?.name||''}) — ${shortDesc} [en inglés, fuente: dnd5eapi.co]`;
          openSpellTargetPickerForLine(detail.name, line);
        }catch(e){ btn.textContent = 'Error de conexión'; }
      });
    });
  }catch(e){
    results.innerHTML = '<div class="hint">No se pudo conectar con la API en este entorno. Probá el grimorio básico de arriba mientras tanto.</div>';
  }
});

