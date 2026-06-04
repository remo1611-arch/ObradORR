(function(){
  "use strict";
  const VERSION = "2.0.0";
  function n(v, fb=0){ const x=Number(v); return Number.isFinite(x)?x:fb; }
  function q(db, sql, bind){ return db.query(sql, bind || {}); }
  function val(db, sql, bind){ return db.value(sql, bind || {}); }
  function iso(){ return window.ObradORRFileTools ? window.ObradORRFileTools.isoStamp() : new Date().toISOString().replace(/[:.]/g,'-').slice(0,19); }
  function escHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function csvCell(v){
    const s = String(v ?? '');
    return /["\n\r;,\t]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  }
  function delimited(rows, delimiter=','){
    return rows.map(r => r.map(csvCell).join(delimiter)).join('\n') + '\n';
  }
  function encodeText(text){ return new TextEncoder().encode(String(text ?? '')); }
  function downloadBlob(filename, content, type){
    if(window.ObradORRFileTools) return window.ObradORRFileTools.downloadBlob(filename, content, type);
    const blob = content instanceof Blob ? content : new Blob([content], {type: type || 'application/octet-stream'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }
  // CRC32 + ZIP sin compresión, suficiente para exportaciones docentes offline sin dependencia externa.
  let crcTable = null;
  function crc32(bytes){
    if(!crcTable){ crcTable = new Uint32Array(256); for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c = (c&1)?(0xEDB88320^(c>>>1)):(c>>>1); crcTable[i]=c>>>0; } }
    let c = 0xffffffff;
    for(const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function u16(v){ return [v & 255, (v>>>8)&255]; }
  function u32(v){ return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]; }
  function concat(chunks){ const len=chunks.reduce((a,c)=>a+c.length,0); const out=new Uint8Array(len); let o=0; for(const c of chunks){ out.set(c,o); o+=c.length; } return out; }
  function zipStore(files){
    const local=[], central=[]; let offset=0;
    for(const file of files){
      const nameBytes = encodeText(file.name.replace(/^\/+/,''));
      const data = file.bytes instanceof Uint8Array ? file.bytes : encodeText(file.bytes);
      const crc = crc32(data);
      const lh = new Uint8Array([0x50,0x4b,0x03,0x04, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0)]);
      local.push(lh,nameBytes,data);
      const ch = new Uint8Array([0x50,0x4b,0x01,0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]);
      central.push(ch,nameBytes);
      offset += lh.length + nameBytes.length + data.length;
    }
    const centralBytes = concat(central); const localBytes = concat(local);
    const end = new Uint8Array([0x50,0x4b,0x05,0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralBytes.length), ...u32(localBytes.length), ...u16(0)]);
    return concat([localBytes, centralBytes, end]);
  }
  function catalogRows(db){
    const rows = [['uid','tipo','id','nombre','familia','subfamilia','estado_interno','release_status','rendimiento','coste_total']];
    for(const r of q(db, `SELECT uid,source_type,source_id,name,family,subfamily,status,release_status,COALESCE(yield_quantity,base_servings,base_flour_g,'') AS rendimiento,total_cost FROM v_elaborations_unified WHERE COALESCE(active,1)=1 ORDER BY name COLLATE NOCASE`)) rows.push([r.uid,r.source_type,r.source_id,r.name,r.family,r.subfamily,r.status,r.release_status,r.rendimiento,r.total_cost]);
    return rows;
  }
  function ingredientsRows(db){
    const rows = [['id','nombre','familia','subfamilia','unidad_base','precio_compra','cantidad_neta','merma_pct','coste_base','grupo_pedido','zona','proveedor','activo']];
    for(const r of q(db, `SELECT id,name,family,subfamily,base_unit,purchase_price,purchase_net_quantity,waste_pct,cost_per_base_unit_after_waste,order_group,storage_zone,supplier,active FROM v_ingredients_cost ORDER BY name COLLATE NOCASE`)) rows.push([r.id,r.name,r.family,r.subfamily,r.base_unit,r.purchase_price,r.purchase_net_quantity,r.waste_pct,r.cost_per_base_unit_after_waste,r.order_group,r.storage_zone,r.supplier,r.active]);
    return rows;
  }
  function allergensRows(db){
    const rows = [['ingrediente_id','ingrediente','alergeno_id','alergeno','orden_normativo','estado_declaracion']];
    for(const r of q(db, `SELECT i.id AS ingredient_id,i.name AS ingredient,a.id AS allergen_id,a.name AS allergen,a.regulation_order,ia.declaration_status FROM ingredient_allergens ia JOIN ingredients i ON i.id=ia.ingredient_id JOIN allergens a ON a.id=ia.allergen_id WHERE a.regulation_order BETWEEN 1 AND 14 ORDER BY a.regulation_order,i.name COLLATE NOCASE`)) rows.push([r.ingredient_id,r.ingredient,r.allergen_id,r.allergen,r.regulation_order,r.declaration_status]);
    return rows;
  }
  function selectionOrderRows(db, state, opts){
    const engine = window.ObradORRRecursiveEngine;
    const rows = [['grupo','ingrediente_id','ingrediente','cantidad','unidad','zona','usado_en','coste_estimado']];
    if(!engine || !state || !state.selection) return rows;
    const lines = engine.selectionOrderLines(db, state.selection, opts || {});
    const ag = engine.aggregate(lines);
    for(const r of ag.sort((a,b)=>String(a.order_group||'').localeCompare(String(b.order_group||''),'es') || String(a.name||'').localeCompare(String(b.name||''),'es'))){
      rows.push([r.order_group || 'Otros', r.ingredient_id || '', r.name || '', Number(r.quantity || 0), r.unit || '', r.storage_zone || '', Array.isArray(r.usedIn)?r.usedIn.join(' · '):String(r.usedIn||''), Number(r.cost || 0)]);
    }
    return rows;
  }
  function selectionAllergensRows(db, state, opts){
    const engine = window.ObradORRRecursiveEngine;
    const rows = [['alergeno_id','alergeno','orden_normativo','ingredientes_origen']];
    if(!engine || !state || !state.selection) return rows;
    const lines = engine.selectionOrderLines(db, state.selection, opts || {});
    const allergens = engine.allergensFromLines(db, lines);
    const map = new Map();
    for(const a of allergens){
      if(!map.has(a.allergen_id)) map.set(a.allergen_id, { id:a.allergen_id, name:a.allergen, order:a.regulation_order, ingredients:new Set() });
      map.get(a.allergen_id).ingredients.add(a.ingredient);
    }
    for(const a of [...map.values()].sort((x,y)=>n(x.order)-n(y.order))) rows.push([a.id,a.name,a.order,[...a.ingredients].sort().join(' · ')]);
    return rows;
  }
  function currentPracticeJson(db, state, opts){
    const engine = window.ObradORRRecursiveEngine;
    const preflight = window.ObradORRPreflight ? window.ObradORRPreflight.run({ db, state, items: state.selection || [], options: opts || {} }) : null;
    const orderRows = selectionOrderRows(db, state, opts);
    return {
      schema: 'ObradORRPracticeExport/2.0-rc1',
      generatedAt: new Date().toISOString(),
      appVersion: VERSION,
      printOptions: opts || state.printOptions || {},
      selection: state.selection || [],
      order: orderRows,
      preflight,
      validationNotice: 'Exportación documental. No acredita validación de obrador.'
    };
  }
  function technicalJson(db, state){
    return {
      schema: 'ObradORRTechnicalExport/2.0-rc1', generatedAt: new Date().toISOString(), appVersion: VERSION,
      meta: q(db, 'SELECT key,value FROM app_meta ORDER BY key'),
      recipes: q(db, `SELECT * FROM v_elaborations_unified WHERE COALESCE(active,1)=1 ORDER BY name COLLATE NOCASE`),
      ingredients: q(db, `SELECT * FROM v_ingredients_cost ORDER BY name COLLATE NOCASE`),
      allergens: q(db, `SELECT ia.*, i.name AS ingredient, a.name AS allergen FROM ingredient_allergens ia JOIN ingredients i ON i.id=ia.ingredient_id JOIN allergens a ON a.id=ia.allergen_id ORDER BY a.regulation_order,i.name`)
    };
  }
  function printablePracticeHtml(db, state, opts){
    const title = (opts && opts.teaching && opts.teaching.title) || 'Práctica ObradORR';
    const order = selectionOrderRows(db,state,opts);
    const allergens = selectionAllergensRows(db,state,opts);
    return `<!doctype html><html lang="es"><meta charset="utf-8"><title>${escHtml(title)}</title><style>body{font-family:Arial,sans-serif;margin:24px;line-height:1.35}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f3f4f6}.muted{color:#666}.page{page-break-before:always}</style><h1>${escHtml(title)}</h1><p class="muted">Exportación HTML imprimible generada desde ObradORR. Pendiente de validación de obrador.</p><h2>Elaboraciones</h2><ol>${(state.selection||[]).map(i=>`<li>${escHtml(i.name)} · ${escHtml(i.qty)} ${escHtml(i.unitLabel||'')}</li>`).join('')}</ol><h2>Pedido consolidado</h2>${tableHtml(order)}<h2>Alérgenos consolidados</h2>${tableHtml(allergens)}</html>`;
  }
  function tableHtml(rows){ if(!rows || !rows.length) return '<p>Sin datos.</p>'; const head=rows[0], body=rows.slice(1); return `<table><thead><tr>${head.map(h=>`<th>${escHtml(h)}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${escHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
  function exportCatalogCsv(db){ downloadBlob(`obradorr_catalogo_${iso()}.csv`, delimited(catalogRows(db)), 'text/csv;charset=utf-8'); }
  function exportIngredientsCsv(db){ downloadBlob(`obradorr_ingredientes_${iso()}.csv`, delimited(ingredientsRows(db)), 'text/csv;charset=utf-8'); }
  function exportAllergensCsv(db){ downloadBlob(`obradorr_alergenos_${iso()}.csv`, delimited(allergensRows(db)), 'text/csv;charset=utf-8'); }
  function exportOrderDelimited(db,state,opts,delimiter){ downloadBlob(`obradorr_pedido_${iso()}${delimiter==='\t'?'.tsv':'.csv'}`, delimited(selectionOrderRows(db,state,opts), delimiter), delimiter==='\t'?'text/tab-separated-values;charset=utf-8':'text/csv;charset=utf-8'); }
  function exportPracticeJson(db,state,opts){ downloadBlob(`obradorr_practica_${iso()}.json`, JSON.stringify(currentPracticeJson(db,state,opts), null, 2), 'application/json;charset=utf-8'); }
  function exportTechnicalJson(db,state){ downloadBlob(`obradorr_export_tecnico_${iso()}.json`, JSON.stringify(technicalJson(db,state), null, 2), 'application/json;charset=utf-8'); }
  function exportPracticeZip(db,state,opts){
    const practice = currentPracticeJson(db,state,opts);
    const files = [
      {name:'README_PRACTICA.txt', bytes: encodeText('Exportación de práctica ObradORR. Documentación docente pendiente de validación de obrador.\nGenerado: '+new Date().toISOString()+'\n')},
      {name:'practica.json', bytes: encodeText(JSON.stringify(practice,null,2))},
      {name:'pedido_consolidado.csv', bytes: encodeText(delimited(selectionOrderRows(db,state,opts)))},
      {name:'pedido_consolidado.tsv', bytes: encodeText(delimited(selectionOrderRows(db,state,opts),'\t'))},
      {name:'alergenos_consolidados.csv', bytes: encodeText(delimited(selectionAllergensRows(db,state,opts)))},
      {name:'fichas_practica.html', bytes: encodeText(printablePracticeHtml(db,state,opts))}
    ];
    downloadBlob(`obradorr_practica_${iso()}.zip`, zipStore(files), 'application/zip');
  }

  async function chooseBackupDirectory(){ if(!window.ObradORRFileTools) return alert('Módulo de archivos no cargado.'); await window.ObradORRFileTools.chooseBackupDirectory(); }
  async function saveBackupSqlite(db){ if(!window.ObradORRFileTools) return alert('Módulo de archivos no cargado.'); await window.ObradORRFileTools.saveBlob(window.ObradORRFileTools.filename('ObradORR_Backup_SQLite','base','sqlite'), db.exportBytes(), 'application/vnd.sqlite3'); alert('Copia SQLite creada.'); }
  async function saveBackupJson(db,state){ if(!window.ObradORRFileTools) return alert('Módulo de archivos no cargado.'); await window.ObradORRFileTools.saveBlob(window.ObradORRFileTools.filename('ObradORR_Backup_JSON','tecnico','json'), JSON.stringify(technicalJson(db,state),null,2), 'application/json;charset=utf-8'); alert('Copia JSON creada.'); }
  async function saveBackupZip(db,state,opts){
    if(!window.ObradORRFileTools) return alert('Módulo de archivos no cargado.');
    const files = [
      {name:'README_BACKUP.txt', bytes: encodeText('Backup completo ObradORR 2.0. No acredita validación de obrador. Generado: '+new Date().toISOString()+'\n')},
      {name:'obradorr.sqlite', bytes: db.exportBytes()},
      {name:'tecnico.json', bytes: encodeText(JSON.stringify(technicalJson(db,state),null,2))},
      {name:'practica_actual.json', bytes: encodeText(JSON.stringify(currentPracticeJson(db,state,opts || {}),null,2))},
      {name:'pedido_consolidado.csv', bytes: encodeText(delimited(selectionOrderRows(db,state,opts || {})))}
    ];
    await window.ObradORRFileTools.saveBlob(window.ObradORRFileTools.filename('ObradORR_Backup_Completo','datos','zip'), zipStore(files), 'application/zip'); alert('Copia ZIP creada.');
  }
  window.ObradORRExportTools = { version: VERSION, delimited, catalogRows, ingredientsRows, allergensRows, selectionOrderRows, selectionAllergensRows, currentPracticeJson, technicalJson, exportCatalogCsv, exportIngredientsCsv, exportAllergensCsv, exportOrderDelimited, exportPracticeJson, exportTechnicalJson, exportPracticeZip, chooseBackupDirectory, saveBackupSqlite, saveBackupJson, saveBackupZip };
})();
