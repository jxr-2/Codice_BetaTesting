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

/* ========================= BLOQUES DE IMAGEN (redimensionar/alinear) =========================
   Sistema compartido entre Fichas, Diario y Bitácora. Estructura guardada:
   <div class="img-block" contenteditable="false">
     <div class="img-toolbar">...</div>
     <span class="img-frame" style="width:X%;margin:...">
       <img>
       <span class="img-resize-handle img-resize-nw|ne|sw|se"></span> x4
     </span>
   </div>
   El "frame" (no la img) es lo que se alinea/redimensiona, para que las esquinas
   queden siempre pegadas a la imagen sin importar cómo esté alineada. */
function insertNodeAtCursor(container, node){
  const sel = window.getSelection();
  if(sel && sel.rangeCount && container.contains(sel.anchorNode)){
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    container.appendChild(node);
  }
}
function startImageResize(e, frame, corner, onChange){
  e.preventDefault(); e.stopPropagation();
  const editable = frame.closest('[contenteditable]');
  const refWidth = (editable || frame.parentElement).clientWidth || 1;
  const startX = e.clientX;
  const startPercent = parseFloat(frame.style.width) || 60;
  const sign = (corner === 'nw' || corner === 'sw') ? -1 : 1;
  function onMove(ev){
    const deltaPercent = ((ev.clientX - startX) * sign / refWidth) * 100;
    frame.style.width = Math.min(100, Math.max(15, startPercent + deltaPercent)) + '%';
  }
  function onUp(){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if(onChange) onChange();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
function wireImgFrameHandles(frame, onChange){
  /* Los handles pueden ya existir en el HTML guardado (se serializan con el resto del
     bloque) pero sin listeners propios — hay que conectarlos de nuevo cada vez que el
     bloque se carga desde HTML, no solo crearlos la primera vez. */
  if(frame.querySelectorAll('.img-resize-handle').length === 0){
    ['nw','ne','sw','se'].forEach(corner=>{
      const handle = document.createElement('span');
      handle.className = 'img-resize-handle img-resize-'+corner;
      frame.appendChild(handle);
    });
  }
  frame.querySelectorAll('.img-resize-handle').forEach(handle=>{
    const corner = ['nw','ne','sw','se'].find(c=> handle.classList.contains('img-resize-'+c));
    handle.addEventListener('mousedown', (e)=> startImageResize(e, frame, corner, onChange));
  });
}
function wireImgBlockToolbar(wrapper, frame, toolbar, onChange){
  toolbar.querySelectorAll('[data-align]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const a = btn.dataset.align;
      if(a==='left')  { frame.style.marginLeft='0'; frame.style.marginRight='auto'; frame.style.display='block'; }
      else if(a==='center'){ frame.style.margin='8px auto'; frame.style.display='block'; }
      else if(a==='right') { frame.style.marginLeft='auto'; frame.style.marginRight='0'; frame.style.display='block'; }
      else if(a==='full')  { frame.style.width='100%'; frame.style.margin='8px 0'; }
      if(onChange) onChange();
    });
  });
  const removeBtn = toolbar.querySelector('[data-remove]');
  if(removeBtn){
    removeBtn.addEventListener('click', ()=>{ wrapper.remove(); if(onChange) onChange(); });
  }
}
function createImageBlock(src, onChange){
  const wrapper = document.createElement('div');
  wrapper.className = 'img-block';
  wrapper.contentEditable = 'false';

  const toolbar = document.createElement('div');
  toolbar.className = 'img-toolbar';
  toolbar.innerHTML = `
    <button data-align="left"   title="Izquierda">◀</button>
    <button data-align="center" title="Centro">▬</button>
    <button data-align="right"  title="Derecha">▶</button>
    <button data-align="full"   title="Ancho completo">⇔</button>
    <button data-remove title="Eliminar">✕</button>`;

  const frame = document.createElement('span');
  frame.className = 'img-frame';
  frame.style.width = '60%';
  frame.style.margin = '8px auto';
  frame.style.display = 'block';

  const img = document.createElement('img');
  img.src = src;
  img.draggable = false;
  frame.appendChild(img);
  wireImgFrameHandles(frame, onChange);
  wireImgBlockToolbar(wrapper, frame, toolbar, onChange);

  wrapper.appendChild(toolbar);
  wrapper.appendChild(frame);
  return wrapper;
}
/* Conecta los controles de un .img-block ya presente en el DOM (cargado desde HTML guardado).
   Si es un bloque viejo (imagen suelta con width/margin inline, sin .img-frame ni esquinas),
   lo migra a la estructura nueva en memoria sin tocar lo guardado hasta el próximo cambio. */
