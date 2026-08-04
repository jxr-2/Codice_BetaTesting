/* ui.js — Helpers de interfaz genéricos: modales, imágenes, tema visual. */
/* ========================= IMAGES ========================= */
function resizeImageFile(file, maxDim, quality){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          if(w > h){ h = Math.round(h * maxDim / w); w = maxDim; } else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


/* ========================= MODAL ========================= */
function renderField(f){
  const val = (f.value||'').toString().replace(/"/g,'&quot;');
  if(f.type === 'select'){
    return `<div class="field"><label>${f.label}</label><select id="mf-${f.key}">
      ${f.options.map(o=>`<option value="${o.value}" ${String(o.value)===String(f.value)?'selected':''}>${o.label}</option>`).join('')}
    </select></div>`;
  }
  if(f.type === 'textarea'){
    return `<div class="field"><label>${f.label}</label><textarea id="mf-${f.key}" placeholder="${f.placeholder||''}">${f.value||''}</textarea></div>`;
  }
  if(f.type === 'color'){
    return `<div class="field"><label>${f.label}</label><input type="color" id="mf-${f.key}" value="${f.value||'#c9922f'}"></div>`;
  }
  return `<div class="field"><label>${f.label}</label><input type="text" id="mf-${f.key}" value="${val}" placeholder="${f.placeholder||''}"></div>`;
}
function openModal(cfg){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = cfg.wide ? 'min(560px,92vw)' : '';
  box.innerHTML = `
    <div class="modal-title">${cfg.title}</div>
    ${cfg.message ? `<div class="modal-message">${cfg.message}</div>` : ''}
    <div class="modal-fields">${(cfg.fields||[]).map(renderField).join('')}</div>
    <div class="modal-actions">
      <div>${cfg.showDelete ? `<button class="btn-delete" id="modalDelete">${cfg.deleteLabel||'Eliminar'}</button>` : ''}</div>
      <div>
        <button class="btn-ghost" id="modalCancel">Cancelar</button>
        <button class="btn-brass" id="modalSubmit">${cfg.submitLabel||'Guardar'}</button>
      </div>
    </div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('modalSubmit').onclick = () => {
    const values = {};
    (cfg.fields||[]).forEach(f => { values[f.key] = document.getElementById('mf-'+f.key).value; });
    closeModal();
    if(cfg.onSubmit) cfg.onSubmit(values);
  };
  if(cfg.showDelete){
    document.getElementById('modalDelete').onclick = () => { closeModal(); if(cfg.onDelete) cfg.onDelete(); };
  }
  const firstInput = box.querySelector('input, select, textarea');
  if(firstInput) setTimeout(()=>firstInput.focus(), 30);
}
function openConfirm({title, message, onConfirm}){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = '';
  box.innerHTML = `
    <div class="modal-title">${title}</div>
    <div class="modal-message">${message}</div>
    <div class="modal-actions"><div></div><div>
      <button class="btn-ghost" id="modalCancel">Cancelar</button>
      <button class="btn-delete" id="modalConfirm">Eliminar</button>
    </div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('modalConfirm').onclick = () => { closeModal(); onConfirm(); };
}
function openUnsavedGuard(name, onSave, onDiscard){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = '';
  box.innerHTML = `
    <div class="modal-title">Cambios sin guardar</div>
    <div class="modal-message">Tenés cambios sin guardar en "${escapeHtml(name||'esta ficha')}". ¿Qué querés hacer?</div>
    <div class="modal-actions">
      <div><button class="btn-delete" id="guardDiscard">Descartar</button></div>
      <div><button class="btn-ghost" id="guardCancel">Cancelar</button><button class="btn-brass" id="guardSave">Guardar y continuar</button></div>
    </div>`;
  overlay.classList.add('open');
  document.getElementById('guardCancel').onclick = closeModal;
  document.getElementById('guardSave').onclick = async ()=>{ closeModal(); await onSave(); };
  document.getElementById('guardDiscard').onclick = async ()=>{ closeModal(); await onDiscard(); };
}
function closeModal(){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.animation = 'popOut 0.15s ease forwards';
  overlay.style.animation = 'fadeOut 0.15s ease forwards';
  setTimeout(()=>{ overlay.classList.remove('open'); box.style.animation=''; overlay.style.animation=''; }, 150);
}
document.getElementById('modalBox').addEventListener('keydown', (e)=>{
  if(e.key==='Enter' && e.target.tagName==='INPUT' && e.target.type!=='color'){
    e.preventDefault();
    const btn = document.getElementById('modalSubmit') || document.getElementById('guardSave') || document.getElementById('modalConfirm');
    if(btn) btn.click();
  }
});
function escapeHtml(str){
  return String(str||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
document.addEventListener('focusin', (e)=>{
  if(e.target.isContentEditable){ document.execCommand('defaultParagraphSeparator', false, 'p'); }
});


function defaultTheme(){ return { brass:'#c9922f', verdigris:'#7bb89d', parchment:'#e8dcc3' }; }
function applyTheme(){
  const t = Object.assign(defaultTheme(), worldMeta.theme||{});
  const root = document.documentElement.style;
  root.setProperty('--brass', t.brass); root.setProperty('--verdigris', t.verdigris); root.setProperty('--parchment', t.parchment);
}

function openSettings(){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = '';
  const theme = Object.assign(defaultTheme(), worldMeta.theme||{});
  box.innerHTML = `
    <div class="modal-title">Ajustes</div>
    <div class="modal-fields">
      <div class="field"><label>Color latón</label><input type="color" id="th-brass" value="${theme.brass}"></div>
      <div class="field"><label>Color verdigris</label><input type="color" id="th-verdigris" value="${theme.verdigris}"></div>
      <div class="field"><label>Color pergamino</label><input type="color" id="th-parchment" value="${theme.parchment}"></div>
    </div>
    <div class="modal-message">📁 Carpeta local: ${dirHandle ? 'conectada — '+escapeHtml(dirHandle.name) : 'no conectada'}.</div>
    <div class="modal-actions">
      <div><button class="btn-ghost" id="connectFolderBtn2" type="button">${dirHandle?'Cambiar carpeta':'Conectar carpeta'}</button></div>
      <div><button class="btn-ghost" id="modalCancel">Cerrar</button><button class="btn-brass" id="saveThemeBtn">Guardar paleta</button></div>
    </div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('connectFolderBtn2').onclick = connectFolder;
  document.getElementById('saveThemeBtn').onclick = async ()=>{
    worldMeta.theme = { brass: document.getElementById('th-brass').value, verdigris: document.getElementById('th-verdigris').value, parchment: document.getElementById('th-parchment').value };
    applyTheme(); await storeSet('world-meta', worldMeta); markDirty(); closeModal();
  };
}
document.getElementById('settingsBtn').addEventListener('click', openSettings);
