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
  overlay.onclick = (e) => { if(e.target === overlay) closeModal(); };
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
  overlay.onclick = (e) => { if(e.target === overlay) closeModal(); };
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
  overlay.onclick = (e) => { if(e.target === overlay) closeModal(); };
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


/* ========================= THEMES ========================= */
const THEME_PRESETS = {
  codice: {
    label: 'Códice (clásico)',
    logo: 'assets/Imagenes/Temas/codice.png',
    brass:'#c9922f', brassB:'#f1d27a', brassD:'#8b6b33',
    verd:'#7bb89d', verdB:'#9cd8c6',
    parch:'#e8dcc3', parchD:'#c9b790',
    text:'#efe3cc', textD:'#b9a98b',
    bgDeep:'#0d0906', bgFrom:'#1e160f', bgTo:'#060402',
    bgPanel:'rgba(20,14,10,0.94)', bgRaised:'rgba(32,24,18,0.96)', bgHover:'rgba(44,34,26,0.92)',
    topFrom:'#241a10', topTo:'#1a130c', topBorder:'rgba(201,146,47,0.16)',
    borderBrass:'rgba(201,146,47,0.35)',
  },
  lotr: {
    label: 'Tierra Media',
    logo: 'assets/Imagenes/Temas/lotr.png',
    brass:'#b89b51', brassB:'#d4af5e', brassD:'#7b6538',
    verd:'#6b9a6f', verdB:'#8ab878',
    parch:'#c9bfa8', parchD:'#3a3a38',
    text:'#ddd5c8', textD:'#9a8f80',
    bgDeep:'#0b0f08', bgFrom:'#15191f', bgTo:'#08090a',
    bgPanel:'rgba(18,22,15,0.96)', bgRaised:'rgba(26,30,20,0.96)', bgHover:'rgba(38,44,28,0.92)',
    topFrom:'#1a1f15', topTo:'#0e1109', topBorder:'rgba(184,155,81,0.26)',
    borderBrass:'rgba(184,155,81,0.42)',
  },
  starwars: {
    label: 'Star Wars',
    logo: 'assets/Imagenes/Temas/starwars.svg',
    brass:'#ffffff', brassB:'#ffe81f', brassD:'#d0d0d0',
    verd:'#00d9ff', verdB:'#66f0ff',
    parch:'#1a2942', parchD:'#0d1620',
    text:'#ffffff', textD:'#e8f0ff',
    bgDeep:'#02040a', bgFrom:'#0a1424', bgTo:'#050810',
    bgPanel:'rgba(10,15,28,0.96)', bgRaised:'rgba(16,22,40,0.97)', bgHover:'rgba(26,35,56,0.93)',
    topFrom:'#0b1428', topTo:'#050810', topBorder:'rgba(255,232,31,0.3)',
    borderBrass:'rgba(255,232,31,0.45)',
  },
  assassin: {
    label: 'Assassin\'s Creed',
    logo: 'assets/Imagenes/Temas/assassins_creed.png',
    brass:'#bf1f24', brassB:'#ff4d52', brassD:'#7d1016',
    verd:'#b0b0b0', verdB:'#e0e0e0',
    parch:'#e8e8e8', parchD:'#2a2a2c',
    text:'#f0f0f0', textD:'#a8a8a8',
    bgDeep:'#0a0a0c', bgFrom:'#141416', bgTo:'#080809',
    bgPanel:'rgba(20,20,22,0.96)', bgRaised:'rgba(30,30,32,0.96)', bgHover:'rgba(45,45,48,0.92)',
    topFrom:'#1a1a1c', topTo:'#0d0d0e', topBorder:'rgba(191,31,36,0.28)',
    borderBrass:'rgba(191,31,36,0.45)',
  },
  stalker: {
    label: 'S.T.A.L.K.E.R.',
    logo: 'assets/Imagenes/Temas/stalker.png',
    brass:'#8a9a6a', brassB:'#c0d890', brassD:'#5a7038',
    verd:'#d4c458', verdB:'#f0e88a',
    parch:'#2a2820', parchD:'#151310',
    text:'#e8e4d0', textD:'#b8b0a0',
    bgDeep:'#080b06', bgFrom:'#14180c', bgTo:'#040502',
    bgPanel:'rgba(14,16,8,0.96)', bgRaised:'rgba(22,26,12,0.97)', bgHover:'rgba(32,40,16,0.93)',
    topFrom:'#1a2010', topTo:'#0d1206', topBorder:'rgba(154,170,90,0.28)',
    borderBrass:'rgba(154,170,90,0.42)',
  },
  fallout: {
    label: 'Fallout (Vault-Tec)',
    logo: 'assets/Imagenes/Temas/fallout.png',
    brass:'#e6c200', brassB:'#f0e34d', brassD:'#9a8800',
    verd:'#2d5fa3', verdB:'#4a90d9',
    parch:'#c4d7f2', parchD:'#9ab6d4',
    text:'#e8f0ff', textD:'#9ab8d4',
    bgDeep:'#031024', bgFrom:'#0a1a3d', bgTo:'#061129',
    bgPanel:'rgba(10,20,45,0.94)', bgRaised:'rgba(16,28,60,0.96)', bgHover:'rgba(20,35,75,0.92)',
    topFrom:'#0a1b44', topTo:'#051025', topBorder:'rgba(230,194,0,0.22)',
    borderBrass:'rgba(230,194,0,0.38)',
  },
  skyrim: {
    label: 'Skyrim',
    logo: 'assets/Imagenes/Temas/skyrim.svg',
    brass:'#8fa4c8', brassB:'#b8d0e8', brassD:'#5a7a9a',
    verd:'#a488c4', verdB:'#d0a8e8',
    parch:'#1e2d42', parchD:'#0f1623',
    text:'#e0e8f8', textD:'#a8b8d8',
    bgDeep:'#060810', bgFrom:'#0f1828', bgTo:'#020308',
    bgPanel:'rgba(12,16,26,0.96)', bgRaised:'rgba(18,24,38,0.97)', bgHover:'rgba(28,38,56,0.93)',
    topFrom:'#121a32', topTo:'#080f1c', topBorder:'rgba(143,164,200,0.28)',
    borderBrass:'rgba(143,164,200,0.42)',
  },
  hogwarts: {
    label: 'Hogwarts',
    logo: 'assets/Imagenes/Temas/hogwarts.png',
    brass:'#d4a644', brassB:'#f0c86a', brassD:'#b8903a',
    verd:'#9a7a5a', verdB:'#c0a070',
    parch:'#2a2620', parchD:'#151310',
    text:'#f0f0f0', textD:'#d0c0b0',
    bgDeep:'#0a0805', bgFrom:'#15110d', bgTo:'#080604',
    bgPanel:'rgba(18,14,12,0.96)', bgRaised:'rgba(26,20,18,0.96)', bgHover:'rgba(40,30,26,0.92)',
    topFrom:'#191512', topTo:'#0d0a08', topBorder:'rgba(180,160,140,0.24)',
    borderBrass:'rgba(212,166,68,0.42)',
  },
};