function wireImageBlock(wrapper, onChange){
  const img = wrapper.querySelector('img');
  if(!img) return;
  let frame = wrapper.querySelector('.img-frame');
  if(!frame){
    frame = document.createElement('span');
    frame.className = 'img-frame';
    frame.style.width = img.style.width || '60%';
    frame.style.margin = img.style.margin || '8px auto';
    frame.style.display = 'block';
    img.parentNode.insertBefore(frame, img);
    frame.appendChild(img);
    img.style.width = ''; img.style.margin = ''; img.style.display = '';
  }
  wireImgFrameHandles(frame, onChange);
  const toolbar = wrapper.querySelector('.img-toolbar');
  if(toolbar){
    const oldRange = toolbar.querySelector('input[type=range]');
    if(oldRange) oldRange.remove();
    wireImgBlockToolbar(wrapper, frame, toolbar, onChange);
  }
}
function wireImageBlocksIn(container, onChange){
  container.querySelectorAll('.img-block').forEach(wrapper=> wireImageBlock(wrapper, onChange));
}

/* ========================= IMPRESIÓN (ventana compartida) ========================= */
function openPrintWindow(html){
  const win = window.open('', '_blank');
  if(!win) return;
  win.document.write(html);
  win.document.close(); win.focus();
  setTimeout(()=>win.print(), 400);
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
    ink:'#231914',
    danger:'#c1604a', dangerB:'#e48d75',
    bgDeep:'#0d0906', bgFrom:'#1e160f', bgTo:'#060402',
    bgPanel:'rgba(20,14,10,0.94)', bgRaised:'rgba(32,24,18,0.96)', bgHover:'rgba(44,34,26,0.92)',
    topFrom:'#241a10', topTo:'#1a130c', topBorder:'rgba(201,146,47,0.16)',
    borderBrass:'rgba(201,146,47,0.35)',
    bgGridOpacity: 0.04, bgBlur: 0,
  },
  lotr: {
    label: 'Tierra Media',
    logo: 'assets/Imagenes/Temas/lotr.png',
    brass:'#b89b51', brassB:'#d4af5e', brassD:'#7b6538',
    verd:'#6b9a6f', verdB:'#8ab878',
    parch:'#c9bfa8', parchD:'#3a3a38',
    text:'#ddd5c8', textD:'#9a8f80',
    ink:'#2a2620',
    danger:'#b85a3a', dangerB:'#d87858',
    bgDeep:'#0b0f08', bgFrom:'#15191f', bgTo:'#08090a',
    bgPanel:'rgba(18,22,15,0.96)', bgRaised:'rgba(26,30,20,0.96)', bgHover:'rgba(38,44,28,0.92)',
    topFrom:'#1a1f15', topTo:'#0e1109', topBorder:'rgba(184,155,81,0.26)',
    borderBrass:'rgba(184,155,81,0.42)',
    bgGridOpacity: 0.03, bgBlur: 0,
  },
  starwars: {
    label: 'Star Wars',
    logo: 'assets/Imagenes/Temas/starwars.svg',
    brass:'#ffffff', brassB:'#ffe81f', brassD:'#d0d0d0',
    verd:'#00d9ff', verdB:'#66f0ff',
    parch:'#1a2942', parchD:'#0d1620',
    text:'#ffffff', textD:'#e8f0ff',
    ink:'#0d1620',
    danger:'#ff4d4d', dangerB:'#ff7878',
    bgDeep:'#02040a', bgFrom:'#0a1424', bgTo:'#050810',
    bgPanel:'rgba(10,15,28,0.96)', bgRaised:'rgba(16,22,40,0.97)', bgHover:'rgba(26,35,56,0.93)',
    topFrom:'#0b1428', topTo:'#050810', topBorder:'rgba(255,232,31,0.3)',
    borderBrass:'rgba(255,232,31,0.45)',
    bgGridOpacity: 0.05, bgBlur: 2,
  },
  assassin: {
    label: 'Assassin\'s Creed',
    logo: 'assets/Imagenes/Temas/assassins_creed.png',
    brass:'#bf1f24', brassB:'#ff4d52', brassD:'#7d1016',
    verd:'#b0b0b0', verdB:'#e0e0e0',
    parch:'#e8e8e8', parchD:'#2a2a2c',
    text:'#f0f0f0', textD:'#a8a8a8',
    ink:'#1a1a1c',
    danger:'#ff4d4d', dangerB:'#ff7878',
    bgDeep:'#0a0a0c', bgFrom:'#141416', bgTo:'#080809',
    bgPanel:'rgba(20,20,22,0.96)', bgRaised:'rgba(30,30,32,0.96)', bgHover:'rgba(45,45,48,0.92)',
    topFrom:'#1a1a1c', topTo:'#0d0d0e', topBorder:'rgba(191,31,36,0.28)',
    borderBrass:'rgba(191,31,36,0.45)',
    bgGridOpacity: 0.02, bgBlur: 0,
  },
  stalker: {
    label: 'S.T.A.L.K.E.R.',
    logo: 'assets/Imagenes/Temas/stalker.png',
    brass:'#8a9a6a', brassB:'#c0d890', brassD:'#5a7038',
    verd:'#d4c458', verdB:'#f0e88a',
    parch:'#2a2820', parchD:'#151310',
    text:'#e8e4d0', textD:'#b8b0a0',
    ink:'#151310',
    danger:'#c87838', dangerB:'#e89858',
    bgDeep:'#080b06', bgFrom:'#14180c', bgTo:'#040502',
    bgPanel:'rgba(14,16,8,0.96)', bgRaised:'rgba(22,26,12,0.97)', bgHover:'rgba(32,40,16,0.93)',
    topFrom:'#1a2010', topTo:'#0d1206', topBorder:'rgba(154,170,90,0.28)',
    borderBrass:'rgba(154,170,90,0.42)',
    bgGridOpacity: 0.05, bgBlur: 1,
  },
  fallout: {
    label: 'Fallout (Vault-Tec)',
    logo: 'assets/Imagenes/Temas/fallout.png',
    brass:'#e6c200', brassB:'#f0e34d', brassD:'#9a8800',
    verd:'#2d5fa3', verdB:'#4a90d9',
    parch:'#c4d7f2', parchD:'#9ab6d4',
    text:'#e8f0ff', textD:'#9ab8d4',
    ink:'#061129',
    danger:'#ff5a3a', dangerB:'#ff7858',
    bgDeep:'#031024', bgFrom:'#0a1a3d', bgTo:'#061129',
    bgPanel:'rgba(10,20,45,0.94)', bgRaised:'rgba(16,28,60,0.96)', bgHover:'rgba(20,35,75,0.92)',
    topFrom:'#0a1b44', topTo:'#051025', topBorder:'rgba(230,194,0,0.22)',
    borderBrass:'rgba(230,194,0,0.38)',
    bgGridOpacity: 0.04, bgBlur: 0,
  },
  skyrim: {
    label: 'Skyrim',
    logo: 'assets/Imagenes/Temas/skyrim.svg',
    brass:'#c9a855', brassB:'#e8c46a', brassD:'#8b7a3a',
    verd:'#7eb8d4', verdB:'#a8d8f0',
    parch:'#2a3d52', parchD:'#0f1623',
    text:'#e8f0f8', textD:'#a8c0d8',
    ink:'#0a0e14',
    danger:'#d8534a', dangerB:'#f07060',
    bgDeep:'#040609', bgFrom:'#0d1520', bgTo:'#06080c',
    bgPanel:'rgba(15,18,28,0.96)', bgRaised:'rgba(22,28,42,0.97)', bgHover:'rgba(32,42,60,0.93)',
    topFrom:'#15202a', topTo:'#0a0f18', topBorder:'rgba(201,168,85,0.32)',
    borderBrass:'rgba(201,168,85,0.48)',
    bgGridOpacity: 0.04, bgBlur: 1.5,
  },
  hogwarts: {
    label: 'Hogwarts',
    logo: 'assets/Imagenes/Temas/hogwarts.png',
    brass:'#d4a644', brassB:'#f0c86a', brassD:'#b8903a',
    verd:'#9a7a5a', verdB:'#c0a070',
    parch:'#2a2620', parchD:'#151310',
    text:'#f0f0f0', textD:'#d0c0b0',
    ink:'#151310',
    danger:'#c84838', dangerB:'#e86858',
    bgDeep:'#0a0805', bgFrom:'#15110d', bgTo:'#080604',
    bgPanel:'rgba(18,14,12,0.96)', bgRaised:'rgba(26,20,18,0.96)', bgHover:'rgba(40,30,26,0.92)',
    topFrom:'#191512', topTo:'#0d0a08', topBorder:'rgba(180,160,140,0.24)',
    borderBrass:'rgba(212,166,68,0.42)',
    bgGridOpacity: 0.04, bgBlur: 0,
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
  r.setProperty('--ink',          preset.ink);
  r.setProperty('--danger',       preset.danger);
  r.setProperty('--danger-bright',preset.dangerB);
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
  r.setProperty('--bg-grid-opacity', preset.bgGridOpacity ?? 0.04);
  r.setProperty('--bg-blur', (preset.bgBlur ?? 0) + 'px');

  const brandLogo = document.getElementById('brandLogo');
  const brandText = document.getElementById('brandText');
  if(worldMeta.logoDataUrl){
    brandLogo.src = worldMeta.logoDataUrl;
    brandLogo.style.display = 'block';
    brandText.style.display = 'none';
  } else {
    brandLogo.style.display = 'none';
    brandText.style.display = 'block';
  }
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
        <div class="field"><label>Tinta (texto oscuro)</label><input type="color" id="th-ink" value="${curr.ink}"></div>
        <div class="field"><label>Peligro (borrar)</label><input type="color" id="th-danger" value="${curr.danger}"></div>
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <div class="modal-message" style="margin-bottom:8px;">Logo personalizado</div>
      <div class="modal-fields">
        <div class="field">
          <label>Importar logo</label>
          <input type="file" id="logoFileInput" accept="image/*" style="font-size:13px;">
        </div>
        ${worldMeta.logoDataUrl ? `<div class="field"><label>Vista previa</label><img src="${worldMeta.logoDataUrl}" style="max-width:60px; max-height:60px; border-radius:4px; border:1px solid var(--border-brass);"></div>` : ''}
        ${worldMeta.logoDataUrl ? `<div class="field"><button class="btn-delete" id="removeLogoBtn" type="button" style="width:100%;">Eliminar logo</button></div>` : ''}
      </div>
    </div>
    <div class="modal-message"><svg class="icon"><use href="#i-folder"/></svg> Carpeta local: ${dirHandle ? 'conectada — '+escapeHtml(dirHandle.name) : 'no conectada'}.</div>
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
      document.getElementById('th-ink').value   = preset.ink;
      document.getElementById('th-danger').value = preset.danger;
    });

  const logoInput = document.getElementById('logoFileInput');
  if(logoInput){
    logoInput.addEventListener('change', async (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const resized = await resizeImageFile(file, 128, 0.8);
      worldMeta.logoDataUrl = resized;
      await storeSet('world-meta', worldMeta); markDirty();
      closeModal();
      openSettings();
    });
  }

  const removeLogoBtn = document.getElementById('removeLogoBtn');
  if(removeLogoBtn){
    removeLogoBtn.addEventListener('click', async ()=>{
      worldMeta.logoDataUrl = null;
      await storeSet('world-meta', worldMeta); markDirty();
      closeModal();
      openSettings();
    });
  }
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
      ink:    document.getElementById('th-ink').value,
      danger: document.getElementById('th-danger').value,
      _preset: existingPreset,
    });
    applyTheme();
    await storeSet('world-meta', worldMeta); markDirty();
    closeModal();
  };
}
document.getElementById('settingsBtn').addEventListener('click', openSettings);

