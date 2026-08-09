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
    brass:'#b89b51', brassB:'#e7d5a4', brassD:'#7b6538',
    verd:'#527a4a', verdB:'#8aa978',
    parch:'#e7decd', parchD:'#c7b791',
    text:'#ede4d6', textD:'#9f8b74',
    bgDeep:'#0b1208', bgFrom:'#1f2f17', bgTo:'#09110a',
    bgPanel:'rgba(20,26,14,0.95)', bgRaised:'rgba(32,42,24,0.96)', bgHover:'rgba(48,62,32,0.92)',
    topFrom:'#24321a', topTo:'#121b0f', topBorder:'rgba(184,155,81,0.22)',
    borderBrass:'rgba(184,155,81,0.38)',
  },
  starwars: {
    label: 'Star Wars',
    logo: 'assets/Imagenes/Temas/starwars.svg',
    brass:'#ffffff', brassB:'#ffe81f', brassD:'#b2b2b2',
    verd:'#00b8ff', verdB:'#6de0ff',
    parch:'#08121f', parchD:'#151f2d',
    text:'#f2f2f2', textD:'#8fa7c1',
    bgDeep:'#02040a', bgFrom:'#070c18', bgTo:'#04060f',
    bgPanel:'rgba(8,12,24,0.96)', bgRaised:'rgba(14,20,36,0.97)', bgHover:'rgba(24,32,56,0.93)',
    topFrom:'#09101d', topTo:'#050812', topBorder:'rgba(255,232,31,0.22)',
    borderBrass:'rgba(255,232,31,0.35)',
  },
  assassin: {
    label: 'Assassin\'s Creed',
    logo: 'assets/Imagenes/Temas/assassins_creed.png',
    brass:'#bf1f24', brassB:'#f7f7f7', brassD:'#7d1016',
    verd:'#b0b0b0', verdB:'#dedede',
    parch:'#ffffff', parchD:'#d8d8d8',
    text:'#111111', textD:'#4f4f4f',
    bgDeep:'#060608', bgFrom:'#0d0d0f', bgTo:'#050507',
    bgPanel:'rgba(255,255,255,0.96)', bgRaised:'rgba(245,245,245,0.96)', bgHover:'rgba(230,230,230,0.94)',
    topFrom:'#18181a', topTo:'#0c0c0d', topBorder:'rgba(191,31,36,0.24)',
    borderBrass:'rgba(191,31,36,0.40)',
  },
  stalker: {
    label: 'S.T.A.L.K.E.R.',
    logo: 'assets/Imagenes/Temas/stalker.png',
    brass:'#7a8a5a', brassB:'#a4b87a', brassD:'#505e38',
    verd:'#c4b454', verdB:'#e0cc72',
    parch:'#d2cdb0', parchD:'#a09a80',
    text:'#ccc8a8', textD:'#8a8464',
    bgDeep:'#080b06', bgFrom:'#111508', bgTo:'#040502',
    bgPanel:'rgba(10,13,7,0.96)', bgRaised:'rgba(16,20,10,0.97)', bgHover:'rgba(24,30,14,0.93)',
    topFrom:'#141a09', topTo:'#0a0e05', topBorder:'rgba(122,138,90,0.22)',
    borderBrass:'rgba(122,138,90,0.38)',
  },
  fallout: {
    label: 'Fallout (Vault-Tec)',
    logo: 'assets/Imagenes/Temas/fallout.png',
    brass:'#ffd800', brassB:'#ffff6d', brassD:'#b2a500',
    verd:'#1c4f8a', verdB:'#5ca6ff',
    parch:'#c4d7f2', parchD:'#9ab6d4',
    text:'#f1f8ff', textD:'#aac4dd',
    bgDeep:'#031024', bgFrom:'#0a1a3d', bgTo:'#061129',
    bgPanel:'rgba(10,20,45,0.94)', bgRaised:'rgba(16,28,60,0.96)', bgHover:'rgba(20,35,75,0.92)',
    topFrom:'#0a1b44', topTo:'#051025', topBorder:'rgba(255,216,0,0.24)',
    borderBrass:'rgba(255,216,0,0.40)',
  },
  skyrim: {
    label: 'Skyrim',
    logo: 'assets/Imagenes/Temas/skyrim.svg',
    brass:'#7890b4', brassB:'#a4b8d8', brassD:'#4e6890',
    verd:'#9070b0', verdB:'#b898d4',
    parch:'#dce4f0', parchD:'#b0bcd4',
    text:'#d8e4f8', textD:'#8898b8',
    bgDeep:'#060810', bgFrom:'#0e1220', bgTo:'#020308',
    bgPanel:'rgba(8,10,18,0.96)', bgRaised:'rgba(14,18,30,0.97)', bgHover:'rgba(20,26,44,0.93)',
    topFrom:'#10162a', topTo:'#070b18', topBorder:'rgba(120,144,180,0.24)',
    borderBrass:'rgba(120,144,180,0.36)',
  },
  hogwarts: {
    label: 'Hogwarts',
    logo: 'assets/Imagenes/Temas/hogwarts.png',
    brass:'#a12b0f', brassB:'#f0b429', brassD:'#7b1f09',
    verd:'#87191f', verdB:'#b94a1f',
    parch:'#f3dfb7', parchD:'#ceb77b',
    text:'#f7edde', textD:'#aa7f3b',
    bgDeep:'#15090b', bgFrom:'#321819', bgTo:'#12050a',
    bgPanel:'rgba(48,14,16,0.95)', bgRaised:'rgba(55,18,18,0.97)', bgHover:'rgba(72,20,22,0.93)',
    topFrom:'#3a1513', topTo:'#220b0b', topBorder:'rgba(240,180,41,0.24)',
    borderBrass:'rgba(240,180,41,0.40)',
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
      style="--th-brass:${p.brassB}; --th-verd:${p.verdB}; --th-bg:${p.bgFrom}; --th-text:${p.parch};">
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
