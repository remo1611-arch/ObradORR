(function(){
  "use strict";
  const VERSION = "2.0.0";
  let backupDirectoryHandle = null;
  function pad(n){ return String(n).padStart(2,'0'); }
  function getIsoTimestampForFilename(date){
    const d = date || new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }
  const isoStamp = getIsoTimestampForFilename;
  function sanitizeFilenamePart(s){
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80) || 'sin_nombre';
  }
  function filename(prefix, label, ext){
    const mid = label ? '_' + sanitizeFilenamePart(label) : '';
    return `${sanitizeFilenamePart(prefix)}${mid}_${isoStamp()}.${String(ext||'dat').replace(/^\./,'')}`;
  }
  function spanishLongDate(value){
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    const s = new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1); // Mantiene formato: Jueves, 4 de junio de 2026
  }
  function downloadBlob(filename, content, type){
    const blob = content instanceof Blob ? content : new Blob([content], {type: type || 'application/octet-stream'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }
  async function chooseBackupDirectory(){
    if (!window.showDirectoryPicker) {
      alert('Este navegador no permite escoger carpeta. ObradORR usará descarga normal como fallback.');
      return null;
    }
    backupDirectoryHandle = await window.showDirectoryPicker({ mode:'readwrite' });
    alert('Carpeta de copias seleccionada para esta sesión. Si el navegador revoca el permiso, se usará descarga normal.');
    return backupDirectoryHandle;
  }
  async function saveBlob(filename, content, type){
    const blob = content instanceof Blob ? content : new Blob([content], {type: type || 'application/octet-stream'});
    if (backupDirectoryHandle && backupDirectoryHandle.getFileHandle) {
      try {
        const handle = await backupDirectoryHandle.getFileHandle(filename, { create:true });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { mode:'folder', filename };
      } catch(error){ console.warn('[ObradORR] No se pudo escribir en carpeta elegida; se descarga como fallback.', error); }
    }
    downloadBlob(filename, blob, type);
    return { mode:'download', filename };
  }
  function hasFolderPicker(){ return !!window.showDirectoryPicker; }
  function backupDirectorySelected(){ return !!backupDirectoryHandle; }
  window.ObradORRFileTools = { version: VERSION, isoStamp, getIsoTimestampForFilename, sanitizeFilenamePart, filename, spanishLongDate, downloadBlob, chooseBackupDirectory, saveBlob, hasFolderPicker, backupDirectorySelected };
})();