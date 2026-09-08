/* modules/writer.js — Herramientas de escritura: modo lectura (oculta secretos),
   verificador de nombres y exportación a .docx del diario. Todo funciona sin
   librerías externas: el .docx se arma a mano como un ZIP mínimo (sin compresión). */

/* ========================= MODO LECTURA ========================= */
function setReaderMode(on){
  readerMode = on;
  const btn = document.getElementById('readerModeBtn');
  btn.classList.toggle('active', on);
  btn.innerHTML = `<svg class="icon"><use href="#${on ? 'i-eye-off' : 'i-eye'}"/></svg>`;
  btn.title = on ? 'Modo lectura activado (clic para desactivar)' : 'Modo lectura (oculta secciones marcadas como secretas)';
  showToast(on ? 'Modo lectura activado: las secciones secretas quedan ocultas' : 'Modo lectura desactivado');
  if(document.getElementById('journalGrid')) renderJournalGrid();
  if(document.getElementById('journalTimelineList')) renderJournalTimeline();
  if(fichasMode === 'editor' && document.getElementById('wsBlocks')) renderBlocks();
}
document.getElementById('readerModeBtn').addEventListener('click', ()=> setReaderMode(!readerMode));

/* ========================= VERIFICADOR DE NOMBRES ========================= */
function levenshtein(a, b){
  const m = a.length, n = b.length;
  const dp = [];
  for(let i=0;i<=m;i++){ dp.push([i]); }
  for(let j=1;j<=n;j++){ dp[0][j] = j; }
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}
const NAME_CHECK_STOPWORDS = new Set(['El','La','Los','Las','Un','Una','Unos','Unas','Y','Pero','Sin','Con','Por','Para','Que','Cuando','Donde','Como','Si','No','Entonces','Después','Antes','Luego','Aunque','Mientras','Porque','Este','Esta','Estos','Estas','Ese','Esa','Esos','Esas','Su','Sus','Mi','Mis','Tu','Tus','También','Ya','Así','Allí','Aquí','Nunca','Siempre','Todo','Toda','Todos','Todas','Cada','Otro','Otra','Otros','Otras','Capítulo']);
const NAME_CHECK_WORD_RE = /(?<![A-Za-zÁÉÍÓÚÑáéíóúñ])[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?![A-Za-zÁÉÍÓÚÑáéíóúñ])/g;
function collectCapitalizedWordFreq(){
  const freq = {};
  journalEntries.forEach(j=>{
    const text = stripHtml(j.content);
    (text.match(NAME_CHECK_WORD_RE) || []).forEach(w=>{ freq[w] = (freq[w]||0) + 1; });
  });
  return freq;
}
function openNameCheckerModal(){
  const freq = collectCapitalizedWordFreq();
  const names = Object.keys(freq).filter(w => !NAME_CHECK_STOPWORDS.has(w));
  const sorted = names.slice().sort((a,b)=> freq[b]-freq[a]);
  const consumed = new Set();
  const flagged = [];
  sorted.forEach(name=>{
    if(consumed.has(name)) return;
    const variants = sorted.filter(other =>
      other !== name && !consumed.has(other) &&
      Math.abs(other.length - name.length) <= 2 &&
      freq[other] < freq[name] &&
      levenshtein(name.toLowerCase(), other.toLowerCase()) <= 2
    );
    if(variants.length){
      variants.forEach(v=>consumed.add(v));
      flagged.push({ main:name, mainCount:freq[name], variants: variants.map(v=>({ name:v, count:freq[v] })) });
    }
  });
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.style.width = 'min(640px,94vw)';
  const flaggedHtml = flagged.length ? flagged.map(f=>`
    <div class="grimoire-row namecheck-row">
      <div><strong>${escapeHtml(f.main)}</strong> <span class="hint">(${f.mainCount}×)</span> — ¿posible variante de: ${f.variants.map(v=>`${escapeHtml(v.name)} (${v.count}×)`).join(', ')}?</div>
    </div>`).join('') : '<div class="hint">No se detectaron inconsistencias evidentes entre los nombres.</div>';
  const allNamesHtml = sorted.slice(0,60).map(n=>`<span class="tag-pill">${escapeHtml(n)} · ${freq[n]}</span>`).join(' ') || '<div class="hint">Todavía no hay suficiente texto en el diario.</div>';
  box.innerHTML = `
    <div class="modal-title">Verificador de nombres</div>
    <div class="modal-message">Analiza todos los capítulos del diario buscando nombres propios que se repiten con grafías parecidas (posibles errores de tipeo). Es una ayuda heurística, no un corrector ortográfico: revisá vos las coincidencias.</div>
    <div class="ws-section-title">Posibles inconsistencias</div>
    ${flaggedHtml}
    <div class="ws-section-title">Nombres detectados en el manuscrito</div>
    <div class="ficha-tags" style="margin-top:6px;">${allNamesHtml}</div>
    <div class="modal-actions"><div></div><div><button class="btn-ghost" id="modalCancel">Cerrar</button></div></div>`;
  overlay.classList.add('open');
  document.getElementById('modalCancel').onclick = closeModal;
}
document.getElementById('journalCheckNamesBtn').addEventListener('click', openNameCheckerModal);

