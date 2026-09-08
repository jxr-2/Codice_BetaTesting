/* modules/master.js — Modo Master: rastreador de iniciativa, bestiario, dados y tablas de botín.
   Sigue el mismo patrón que grimorio.js (dataset local en español + búsqueda opcional en dnd5eapi.co). */
let masterInited = false;
let masterTab = 'iniciativa';
let BESTIARY = [];
let bestiaryLoadState = 'idle';
let bestiaryLoadPromise = null;
let rollLog = [];
let lastLootRoll = null;

const PRESET_LOOT_TABLES = [
  { id:'preset-menor', name:'Botín menor (individuo, CR 0-4)', entries:[
    { weight:30, text:'Unas monedas sueltas: 2d6 po' },
    { weight:25, text:'5d6 piezas de plata' },
    { weight:20, text:'Un objeto personal sin valor especial (peine, amuleto gastado, retrato viejo)' },
    { weight:15, text:'Una gema pequeña sin tallar (valor aproximado 10 po)' },
    { weight:10, text:'Nada de valor' }
  ]},
  { id:'preset-monton', name:'Tesoro de montón (CR 0-4)', entries:[
    { weight:25, text:'6d6 po y 3d6 pp' },
    { weight:20, text:'Un objeto de arte tallado (valor aproximado 25 po)' },
    { weight:20, text:'Una poción de curación' },
    { weight:15, text:'Un pergamino de conjuro de nivel 1' },
    { weight:10, text:'Una pieza de joyería sencilla (valor aproximado 50 po)' },
    { weight:10, text:'2d4 gemas talladas (valor aproximado 10 po cada una)' }
  ]},
  { id:'preset-magico', name:'Objetos mágicos menores', entries:[
    { weight:1, text:'Poción de curación' },
    { weight:1, text:'Pergamino de protección' },
    { weight:1, text:'Anillo de nadar' },
    { weight:1, text:'Polvo de desaparición (una dosis)' },
    { weight:1, text:'Alfombra voladora en miniatura (1,5 x 1,5 m, solo soporta un objeto pequeño)' },
    { weight:1, text:'Municiones +1 (2d4 flechas o virotes)' },
    { weight:1, text:'Amuleto de resistencia menor (ventaja en un tipo de salvación a elección, una vez por descanso largo)' },
    { weight:1, text:'Capa de trepador de arañas' }
  ]},
  { id:'preset-chatarra', name:'Chatarra de mazmorra (relleno de sala vacía)', entries:[
    { weight:1, text:'Una rata muerta hace tiempo' },
    { weight:1, text:'Una llave oxidada que no abre ninguna cerradura conocida' },
    { weight:1, text:'Un libro con las páginas pegadas por la humedad' },
    { weight:1, text:'Una moneda de un reino que ya no existe' },
    { weight:1, text:'Un guante esmerilado, sin su pareja' },
    { weight:1, text:'Huesos de un animal pequeño, roídos' },
    { weight:1, text:'Una vela consumida hasta la mitad' },
    { weight:1, text:'Un mapa dibujado a mano, ilegible por el agua' }
  ]}
];

/* ========================= NAV / TABS ========================= */
async function initMaster(){
  masterInited = true;
  await loadBestiaryDB();
  refreshBestiaryFilters();
  renderBestiaryBasicList();
  renderCombatList();
  renderLootPanel();
  renderDiceLog();
}
function setMasterTab(tab){
  masterTab = tab;
  document.querySelectorAll('[data-master-tab]').forEach(b=>b.classList.toggle('active', b.dataset.masterTab===tab));
  document.querySelectorAll('.master-panel').forEach(p=>p.classList.toggle('active', p.id === 'masterPanel'+tab.charAt(0).toUpperCase()+tab.slice(1)));
}
document.querySelectorAll('[data-master-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=> setMasterTab(btn.dataset.masterTab));
});

