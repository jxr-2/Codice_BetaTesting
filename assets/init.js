/* init.js — Arranque final: se ejecuta después de que todos los módulos ya definieron
   sus funciones y adjuntaron sus listeners (mismo comportamiento que el
   bloque INIT original de index.html). */
renderWsTypeOptions('personaje');
renderWsFolderOptions(null);
loadWorld();
loadExtras();

/* ========================= AUTOSAVE ========================= */
(function setupAutosave(){
  const INTERVAL_MS = 45000; // every 45 seconds
  let lastSavedDirty = false;

  setInterval(async () => {
    // Only autosave the ficha editor — it's the only place with unsaved rich content
    if(!wsDirty) return;
    // Don't autosave if a modal is open (user might be in the middle of a decision)
    if(document.getElementById('modalOverlay').classList.contains('open')) return;
    // Only autosave if a ficha is currently being edited
    if(fichasMode !== 'editor' || !currentEntryId) return;

    showToast('Autoguardando…', 1800, 'autosave');
    try{
      await saveCurrentWorkspace();
      showToast('Progreso guardado ✓', 2000, 'autosave');
    }catch(e){
      console.warn('Autosave failed:', e);
    }
  }, INTERVAL_MS);
})();