function defaultTheme(){ return THEME_PRESETS.codice; }

function applyTheme(){
  const preset = Object.assign({}, defaultTheme(), worldMeta.theme||{});
  const r = document.documentElement.style;
  r.setProperty('--brass',        preset.brass);
  r.setProperty('--brass-bright', preset.brassB);
  r.setProperty('--brass-dim',    preset.brassD);
  r.setProperty('--verdigris',    preset.verd);
  r.setProperty('--verdigris-bright', preset.verdB);
  r.setProperty('--parchment',    preset.parch);
  r.setProperty('--parchment-dim',preset.parchD);
  r.setProperty('--text',         preset.text);
  r.setProperty('--text-dim2',    preset.textD);
  r.setProperty('--bg-deep',      preset.bgDeep);
  r.setProperty('--bg-body-from', preset.bgFrom);
  r.setProperty('--bg-body-to',   preset.bgTo);
  r.setProperty('--bg-panel',     preset.bgPanel);
  r.setProperty('--bg-panel-raised', preset.bgRaised);
  r.setProperty('--bg-panel-hover',  preset.bgHover);
  r.setProperty('--topbar-from',   preset.topFrom);
  r.setProperty('--topbar-to',     preset.topTo);
  r.setProperty('--topbar-border', preset.topBorder);
  r.setProperty('--border-brass',  preset.borderBrass);
}