/* ========================= DADOS ========================= */
function rollFormula(expr){
  const cleaned = String(expr||'').replace(/\s+/g,'');
  if(!cleaned) return null;
  const tokens = cleaned.match(/[+-]?\d*d\d+|[+-]?\d+/gi);
  if(!tokens) return null;
  let total = 0;
  const parts = [];
  tokens.forEach(tok=>{
    const sign = tok.startsWith('-') ? -1 : 1;
    const body = tok.replace(/^[+-]/,'');
    if(/d/i.test(body)){
      const [countStr, sidesStr] = body.split(/d/i);
      const count = Math.min(100, Math.max(1, parseInt(countStr||'1',10)));
      const sides = Math.max(1, parseInt(sidesStr,10));
      const rolls = [];
      for(let i=0;i<count;i++) rolls.push(1 + Math.floor(Math.random()*sides));
      const sum = rolls.reduce((a,b)=>a+b,0);
      total += sign * sum;
      parts.push(`${sign<0?'-':(parts.length?'+':'')}${count}d${sides}(${rolls.join(',')})`);
    } else {
      const value = parseInt(body,10);
      total += sign * value;
      parts.push(`${sign<0?'-':(parts.length?'+':'')}${value}`);
    }
  });
  return { expr: cleaned, total, breakdown: parts.join('') };
}
function pushRoll(result){
  if(!result) return;
  rollLog.unshift(result);
  if(rollLog.length > 30) rollLog.length = 30;
  renderDiceLog();
  const resultEl = document.getElementById('diceResult');
  resultEl.innerHTML = `<div class="dice-result-total">${result.total}</div><div class="dice-result-breakdown">${escapeHtml(result.breakdown)}</div>`;
  showToast(`${result.expr} = ${result.total}`);
}
function renderDiceLog(){
  const el = document.getElementById('diceLog');
  if(!el) return;
  el.innerHTML = rollLog.map(r=>`<div class="dice-log-row"><span class="dice-log-expr">${escapeHtml(r.breakdown)}</span><span class="dice-log-total">${r.total}</span></div>`).join('') || '<div class="hint">Todavía no tiraste dados.</div>';
}
document.querySelectorAll('.dice-btn[data-die]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const sides = btn.dataset.die;
    const qty = Math.min(100, Math.max(1, parseInt(document.getElementById('diceQty').value,10) || 1));
    const mod = parseInt(document.getElementById('diceMod').value,10) || 0;
    const expr = `${qty}d${sides}${mod!==0 ? (mod>0?'+':'')+mod : ''}`;
    pushRoll(rollFormula(expr));
  });
});
document.getElementById('diceCustomRollBtn').addEventListener('click', ()=>{
  const expr = document.getElementById('diceCustomExpr').value.trim();
  if(!expr) return;
  const result = rollFormula(expr);
  if(!result){ showToast('Fórmula inválida'); return; }
  pushRoll(result);
});
document.getElementById('diceCustomExpr').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('diceCustomRollBtn').click(); });
document.getElementById('diceClearLogBtn').addEventListener('click', ()=>{ rollLog = []; renderDiceLog(); });