function openHelp(){
  openModal({
    title: 'Acerca de Códice',
    message: `
      <div style="line-height:1.7;">
        <p><strong>Códice</strong> es una herramienta de worldbuilding para RPGs y narrativa.</p>
        <p><strong>Estado:</strong> Beta testing en progreso. Si encontrás bugs o tenés sugerencias, por favor reportalas.</p>
        <p><strong>Changelog reciente:</strong></p>
        <ul style="margin-left:18px; margin-top:8px; margin-bottom:12px;">
          <li>Sistema de temas con 8 presets (Códice, LOTR, Star Wars, Assassin's Creed, S.T.A.L.K.E.R., Fallout, Skyrim, Hogwarts)</li>
          <li>Logo personalizable importable</li>
          <li>Fondo con grilla sutil y control de blur</li>
          <li>Navegación reestructurada con secciones primarias directas</li>
          <li>Pantalla de carga al inicio</li>
          <li>Grimorio con base de datos completa en español</li>
          <li>En <a href="https://jxr-2.github.io/Codice_BetaTesting" target="_blank" style="color:var(--verdigris); text-decoration:underline;">jxr-2.github.io/Codice_BetaTesting</a> podes encontrar la última versión en desarrollo.</li>
        </ul>
        <p><strong>Créditos:</strong></p>
        <p style="margin-top:8px;">Desarrollado con ❤️ para la comunidad de RPG.</p>
      </div>
    `,
    fields: [],
    submitLabel: 'Cerrar',
    onSubmit: closeModal
  });
}
document.getElementById('helpBtn').addEventListener('click', openHelp);

