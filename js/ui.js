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
    label: '⚙ Códice (clásico)',
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
    label: '💍 Tierra Media',
    brass:'#8d7b5a', brassB:'#c8b88a', brassD:'#5c4e36',
    verd:'#6b9e74', verdB:'#8fcb99',
    parch:'#e6dcc0', parchD:'#c4b48c',
    text:'#e8dabb', textD:'#a89874',
    bgDeep:'#0c0f09', bgFrom:'#16200f', bgTo:'#050804',
    bgPanel:'rgba(15,19,10,0.95)', bgRaised:'rgba(24,30,16,0.96)', bgHover:'rgba(34,44,22,0.92)',
    topFrom:'#1a2411', topTo:'#0e160a', topBorder:'rgba(141,123,90,0.20)',
    borderBrass:'rgba(141,123,90,0.38)',
  },
  starwars: {
    label: '⚡ Galaxia Lejana',
    brass:'#5b9bbf', brassB:'#89ccee', brassD:'#2e6a8e',
    verd:'#e8c456', verdB:'#f5d97a',
    parch:'#d8e6f0', parchD:'#9ab8cc',
    text:'#d0e8f5', textD:'#7aaabb',
    bgDeep:'#03060e', bgFrom:'#060d1a', bgTo:'#010208',
    bgPanel:'rgba(4,8,18,0.95)', bgRaised:'rgba(8,14,28,0.97)', bgHover:'rgba(12,22,44,0.92)',
    topFrom:'#060d1c', topTo:'#03060f', topBorder:'rgba(91,155,191,0.22)',
    borderBrass:'rgba(91,155,191,0.35)',
  },
  assassin: {
    label: '🦅 Orden del Credo',
    brass:'#c0392b', brassB:'#e74c3c', brassD:'#922b21',
    verd:'#d4ac0d', verdB:'#f1c40f',
    parch:'#f0e6c8', parchD:'#c9b68a',
    text:'#ede0c4', textD:'#9e8a65',
    bgDeep:'#0a0706', bgFrom:'#160e0a', bgTo:'#050302',
    bgPanel:'rgba(18,10,8,0.95)', bgRaised:'rgba(28,16,12,0.97)', bgHover:'rgba(42,24,18,0.92)',
    topFrom:'#1e0f0b', topTo:'#100806', topBorder:'rgba(192,57,43,0.28)',
    borderBrass:'rgba(192,57,43,0.42)',
  },
  stalker: {
    label: '☢ La Zona',
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
    label: '⚛ Yermo Nuclear',
    brass:'#c8a432', brassB:'#f0ca58', brassD:'#8a6e1e',
    verd:'#7caf34', verdB:'#9dd452',
    parch:'#dcd4a0', parchD:'#b4ac74',
    text:'#d8cc94', textD:'#948e58',
    bgDeep:'#0c0b04', bgFrom:'#1a180a', bgTo:'#060502',
    bgPanel:'rgba(16,15,5,0.96)', bgRaised:'rgba(26,24,8,0.97)', bgHover:'rgba(38,36,12,0.93)',
    topFrom:'#201e08', topTo:'#100f04', topBorder:'rgba(200,164,50,0.24)',
    borderBrass:'rgba(200,164,50,0.40)',
  },
  skyrim: {
    label: '🐉 Tierras de Tamriel',
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
    label: '⚗ Escuela de Magia',
    brass:'#9e7b2c', brassB:'#d4aa50', brassD:'#6a5020',
    verd:'#5a3a7e', verdB:'#8060aa',
    parch:'#ecddc0', parchD:'#c8b490',
    text:'#e8d8b8', textD:'#a08860',
    bgDeep:'#0c0810', bgFrom:'#16101e', bgTo:'#060408',
    bgPanel:'rgba(16,10,22,0.95)', bgRaised:'rgba(26,16,34,0.97)', bgHover:'rgba(38,24,50,0.93)',
    topFrom:'#1e1428', topTo:'#100a18', topBorder:'rgba(158,123,44,0.24)',
    borderBrass:'rgba(158,123,44,0.40)',
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
      ${p.label}
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

  /* preset button style */
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .theme-preset-btn{
      background:var(--th-bg, #1a140e); border:2px solid transparent;
      color:var(--th-text, #e8dcc3); padding:10px 12px; border-radius:6px;
      font-size:12px; text-align:left; transition:border-color 0.15s;
    }
    .theme-preset-btn:hover{ border-color: var(--th-brass, #c9922f); }
    .theme-preset-btn.active{ border-color: var(--th-brass, #c9922f); box-shadow:0 0 8px rgba(0,0,0,0.5); }`;
  box.appendChild(styleEl);

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
