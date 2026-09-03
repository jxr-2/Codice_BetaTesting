/* modules/bitacora.js — Bitácora de sesiones. */
/* ========================= BITÁCORA ========================= */
function renderSessionList(){
  const el = document.getElementById('sessionList');
  const sorted = sessionLog.slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  el.innerHTML = sorted.map(s=>`<div class="rail-item ${currentSessionId===s.id?'active':''}" data-id="${s.id}"><span>${escapeHtml(s.title||'Sesión')}</span><span class="rail-count">${s.date||''}</span></div>`).join('') || '<div class="hint" style="margin:8px 0;">Sin sesiones.</div>';
  el.querySelectorAll('.rail-item').forEach(item=> item.addEventListener('click', ()=> loadSession(item.dataset.id)));
}
let sessionAutosaveTimer = null;
function loadSession(id){
  currentSessionId = id;
  clearTimeout(sessionAutosaveTimer);
  sessionDirty = false;
  document.getElementById('sessionDirtyHint').textContent = '';
  const s = sessionLog.find(x=>x.id===id);
  document.getElementById('sessionEmpty').style.display = s? 'none':'flex';
  document.getElementById('sessionEditor').style.display = s? 'block':'none';
  if(s){
    document.getElementById('sessionTitle').value = s.title||'';
    document.getElementById('sessionDate').value = s.date||'';
    document.getElementById('sessionSummary').value = s.summary||'';
    const notes = document.getElementById('sessionNotes');
    notes.innerHTML = s.notes||'';
    wireImageBlocksIn(notes, markSessionDirty);
    renderSessionLinks(s);
  }
  renderSessionList();
}
function renderSessionLinks(s){
  const el = document.getElementById('sessionLinks');
  el.innerHTML = entriesIndex.map(en=>`
    <label class="linked-ficha-check"><input type="checkbox" data-link="${en.id}" ${s.linkedEntryIds&&s.linkedEntryIds.includes(en.id)?'checked':''}> ${TYPES[en.type].glyph} ${escapeHtml(en.name)}</label>`).join('') || '<div class="hint">No hay fichas creadas.</div>';
  el.querySelectorAll('[data-link]').forEach(chk=> chk.addEventListener('change', markSessionDirty));
}
async function saveSessionEntry(opts={}){
  const silent = !!opts.silent;
  const s = sessionLog.find(x=>x.id===currentSessionId);
  if(!s) return false;
  const hint = document.getElementById('sessionDirtyHint');
  if(silent) hint.textContent = 'Guardando…';
  s.title = document.getElementById('sessionTitle').value.trim() || 'Sesión';
  s.date = document.getElementById('sessionDate').value;
  s.summary = document.getElementById('sessionSummary').value;
  s.notes = document.getElementById('sessionNotes').innerHTML;
  s.linkedEntryIds = Array.from(document.querySelectorAll('[data-link]:checked')).map(el=>el.dataset.link);
  await storeSet('session-log', sessionLog);
  markDirty();
  sessionDirty = false;
  clearTimeout(sessionAutosaveTimer);
  hint.textContent = '✓ Guardado';
  renderSessionList();
  return true;
}
function markSessionDirty(){
  sessionDirty = true;
  document.getElementById('sessionDirtyHint').textContent = '● cambios sin guardar';
  clearTimeout(sessionAutosaveTimer);
  sessionAutosaveTimer = setTimeout(()=> saveSessionEntry({silent:true}), 2500);
}
document.getElementById('newSessionBtn').addEventListener('click', async ()=>{
  const s = { id:uid(), title:'Nueva sesión', date:new Date().toISOString().slice(0,10), summary:'', notes:'', linkedEntryIds:[] };
  sessionLog.push(s); await storeSet('session-log', sessionLog); markDirty();
  loadSession(s.id);
});
document.getElementById('sessionTitle').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); document.getElementById('sessionSummary').focus(); }
});
document.getElementById('sessionTitle').addEventListener('input', markSessionDirty);
document.getElementById('sessionDate').addEventListener('input', markSessionDirty);
document.getElementById('sessionSummary').addEventListener('input', markSessionDirty);
document.getElementById('sessionNotes').addEventListener('input', markSessionDirty);
wireRichTextToolbar(document.getElementById('sessionToolbar'), document.getElementById('sessionNotes'), markSessionDirty);
document.getElementById('sessionInsertImgBtn').addEventListener('click', ()=> document.getElementById('sessionImgFile').click());
document.getElementById('sessionImgFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const dataUrl = await resizeImageFile(file, 1200, 0.8);
  const notes = document.getElementById('sessionNotes');
  notes.focus();
  insertNodeAtCursor(notes, createImageBlock(dataUrl, markSessionDirty));
  markSessionDirty();
  e.target.value = '';
});
document.getElementById('sessionSave').addEventListener('click', ()=> saveSessionEntry());
document.getElementById('sessionDelete').addEventListener('click', ()=>{
  if(!currentSessionId) return;
  openConfirm({ title:'Eliminar sesión', message:'Se eliminará esta entrada de la bitácora.', onConfirm: async ()=>{
    sessionLog = sessionLog.filter(x=>x.id!==currentSessionId);
    await storeSet('session-log', sessionLog); markDirty();
    currentSessionId = null; loadSession(null);
  }});
});

