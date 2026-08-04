/* state.js — Estado global y constantes compartidas.
   Extraído sin modificar de index.html (Fase 2 de la migración modular). */
const TYPES = {
  personaje: { label:'Personaje', color:'#e0b45c', glyph:'☉' },
  lugar:     { label:'Lugar',     color:'#8fc4b0', glyph:'△' },
  objeto:    { label:'Objeto',    color:'#c98fd6', glyph:'◆' }
};
const uid = () => 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
const PROJECT_FILE_NAME_SUFFIX = '_project.json';

/* ========================= STATE ========================= */
let worldMeta = { worldName:'Mundo sin nombre', folders:[], settings:{}, theme:{} };
let entriesIndex = [];
let activeFolder = 'all';
let activeType = 'all';
let searchTerm = '';
let currentEntryId = null;
let currentBlocks = [];
let fichasMode = 'grid';
let selectMode = false;
let selectedIds = new Set();
let wsEnable5E = false;
let wsCoverData = null;
let wsCoverPos = { x:50, y:50 };
let wsCoverZoom = 1;
let coverDragState = null;
let wsDirty = false;

let canvasData = { nodes:[], edges:[] };
let canvasLoaded = false;
let canvasPan = { x:60, y:40 };
let canvasZoom = 1;
let draggingNode = null;
let panningCanvas = false;
let connectMode = false;
let connectSrc = null;

let mapsIndex = [];
let mapsLoaded = false;
let currentMap = null;
let mapMode = 'pin';
let regionDraft = [];
let projectDirty = false;
let dirHandle = null;

let journalEntries = [];
let currentJournalId = null;
let sessionLog = [];
let currentSessionId = null;
let grimorioInited = false;

function markDirty(){ projectDirty = true; }
function clearDirty(){ projectDirty = false; }
window.addEventListener('beforeunload', (e)=>{
  if(projectDirty || wsDirty){ e.preventDefault(); e.returnValue = ''; }
});