/* ========================= EXPORTAR .DOCX ========================= */
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=> URL.revokeObjectURL(url), 4000);
}
function crc32(bytes){
  if(!crc32.table){
    const table = [];
    for(let n=0;n<256;n++){
      let c = n;
      for(let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    crc32.table = table;
  }
  let crc = 0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++) crc = crc32.table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function pushU16(arr, n){ arr.push(n & 0xFF, (n >> 8) & 0xFF); }
function pushU32(arr, n){ arr.push(n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >>> 24) & 0xFF); }
function buildZip(files){
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach(f=>{
    const nameBytes = encoder.encode(f.name);
    const data = typeof f.data === 'string' ? encoder.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = [];
    pushU32(lh, 0x04034b50); pushU16(lh, 20); pushU16(lh, 0); pushU16(lh, 0);
    pushU16(lh, 0); pushU16(lh, 0); pushU32(lh, crc); pushU32(lh, data.length); pushU32(lh, data.length);
    pushU16(lh, nameBytes.length); pushU16(lh, 0);
    const lhBytes = new Uint8Array(lh);
    localParts.push(lhBytes, nameBytes, data);
    const ch = [];
    pushU32(ch, 0x02014b50); pushU16(ch, 20); pushU16(ch, 20); pushU16(ch, 0); pushU16(ch, 0);
    pushU16(ch, 0); pushU16(ch, 0); pushU32(ch, crc); pushU32(ch, data.length); pushU32(ch, data.length);
    pushU16(ch, nameBytes.length); pushU16(ch, 0); pushU16(ch, 0); pushU16(ch, 0); pushU16(ch, 0);
    pushU32(ch, 0); pushU32(ch, offset);
    centralParts.push(new Uint8Array(ch), nameBytes);
    offset += lhBytes.length + nameBytes.length + data.length;
  });
  const centralStart = offset;
  const centralSize = centralParts.reduce((s,p)=>s+p.length, 0);
  const eocd = [];
  pushU32(eocd, 0x06054b50); pushU16(eocd, 0); pushU16(eocd, 0);
  pushU16(eocd, files.length); pushU16(eocd, files.length);
  pushU32(eocd, centralSize); pushU32(eocd, centralStart); pushU16(eocd, 0);
  return new Blob([...localParts, ...centralParts, new Uint8Array(eocd)], { type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
function escapeXml(str){ return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
function extractRuns(node, fmt){
  let runs = [];
  node.childNodes.forEach(child=>{
    if(child.nodeType === Node.TEXT_NODE){
      if(child.textContent) runs.push({ text: child.textContent, ...fmt });
    } else if(child.nodeType === Node.ELEMENT_NODE){
      const tag = child.tagName.toLowerCase();
      if(tag === 'br'){ runs.push({ isBreak:true }); return; }
      const newFmt = { ...fmt };
      if(tag==='b' || tag==='strong') newFmt.bold = true;
      if(tag==='i' || tag==='em') newFmt.italic = true;
      if(tag==='u') newFmt.underline = true;
      runs = runs.concat(extractRuns(child, newFmt));
    }
  });
  return runs;
}
function htmlToParagraphs(html){
  const container = document.createElement('div');
  container.innerHTML = html || '';
  const paragraphs = [];
  container.childNodes.forEach(child=>{
    if(child.nodeType === Node.TEXT_NODE){
      if(child.textContent.trim()) paragraphs.push({ runs:[{ text: child.textContent }] });
      return;
    }
    if(child.nodeType !== Node.ELEMENT_NODE) return;
    const tag = child.tagName.toLowerCase();
    if(tag==='p' || tag==='div' || tag==='blockquote'){
      paragraphs.push({ runs: extractRuns(child, {}) });
    } else if(/^h[1-3]$/.test(tag)){
      paragraphs.push({ runs: extractRuns(child, { bold:true }), heading: Number(tag[1]) });
    } else if(tag==='ul' || tag==='ol'){
      [...child.children].forEach((li, idx)=>{
        paragraphs.push({ runs: extractRuns(li, {}), listPrefix: tag==='ul' ? '•  ' : (idx+1)+'.  ' });
      });
    } else if(tag==='hr'){
      paragraphs.push({ runs:[{ text:'───────────────────────' }] });
    } else if(tag==='img'){
      /* la exportación a .docx no incrusta imágenes en esta versión */
    } else {
      const runs = extractRuns(child, {});
      if(runs.length) paragraphs.push({ runs });
    }
  });
  return paragraphs;
}
function runToXml(run){
  if(run.isBreak) return '<w:br/>';
  const rPrParts = [];
  if(run.bold) rPrParts.push('<w:b/>');
  if(run.italic) rPrParts.push('<w:i/>');
  if(run.underline) rPrParts.push('<w:u w:val="single"/>');
  if(run.size){ rPrParts.push(`<w:sz w:val="${run.size}"/><w:szCs w:val="${run.size}"/>`); }
  const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(run.text||'')}</w:t></w:r>`;
}
function paragraphToXml(p, opts={}){
  const pPr = opts.pageBreakBefore ? '<w:pPr><w:pageBreakBefore/></w:pPr>' : '';
  const headingSize = p.heading===1 ? 32 : p.heading===2 ? 28 : p.heading===3 ? 24 : null;
  let runsXml = p.listPrefix ? runToXml({ text: p.listPrefix }) : '';
  runsXml += p.runs.map(r => headingSize ? runToXml({ ...r, bold:true, size:headingSize }) : runToXml(r)).join('');
  return `<w:p>${pPr}${runsXml}</w:p>`;
}
function buildManuscriptDocxBlob(chapters){
  let bodyXml = '';
  chapters.forEach((ch, idx)=>{
    bodyXml += paragraphToXml({ runs:[{ text: ch.title || 'Sin título' }], heading:1 }, { pageBreakBefore: idx>0 });
    const metaText = [ch.eventLabel, ch.date].filter(Boolean).join(' — ');
    if(metaText) bodyXml += paragraphToXml({ runs:[{ text: metaText, italic:true }] });
    bodyXml += paragraphToXml({ runs:[] });
    htmlToParagraphs(ch.content).forEach(p => bodyXml += paragraphToXml(p));
  });
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}<w:sectPr/></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return buildZip([
    { name:'[Content_Types].xml', data: contentTypes },
    { name:'_rels/.rels', data: rels },
    { name:'word/document.xml', data: documentXml }
  ]);
}
document.getElementById('journalExportDocxBtn').addEventListener('click', ()=>{
  const chapters = sortedJournalEntries();
  if(!chapters.length){ showToast('No hay capítulos para exportar'); return; }
  const blob = buildManuscriptDocxBlob(chapters);
  const filename = ((worldMeta.worldName||'manuscrito').trim().replace(/\s+/g,'_')) + '.docx';
  downloadBlob(blob, filename);
  showToast('Manuscrito exportado: ' + filename);
});
