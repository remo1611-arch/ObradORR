(function () {
  "use strict";
  const VERSION = "2.1.0";
  const MIGRATION_ID = "20260605_210_workshop_validation";
  function q(db, sql, params){ return db.query(sql, params || {}); }
  function hasColumn(db, table, column) { return q(db, `PRAGMA table_info(${table})`).some(r => r.name === column); }
  function addColumn(db, table, spec) { const name = spec.split(/\s+/)[0]; if (!hasColumn(db, table, name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${spec}`); }
  function tableSql(db, name) { const r = q(db, "SELECT sql FROM sqlite_master WHERE type='table' AND name=$name", { $name: name })[0]; return r ? String(r.sql || '') : ''; }
  function ensureMigrationsLog(db){
    db.exec(`CREATE TABLE IF NOT EXISTS migrations_log (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'applied',
      checksum TEXT,
      description TEXT,
      rollback_notes TEXT
    );`);
  }
  function createWorkshopValidationLog(db, tableName){
    db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (
      id TEXT PRIMARY KEY,
      recipe_type TEXT NOT NULL CHECK(recipe_type IN ('culinary','bakery')),
      recipe_id TEXT NOT NULL,
      recipe_name_snapshot TEXT,
      validation_date TEXT,
      responsible TEXT,
      group_module TEXT,
      practice_title TEXT,
      result_status TEXT NOT NULL DEFAULT 'no_validada' CHECK(result_status IN ('no_validada','probada_con_ajustes','requiere_revision','validada','tested','validated','rejected','needs_adjustment')),
      measured_yield_quantity REAL,
      measured_yield_unit_id TEXT,
      planned_quantity TEXT,
      actual_quantity TEXT,
      planned_yield TEXT,
      actual_yield TEXT,
      planned_servings REAL,
      actual_servings REAL,
      planned_pieces REAL,
      actual_pieces REAL,
      target_flour_g REAL,
      actual_flour_g REAL,
      planned_raw_dough_g REAL,
      actual_raw_dough_g REAL,
      raw_piece_weight_g REAL,
      baked_piece_weight_g REAL,
      bake_loss_pct REAL,
      tfm_c REAL,
      fermentation_time_min REAL,
      fermentation_temp_c REAL,
      baking_notes TEXT,
      adjustments_required TEXT,
      notes TEXT,
      validation_data_json TEXT,
      invalidates_validation_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);
  }
  function ensureWorkshopValidationLog(db){
    const exists = Number(db.value("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='workshop_validation_log'") || 0) > 0;
    if (!exists) { createWorkshopValidationLog(db, 'workshop_validation_log'); return; }
    const sql = tableSql(db, 'workshop_validation_log');
    if (!/probada_con_ajustes/.test(sql) || !/target_flour_g/.test(sql) || !/validation_data_json/.test(sql)) {
      db.exec('ALTER TABLE workshop_validation_log RENAME TO workshop_validation_log_old_210;');
      createWorkshopValidationLog(db, 'workshop_validation_log');
      db.exec(`INSERT INTO workshop_validation_log (id,recipe_type,recipe_id,recipe_name_snapshot,validation_date,responsible,result_status,measured_yield_quantity,measured_yield_unit_id,notes,created_at)
        SELECT id, recipe_type, recipe_id, NULL, validation_date, responsible,
          CASE result_status WHEN 'validated' THEN 'validada' WHEN 'tested' THEN 'probada_con_ajustes' WHEN 'needs_adjustment' THEN 'requiere_revision' WHEN 'rejected' THEN 'no_validada' ELSE COALESCE(result_status,'no_validada') END,
          measured_yield_quantity, measured_yield_unit_id, notes, COALESCE(created_at,CURRENT_TIMESTAMP)
        FROM workshop_validation_log_old_210;`);
      db.exec('DROP TABLE workshop_validation_log_old_210;');
      return;
    }
    const cols = {
      recipe_name_snapshot: 'recipe_name_snapshot TEXT', group_module: 'group_module TEXT', practice_title: 'practice_title TEXT',
      planned_quantity: 'planned_quantity TEXT', actual_quantity: 'actual_quantity TEXT', planned_yield: 'planned_yield TEXT', actual_yield: 'actual_yield TEXT',
      planned_servings: 'planned_servings REAL', actual_servings: 'actual_servings REAL', planned_pieces: 'planned_pieces REAL', actual_pieces: 'actual_pieces REAL',
      target_flour_g: 'target_flour_g REAL', actual_flour_g: 'actual_flour_g REAL', planned_raw_dough_g: 'planned_raw_dough_g REAL', actual_raw_dough_g: 'actual_raw_dough_g REAL',
      raw_piece_weight_g: 'raw_piece_weight_g REAL', baked_piece_weight_g: 'baked_piece_weight_g REAL', bake_loss_pct: 'bake_loss_pct REAL', tfm_c: 'tfm_c REAL',
      fermentation_time_min: 'fermentation_time_min REAL', fermentation_temp_c: 'fermentation_temp_c REAL', baking_notes: 'baking_notes TEXT', adjustments_required: 'adjustments_required TEXT',
      validation_data_json: 'validation_data_json TEXT', invalidates_validation_id: 'invalidates_validation_id TEXT'
    };
    Object.values(cols).forEach(spec => addColumn(db, 'workshop_validation_log', spec));
  }
  function upsertMeta(db, key, value){
    db.exec(`INSERT INTO app_meta (key,value,updated_at) VALUES ($key,$value,CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`, { $key: key, $value: String(value) });
  }
  function ensure(db, meta) {
    ensureMigrationsLog(db);
    ensureWorkshopValidationLog(db);
    addColumn(db, 'culinary_recipes', "documentary_status TEXT NOT NULL DEFAULT 'contrastada'");
    addColumn(db, 'culinary_recipes', "workshop_validation_status TEXT NOT NULL DEFAULT 'no_validada'");
    addColumn(db, 'bakery_recipes', "documentary_status TEXT NOT NULL DEFAULT 'contrastada'");
    addColumn(db, 'bakery_recipes', "workshop_validation_status TEXT NOT NULL DEFAULT 'no_validada'");
    upsertMeta(db, 'version', VERSION);
    upsertMeta(db, 'app_version', VERSION);
    upsertMeta(db, 'schema_version', VERSION);
    if (meta && meta.releaseTag) upsertMeta(db, 'release_tag', meta.releaseTag);
    if (meta && meta.cacheTag) upsertMeta(db, 'cache_tag', meta.cacheTag);
    const exists = db.value("SELECT COUNT(*) FROM migrations_log WHERE id=$id", { $id: MIGRATION_ID });
    if (!exists) {
      db.exec(`INSERT INTO migrations_log (id,version,status,checksum,description,rollback_notes)
        VALUES ($id,$version,'applied','runtime-210-workshop-validation','Alinea validación de obrador 2.1, histórico ampliado y metadatos sin validar fichas automáticamente.','Restaurar copia SQLite previa del usuario.')`, { $id: MIGRATION_ID, $version: VERSION });
    }
    return { ok: true, migrationId: MIGRATION_ID };
  }
  function status(db) { return db.query("SELECT id,version,applied_at,status,description FROM migrations_log ORDER BY applied_at DESC LIMIT 20"); }
  window.ObradORRMigrations = { version: VERSION, ensure, status };
})();
