/* modules/bitacora.js — Bitácora de sesiones. */
/* ========================= BITÁCORA ========================= */
function renderSessionList(){
  const el = document.getElementById('sessionList');
  const sorted = sessionLog.slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  el.innerHTML = sorted.map(s=>`<div class="rail-item ${currentSessionId===s.id?'active':''}" data-id="${s.id}"><span>${escapeHtml(s.title||'Sesión')}</span><span class="rail-count">${s.date||''}</span></div>`).join('') || '<div class="hint" style="margin:8px 0;">Sin sesiones.</div>';
  el.querySelectorAll('.rail-item').forEach(item=> item.addEventListener('click', ()=> loadSession(item.dataset.id)));
}
function loadSession(id){
  currentSessionId = id;
  const s = sessionLog.find(x=>x.id===id);
  document.getElementById('sessionEmpty').style.display = s? 'none':'flex';
  document.getElementById('sessionEditor').style.display = s? 'block':'none';
  if(s){
    document.getElementById('sessionTitle').value = s.title||'';
    document.getElementById('sessionDate').value = s.date||'';
    document.getElementById('sessionSummary').value = s.summary||'';
    document.getElementById('sessionNotes').innerHTML = s.notes||'';
    renderSessionLinks(s);
  }
  renderSessionList();
}
function renderSessionLinks(s){
  const el = document.getElementById('sessionLinks');
  el.innerHTML = entriesIndex.map(en=>`
    <label class="linked-ficha-check"><input type="checkbox" data-link="${en.id}" ${s.linkedEntryIds&&s.linkedEntryIds.includes(en.id)?'checked':''}> ${TYPES[en.type].glyph} ${escapeHtml(en.name)}</label>`).join('') || '<div class="hint">No hay fichas creadas.</div>';
}
document.getElementById('newSessionBtn').addEventListener('click', async ()=>{
  const s = { id:uid(), title:'Nueva sesión', date:new Date().toISOString().slice(0,10), summary:'', notes:'', linkedEntryIds:[] };
  sessionLog.push(s); await storeSet('session-log', sessionLog); markDirty();
  loadSession(s.id);
});
document.getElementById('sessionTitle').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); document.getElementById('sessionSummary').focus(); }
});
document.getElementById('sessionSave').addEventListener('click', async ()=>{
  const s = sessionLog.find(x=>x.id===currentSessionId); if(!s) return;
  s.title = document.getElementById('sessionTitle').value.trim() || 'Sesión';
  s.date = document.getElementById('sessionDate').value;
  s.summary = document.getElementById('sessionSummary').value;
  s.notes = document.getElementById('sessionNotes').innerHTML;
  s.linkedEntryIds = Array.from(document.querySelectorAll('[data-link]:checked')).map(el=>el.dataset.link);
  await storeSet('session-log', sessionLog); markDirty(); renderSessionList();
});
document.getElementById('sessionDelete').addEventListener('click', ()=>{
  if(!currentSessionId) return;
  openConfirm({ title:'Eliminar sesión', message:'Se eliminará esta entrada de la bitácora.', onConfirm: async ()=>{
    sessionLog = sessionLog.filter(x=>x.id!==currentSessionId);
    await storeSet('session-log', sessionLog); markDirty();
    currentSessionId = null; loadSession(null);
  }});
});

