/* modules/diario.js — Diario del viajero (capítulos). */
/* ========================= DIARIO (capítulos) ========================= */
function setJournalMode(mode){
  document.getElementById('journalGridWrap').style.display = mode==='grid' ? 'block' : 'none';
  document.getElementById('journalEditor').style.display = mode==='editor' ? 'block' : 'none';
}
function sortedJournalEntries(){
  return journalEntries.slice().sort((a,b)=> (a.order||0)-(b.order||0));
}
let journalSelectMode = false;
let journalSelectedIds = new Set();
function renderJournalGrid(){
  const grid = document.getElementById('journalGrid');
  const empty = document.getElementById('journalEmpty');
  const sorted = sortedJournalEntries();
  if(sorted.length === 0){
    grid.innerHTML = '';
    empty.style.display = 'flex';
    document.getElementById('journalBulkBar').style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = sorted.map((j,idx)=>{
    const preview = stripHtml(j.content).slice(0,140);
    const checked = journalSelectedIds.has(j.id);
    return `<div class="ficha-card" data-id="${j.id}">
      ${journalSelectMode ? `<input type="checkbox" class="ficha-check" data-check="${j.id}" ${checked?'checked':''}>` : ''}
      <div class="ficha-body">
        <div class="ficha-type">Capítulo ${idx+1}${j.date ? ' · '+escapeHtml(j.date) : ''}</div>
        <div class="ficha-name">${escapeHtml(j.title||'Sin título')}</div>
        <div class="ficha-summary">${escapeHtml(preview)}${preview.length===140?'…':''}</div>
      </div>
      <div class="journal-card-order">
        <button type="button" data-move-up="${j.id}" title="Mover arriba" ${idx===0?'disabled':''}>↑</button>
        <button type="button" data-move-down="${j.id}" title="Mover abajo" ${idx===sorted.length-1?'disabled':''}>↓</button>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.ficha-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest('[data-move-up],[data-move-down]')) return;
      if(journalSelectMode){
        if(e.target.dataset.check !== undefined) return;
        if(journalSelectedIds.has(card.dataset.id)) journalSelectedIds.delete(card.dataset.id); else journalSelectedIds.add(card.dataset.id);
        renderJournalGrid();
        return;
      }
      openJournalEntry(card.dataset.id);
    });
  });
  grid.querySelectorAll('[data-check]').forEach(chk=>{
    chk.addEventListener('click', e=>e.stopPropagation());
    chk.addEventListener('change', ()=>{
      if(chk.checked) journalSelectedIds.add(chk.dataset.check); else journalSelectedIds.delete(chk.dataset.check);
      renderJournalBulkBar();
    });
  });
  grid.querySelectorAll('[data-move-up]').forEach(btn=> btn.addEventListener('click', (e)=>{ e.stopPropagation(); moveJournalEntry(btn.dataset.moveUp, -1); }));
  grid.querySelectorAll('[data-move-down]').forEach(btn=> btn.addEventListener('click', (e)=>{ e.stopPropagation(); moveJournalEntry(btn.dataset.moveDown, 1); }));
  renderJournalBulkBar();
}
function renderJournalBulkBar(){
  const bar = document.getElementById('journalBulkBar');
  if(!journalSelectMode || journalSelectedIds.size===0){ bar.style.display='none'; return; }
  bar.style.display='flex';
  document.getElementById('journalBulkCount').textContent = journalSelectedIds.size + ' seleccionado(s)';
}
document.getElementById('journalSelectModeBtn').addEventListener('click', ()=>{
  journalSelectMode = !journalSelectMode; journalSelectedIds.clear();
  document.getElementById('journalSelectModeBtn').classList.toggle('active', journalSelectMode);
  renderJournalGrid();
});
document.getElementById('journalBulkCancelBtn').addEventListener('click', ()=>{
  journalSelectMode = false; journalSelectedIds.clear();
  document.getElementById('journalSelectModeBtn').classList.remove('active');
  renderJournalGrid();
});
document.getElementById('journalBulkPrintBtn').addEventListener('click', ()=>{
  const chapters = sortedJournalEntries().filter(j=>journalSelectedIds.has(j.id));
  printJournalChapters(chapters);
});
async function moveJournalEntry(id, dir){
  const sorted = sortedJournalEntries();
  const idx = sorted.findIndex(j=>j.id===id);
  const swapIdx = idx + dir;
  if(idx===-1 || swapIdx<0 || swapIdx>=sorted.length) return;
  const a = sorted[idx], b = sorted[swapIdx];
  const tmp = a.order||0; a.order = b.order||0; b.order = tmp;
  await storeSet('journal-entries', journalEntries); markDirty();
  renderJournalGrid();
}
let journalAutosaveTimer = null;
function updateJournalNavButtons(){
  const sorted = sortedJournalEntries();
  const idx = sorted.findIndex(j=>j.id===currentJournalId);
  document.getElementById('journalPrevBtn').disabled = idx <= 0;
  document.getElementById('journalNextBtn').disabled = idx === -1 || idx >= sorted.length-1;
}
function openJournalEntry(id){
  currentJournalId = id;
  clearTimeout(journalAutosaveTimer);
  journalDirty = false;
  document.getElementById('journalDirtyHint').textContent = '';
  const sorted = sortedJournalEntries();
  const j = journalEntries.find(x=>x.id===id);
  if(!j) return;
  const idx = sorted.findIndex(x=>x.id===id);
  document.getElementById('journalNum').textContent = 'Capítulo ' + (idx+1);
  document.getElementById('journalTitle').value = j.title || '';
  document.getElementById('journalDate').value = j.date || '';
  const content = document.getElementById('journalContent');
  content.innerHTML = j.content || '';
  wireImageBlocksIn(content, markJournalDirty);
  updateJournalNavButtons();
  setJournalMode('editor');
}
async function backToJournalGrid(){
  if(journalDirty) await saveJournalEntry();
  currentJournalId = null;
  setJournalMode('grid');
  renderJournalGrid();
}
async function gotoAdjacentJournal(dir){
  if(journalDirty) await saveJournalEntry();
  const sorted = sortedJournalEntries();
  const idx = sorted.findIndex(j=>j.id===currentJournalId);
  const target = sorted[idx+dir];
  if(target) openJournalEntry(target.id);
}
async function saveJournalEntry(opts={}){
  const silent = !!opts.silent;
  const j = journalEntries.find(x=>x.id===currentJournalId);
  if(!j) return false;
  const hint = document.getElementById('journalDirtyHint');
  if(silent) hint.textContent = 'Guardando…';
  j.title = document.getElementById('journalTitle').value.trim() || 'Sin título';
  j.date = document.getElementById('journalDate').value;
  j.content = document.getElementById('journalContent').innerHTML;
  await storeSet('journal-entries', journalEntries);
  markDirty();
  journalDirty = false;
  clearTimeout(journalAutosaveTimer);
  hint.textContent = '✓ Guardado';
  return true;
}
function markJournalDirty(){
  journalDirty = true;
  document.getElementById('journalDirtyHint').textContent = '● cambios sin guardar';
  clearTimeout(journalAutosaveTimer);
  journalAutosaveTimer = setTimeout(()=> saveJournalEntry({silent:true}), 2500);
}
document.getElementById('newJournalBtn').addEventListener('click', async ()=>{
  const j = { id:uid(), title:'', date: new Date().toISOString().slice(0,10), content:'', order: journalEntries.length };
  journalEntries.push(j); await storeSet('journal-entries', journalEntries); markDirty();
  openJournalEntry(j.id);
});
document.getElementById('backToJournalGridBtn').addEventListener('click', backToJournalGrid);
document.getElementById('journalPrevBtn').addEventListener('click', ()=> gotoAdjacentJournal(-1));
document.getElementById('journalNextBtn').addEventListener('click', ()=> gotoAdjacentJournal(1));
document.getElementById('journalTitle').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); document.getElementById('journalContent').focus(); }
});
document.getElementById('journalTitle').addEventListener('input', markJournalDirty);
document.getElementById('journalDate').addEventListener('input', markJournalDirty);
document.getElementById('journalContent').addEventListener('input', markJournalDirty);
wireRichTextToolbar(document.getElementById('journalToolbar'), document.getElementById('journalContent'), markJournalDirty);
document.getElementById('journalInsertImgBtn').addEventListener('click', ()=> document.getElementById('journalImgFile').click());
document.getElementById('journalImgFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const dataUrl = await resizeImageFile(file, 1200, 0.8);
  const content = document.getElementById('journalContent');
  content.focus();
  insertNodeAtCursor(content, createImageBlock(dataUrl, markJournalDirty));
  markJournalDirty();
  e.target.value='';
});
document.getElementById('journalSave').addEventListener('click', ()=> saveJournalEntry());
document.getElementById('journalDelete').addEventListener('click', ()=>{
  if(!currentJournalId) return;
  openConfirm({ title:'Eliminar capítulo', message:'Este capítulo del diario se eliminará.', onConfirm: async ()=>{
    journalEntries = journalEntries.filter(x=>x.id!==currentJournalId);
    await storeSet('journal-entries', journalEntries); markDirty();
    currentJournalId = null;
    clearTimeout(journalAutosaveTimer); journalDirty = false;
    setJournalMode('grid');
    renderJournalGrid();
  }});
});

/* Print */
function buildJournalPrintHtml(chapters){
  return `<html><head><title>Diario del viajero</title><style>
    body{ font-family: Georgia, serif; padding:40px; color:#231914; max-width:760px; margin:auto; }
    h1{ font-size:26px; margin-bottom:4px; } .meta{ color:#7d5f2c; font-size:12px; margin-bottom:16px; }
    img{ max-width:100%; border-radius:6px; }
    .page-break{ page-break-after: always; margin-bottom:40px; border-bottom:1px dashed #ccc; padding-bottom:30px; }
  </style></head><body>
  ${chapters.map(j=>`
    <div class="page-break">
      <h1>${escapeHtml(j.title||'Sin título')}</h1>
      <div class="meta">${escapeHtml(j.date||'')}</div>
      <div>${j.content||''}</div>
    </div>`).join('')}
  </body></html>`;
}
function printJournalChapters(chapters){
  if(!chapters.length) return;
  openPrintWindow(buildJournalPrintHtml(chapters));
}
document.getElementById('journalPrintBtn').addEventListener('click', ()=>{
  const j = journalEntries.find(x=>x.id===currentJournalId);
  if(j) printJournalChapters([j]);
});
