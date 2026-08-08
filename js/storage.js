/* storage.js — Persistencia: window.storage/localStorage, exportar/importar
   proyecto, y conexión de carpeta local (File System Access API). */
/* ========================= STORAGE ========================= */
const STORAGE_PREFIX = 'codice:';
async function storeGet(key){
  try{
    if(window.storage && typeof window.storage.get === 'function'){
      const r = await window.storage.get(key, false);
      return r ? JSON.parse(r.value) : null;
    }
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    return v ? JSON.parse(v) : null;
  }catch(e){ return null; }
}
async function storeSet(key, value){
  const json = JSON.stringify(value);
  try{
    if(window.storage && typeof window.storage.set === 'function'){ await window.storage.set(key, json, false); return; }
    localStorage.setItem(STORAGE_PREFIX + key, json);
  }catch(e){ try{ localStorage.setItem(STORAGE_PREFIX + key, json); }catch(e2){} }
}
async function storeDelete(key){
  try{
    if(window.storage && typeof window.storage.delete === 'function'){ await window.storage.delete(key, false); return; }
    localStorage.removeItem(STORAGE_PREFIX + key);
  }catch(e){}
}


async function tryAutoImportFromFolder(){
  if(!dirHandle) return { ok:false };
  try{
    let jsonFile = null;
    for await (const entry of dirHandle.values()){
      if(entry.kind === 'file' && entry.name.toLowerCase().endsWith('.json')){ jsonFile = entry; break; }
    }
    if(!jsonFile) return { ok:false, reason:'none' };
    const file = await jsonFile.getFile();
    await importProject(file, true);
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error' }; }
}
async function connectFolder(){
  if(!window.showDirectoryPicker){
    openModal({ title:'No disponible', fields:[], submitLabel:'Cerrar', message:'Tu navegador no soporta conectar carpetas directamente. Usá Exportar/Importar para mover el proyecto entre computadoras.' });
    return;
  }
  try{ dirHandle = await window.showDirectoryPicker({ mode:'readwrite' }); }
  catch(e){ return; }
  const res = await tryAutoImportFromFolder();
  if(res.ok){
    openModal({ title:'Proyecto cargado', fields:[], submitLabel:'Cerrar', message:`Se encontró y cargó un proyecto desde "${escapeHtml(dirHandle.name)}".` });
  } else {
    openModal({
      title:'Carpeta conectada', fields:[], submitLabel:'Cerrar', showDelete:true, deleteLabel:'Elegir otra carpeta',
      message:`No encontramos un archivo de proyecto (.json) válido en "${escapeHtml(dirHandle.name)}". A partir de ahora, cada Exportar guardará ahí.`,
      onDelete: connectFolder
    });
  }
}

/* ========================= EXPORT / IMPORT ========================= */
function triggerDownload(json, name){
  const blob = new Blob([json], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
async function exportProject(){
  const btn = document.getElementById('exportProjectBtn');
  btn.classList.add('spinning'); btn.disabled = true;
  try{
    const project = { worldMeta, entriesIndex, canvasData, mapsIndex, journalEntries, sessionLog, entries:[], maps:[] };
    for(const entry of entriesIndex){ const full = await storeGet('entry:'+entry.id); if(full) project.entries.push(full); }
    for(const mapItem of mapsIndex){ const fullMap = await storeGet('map:'+mapItem.id); if(fullMap) project.maps.push(fullMap); }
    const json = JSON.stringify(project, null, 2);
    const fileName = `${(worldMeta.worldName||'codice').replace(/\s+/g,'_')}${PROJECT_FILE_NAME_SUFFIX}`;
    if(dirHandle){
      try{
        const fh = await dirHandle.getFileHandle(fileName, { create:true });
        const w = await fh.createWritable(); await w.write(json); await w.close();
      }catch(e){ console.warn('No se pudo escribir en la carpeta, descargando como respaldo', e); triggerDownload(json, fileName); }
    } else {
      triggerDownload(json, fileName);
    }
  } finally {
    btn.classList.remove('spinning'); btn.disabled = false;
  }
}
async function importProject(file, silent){
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(!data || typeof data !== 'object') throw new Error('Archivo inválido');
    worldMeta = data.worldMeta || { worldName:'Mundo sin nombre', folders:[] };
    await storeSet('world-meta', worldMeta);
    const importedEntries = data.entries || [];
    const importedIndex = data.entriesIndex || importedEntries.map(e=>({ id:e.id, name:e.name, type:e.type, folderId:e.folderId, tags:e.tags, summary:e.summary, coverThumb:e.coverThumb, updatedAt:e.updatedAt, createdAt:e.createdAt }));
    await storeSet('entries-index', importedIndex);
    for(const entry of importedEntries){ await storeSet('entry:'+entry.id, entry); }
    const importedMaps = data.maps || [];
    await storeSet('maps-index', data.mapsIndex || importedMaps.map(m=>({ id:m.id, name:m.name })));
    for(const mapItem of importedMaps){ await storeSet('map:'+mapItem.id, mapItem); }
    await storeSet('canvas-data', data.canvasData || { nodes:[], edges:[] });
    canvasData = data.canvasData || { nodes:[], edges:[] };
    journalEntries = data.journalEntries || []; await storeSet('journal-entries', journalEntries);
    sessionLog = data.sessionLog || []; await storeSet('session-log', sessionLog);
    currentMap = null;
    await loadWorld();
    applyTheme();
    if(canvasLoaded){ applyCanvasTransform(); renderCanvasNodes(); renderCanvasEdges(); }
    if(mapsLoaded) renderMapList();
    renderJournalList(); renderSessionList();
    clearDirty();
    if(!silent) openModal({ title:'Proyecto importado', fields:[], submitLabel:'Cerrar' });
  } catch(err){
    openModal({ title:'Error al importar', fields:[], submitLabel:'Cerrar', message: err.message || 'El archivo no corresponde a un proyecto válido.' });
  }
}
document.getElementById('importProjectBtn').addEventListener('click', ()=> document.getElementById('projectImportFile').click());
document.getElementById('exportProjectBtn').addEventListener('click', async ()=>{ await exportProject(); clearDirty(); });
document.getElementById('projectImportFile').addEventListener('change', async (e)=>{ const file = e.target.files[0]; if(file) await importProject(file); e.target.value=''; });


document.getElementById('folderBtn').addEventListener('click', connectFolder);
