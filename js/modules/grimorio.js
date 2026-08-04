/* modules/grimorio.js — Grimorio: lista de hechizos + agregar a ficha.
   NOTA: acopla con fichas.js vía currentEntryId/fichasMode/#wsSpells (documentado). */
const GRIMOIRE = [
 {name:'Prestidigitación', level:0, school:'Transmutación', blurb:'Truco de manos menor: enciende una vela, limpia una mancha, crea un efecto sensorial pequeño.'},
 {name:'Luz', level:0, school:'Evocación', blurb:'Un objeto emite luz brillante en un radio moderado.'},
 {name:'Mano de mago', level:0, school:'Conjuración', blurb:'Crea una mano espectral que manipula objetos livianos a distancia.'},
 {name:'Proyectil de fuego', level:0, school:'Evocación', blurb:'Lanza una chispa de fuego que hace daño a un objetivo.'},
 {name:'Rayo de escarcha', level:0, school:'Evocación', blurb:'Un rayo helado daña y reduce la velocidad del objetivo.'},
 {name:'Descarga eléctrica', level:0, school:'Evocación', blurb:'Toque cargado de electricidad que daña e impide reacciones.'},
 {name:'Orientación', level:0, school:'Adivinación', blurb:'Otorga un pequeño bono a una prueba de habilidad.'},
 {name:'Reparar', level:0, school:'Transmutación', blurb:'Arregla una rotura o daño menor en un objeto.'},
 {name:'Golpe llameante', level:0, school:'Evocación', blurb:'Ataque cuerpo a cuerpo envuelto en llamas.'},
 {name:'Detectar magia', level:1, school:'Adivinación', blurb:'Sientes la presencia de magia cercana y su escuela general.'},
 {name:'Identificar', level:1, school:'Adivinación', blurb:'Revela las propiedades mágicas de un objeto o hechizo activo.'},
 {name:'Escudo', level:1, school:'Abjuración', blurb:'Barrera invisible que aumenta la defensa por un instante.'},
 {name:'Armadura de mago', level:1, school:'Abjuración', blurb:'Una fuerza protectora envuelve al conjurador sin armadura.'},
 {name:'Palabra de curación', level:1, school:'Evocación', blurb:'Cura heridas leves con una sola palabra, a distancia.'},
 {name:'Curar heridas', level:1, school:'Evocación', blurb:'Restaura puntos de golpe con el toque del sanador.'},
 {name:'Misil mágico', level:1, school:'Evocación', blurb:'Dardos de energía que impactan sin posibilidad de fallo.'},
 {name:'Sueño', level:1, school:'Encantamiento', blurb:'Sume a varias criaturas débiles en un sueño mágico.'},
 {name:'Fuego feérico', level:1, school:'Ilusión', blurb:'Cubre objetivos con luz coloreada, revelándolos aunque sean invisibles.'},
 {name:'Salto', level:1, school:'Transmutación', blurb:'Triplica la distancia de salto del objetivo.'},
 {name:'Nube de niebla', level:1, school:'Conjuración', blurb:'Crea una niebla densa que bloquea la visión en un área.'},
 {name:'Invisibilidad', level:2, school:'Ilusión', blurb:'Vuelve invisible al objetivo hasta que ataque o lance un conjuro.'},
 {name:'Telaraña', level:2, school:'Conjuración', blurb:'Llena un área con telarañas pegajosas que atrapan criaturas.'},
 {name:'Sugestión', level:2, school:'Encantamiento', blurb:'Sugiere mágicamente un curso de acción razonable.'},
 {name:'Rayo abrasador', level:2, school:'Evocación', blurb:'Dos rayos de fuego que pueden incendiar objetos inflamables.'},
 {name:'Levitar', level:2, school:'Transmutación', blurb:'Hace flotar a una criatura u objeto en el aire.'},
 {name:'Silencio', level:2, school:'Ilusión', blurb:'Crea una zona donde no se puede producir sonido.'},
 {name:'Restablecimiento menor', level:2, school:'Abjuración', blurb:'Cura una enfermedad o elimina una condición debilitante.'},
 {name:'Rayo de relámpago', level:3, school:'Evocación', blurb:'Una línea de electricidad que daña a todos en su trayectoria.'},
 {name:'Bola de fuego', level:3, school:'Evocación', blurb:'Explosión ardiente que daña a todos en un área amplia.'},
 {name:'Contrahechizo', level:3, school:'Abjuración', blurb:'Interrumpe el conjuro que otra criatura está lanzando.'},
 {name:'Volar', level:3, school:'Transmutación', blurb:'Otorga velocidad de vuelo al objetivo durante varios minutos.'},
 {name:'Lentitud', level:3, school:'Transmutación', blurb:'Ralentiza drásticamente a varios enemigos en un área.'},
 {name:'Disipar magia', level:3, school:'Abjuración', blurb:'Termina un efecto mágico activo en un objetivo.'},
 {name:'Clarividencia', level:3, school:'Adivinación', blurb:'Crea un sensor invisible que ve y oye un lugar distante.'},
 {name:'Puerta dimensional', level:4, school:'Conjuración', blurb:'Teletransporta instantáneamente al conjurador a un punto visible.'},
 {name:'Polimorfar', level:4, school:'Transmutación', blurb:'Transforma a una criatura en otra forma, alterando sus estadísticas.'},
 {name:'Muro de fuego', level:4, school:'Evocación', blurb:'Erige un muro ardiente que daña a quien lo cruza.'},
 {name:'Piel de piedra', level:4, school:'Abjuración', blurb:'Resistencia casi total al daño físico durante un tiempo.'},
 {name:'Confusión', level:4, school:'Encantamiento', blurb:'Vuelve errático el comportamiento de varias criaturas.'},
 {name:'Muro de fuerza', level:5, school:'Evocación', blurb:'Barrera invisible e indestructible que nada puede atravesar.'},
 {name:'Telepatía', level:5, school:'Evocación', blurb:'Comunicación mental a gran distancia con una criatura conocida.'},
 {name:'Curación en masa', level:5, school:'Evocación', blurb:'Restaura puntos de golpe a varias criaturas a la vez.'},
 {name:'Restauración mayor', level:5, school:'Abjuración', blurb:'Revierte maldiciones, transformaciones o pérdida de habilidad.'},
 {name:'Sol vengativo', level:6, school:'Evocación', blurb:'Crea un pequeño sol que daña con su luz radiante.'},
 {name:'Muro de hielo', level:6, school:'Evocación', blurb:'Erige una muralla helada que bloquea el paso.'},
 {name:'Contingencia', level:6, school:'Evocación', blurb:'Prepara un conjuro que se activa automáticamente ante una condición.'},
 {name:'Portal etéreo', level:7, school:'Conjuración', blurb:'Permite viajar entre el plano material y el plano etéreo.'},
 {name:'Simulacro', level:7, school:'Ilusión', blurb:'Crea una copia ilusoria pero funcional de una criatura conocida.'},
 {name:'Enjambre de meteoros', level:9, school:'Evocación', blurb:'Bólidos de fuego caen del cielo devastando un área enorme.'},
 {name:'Deseo', level:9, school:'Conjuración', blurb:'El conjuro más poderoso: altera la realidad según se desee.'},
 {name:'Portal', level:9, school:'Conjuración', blurb:'Abre un portal circular entre dos ubicaciones distantes o planos.'},
 {name:'Verdadera resurrección', level:9, school:'Necromancia', blurb:'Devuelve la vida a un fallecido, aunque el cuerpo ya no exista.'},
];