/* ========================= BESTIARIO ========================= */
function abilityMod(score){ return Math.floor((Number(score||10)-10)/2); }
function fmtMod(n){ return n>=0 ? '+'+n : String(n); }
function normalizeBeast(raw, index){
  return {
    id: index,
    name: raw.nombre || 'Sin nombre',
    type: raw.tipo || '',
    size: raw.tamano || '',
    alignment: raw.alineamiento || '',
    ac: raw.ca ?? '—',
    hp: raw.pg ?? '—',
    hpDice: raw.pg_dado || '',
    speed: raw.velocidad || '',
    str: raw.str, dex: raw.dex, con: raw.con, int: raw.int, wis: raw.wis, cha: raw.cha,
    senses: raw.sentidos || '',
    languages: raw.idiomas || '',
    cr: raw.desafio || '0',
    xp: raw.px || 0,
    resistances: raw.resistencias || '',
    immunities: raw.inmunidades || '',
    conditionImmune: raw.condiciones_inmunes || '',
    traits: Array.isArray(raw.rasgos) ? raw.rasgos : [],
    actions: Array.isArray(raw.acciones) ? raw.acciones : []
  };
}
async function loadBestiaryDB(){
  if(bestiaryLoadState === 'loaded') return BESTIARY;
  if(bestiaryLoadState === 'loading') return bestiaryLoadPromise;
  bestiaryLoadState = 'loading';
  bestiaryLoadPromise = fetch('./data/bestiario.json')
    .then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(data=>{
      if(!Array.isArray(data)) throw new Error('bestiario.json inválido');
      BESTIARY = data.map(normalizeBeast);
      bestiaryLoadState = 'loaded';
      return BESTIARY;
    })
    .catch(err=>{
      console.error('Error cargando bestiario desde data/bestiario.json:', err);
      BESTIARY = [];
      bestiaryLoadState = 'error';
      return BESTIARY;
    });
  return bestiaryLoadPromise;
}
function refreshBestiaryFilters(){
  const typeFilter = document.getElementById('bestiaryTypeFilter');
  const crFilter = document.getElementById('bestiaryCrFilter');
  const selectedType = typeFilter.value;
  const selectedCr = crFilter.value;
  const types = [...new Set(BESTIARY.map(b=>b.type))].sort((a,b)=>a.localeCompare(b,'es'));
  const crs = [...new Set(BESTIARY.map(b=>b.cr))].sort((a,b)=>parseCr(a)-parseCr(b));
  typeFilter.innerHTML = '<option value="">Todos los tipos</option>' + types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  crFilter.innerHTML = '<option value="">Todos los desafíos</option>' + crs.map(c=>`<option value="${escapeHtml(c)}">CR ${escapeHtml(c)}</option>`).join('');
  typeFilter.value = selectedType;
  crFilter.value = selectedCr;
}
function parseCr(cr){
  if(cr==='1/8') return 0.125;
  if(cr==='1/4') return 0.25;
  if(cr==='1/2') return 0.5;
  return parseFloat(cr) || 0;
}
function beastMetaHtml(b){
  return `
    <span><strong>CA</strong>${b.ac}</span>
    <span><strong>PG</strong>${b.hp}${b.hpDice ? ' ('+escapeHtml(b.hpDice)+')' : ''}</span>
    <span><strong>Velocidad</strong>${escapeHtml(b.speed)}</span>
    <span><strong>Desafío</strong>${escapeHtml(b.cr)} (${b.xp} PX)</span>
    <span><strong>FUE</strong>${b.str} (${fmtMod(abilityMod(b.str))})</span>
    <span><strong>DES</strong>${b.dex} (${fmtMod(abilityMod(b.dex))})</span>
    <span><strong>CON</strong>${b.con} (${fmtMod(abilityMod(b.con))})</span>
    <span><strong>INT</strong>${b.int} (${fmtMod(abilityMod(b.int))})</span>
    <span><strong>SAB</strong>${b.wis} (${fmtMod(abilityMod(b.wis))})</span>
    <span><strong>CAR</strong>${b.cha} (${fmtMod(abilityMod(b.cha))})</span>
    ${b.senses ? `<span class="grimoire-meta-wide"><strong>Sentidos</strong>${escapeHtml(b.senses)}</span>` : ''}
    ${b.languages ? `<span class="grimoire-meta-wide"><strong>Idiomas</strong>${escapeHtml(b.languages)}</span>` : ''}
    ${b.resistances ? `<span class="grimoire-meta-wide"><strong>Resistencias</strong>${escapeHtml(b.resistances)}</span>` : ''}
    ${b.immunities ? `<span class="grimoire-meta-wide"><strong>Inmunidades</strong>${escapeHtml(b.immunities)}</span>` : ''}
    ${b.conditionImmune ? `<span class="grimoire-meta-wide"><strong>Inmune a condiciones</strong>${escapeHtml(b.conditionImmune)}</span>` : ''}`;
}
function beastBlockHtml(b){
  const traits = b.traits.map(t=>`<p><strong>${escapeHtml(t.nombre)}.</strong> ${escapeHtml(t.texto)}</p>`).join('');
  const actions = b.actions.map(a=>`<p><strong>${escapeHtml(a.nombre)}.</strong> ${escapeHtml(a.texto)}</p>`).join('');
  return `${traits}${actions ? '<div class="ws-section-title">Acciones</div>'+actions : ''}`;
}
function renderBestiaryBasicList(q=''){
  const el = document.getElementById('bestiaryBasicList');
  if(bestiaryLoadState === 'loading' || bestiaryLoadState === 'idle'){ el.innerHTML = '<div class="hint">Cargando bestiario…</div>'; return; }
  if(bestiaryLoadState === 'error'){ el.innerHTML = '<div class="hint">No se pudo cargar el bestiario. Revisá la consola y comprobá que data/bestiario.json esté disponible.</div>'; return; }
  const selectedType = document.getElementById('bestiaryTypeFilter').value;
  const selectedCr = document.getElementById('bestiaryCrFilter').value;
  const nq = q.trim().toLowerCase();
  const filtered = BESTIARY.filter(b =>
    (!nq || b.name.toLowerCase().includes(nq)) &&
    (!selectedType || b.type === selectedType) &&
    (!selectedCr || b.cr === selectedCr)
  );
  el.innerHTML = filtered.map(b=>`
    <article class="ficha-card grimoire-spell-card" data-beast-detail="${b.id}" tabindex="0" role="button" aria-label="Ver detalles de ${escapeHtml(b.name)}">
      <div class="ficha-body">
        <div class="ficha-type">${escapeHtml(b.type)} · CR ${escapeHtml(b.cr)}</div>
        <div class="ficha-name" style="font-size:15px;">${escapeHtml(b.name)}</div>
        <div class="grimoire-metadata">${beastMetaHtml(b)}</div>
        <div class="grimoire-card-footer"><span>Ver ficha completa</span><button class="rail-btn" data-add-combat-basic="${b.id}" type="button">+ Iniciativa</button></div>
      </div>
    </article>`).join('') || '<div class="hint">Sin resultados.</div>';
  el.querySelectorAll('[data-beast-detail]').forEach(card=>{
    const open = ()=> openBeastDetail(card.dataset.beastDetail);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
  });
  el.querySelectorAll('[data-add-combat-basic]').forEach(btn=>{
    btn.addEventListener('click', e=>{ e.stopPropagation(); addCombatantFromBeast(btn.dataset.addCombatBasic); });
  });
}
function openBeastDetail(beastId){
  const b = BESTIARY.find(x=>x.id===Number(beastId));
  if(!b) return;
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = 'min(760px,94vw)';
  box.innerHTML = `
    <div class="spell-detail-heading">
      <div class="ficha-type">${escapeHtml(b.size)} · ${escapeHtml(b.type)} · ${escapeHtml(b.alignment)}</div>
      <div class="modal-title">${escapeHtml(b.name)}</div>
    </div>
    <div class="grimoire-metadata spell-detail-metadata">${beastMetaHtml(b)}</div>
    <div class="spell-detail-description">${beastBlockHtml(b)}</div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button><button class="btn-brass" id="beastDetailAdd">+ Agregar a iniciativa</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('beastDetailAdd').onclick = ()=>{ closeModal(); addCombatantFromBeast(b.id); };
}
document.getElementById('bestiaryBasicSearch').addEventListener('input', e=> renderBestiaryBasicList(e.target.value));
document.getElementById('bestiaryTypeFilter').addEventListener('change', ()=> renderBestiaryBasicList(document.getElementById('bestiaryBasicSearch').value));
document.getElementById('bestiaryCrFilter').addEventListener('change', ()=> renderBestiaryBasicList(document.getElementById('bestiaryBasicSearch').value));
document.getElementById('bestiaryApiSearchBtn').addEventListener('click', async ()=>{
  const q = document.getElementById('bestiaryApiSearch').value.trim();
  const results = document.getElementById('bestiaryApiResults');
  results.innerHTML = '<div class="hint">Buscando…</div>';
  try{
    const res = await fetch('https://www.dnd5eapi.co/api/monsters' + (q ? '?name='+encodeURIComponent(q) : ''));
    if(!res.ok) throw new Error('API error');
    const data = await res.json();
    const items = data.results || [];
    if(items.length===0){ results.innerHTML = '<div class="hint">Sin resultados.</div>'; return; }
    results.innerHTML = items.slice(0,30).map(it=>`
      <div class="grimoire-row" style="margin-bottom:8px;">
        <div><strong>${escapeHtml(it.name)}</strong></div>
        <button class="rail-btn" data-api-monster="${escapeHtml(it.url)}" type="button">Ver / + Agregar</button>
      </div>`).join('');
    results.querySelectorAll('[data-api-monster]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        try{
          const detailRes = await fetch('https://www.dnd5eapi.co'+btn.dataset.apiMonster);
          const detail = await detailRes.json();
          openApiBeastDetail(detail);
        }catch(e){ btn.textContent = 'Error de conexión'; }
      });
    });
  }catch(e){
    results.innerHTML = '<div class="hint">No se pudo conectar con la API en este entorno. Probá el bestiario básico de arriba mientras tanto.</div>';
  }
});
function openApiBeastDetail(detail){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = 'min(760px,94vw)';
  const ac = Array.isArray(detail.armor_class) ? (detail.armor_class[0]?.value ?? '—') : (detail.armor_class ?? '—');
  const actions = (detail.actions||[]).map(a=>`<p><strong>${escapeHtml(a.name)}.</strong> ${escapeHtml(a.desc||'')}</p>`).join('');
  box.innerHTML = `
    <div class="spell-detail-heading">
      <div class="ficha-type">${escapeHtml(detail.size||'')} · ${escapeHtml(detail.type||'')} · CR ${escapeHtml(String(detail.challenge_rating ?? '?'))} [en inglés, fuente: dnd5eapi.co]</div>
      <div class="modal-title">${escapeHtml(detail.name||'')}</div>
    </div>
    <div class="grimoire-metadata spell-detail-metadata">
      <span><strong>AC</strong>${ac}</span>
      <span><strong>HP</strong>${detail.hit_points ?? '—'}</span>
      <span><strong>Speed</strong>${escapeHtml(JSON.stringify(detail.speed||{}).replace(/[{}"]/g,'').replace(/,/g,', '))}</span>
    </div>
    <div class="spell-detail-description">${actions}</div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button><button class="btn-brass" id="apiBeastAdd">+ Agregar a iniciativa</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('apiBeastAdd').onclick = ()=>{
    closeModal();
    const dexMod = detail.dexterity ? abilityMod(detail.dexterity) : 0;
    addCombatant({ name: detail.name||'Criatura', ac: ac, hp: detail.hit_points ?? 10, maxHp: detail.hit_points ?? 10,
      initiative: 1+Math.floor(Math.random()*20)+dexMod, isPC:false, notes:'dnd5eapi.co' });
  };
}

/* ========================= INICIATIVA ========================= */
function sortCombatants(){
  const activeId = combatState.active && combatState.combatants[combatState.turnIndex] ? combatState.combatants[combatState.turnIndex].id : null;
  combatState.combatants.sort((a,b)=> (b.initiative||0) - (a.initiative||0));
  if(activeId){
    const newIdx = combatState.combatants.findIndex(c=>c.id===activeId);
    if(newIdx>-1) combatState.turnIndex = newIdx;
  }
}
async function persistCombat(){ await storeSet('combat-state', combatState); }
async function addCombatant(data){
  combatState.combatants.push({
    id: uid(), name: data.name||'Sin nombre', initiative: Number(data.initiative)||0,
    hp: Number(data.hp)||0, maxHp: Number(data.maxHp ?? data.hp)||0, ac: data.ac ?? '—',
    isPC: !!data.isPC, notes: data.notes||''
  });
  sortCombatants();
  await persistCombat();
  renderCombatList();
}
function addCombatantFromBeast(beastId){
  const b = BESTIARY.find(x=>x.id===Number(beastId));
  if(!b) return;
  const dexMod = abilityMod(b.dex);
  addCombatant({ name:b.name, ac:b.ac, hp:b.hp, maxHp:b.hp, initiative: 1+Math.floor(Math.random()*20)+dexMod, isPC:false, notes:'CR '+b.cr });
  showToast(`${b.name} agregado a la iniciativa`);
}
async function removeCombatant(id){
  const idx = combatState.combatants.findIndex(c=>c.id===id);
  if(idx===-1) return;
  combatState.combatants.splice(idx,1);
  if(combatState.turnIndex > idx) combatState.turnIndex--;
  if(combatState.turnIndex >= combatState.combatants.length) combatState.turnIndex = 0;
  await persistCombat();
  renderCombatList();
}
async function updateCombatant(id, changes){
  const c = combatState.combatants.find(x=>x.id===id);
  if(!c) return;
  Object.assign(c, changes);
  if('initiative' in changes) sortCombatants();
  await persistCombat();
  renderCombatList();
}
function openAddCombatantModal(){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = 'min(480px,92vw)';
  box.innerHTML = `
    <div class="modal-title">Nuevo combatiente</div>
    <div class="modal-fields">
      <div class="field"><label>Nombre</label><input type="text" id="cbName" placeholder="Nombre"></div>
      <div class="field"><label>Iniciativa</label><div style="display:flex;gap:8px;"><input type="number" id="cbInit" value="10" style="flex:1;"><button class="btn-ghost" id="cbRollInit" type="button">🎲 d20</button></div></div>
      <div class="field"><label>PG máximos</label><input type="number" id="cbHp" value="10"></div>
      <div class="field"><label>CA</label><input type="number" id="cbAc" value="10"></div>
      <div class="field"><label><input type="checkbox" id="cbIsPc"> Es jugador (PC)</label></div>
    </div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cancelar</button><button class="btn-brass" id="cbConfirm">Agregar</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('cbRollInit').onclick = ()=>{ document.getElementById('cbInit').value = 1+Math.floor(Math.random()*20); };
  document.getElementById('cbConfirm').onclick = async ()=>{
    const name = document.getElementById('cbName').value.trim() || 'Combatiente';
    const hp = document.getElementById('cbHp').value;
    await addCombatant({ name, initiative: document.getElementById('cbInit').value, hp, maxHp: hp, ac: document.getElementById('cbAc').value, isPC: document.getElementById('cbIsPc').checked });
    closeModal();
  };
  setTimeout(()=> document.getElementById('cbName').focus(), 30);
}
function openAddCombatantFromFichaModal(){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const entries = entriesIndex.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','es'));
  box.style.width = 'min(480px,92vw)';
  if(!entries.length){
    box.innerHTML = `<div class="modal-title">Agregar desde ficha</div><div class="modal-message">Todavía no hay fichas creadas.</div><div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button></div></div>`;
    overlay.classList.add('open');
    document.getElementById('modalCancel').onclick = closeModal;
    return;
  }
  box.innerHTML = `
    <div class="modal-title">Agregar desde ficha</div>
    <div class="modal-fields"><div class="field"><label>Ficha</label><select id="cbFichaSelect">${entries.map(e=>`<option value="${e.id}">${escapeHtml(e.name||'Sin nombre')}</option>`).join('')}</select></div></div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cancelar</button><button class="btn-brass" id="cbFichaConfirm">Agregar</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('cbFichaConfirm').onclick = async ()=>{
    const id = document.getElementById('cbFichaSelect').value;
    const full = await storeGet('entry:'+id);
    const stats = (full && full.stats) || {};
    const dexMod = stats.DEX ? abilityMod(stats.DEX) : 0;
    const hp = stats.HP || 10;
    await addCombatant({ name: full ? full.name : 'Ficha', initiative: 1+Math.floor(Math.random()*20)+dexMod, hp, maxHp: hp, ac: stats.AC || 10, isPC:true, notes:'Ficha' });
    closeModal();
  };
}
async function combatNextTurn(){
  if(!combatState.combatants.length) return;
  combatState.turnIndex++;
  if(combatState.turnIndex >= combatState.combatants.length){ combatState.turnIndex = 0; combatState.round++; }
  await persistCombat();
  renderCombatList();
}
async function combatPrevTurn(){
  if(!combatState.combatants.length) return;
  combatState.turnIndex--;
  if(combatState.turnIndex < 0){ combatState.turnIndex = combatState.combatants.length-1; combatState.round = Math.max(1, combatState.round-1); }
  await persistCombat();
  renderCombatList();
}
document.getElementById('combatStartBtn').addEventListener('click', async ()=>{
  if(!combatState.combatants.length){ showToast('Agregá combatientes primero'); return; }
  combatState.active = true; combatState.round = 1; combatState.turnIndex = 0;
  sortCombatants();
  await persistCombat();
  renderCombatList();
});
document.getElementById('combatNextBtn').addEventListener('click', combatNextTurn);
document.getElementById('combatPrevBtn').addEventListener('click', combatPrevTurn);
document.getElementById('addCombatantBtn').addEventListener('click', openAddCombatantModal);
document.getElementById('addCombatantFromFichaBtn').addEventListener('click', openAddCombatantFromFichaModal);
document.getElementById('clearCombatBtn').addEventListener('click', ()=>{
  if(!combatState.combatants.length) return;
  openConfirm({ title:'Vaciar encuentro', message:'Se eliminarán todos los combatientes y se reiniciará la ronda. ¿Continuar?', onConfirm: async ()=>{
    combatState = { combatants:[], round:1, turnIndex:0, active:false };
    await persistCombat();
    renderCombatList();
  }});
});
function renderCombatList(){
  const el = document.getElementById('combatList');
  if(!el) return;
  document.getElementById('combatRoundLabel').textContent = 'Ronda '+combatState.round;
  const hint = document.getElementById('combatHint');
  hint.textContent = combatState.combatants.length ? '' : 'Agregá combatientes para empezar.';
  el.innerHTML = combatState.combatants.map((c,i)=>`
    <div class="combat-row ${combatState.active && i===combatState.turnIndex ? 'combat-row-active' : ''}" data-cid="${c.id}">
      <div class="combat-init">${c.initiative}</div>
      <div class="combat-name">${escapeHtml(c.name)}${c.isPC ? ' <span class="combat-pc-badge">PC</span>' : ''}</div>
      <div class="combat-hp">
        <button class="mini-fmt-btn" data-hp-delta="-1">−</button>
        <input type="number" class="combat-hp-input" value="${c.hp}" data-hp-input>
        <span class="combat-hp-max">/ ${c.maxHp}</span>
        <button class="mini-fmt-btn" data-hp-delta="1">+</button>
      </div>
      <div class="combat-ac">CA ${c.ac}</div>
      <button class="icon-btn combat-remove" data-remove-combatant title="Quitar">✕</button>
    </div>`).join('') || '<div class="hint">Sin combatientes.</div>';
  el.querySelectorAll('.combat-row').forEach(row=>{
    const id = row.dataset.cid;
    row.querySelector('[data-hp-delta="-1"]').addEventListener('click', ()=>{
      const c = combatState.combatants.find(x=>x.id===id);
      updateCombatant(id, { hp: Math.max(0, (c.hp||0)-1) });
    });
    row.querySelector('[data-hp-delta="1"]').addEventListener('click', ()=>{
      const c = combatState.combatants.find(x=>x.id===id);
      updateCombatant(id, { hp: (c.hp||0)+1 });
    });
    row.querySelector('[data-hp-input]').addEventListener('change', e=>{
      updateCombatant(id, { hp: Math.max(0, parseInt(e.target.value,10)||0) });
    });
    row.querySelector('[data-remove-combatant]').addEventListener('click', ()=> removeCombatant(id));
  });
}

/* ========================= BOTÍN ========================= */
function weightedPick(entries){
  const total = entries.reduce((s,e)=>s+(e.weight||1),0);
  let roll = Math.random()*total;
  for(const e of entries){
    roll -= (e.weight||1);
    if(roll <= 0) return e;
  }
  return entries[entries.length-1];
}
function rollLootTable(table){
  const entry = weightedPick(table.entries);
  lastLootRoll = entry.text;
  const resultEl = document.getElementById('lootResult');
  resultEl.style.display = 'flex';
  resultEl.innerHTML = `
    <div class="loot-result-text"><strong>${escapeHtml(table.name)}:</strong> ${escapeHtml(entry.text)}</div>
    <div class="loot-result-actions">
      <button class="btn-ghost" id="lootAddToFichaBtn">+ Agregar a inventario</button>
    </div>`;
  document.getElementById('lootAddToFichaBtn').onclick = ()=> openLootTargetPicker(entry.text);
  showToast('Botín: '+entry.text);
}
function openLootTargetPicker(text){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const entries = entriesIndex.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','es'));
  box.style.width = 'min(480px,92vw)';
  if(!entries.length){
    box.innerHTML = `<div class="modal-title">Agregar botín</div><div class="modal-message">Todavía no hay fichas disponibles.</div><div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button></div></div>`;
    overlay.classList.add('open');
    document.getElementById('modalCancel').onclick = closeModal;
    return;
  }
  box.innerHTML = `
    <div class="modal-title">Agregar botín</div>
    <div class="modal-message">Elegí la ficha donde querés guardar este objeto en su inventario.</div>
    <div class="modal-fields"><div class="field"><label>Ficha destino</label><select id="lootTargetEntry">${entries.map(e=>`<option value="${e.id}">${escapeHtml(e.name||'Sin nombre')}</option>`).join('')}</select></div></div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cancelar</button><button class="btn-brass" id="lootTargetConfirm">Agregar</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('lootTargetConfirm').onclick = async ()=>{
    const entryId = document.getElementById('lootTargetEntry').value;
    const full = await storeGet('entry:'+entryId);
    if(full){
      full.inventory = full.inventory ? full.inventory + '\n' + text : text;
      await storeSet('entry:'+entryId, full);
      markDirty();
      if(currentEntryId === entryId && fichasMode==='editor'){ document.getElementById('wsInventory').value = full.inventory; }
    }
    closeModal();
  };
}
function lootTableCard(table, isCustom){
  return `
    <article class="ficha-card loot-table-card">
      <div class="ficha-body">
        <div class="ficha-name" style="font-size:15px;">${escapeHtml(table.name)}</div>
        <div class="hint">${table.entries.length} resultado${table.entries.length===1?'':'s'}</div>
        <div class="grimoire-card-footer">
          <button class="btn-brass" data-roll-loot="${table.id}" type="button">🎲 Tirar</button>
          ${isCustom ? `<span><button class="rail-btn" data-edit-loot="${table.id}" type="button">Editar</button> <button class="rail-btn" data-delete-loot="${table.id}" type="button">Eliminar</button></span>` : ''}
        </div>
      </div>
    </article>`;
}
function renderLootPanel(){
  const presetEl = document.getElementById('lootPresetList');
  const customEl = document.getElementById('lootCustomList');
  if(!presetEl) return;
  presetEl.innerHTML = PRESET_LOOT_TABLES.map(t=>lootTableCard(t,false)).join('');
  customEl.innerHTML = lootTables.map(t=>lootTableCard(t,true)).join('') || '<div class="hint">Todavía no creaste tablas propias.</div>';
  [...presetEl.querySelectorAll('[data-roll-loot]'), ...customEl.querySelectorAll('[data-roll-loot]')].forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const table = PRESET_LOOT_TABLES.find(t=>t.id===btn.dataset.rollLoot) || lootTables.find(t=>t.id===btn.dataset.rollLoot);
      if(table) rollLootTable(table);
    });
  });
  customEl.querySelectorAll('[data-edit-loot]').forEach(btn=>{
    btn.addEventListener('click', ()=> openEditLootTableModal(lootTables.find(t=>t.id===btn.dataset.editLoot)));
  });
  customEl.querySelectorAll('[data-delete-loot]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const table = lootTables.find(t=>t.id===btn.dataset.deleteLoot);
      if(!table) return;
      openConfirm({ title:'Eliminar tabla', message:`¿Eliminar "${escapeHtml(table.name)}"? Esta acción no se puede deshacer.`, onConfirm: async ()=>{
        lootTables = lootTables.filter(t=>t.id!==table.id);
        await storeSet('loot-tables', lootTables);
        markDirty();
        renderLootPanel();
      }});
    });
  });
}
function parseLootEntriesText(text){
  return String(text||'').split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{
    const m = line.match(/^(\d+)\s*\|\s*(.+)$/);
    return m ? { weight: parseInt(m[1],10)||1, text: m[2].trim() } : { weight:1, text:line };
  });
}
function openEditLootTableModal(table){
  openModal({
    title: table ? 'Editar tabla de botín' : 'Nueva tabla de botín',
    wide: true,
    submitLabel: table ? 'Guardar' : 'Crear',
    fields: [
      { key:'name', label:'Nombre de la tabla', type:'text', value: table ? table.name : '' },
      { key:'entries', label:'Resultados (uno por línea; opcional "peso | texto", ej: 3 | Espada larga +1)', type:'textarea',
        value: table ? table.entries.map(e=> e.weight!==1 ? `${e.weight} | ${e.text}` : e.text).join('\n') : '' }
    ],
    onSubmit: async (values)=>{
      const name = values.name.trim() || 'Tabla sin nombre';
      const entries = parseLootEntriesText(values.entries);
      if(!entries.length){ showToast('La tabla necesita al menos un resultado'); return; }
      if(table){ table.name = name; table.entries = entries; }
      else { lootTables.push({ id: uid(), name, entries }); }
      await storeSet('loot-tables', lootTables);
      markDirty();
      renderLootPanel();
    }
  });
}
document.getElementById('newLootTableBtn').addEventListener('click', ()=> openEditLootTableModal(null));
