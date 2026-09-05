/* init.js — Arranque final: se ejecuta después de que todos los módulos ya definieron
   sus funciones y adjuntaron sus listeners (mismo comportamiento que el
   bloque INIT original de index.html). */
renderWsFolderOptions(null);
loadWorld().then(()=>{
  loadExtras().then(()=>{
    const loadingScreen = document.getElementById('loading-screen');
    if(loadingScreen){
      loadingScreen.classList.add('hidden');
      setTimeout(()=>{
        loadingScreen.style.display = 'none';
      }, 400);
    }
  });
});
