(function () {
  "use strict";
  const VERSION = "2.0.0";
  const MIGRATION_ID = "20260604_200_final_allinone_non_destructive";
  function hasColumn(db, table, column) { return db.query(`PRAGMA table_info(${table})`).some(r => r.name === column); }
  function addColumn(db, table, spec) { const name = spec.split(/\s+/)[0]; if (!hasColumn(db, table, name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${spec}`); }
  function ensure(db, meta) {
    db.exec(`CREATE TABLE IF NOT EXISTS migrations_log (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'applied',
      checksum TEXT,
      description TEXT,
      rollback_notes TEXT
    );`);
    db.exec(`CREATE TABLE IF NOT EXISTS workshop_validation_log (
      id TEXT PRIMARY KEY,
      recipe_type TEXT NOT NULL CHECK(recipe_type IN ('culinary','bakery')),
      recipe_id TEXT NOT NULL,
      validation_date TEXT,
      responsible TEXT,
      result_status TEXT NOT NULL DEFAULT 'tested' CHECK(result_status IN ('tested','validated','rejected','needs_adjustment')),
      measured_yield_quantity REAL,
      measured_yield_unit_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);
    addColumn(db, 'culinary_recipes', "documentary_status TEXT NOT NULL DEFAULT 'contrastada'");
    addColumn(db, 'culinary_recipes', "workshop_validation_status TEXT NOT NULL DEFAULT 'no_validada'");
    addColumn(db, 'bakery_recipes', "documentary_status TEXT NOT NULL DEFAULT 'contrastada'");
    addColumn(db, 'bakery_recipes', "workshop_validation_status TEXT NOT NULL DEFAULT 'no_validada'");
    const exists = db.value("SELECT COUNT(*) FROM migrations_log WHERE id=$id", { $id: MIGRATION_ID });
    if (!exists) {
      db.exec(`INSERT INTO migrations_log (id,version,status,checksum,description,rollback_notes)
        VALUES ($id,$version,'applied','runtime-non-destructive','Añade estados documentales y tabla de validación de obrador sin migrar recetas ni alterar fórmulas.','Restaurar ZIP/SQLite anterior o copia descargada por el usuario.')`, { $id: MIGRATION_ID, $version: VERSION });
    }
    return { ok: true, migrationId: MIGRATION_ID };
  }
  function status(db) { return db.query("SELECT id,version,applied_at,status,description FROM migrations_log ORDER BY applied_at DESC LIMIT 20"); }
  window.ObradORRMigrations = { version: VERSION, ensure, status };
})();