/* ========================= MENCIÓN @FICHA EN LAS NOTAS ========================= */
/* No agrega datos nuevos: el chip se guarda como parte del mismo HTML libre que ya
   usa sessionNotes (igual que las imágenes dentro de los bloques de fichas). */
function closeMentionPopup(){
  const popup = document.getElementById('mentionPopup');
  if(popup) popup.remove();
}
function openMentionPopup(anchorRect, query){
  closeMentionPopup();
  const matches = entriesIndex.filter(e=>(e.name||'').toLowerCase().includes(query.toLowerCase())).slice(0,8);
  if(!matches.length) return;
  const popup = document.createElement('div');
  popup.id = 'mentionPopup';
  popup.className = 'mention-popup';
  popup.style.left = (anchorRect.left + window.scrollX) + 'px';
  popup.style.top = (anchorRect.bottom + window.scrollY + 4) + 'px';
  popup.innerHTML = matches.map(e=>`<div class="mention-option" data-id="${e.id}">${TYPES[e.type]?.glyph||'☉'} ${escapeHtml(e.name||'Sin nombre')}</div>`).join('');
  document.body.appendChild(popup);
  popup.querySelectorAll('.mention-option').forEach(opt=>{
    opt.addEventListener('mousedown', (e)=>{ e.preventDefault(); insertMention(opt.dataset.id); });
  });
}
function insertMention(entryId){
  const entry = entriesIndex.find(e=>e.id===entryId);
  if(!entry){ closeMentionPopup(); return; }
  const sel = window.getSelection();
  if(!sel.rangeCount){ closeMentionPopup(); return; }
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if(node.nodeType === Node.TEXT_NODE){
    const at = node.textContent.lastIndexOf('@', range.startOffset - 1);
    if(at > -1) range.setStart(node, at);
  }
  range.deleteContents();
  const chip = document.createElement('span');
  chip.className = 'mention-chip';
  chip.contentEditable = 'false';
  chip.dataset.entryId = entryId;
  chip.textContent = '@' + (entry.name||'Sin nombre');
  range.insertNode(chip);
  const space = document.createTextNode(' ');
  chip.after(space);
  range.setStartAfter(space);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  closeMentionPopup();
  markSessionDirty();
}
document.getElementById('sessionNotes').addEventListener('input', ()=>{
  const sel = window.getSelection();
  if(!sel.rangeCount){ closeMentionPopup(); return; }
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if(node.nodeType === Node.TEXT_NODE){
    const match = node.textContent.slice(0, range.startOffset).match(/@([^\s@]*)$/);
    if(match){
      const rect = range.getClientRects()[0] || node.parentElement.getBoundingClientRect();
      openMentionPopup(rect, match[1]);
      return;
    }
  }
  closeMentionPopup();
});
document.getElementById('sessionNotes').addEventListener('keydown', (e)=>{
  if(e.key==='Escape') closeMentionPopup();
});
document.getElementById('sessionNotes').addEventListener('click', (e)=>{
  const chip = e.target.closest('.mention-chip');
  if(chip) openFichaEditor(chip.dataset.entryId);
});
document.getElementById('sessionNotes').addEventListener('blur', ()=> setTimeout(closeMentionPopup, 150));