function openSettings(){
  const overlay = document.getElementById('modalOverlay');
  const box     = document.getElementById('modalBox');
  box.style.width = 'min(520px,92vw)';
  const currentPresetKey = worldMeta.theme?._preset || 'codice';
  const isCustom = !worldMeta.theme?._preset;

  const presetGrid = Object.entries(THEME_PRESETS).map(([k, p])=>`
    <button type="button" class="theme-preset-btn ${k===currentPresetKey && !isCustom ?'active':''}"
      data-preset="${k}"
      style="--th-brass:${p.brassB}; --th-verd:${p.verdB}; --th-bg:${p.bgFrom}; --th-text:${p.text};">
      <img class="theme-preset-logo" src="${p.logo}" alt="">
      <span>${p.label}</span>
    </button>`).join('');

  const curr = Object.assign({}, defaultTheme(), worldMeta.theme||{});

  box.innerHTML = `
    <div class="modal-title">Ajustes</div>
    <div style="margin-bottom:14px;">
      <div class="modal-message" style="margin-bottom:10px;">Tema visual</div>
      <div id="presetGrid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:18px;">
        ${presetGrid}
      </div>
      <div class="modal-message" style="margin-bottom:8px;">Personalizado (anula el preset)</div>
      <div class="modal-fields" id="customFields">
        <div class="field"><label>Acento principal</label><input type="color" id="th-brass" value="${curr.brass}"></div>
        <div class="field"><label>Acento secundario</label><input type="color" id="th-verd" value="${curr.verd}"></div>
        <div class="field"><label>Superficie (pergamino)</label><input type="color" id="th-parch" value="${curr.parch}"></div>
      </div>
    </div>
    <div class="modal-message">📁 Carpeta local: ${dirHandle ? 'conectada — '+escapeHtml(dirHandle.name) : 'no conectada'}.</div>
    <div class="modal-actions">
      <div><button class="btn-ghost" id="connectFolderBtn2" type="button">${dirHandle?'Cambiar carpeta':'Conectar carpeta'}</button></div>
      <div>
        <button class="btn-ghost" id="modalCancel">Cerrar</button>
        <button class="btn-brass" id="saveThemeBtn">Guardar</button>
      </div>
    </div>`;

  overlay.classList.add('open');
  overlay.onclick = (e) => { if(e.target === overlay) closeModal(); };
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('connectFolderBtn2').onclick = connectFolder;

  box.querySelectorAll('.theme-preset-btn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const key = btn.dataset.preset;
      const preset = THEME_PRESETS[key];
      worldMeta.theme = { ...preset, _preset: key };
      applyTheme();
      await storeSet('world-meta', worldMeta); markDirty();
      box.querySelectorAll('.theme-preset-btn').forEach(b=>b.classList.toggle('active', b===btn));
      // update custom pickers to reflect chosen preset
      document.getElementById('th-brass').value = preset.brass;
      document.getElementById('th-verd').value  = preset.verd;
      document.getElementById('th-parch').value = preset.parch;
    });
  });

  document.getElementById('saveThemeBtn').onclick = async ()=>{
    const existingPreset = worldMeta.theme?._preset || null;
    worldMeta.theme = Object.assign({}, worldMeta.theme||{}, {
      brass:  document.getElementById('th-brass').value,
      brassB: document.getElementById('th-brass').value,
      verd:   document.getElementById('th-verd').value,
      verdB:  document.getElementById('th-verd').value,
      parch:  document.getElementById('th-parch').value,
      parchD: document.getElementById('th-parch').value,
      _preset: existingPreset,
    });
    applyTheme();
    await storeSet('world-meta', worldMeta); markDirty();
    closeModal();
  };
}
document.getElementById('settingsBtn').addEventListener('click', openSettings);
