(function(){
  "use strict";
  const VERSION = "2.1.0";
  const CORE_TABLES = [
    'ingredients','ingredient_allergens',
    'culinary_recipes','culinary_recipe_lines',
    'bakery_recipes','bakery_preferments','bakery_recipe_lines','bakery_process_steps','bakery_recipe_components',
    'appcc_doc_blocks','recipe_documentary_reviews','media_assets','recipe_media','recipe_photos',
    'workshop_validation_log',
    'class_sessions','class_session_items'
  ];
  const POLICY = {
    version: VERSION,
    overwriteExisting: false,
    validateByImport: false,
    validationPolicy: 'Las validaciones externas se importan como evidencia histórica si la ficha destino se identifica de forma inequívoca. Nunca convierten una ficha en validada por sí solas.',
    mediaPolicy: 'Los assets embebidos en SQLite se importan si existen en media_assets; recipe_photos con rutas externas se omiten para evitar fotos rotas.',
    documentaryReviewPolicy: 'recipe_documentary_reviews se importa como cobertura documental; no acredita validación de obrador.'
  };
  function q(db, sql, bind){ return db.query(sql, bind || {}); }
  function val(db, sql, bind){ return db.value(sql, bind || {}); }
  function nowStamp(){ return (window.ObradORRFileTools && window.ObradORRFileTools.isoStamp) ? window.ObradORRFileTools.isoStamp() : new Date().toISOString().replace(/[:.]/g,'-').slice(0,19); }
  function normalizeText(s){ return String(s ?? '').trim(); }
  function signature(row, ignore){
    const drop = new Set(ignore || ['created_at','updated_at']);
    const o = {};
    Object.keys(row || {}).sort().forEach(k=>{ if(!drop.has(k)) o[k] = row[k] === undefined ? null : row[k]; });
    return JSON.stringify(o);
  }
  function tableColumns(db, table){ return q(db, `PRAGMA table_info(${table})`).map(c=>c.name); }
  function existsTable(db, table){ return !!val(db, "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=$t", {$t:table}); }
  function rowById(db, table, id){ return q(db, `SELECT * FROM ${table} WHERE id=$id`, {$id:id})[0] || null; }
  function nameExists(db, table, name){ return !!val(db, `SELECT COUNT(*) FROM ${table} WHERE name=$name`, {$name:name}); }
  function uniqueId(db, table, base){ let id=base, i=1; while(rowById(db, table, id)){ id = `${base}-${i++}`; } return id; }
  function uniqueName(db, table, base, suffix){ let name = `${base} (import ${suffix})`, i=2; while(nameExists(db, table, name)){ name = `${base} (import ${suffix} ${i++})`; } return name; }
  function insertRow(db, table, row){
    const cols = tableColumns(db, table).filter(c => Object.prototype.hasOwnProperty.call(row, c));
    if(!cols.length) return;
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(c=>'$'+c).join(',')})`;
    const bind = {}; cols.forEach(c => bind['$'+c] = row[c]); db.exec(sql, bind);
  }
  function mappedRecipeId(kind, id, culMap, bakMap){
    if(!id) return id;
    const k = String(kind || '').toLowerCase();
    if(k.includes('bakery') || k.includes('pan')) return bakMap[id] || id;
    return culMap[id] || id;
  }
  function recipeExists(db, kind, id){
    if(!id) return false;
    const k = String(kind || '').toLowerCase();
    const table = (k.includes('bakery') || k.includes('pan')) ? 'bakery_recipes' : 'culinary_recipes';
    return !!rowById(db, table, id);
  }
  function sourceTableExists(importDb, currentDb, table){
    return existsTable(importDb, table) && existsTable(currentDb, table);
  }
  function updateFk(row, key, map){ if(row[key] && map[row[key]]) row[key] = map[row[key]]; }
  function ensureImportLog(db){
    db.exec(`CREATE TABLE IF NOT EXISTS import_log (id TEXT PRIMARY KEY, imported_at TEXT DEFAULT CURRENT_TIMESTAMP, source_name TEXT, source_schema TEXT, summary_json TEXT, notes TEXT)`);
  }
  function schemaOk(importDb){
    const required = ['app_meta','ingredients','culinary_recipes','bakery_recipes','culinary_recipe_lines','bakery_recipe_lines'];
    const missing = required.filter(t => !existsTable(importDb, t));
    if(missing.length) throw new Error('La base importada no es ObradORR compatible. Faltan tablas: '+missing.join(', '));
    return true;
  }
  function preview(currentDb, importDb){
    schemaOk(importDb);
    const out = { sourceVersion: val(importDb, "SELECT value FROM app_meta WHERE key='app_version'") || '', tables:{}, totalNew:0, totalIdentical:0, totalConflicts:0 };
    for(const t of CORE_TABLES){
      if(!existsTable(currentDb,t) || !existsTable(importDb,t)) continue;
      const rows = q(importDb, `SELECT * FROM ${t}`);
      const stat = { rows: rows.length, nuevos:0, identicos:0, conflictos:0 };
      for(const r of rows){
        const key = (t === 'ingredient_allergens') ? `${r.ingredient_id}||${r.allergen_id}` : r.id;
        let cur = null;
        if(t === 'ingredient_allergens') cur = q(currentDb, `SELECT * FROM ingredient_allergens WHERE ingredient_id=$i AND allergen_id=$a`, {$i:r.ingredient_id,$a:r.allergen_id})[0] || null;
        else if(key) cur = rowById(currentDb, t, key);
        if(!cur) stat.nuevos++;
        else if(signature(cur) === signature(r)) stat.identicos++;
        else stat.conflictos++;
      }
      out.tables[t]=stat; out.totalNew += stat.nuevos; out.totalIdentical += stat.identicos; out.totalConflicts += stat.conflictos;
    }
    return out;
  }
  function merge(currentDb, importDb, sourceName){
    schemaOk(importDb); ensureImportLog(currentDb);
    const suffix = nowStamp();
    const summary = { importedAt:new Date().toISOString(), sourceName: sourceName || '', sourceVersion: val(importDb, "SELECT value FROM app_meta WHERE key='app_version'") || '', policy: POLICY, nuevos:0, identicos:0, conflictosVariantes:0, omitidos:0, tables:{} };
    const ingMap = {}, culMap = {}, bakMap = {}, sessionMap = {};
    currentDb.exec('BEGIN IMMEDIATE;');
    try{
      // Ingredients first, with no overwrite.
      if(existsTable(importDb,'ingredients')){
        summary.tables.ingredients = { nuevos:0, identicos:0, conflictosVariantes:0 };
        for(const r0 of q(importDb,'SELECT * FROM ingredients ORDER BY name COLLATE NOCASE')){
          const r = Object.assign({}, r0);
          const cur = rowById(currentDb,'ingredients', r.id);
          const nameConflict = r.name && nameExists(currentDb,'ingredients', r.name) && (!cur || cur.id !== r.id);
          if(!cur && !nameConflict){ insertRow(currentDb,'ingredients',r); ingMap[r0.id]=r.id; summary.nuevos++; summary.tables.ingredients.nuevos++; continue; }
          if(cur && signature(cur) === signature(r) && !nameConflict){ ingMap[r0.id]=r.id; summary.identicos++; summary.tables.ingredients.identicos++; continue; }
          const newId = uniqueId(currentDb,'ingredients', `${r.id}-IMPORT-${suffix}`);
          r.id = newId; r.name = uniqueName(currentDb,'ingredients', r.name || r0.id, suffix); r.active = r.active ?? 1;
          insertRow(currentDb,'ingredients', r); ingMap[r0.id]=newId; summary.conflictosVariantes++; summary.tables.ingredients.conflictosVariantes++;
        }
      }
      // Ingredient allergens after mapping.
      if(existsTable(importDb,'ingredient_allergens')){
        summary.tables.ingredient_allergens = { nuevos:0, identicos:0, omitidos:0 };
        for(const r0 of q(importDb,'SELECT * FROM ingredient_allergens')){
          const ingredient = ingMap[r0.ingredient_id] || r0.ingredient_id;
          if(!rowById(currentDb,'ingredients',ingredient)){ summary.omitidos++; summary.tables.ingredient_allergens.omitidos++; continue; }
          if(!val(currentDb,"SELECT COUNT(*) FROM allergens WHERE id=$id", {$id:r0.allergen_id})){ summary.omitidos++; summary.tables.ingredient_allergens.omitidos++; continue; }
          const exists = q(currentDb,'SELECT * FROM ingredient_allergens WHERE ingredient_id=$i AND allergen_id=$a', {$i:ingredient,$a:r0.allergen_id})[0];
          if(exists){ summary.identicos++; summary.tables.ingredient_allergens.identicos++; continue; }
          const r = Object.assign({}, r0, { ingredient_id: ingredient }); insertRow(currentDb,'ingredient_allergens',r); summary.nuevos++; summary.tables.ingredient_allergens.nuevos++;
        }
      }
      function importRecipeTable(table,map){
        summary.tables[table] = { nuevos:0, identicos:0, conflictosVariantes:0 };
        if(!existsTable(importDb,table)) return;
        for(const r0 of q(importDb,`SELECT * FROM ${table} ORDER BY name COLLATE NOCASE`)){
          const r = Object.assign({}, r0); const cur = rowById(currentDb,table,r.id);
          const nameConflict = r.name && nameExists(currentDb,table,r.name) && (!cur || cur.id !== r.id);
          if(!cur && !nameConflict){ r.release_status='pendiente'; if(table==='bakery_recipes') r.yield_status='pending'; insertRow(currentDb,table,r); map[r0.id]=r.id; summary.nuevos++; summary.tables[table].nuevos++; continue; }
          if(cur && signature(cur)===signature(r) && !nameConflict){ map[r0.id]=r.id; summary.identicos++; summary.tables[table].identicos++; continue; }
          const newId = uniqueId(currentDb,table,`${r.id}-IMPORT-${suffix}`);
          r.id = newId; r.name = uniqueName(currentDb,table,r.name || r0.id,suffix); r.status='draft'; r.release_status='pendiente'; r.active = r.active ?? 1; if(table==='bakery_recipes') r.yield_status='pending';
          r.notes = `${r.notes || ''}\n\nVariante importada desde ${r0.id}. No sustituye la ficha existente. Pendiente de revisión docente.`.trim();
          insertRow(currentDb,table,r); map[r0.id]=newId; summary.conflictosVariantes++; summary.tables[table].conflictosVariantes++;
        }
      }
      importRecipeTable('culinary_recipes', culMap);
      importRecipeTable('bakery_recipes', bakMap);
      function importLineTable(table, recipeKey, map, extraMapper){
        summary.tables[table] = { nuevos:0, identicos:0, conflictosVariantes:0, omitidos:0 };
        if(!existsTable(importDb,table)) return;
        for(const r0 of q(importDb,`SELECT * FROM ${table}`)){
          const r = Object.assign({}, r0);
          if(recipeKey && r[recipeKey]) r[recipeKey] = map[r[recipeKey]] || r[recipeKey];
          if(extraMapper) extraMapper(r);
          // skip if recipe target missing
          if(recipeKey && table.includes('culinary') && !rowById(currentDb,'culinary_recipes',r[recipeKey])){ summary.omitidos++; summary.tables[table].omitidos++; continue; }
          if(recipeKey && table.includes('bakery') && !rowById(currentDb,'bakery_recipes',r[recipeKey])){ summary.omitidos++; summary.tables[table].omitidos++; continue; }
          const cur = r.id ? rowById(currentDb,table,r.id) : null;
          if(cur && signature(cur)===signature(r)){ summary.identicos++; summary.tables[table].identicos++; continue; }
          if(cur || !r.id) r.id = uniqueId(currentDb,table,`${r0.id || table}-IMPORT-${suffix}`);
          try{ insertRow(currentDb,table,r); summary.nuevos++; summary.tables[table].nuevos++; } catch(error){ console.warn('[ObradORRImportMerge] omitida línea', table, error); summary.omitidos++; summary.tables[table].omitidos++; }
        }
      }
      importLineTable('culinary_recipe_lines','recipe_id',culMap, r=>{ updateFk(r,'ingredient_id',ingMap); updateFk(r,'subrecipe_id',culMap); });
      importLineTable('bakery_preferments','recipe_id',bakMap, null);
      importLineTable('bakery_recipe_lines','recipe_id',bakMap, r=>{ updateFk(r,'ingredient_id',ingMap); });
      importLineTable('bakery_process_steps','recipe_id',bakMap, null);
      importLineTable('bakery_recipe_components','bakery_recipe_id',bakMap, r=>{ updateFk(r,'component_culinary_recipe_id',culMap); updateFk(r,'component_bakery_recipe_id',bakMap); });

      // APPCC documentary blocks: import only if recipe target is mapped and exists. Does not validate recipes.
      if(sourceTableExists(importDb,currentDb,'appcc_doc_blocks')){
        summary.tables.appcc_doc_blocks = { nuevos:0, identicos:0, omitidos:0 };
        for(const r0 of q(importDb,'SELECT * FROM appcc_doc_blocks')){
          const r = Object.assign({}, r0);
          const kind = r.recipe_kind || r.recipe_type || '';
          r.recipe_id = mappedRecipeId(kind, r.recipe_id, culMap, bakMap);
          if(!recipeExists(currentDb, kind, r.recipe_id)){ summary.omitidos++; summary.tables.appcc_doc_blocks.omitidos++; continue; }
          const cur = r.id ? rowById(currentDb,'appcc_doc_blocks',r.id) : null;
          if(cur && signature(cur)===signature(r)){ summary.identicos++; summary.tables.appcc_doc_blocks.identicos++; continue; }
          if(cur || !r.id) r.id = uniqueId(currentDb,'appcc_doc_blocks',`${r0.id || 'APPCC'}-IMPORT-${suffix}`);
          try{ insertRow(currentDb,'appcc_doc_blocks',r); summary.nuevos++; summary.tables.appcc_doc_blocks.nuevos++; }
          catch(error){ console.warn('[ObradORRImportMerge] appcc omitido', error); summary.omitidos++; summary.tables.appcc_doc_blocks.omitidos++; }
        }
      }
      // Documentary reviews: import as coverage only; never as workshop validation.
      if(sourceTableExists(importDb,currentDb,'recipe_documentary_reviews')){
        summary.tables.recipe_documentary_reviews = { nuevos:0, identicos:0, omitidos:0 };
        for(const r0 of q(importDb,'SELECT * FROM recipe_documentary_reviews')){
          const r = Object.assign({}, r0);
          r.recipe_id = mappedRecipeId(r.recipe_kind, r.recipe_id, culMap, bakMap);
          if(!recipeExists(currentDb, r.recipe_kind, r.recipe_id)){ summary.omitidos++; summary.tables.recipe_documentary_reviews.omitidos++; continue; }
          const cur = r.id ? rowById(currentDb,'recipe_documentary_reviews',r.id) : null;
          if(cur && signature(cur)===signature(r)){ summary.identicos++; summary.tables.recipe_documentary_reviews.identicos++; continue; }
          if(cur || !r.id) r.id = uniqueId(currentDb,'recipe_documentary_reviews',`${r0.id || 'DOCREV'}-IMPORT-${suffix}`);
          r.summary = `${r.summary || ''}\n\nImportada como cobertura documental; no valida la ficha en obrador.`.trim();
          try{ insertRow(currentDb,'recipe_documentary_reviews',r); summary.nuevos++; summary.tables.recipe_documentary_reviews.nuevos++; }
          catch(error){ console.warn('[ObradORRImportMerge] revisión documental omitida', error); summary.omitidos++; summary.tables.recipe_documentary_reviews.omitidos++; }
        }
      }
      // Media assets embedded in SQLite: import if present; path-based recipe_photos are intentionally omitted.
      const mediaMap = {};
      if(sourceTableExists(importDb,currentDb,'media_assets')){
        summary.tables.media_assets = { nuevos:0, identicos:0, conflictosVariantes:0 };
        for(const r0 of q(importDb,'SELECT * FROM media_assets')){
          const r = Object.assign({}, r0);
          let cur = r.id ? rowById(currentDb,'media_assets',r.id) : null;
          if(!cur && r.sha256) cur = q(currentDb,'SELECT * FROM media_assets WHERE sha256=$sha', {$sha:r.sha256})[0] || null;
          if(!cur){ insertRow(currentDb,'media_assets',r); mediaMap[r0.id]=r.id; summary.nuevos++; summary.tables.media_assets.nuevos++; continue; }
          if(signature(cur)===signature(r)){ mediaMap[r0.id]=cur.id; summary.identicos++; summary.tables.media_assets.identicos++; continue; }
          const newId = uniqueId(currentDb,'media_assets',`${r.id || 'MEDIA'}-IMPORT-${suffix}`);
          r.id = newId; insertRow(currentDb,'media_assets',r); mediaMap[r0.id]=newId; summary.conflictosVariantes++; summary.tables.media_assets.conflictosVariantes++;
        }
      }
      if(sourceTableExists(importDb,currentDb,'recipe_media')){
        summary.tables.recipe_media = { nuevos:0, identicos:0, omitidos:0 };
        for(const r0 of q(importDb,'SELECT * FROM recipe_media')){
          const r = Object.assign({}, r0);
          r.recipe_id = mappedRecipeId(r.recipe_kind, r.recipe_id, culMap, bakMap);
          r.media_id = mediaMap[r.media_id] || r.media_id;
          if(!recipeExists(currentDb, r.recipe_kind, r.recipe_id) || !rowById(currentDb,'media_assets',r.media_id)){ summary.omitidos++; summary.tables.recipe_media.omitidos++; continue; }
          const exists = q(currentDb,'SELECT * FROM recipe_media WHERE recipe_kind=$k AND recipe_id=$r AND media_id=$m AND COALESCE(role,"")=COALESCE($role,"")', {$k:r.recipe_kind,$r:r.recipe_id,$m:r.media_id,$role:r.role || ''})[0];
          if(exists){ summary.identicos++; summary.tables.recipe_media.identicos++; continue; }
          try{ insertRow(currentDb,'recipe_media',r); summary.nuevos++; summary.tables.recipe_media.nuevos++; }
          catch(error){ console.warn('[ObradORRImportMerge] recipe_media omitido', error); summary.omitidos++; summary.tables.recipe_media.omitidos++; }
        }
      }
      if(sourceTableExists(importDb,currentDb,'recipe_photos')){
        const count = q(importDb,'SELECT * FROM recipe_photos').length;
        summary.tables.recipe_photos = { nuevos:0, identicos:0, omitidos:count, policy:'omitidas rutas de fotos externas para evitar referencias rotas' };
        summary.omitidos += count;
      }
      // Workshop validation logs: import as evidence only. They do not change release_status or workshop_validation_status.
      if(sourceTableExists(importDb,currentDb,'workshop_validation_log')){
        summary.tables.workshop_validation_log = { nuevos:0, identicos:0, omitidos:0 };
        for(const r0 of q(importDb,'SELECT * FROM workshop_validation_log')){
          const r = Object.assign({}, r0);
          const kind = r.recipe_type || r.recipe_kind || '';
          r.recipe_id = mappedRecipeId(kind, r.recipe_id, culMap, bakMap);
          if(!recipeExists(currentDb, kind, r.recipe_id)){ summary.omitidos++; summary.tables.workshop_validation_log.omitidos++; continue; }
          const cur = r.id ? rowById(currentDb,'workshop_validation_log',r.id) : null;
          if(cur && signature(cur)===signature(r)){ summary.identicos++; summary.tables.workshop_validation_log.identicos++; continue; }
          if(cur || !r.id) r.id = uniqueId(currentDb,'workshop_validation_log',`${r0.id || 'WV'}-IMPORT-${suffix}`);
          r.notes = `${r.notes || ''}\n\nRegistro de prueba importado desde base externa; no cambia el estado de validación de la ficha por sí solo.`.trim();
          try{ insertRow(currentDb,'workshop_validation_log',r); summary.nuevos++; summary.tables.workshop_validation_log.nuevos++; }
          catch(error){ console.warn('[ObradORRImportMerge] validación externa omitida', error); summary.omitidos++; summary.tables.workshop_validation_log.omitidos++; }
        }
      }

      // Sessions imported as copies only.
      if(existsTable(importDb,'class_sessions')){
        summary.tables.class_sessions = { nuevos:0, omitidos:0 };
        for(const r0 of q(importDb,'SELECT * FROM class_sessions')){
          const r = Object.assign({}, r0); const old = r.id; r.id = uniqueId(currentDb,'class_sessions',`${r.id}-IMPORT-${suffix}`); r.title = `${r.title || 'Sesión importada'} (import ${suffix})`; sessionMap[old] = r.id; insertRow(currentDb,'class_sessions',r); summary.nuevos++; summary.tables.class_sessions.nuevos++;
        }
      }
      if(existsTable(importDb,'class_session_items')){
        summary.tables.class_session_items = { nuevos:0, omitidos:0 };
        for(const r0 of q(importDb,'SELECT * FROM class_session_items')){
          const r = Object.assign({}, r0); if(!sessionMap[r.session_id]){ summary.omitidos++; summary.tables.class_session_items.omitidos++; continue; } r.session_id = sessionMap[r.session_id]; updateFk(r,'culinary_recipe_id',culMap); updateFk(r,'bakery_recipe_id',bakMap); r.id = uniqueId(currentDb,'class_session_items',`${r.id}-IMPORT-${suffix}`); insertRow(currentDb,'class_session_items',r); summary.nuevos++; summary.tables.class_session_items.nuevos++;
        }
      }
      const logId = `IMPORT-${suffix}`;
      currentDb.exec("INSERT INTO import_log (id,source_name,source_schema,summary_json,notes) VALUES ($id,$src,$schema,$summary,$notes)", {$id:logId,$src:sourceName || '',$schema:summary.sourceVersion,$summary:JSON.stringify(summary),$notes:'Importación combinada segura 2.1: sin sobreescritura; conflictos como variantes; validaciones externas importadas solo como evidencia si hay correspondencia inequívoca; fotos por ruta omitidas.'});
      currentDb.exec('COMMIT;');
      return summary;
    } catch(error){ try{currentDb.exec('ROLLBACK;')}catch(_){} throw error; }
  }
  async function withImportedDb(file, fn){
    const imported = new window.ObradORRDatabase();
    await imported.init();
    const bytes = new Uint8Array(await file.arrayBuffer());
    imported.loadFromBytes(bytes);
    try { return await fn(imported); } finally { imported.close(); }
  }
  window.ObradORRImportMerge = { version: VERSION, policy: POLICY, preview, merge, withImportedDb };
})();