/* ========================= GRIMORIO (tab dedicado) ========================= */
function initGrimorio(){
  grimorioInited = true;
  refreshGrimoireTargetSelect();
  renderGrimoireBasicList();
}
function refreshGrimoireTargetSelect(){
  const sel = document.getElementById('grimoireTargetEntry');
  const byFolder = worldMeta.folders.reduce((acc,f)=>{ acc[f.id] = { folder:f, entries:[] }; return acc; }, {});
  const orphanGroup = { folder:{ name:'Sin carpeta' }, entries:[] };

  entriesIndex.forEach(entry => {
    const option = `<option value="${entry.id}">${TYPES[entry.type]?.glyph||''} ${escapeHtml(entry.name||'Sin nombre')}</option>`;
    if(entry.folderId && byFolder[entry.folderId]){
      byFolder[entry.folderId].entries.push(option);
    } else {
      orphanGroup.entries.push(option);
    }
  });

  const sections = [];
  if(orphanGroup.entries.length) sections.push(`<optgroup label="${escapeHtml(orphanGroup.folder.name)}">${orphanGroup.entries.join('')}</optgroup>`);
  Object.values(byFolder).forEach(group => {
    if(group.entries.length){
      sections.push(`<optgroup label="${escapeHtml(group.folder.name)}">${group.entries.join('')}</optgroup>`);
    }
  });

  sel.innerHTML = sections.length ? sections.join('') : '<option value="">(sin fichas creadas)</option>';
}
function renderGrimoireBasicList(q=''){
  const el = document.getElementById('grimoireBasicList');
  const filtered = GRIMOIRE.filter(s=> !q || s.name.toLowerCase().includes(q.toLowerCase()));
  el.innerHTML = filtered.map(s=>`
    <div class="ficha-card" style="cursor:default;">
      <div class="ficha-body">
        <div class="ficha-type">${s.level===0?'Truco':'Nivel '+s.level} · ${escapeHtml(s.school)}</div>
        <div class="ficha-name" style="font-size:15px;">${escapeHtml(s.name)}</div>
        <div class="ficha-summary" style="max-height:4.2em;">${escapeHtml(s.blurb)}</div>
        <button class="rail-btn" style="margin-top:8px;" data-add-basic="${escapeHtml(s.name)}" type="button">+ Agregar a ficha</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('[data-add-basic]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const targetId = document.getElementById('grimoireTargetEntry').value;
      if(!targetId){ return; }
      const spell = GRIMOIRE.find(s=>s.name===btn.dataset.addBasic);
      const line = `${spell.name} (${spell.level===0?'Truco':'Nv '+spell.level}, ${spell.school}) — ${spell.blurb}`;
      const added = await toggleSpellLineOnEntry(targetId, line);
      btn.textContent = added ? 'Agregado ✓' : '+ Agregar a ficha';
    });
  });
}
document.getElementById('grimoireBasicSearch').addEventListener('input', (e)=> renderGrimoireBasicList(e.target.value));
async function toggleSpellLineOnEntry(entryId, line){
  const full = await storeGet('entry:'+entryId);
  if(!full) return null;
  const lines = full.spells ? full.spells.split('\n') : [];
  const index = lines.findIndex(l=>l===line);
  const added = index === -1;
  if(added){
    full.spells = full.spells ? full.spells + '\n' + line : line;
  } else {
    lines.splice(index, 1);
    full.spells = lines.filter(Boolean).join('\n');
  }
  await storeSet('entry:'+entryId, full);
  markDirty();
  if(currentEntryId === entryId && fichasMode==='editor'){ document.getElementById('wsSpells').value = full.spells; }
  return added;
}
async function addSpellLineToEntry(entryId, line){
  const full = await storeGet('entry:'+entryId);
  if(!full) return;
  full.spells = full.spells ? full.spells + '\n' + line : line;
  await storeSet('entry:'+entryId, full);
  markDirty();
  if(currentEntryId === entryId && fichasMode==='editor'){ document.getElementById('wsSpells').value = full.spells; }
}
document.getElementById('grimoireApiSearchBtn').addEventListener('click', async ()=>{
  const q = document.getElementById('grimoireApiSearch').value.trim();
  const results = document.getElementById('grimoireApiResults');
  results.innerHTML = '<div class="hint">Buscando…</div>';
  try{
    const res = await fetch('https://www.dnd5eapi.co/api/spells' + (q ? '?name='+encodeURIComponent(q) : ''));
    if(!res.ok) throw new Error('API error');
    const data = await res.json();
    const items = data.results || [];
    if(items.length===0){ results.innerHTML = '<div class="hint">Sin resultados.</div>'; return; }
    results.innerHTML = items.slice(0,30).map(it=>`
      <div class="grimoire-row" style="margin-bottom:8px;">
        <div><strong>${escapeHtml(it.name)}</strong></div>
        <button class="rail-btn" data-api-spell="${escapeHtml(it.url)}" type="button">+ Agregar</button>
      </div>`).join('');
    results.querySelectorAll('[data-api-spell]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const targetId = document.getElementById('grimoireTargetEntry').value;
        if(!targetId){ btn.textContent='Elegí un personaje'; return; }
        try{
          const detailRes = await fetch('https://www.dnd5eapi.co'+btn.dataset.apiSpell);
          const detail = await detailRes.json();
          const desc = Array.isArray(detail.desc) ? detail.desc.join(' ') : '';
          const shortDesc = desc.slice(0,180) + (desc.length>180?'…':'');
          const line = `${detail.name} (Nv ${detail.level}, ${detail.school?.name||''}) — ${shortDesc} [en inglés, fuente: dnd5eapi.co]`;
          await addSpellLineToEntry(targetId, line);
          btn.textContent = 'Agregado ✓';
        }catch(e){ btn.textContent = 'Error de conexión'; }
      });
    });
  }catch(e){
    results.innerHTML = '<div class="hint">No se pudo conectar con la API en este entorno. Probá el grimorio básico de arriba mientras tanto.</div>';
  }
});

