/* state.js — Estado global y constantes compartidas.
   Extraído sin modificar de index.html (Fase 2 de la migración modular). */
const uid = () => 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
const PROJECT_FILE_NAME_SUFFIX = '_project.json';

/* ========================= STATE ========================= */
let worldMeta = { worldName:'Mundo sin nombre', folders:[], settings:{}, theme:{} };
let entriesIndex = [];
let activeFolder = 'all';
let folderExpandedIds = new Set();
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
let activeMapFolder = 'all';
let projectDirty = false;
let dirHandle = null;
let projectFileName = null;

let journalEntries = [];
let currentJournalId = null;
let journalDirty = false;
let sessionLog = [];
let currentSessionId = null;
let sessionDirty = false;
let grimorioInited = false;

let combatState = { combatants:[], round:1, turnIndex:0, active:false };
let lootTables = [];
let readerMode = false;

function markDirty(){ projectDirty = true; }
function clearDirty(){ projectDirty = false; }
window.addEventListener('beforeunload', (e)=>{
  if(projectDirty || wsDirty || journalDirty || sessionDirty){ e.preventDefault(); e.returnValue = ''; }
});