/* ========================= TOOLBAR DE TEXTO ENRIQUECIDO ========================= */
/* Compartido entre Diario y Bitácora: los botones ya están en el HTML estático de cada
   editor (data-rt-cmd / data-rt-block / data-rt-size), esta función solo los conecta. */
function wireRichTextToolbar(toolbarEl, contentEl, onChange){
  if(!toolbarEl || !contentEl) return;
  toolbarEl.querySelectorAll('[data-rt-cmd]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      contentEl.focus();
      if(btn.dataset.rtCmd === 'hr') document.execCommand('insertHorizontalRule');
      else document.execCommand(btn.dataset.rtCmd);
      if(onChange) onChange();
    });
  });
  const blockSelect = toolbarEl.querySelector('[data-rt-block]');
  if(blockSelect){
    blockSelect.addEventListener('change', ()=>{
      contentEl.focus();
      document.execCommand('formatBlock', false, blockSelect.value);
      if(onChange) onChange();
    });
  }
  const sizeSelect = toolbarEl.querySelector('[data-rt-size]');
  if(sizeSelect){
    sizeSelect.addEventListener('change', ()=>{
      contentEl.focus();
      document.execCommand('fontSize', false, sizeSelect.value);
      if(onChange) onChange();
    });
  }
}

/* ========================= BÚSQUEDA GLOBAL ========================= */
function stripHtml(html){ return String(html||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
function openGlobalSearch(){
  document.getElementById('searchOverlay').classList.add('open');
  const input = document.getElementById('globalSearchInput');
  input.value = '';
  renderGlobalSearchResults('');
  setTimeout(()=> input.focus(), 30);
}
function closeGlobalSearch(){ document.getElementById('searchOverlay').classList.remove('open'); }
function renderGlobalSearchResults(q){
  const el = document.getElementById('globalSearchResults');
  const query = q.trim().toLowerCase();
  if(!query){ el.innerHTML = '<div class="hint" style="padding:8px;">Escribí para buscar en fichas, diario, bitácora y mapas.</div>'; return; }
  const results = [];
  entriesIndex.forEach(e=>{
    const hay = `${e.name||''} ${e.summary||''} ${(e.tags||[]).join(' ')}`.toLowerCase();
    if(hay.includes(query)) results.push({ kind:'ficha', id:e.id, icon:'<svg class="icon"><use href="#i-cards"/></svg>', title: e.name||'Sin nombre', sub: worldMeta.folders.find(f=>f.id===e.folderId)?.name || 'Ficha' });
  });
  journalEntries.forEach(j=>{
    const hay = `${j.title||''} ${stripHtml(j.content)}`.toLowerCase();
    if(hay.includes(query)) results.push({ kind:'journal', id:j.id, icon:'<svg class="icon"><use href="#i-book"/></svg>', title: j.title||'Sin título', sub:'Diario' });
  });
  sessionLog.forEach(s=>{
    const hay = `${s.title||''} ${s.summary||''} ${stripHtml(s.notes)}`.toLowerCase();
    if(hay.includes(query)) results.push({ kind:'session', id:s.id, icon:'<svg class="icon"><use href="#i-notebook"/></svg>', title: s.title||'Sesión', sub:'Bitácora' });
  });
  mapsIndex.forEach(m=>{
    if((m.name||'').toLowerCase().includes(query)) results.push({ kind:'map', id:m.id, icon:'<svg class="icon"><use href="#i-map"/></svg>', title: m.name, sub:'Mapa' });
  });
  if(!results.length){ el.innerHTML = '<div class="hint" style="padding:8px;">Sin resultados.</div>'; return; }
  el.innerHTML = results.slice(0,40).map(r=>`
    <div class="mention-option global-search-result" data-kind="${r.kind}" data-id="${r.id}">
      <span style="margin-right:8px;">${r.icon}</span><strong>${escapeHtml(r.title)}</strong>
      <span class="hint" style="margin-left:8px;">${r.sub}</span>
    </div>`).join('');
  el.querySelectorAll('.global-search-result').forEach(row=>{
    row.addEventListener('click', ()=> goToSearchResult(row.dataset.kind, row.dataset.id));
  });
}
async function goToSearchResult(kind, id){
  closeGlobalSearch();
  if(kind==='ficha') await openFichaEditor(id);
  else if(kind==='journal'){ await navigateTo('diario'); openJournalEntry(id); }
  else if(kind==='session'){ await navigateTo('bitacora'); loadSession(id); }
  else if(kind==='map'){ await navigateTo('mapas'); loadMap(id); }
}
document.getElementById('globalSearchBtn').addEventListener('click', openGlobalSearch);
document.getElementById('globalSearchInput').addEventListener('input', (e)=> renderGlobalSearchResults(e.target.value));
document.getElementById('searchOverlay').addEventListener('click', (e)=>{ if(e.target.id==='searchOverlay') closeGlobalSearch(); });
document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openGlobalSearch(); }
  else if(e.key==='Escape' && document.getElementById('searchOverlay').classList.contains('open')){ closeGlobalSearch(); }
});
