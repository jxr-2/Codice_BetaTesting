/* init.js — Arranque final: se ejecuta después de que todos los módulos ya definieron
   sus funciones y adjuntaron sus listeners (mismo comportamiento que el
   bloque INIT original de index.html). */
renderWsTypeOptions('personaje');
renderWsFolderOptions(null);
loadWorld();
loadExtras();
