/* modules/diario.js — Diario del viajero (capítulos). */
/* ========================= DIARIO (capítulos) ========================= */
function renderJournalList(){
  const el = document.getElementById('journalList');
  const sorted = journalEntries.slice().sort((a,b)=> (a.order||0)-(b.order||0));
  el.innerHTML = sorted.map((j,idx)=>`<div class="rail-item ${currentJournalId===j.id?'active':''}" data-id="${j.id}"><span>Cap. ${idx+1} — ${escapeHtml(j.title||'Sin título')}</span></div>`).join('') || '<div class="hint" style="margin:8px 0;">Sin capítulos.</div>';
  el.querySelectorAll('.rail-item').forEach(item=> item.addEventListener('click', ()=> loadJournalEntry(item.dataset.id)));
}
function loadJournalEntry(id){
  currentJournalId = id;
  const sorted = journalEntries.slice().sort((a,b)=> (a.order||0)-(b.order||0));
  const j = journalEntries.find(x=>x.id===id);
  document.getElementById('journalEmpty').style.display = j ? 'none' : 'flex';
  document.getElementById('journalEditor').style.display = j ? 'block' : 'none';
  if(j){
    const idx = sorted.findIndex(x=>x.id===id);
    document.getElementById('journalNum').textContent = 'Capítulo ' + (idx+1);
    document.getElementById('journalTitle').value = j.title || '';
    document.getElementById('journalDate').value = j.date || '';
    document.getElementById('journalContent').innerHTML = j.content || '';
  }
  renderJournalList();
}
document.getElementById('newJournalBtn').addEventListener('click', async ()=>{
  const j = { id:uid(), title:'', date: new Date().toISOString().slice(0,10), content:'', order: journalEntries.length };
  journalEntries.push(j); await storeSet('journal-entries', journalEntries); markDirty();
  loadJournalEntry(j.id);
});
document.getElementById('journalTitle').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); document.getElementById('journalContent').focus(); }
});
document.getElementById('journalInsertImgBtn').addEventListener('click', ()=> document.getElementById('journalImgFile').click());
document.getElementById('journalImgFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const dataUrl = await resizeImageFile(file, 800, 0.7);
  document.getElementById('journalContent').focus();
  document.execCommand('insertImage', false, dataUrl);
  e.target.value='';
});
document.getElementById('journalSave').addEventListener('click', async ()=>{
  const j = journalEntries.find(x=>x.id===currentJournalId); if(!j) return;
  j.title = document.getElementById('journalTitle').value.trim() || 'Sin título';
  j.date = document.getElementById('journalDate').value;
  j.content = document.getElementById('journalContent').innerHTML;
  await storeSet('journal-entries', journalEntries); markDirty(); renderJournalList();
});
document.getElementById('journalDelete').addEventListener('click', ()=>{
  if(!currentJournalId) return;
  openConfirm({ title:'Eliminar capítulo', message:'Este capítulo del diario se eliminará.', onConfirm: async ()=>{
    journalEntries = journalEntries.filter(x=>x.id!==currentJournalId);
    await storeSet('journal-entries', journalEntries); markDirty();
    currentJournalId = null; loadJournalEntry(null);
  }});
});

