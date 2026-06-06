#!/usr/bin/env python3
from pathlib import Path
import sqlite3, subprocess, sys, re
ROOT = Path(__file__).resolve().parents[1]
errors=[]
def ok(m): print('[OK]',m)
def fail(m): print('[ERROR]',m); errors.append(m)
for js in sorted((ROOT/'app/js').rglob('*.js')):
    r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
    ok(f'node --check {js.relative_to(ROOT)}') if r.returncode==0 else fail(f'node --check falla {js.relative_to(ROOT)}: {r.stderr}')
html=(ROOT/'app/obradorr.html').read_text(encoding='utf-8')
print_view_html=(ROOT/'app/print-view.html').read_text(encoding='utf-8') if (ROOT/'app/print-view.html').exists() else ''
alljs='\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'app/js').rglob('*.js'))
css=(ROOT/'app/css/obradorr.css').read_text(encoding='utf-8')
print_css=(ROOT/'app/css/print-document.css').read_text(encoding='utf-8') if (ROOT/'app/css/print-document.css').exists() else ''
docs='\n'.join(p.read_text(encoding='utf-8', errors='ignore') for p in [ROOT/'README.md',ROOT/'RELEASE_NOTES.md',ROOT/'CHANGELOG.md',ROOT/'GUIA_TERMUX.md',ROOT/'GUIA_WINDOWS.md'] if p.exists())
blob=html+'\n'+alljs+'\n'+css+'\n'+print_css+'\n'+docs
required_tokens = [
    '2.1.0','2.1.0-rc7','obradorr-210-rc7-release-candidate','obradorr-data-210-rc7-release-candidate',
    'ObradORRExportTools','exportPracticeZip','ObradORRRecursiveEngine','ObradORRPreflight','ObradORRSafeEditor','ObradORRImportMerge',
    'findIngredientNameDuplicate','findRecipeNameDuplicate','friendlyDbErrorMessage',
    'Comprobación documental previa','Criterio de revisión documental','Sistema de guardado disponible','Base incluida en la aplicación cargada',
    'pagehide','visibilitychange','previous-db-1','modeSelect','rawDoughG','flourG','pieceWeightG','Piezas + peso unitario','Masa total','Harina total',
    'Ejemplo: Remo J. Pereira González','Ejemplo: Práctica de masas fermentadas dulces','mise en place previa',
    'Validación de obrador','Registrar prueba de obrador','workshop_validation_flow','probada_con_ajustes','requiere_revision',
    'Crear base nueva limpia','Usar base incluida','Restaurar SQLite sustituyendo','Validar base activa',
    'Copia previa obligatoria','policy: POLICY','validateByImport: false','recipe_documentary_reviews','workshop_validation_log','media_assets',
    'exportCatalogExcel','Catálogo Excel','Exportaciones técnicas','technical-exports',
    'ObradORR_catalogo_completo_',
    '99_AUX_VALIDACION','11_AVISOS','Release candidate integral'
]
for token in required_tokens:
    ok(f'token presente: {token}') if token in blob else fail(f'token ausente: {token}')
for label, forbidden in [
    ('cache rc4 activo', 'obradorr-210-rc4-hardening-bases'),
    ('cache rc3 activo', 'obradorr-210-rc3-gestion-bases'),
    ('idb rc4 activa', 'obradorr-data-210-rc4-hardening-bases'),
    ('idb rc3 activa', 'obradorr-data-210-rc3-gestion-bases'),
    ('texto interno preflight antiguo', 'Preflight documental ' + 'experimental'),
    ('texto interno via antigua', 'Vía B' + ' ·'),
    ('criterio interno B1 antiguo', 'B1' + ' ·'),
    ('criterio interno B2 antiguo', 'B2' + ' ·'),
    ('criterio interno B3 antiguo', 'B3' + ' ·'),
    ('criterio interno B4 antiguo', 'B4' + ' ·'),
    ('mención RC en portada', 'avisos ' + 'RC'),
    ('nota APPCC sin puntuación', 'Modelo docente mínimo ' + 'Ficha pendiente'),
    ('terminología antigua masa/pasta total', 'Masa/pasta total'),
    ('terminología antigua masa/pasta cruda', 'masa/pasta cruda'),
    ('función antigua de añadir sin modal', 'function addRecipeToSelection'),
    ('export schema antiguo practica', 'ObradORRPracticeExport/2.0-rc1'),
    ('export schema antiguo tecnico', 'ObradORRTechnicalExport/2.0-rc1'),
    ('botón importar plantilla Excel retirado', 'data-import-template-excel'),
    ('botón plantilla Excel vacía retirado', 'data-export-template-excel'),
    ('input importación Excel retirado', 'excelImportFileInput'),
    ('módulo importación Excel no cargado', 'js/import/excel-import.js'),
]:
    ok(f'ausente: {label}') if forbidden not in blob else fail(f'texto/código no limpiado: {label}')

# Comprobación estática mínima de exportación XLSX en JS
if 'xlsxWorkbookBytes' in alljs and 'xlsxSheetXml' in alljs and 'dataValidations' in alljs:
    ok('motor XLSX sin dependencias presente')
else:
    fail('motor XLSX incompleto')

con=sqlite3.connect(ROOT/'db/obradorr.sqlite')
cur=con.cursor()
if cur.execute('PRAGMA integrity_check').fetchone()[0]=='ok': ok('SQLite integrity_check ok')
else: fail('SQLite integrity_check falla')
fk=cur.execute('PRAGMA foreign_key_check').fetchall()
ok('SQLite foreign_key_check sin errores') if not fk else fail(f'foreign_key_check: {fk[:5]}')
meta=dict(cur.execute("SELECT key,value FROM app_meta"))
for k,v in [('app_version','2.1.0'),('schema_version','2.1.0'),('version','2.1.0'),('release_tag','2.1.0-rc7'),('cache_tag','obradorr-210-rc7-release-candidate'),('stable','0'),('public_release','0')]:
    ok(f'app_meta {k}={v}') if meta.get(k)==v else fail(f'app_meta {k} incorrecto: {meta.get(k)}')
legacy_keys = ['release','cache','document_model','public_notes','public_review','public_github_ready','experimental_allinone','v2_experimental_final','stable_closed_at']
for k in legacy_keys:
    ok(f'app_meta legado ausente: {k}') if k not in meta else fail(f'app_meta conserva clave antigua: {k}={meta.get(k)}')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260605_210_rc5_excel_export'").fetchone(): ok('migración RC5 registrada')
else: fail('migración RC5 ausente')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260605_210_rc6_excel_import_altas'").fetchone(): ok('migración RC6 registrada')
else: fail('migración RC6 ausente')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260605_210_rc7_release_candidate'").fetchone(): ok('migración RC7 registrada')
else: fail('migración RC7 ausente')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260605_210_workshop_validation'").fetchone(): ok('migración 2.1 registrada')
else: fail('migración 2.1 ausente')

# RC9 · Allergen resolver unification: casos mínimos por ficha.
def assert_allergens_for_ingredients(label, ingredient_query, expected_allergen_names):
    ingredient_ids = [r[0] for r in cur.execute(ingredient_query)]
    if not ingredient_ids:
        fail(f'RC9 {label}: sin ingredientes para comprobar')
        return
    placeholders = ','.join('?' for _ in ingredient_ids)
    rows = cur.execute(f"""SELECT DISTINCT a.name
        FROM ingredient_allergens ia
        JOIN allergens a ON a.id=ia.allergen_id
        WHERE a.regulation_order BETWEEN 1 AND 14
          AND ia.declaration_status='confirmed'
          AND ia.ingredient_id IN ({placeholders})""", ingredient_ids).fetchall()
    found = {r[0] for r in rows}
    missing = sorted(set(expected_allergen_names) - found)
    ok(f'RC9 {label}: alérgenos {", ".join(sorted(found))}') if not missing else fail(f'RC9 {label}: faltan alérgenos {missing}; encontrados {sorted(found)}')

assert_allergens_for_ingredients(
    'Ajoblanco',
    "SELECT DISTINCT ingredient_id FROM v_culinary_expanded_ingredient_lines WHERE recipe_id='REC-AJOBLANCO' AND ingredient_id IS NOT NULL",
    ['Gluten', 'Frutos de cáscara']
)
assert_allergens_for_ingredients(
    'Tortilla Betanzos',
    "SELECT DISTINCT ingredient_id FROM v_culinary_expanded_ingredient_lines WHERE recipe_id='REC-TORTILLA-BETANZOS' AND ingredient_id IS NOT NULL",
    ['Huevos']
)
assert_allergens_for_ingredients(
    'Torta de nata panadera directa',
    "SELECT DISTINCT ingredient_id FROM bakery_recipe_lines WHERE recipe_id='torta-de-nata-pedro' AND ingredient_id IS NOT NULL",
    ['Gluten', 'Huevos', 'Leche']
)
assert_allergens_for_ingredients(
    'Crema chantilly componente',
    "SELECT DISTINCT ingredient_id FROM v_culinary_expanded_ingredient_lines WHERE recipe_id='REC-PAST-CHANTILLY' AND ingredient_id IS NOT NULL",
    ['Leche']
)

# Regresión SQL del exportador: ejecutar todas las consultas usadas por las hojas del
# catálogo completo y por las exportaciones auxiliares. Esto evita falsos OK cuando
# una hoja posterior falla en navegador por columna inexistente.
excel_export_queries = {
    '00_AUX units': "SELECT id, symbol || ' · ' || name AS label FROM units ORDER BY id",
    '00_AUX familias': "SELECT id, name FROM technical_families ORDER BY name COLLATE NOCASE",
    '00_AUX subfamilias': "SELECT id, name FROM technical_subfamilies ORDER BY name COLLATE NOCASE",
    '00_AUX alergenos': "SELECT name FROM allergens WHERE regulation_order BETWEEN 1 AND 14 ORDER BY regulation_order",
    '02_ELABORACIONES': "SELECT * FROM (SELECT 'culinary' AS recipe_kind, c.id, c.name, COALESCE(f.name,c.family_id,'') AS family, COALESCE(sf.name,c.subfamily_id,'') AS subfamily, c.base_servings, c.yield_quantity, c.yield_unit_id, c.release_status, c.documentary_status, c.workshop_validation_status, '' AS yield_status, c.notes, 'raciones_rendimiento' AS mundo FROM culinary_recipes c LEFT JOIN technical_families f ON f.id=c.family_id LEFT JOIN technical_subfamilies sf ON sf.id=c.subfamily_id WHERE COALESCE(c.active,1)=1 UNION ALL SELECT 'bakery', b.id, b.name, COALESCE(f.name,b.family_id,''), COALESCE(sf.name,b.subfamily_id,''), b.base_pieces, b.base_raw_weight_g, 'g', b.release_status, b.documentary_status, b.workshop_validation_status, b.yield_status, b.notes, 'formulacion' FROM bakery_recipes b LEFT JOIN technical_families f ON f.id=b.family_id LEFT JOIN technical_subfamilies sf ON sf.id=b.subfamily_id WHERE COALESCE(b.active,1)=1) ORDER BY name COLLATE NOCASE",
    '03_INGREDIENTES': "SELECT v.id,v.name,v.family,v.subfamily,v.base_unit,v.storage_zone,v.cost_per_base_unit_after_waste,i.notes FROM v_ingredients_cost v LEFT JOIN ingredients i ON i.id=v.id ORDER BY v.name COLLATE NOCASE",
    '04_LINEAS_RECETA': "SELECT l.recipe_id, COALESCE(l.ingredient_id,l.subrecipe_id,'') AS ref, l.line_type, l.quantity, l.unit_id, '' AS block, 1 AS obligatory, l.technical_note FROM culinary_recipe_lines l ORDER BY l.recipe_id,l.sort_order",
    '05_PROCESOS culinary': "SELECT id AS recipe_id, 'proceso' AS block, process AS instruction FROM culinary_recipes WHERE COALESCE(active,1)=1 AND COALESCE(process,'')<>'' ORDER BY name COLLATE NOCASE",
    '05_PROCESOS bakery': "SELECT recipe_id, step_number, block, instruction FROM bakery_process_steps ORDER BY recipe_id,block,step_number",
    '06_FORMULACION_PANADERA': "SELECT id,base_flour_g,base_raw_weight_g,base_pieces,base_raw_piece_weight_g,preferment_type,yield_status FROM bakery_recipes WHERE COALESCE(active,1)=1 ORDER BY name COLLATE NOCASE",
    '07_COMPONENTES_SUBRECETAS': "SELECT bakery_recipe_id, COALESCE(component_culinary_recipe_id,component_bakery_recipe_id,'') AS component, CASE WHEN component_bakery_recipe_id IS NOT NULL THEN 'bakery' ELSE 'culinary' END AS component_type, usage_role, calculation_base, quantity_value, unit_id, component_status FROM bakery_recipe_components WHERE COALESCE(active,1)=1 ORDER BY bakery_recipe_id,sort_order",
    '08_ALERGENOS': "SELECT i.id AS ingredient_id,a.name AS allergen,ia.declaration_status,ia.notes FROM ingredient_allergens ia JOIN ingredients i ON i.id=ia.ingredient_id JOIN allergens a ON a.id=ia.allergen_id WHERE a.regulation_order BETWEEN 1 AND 14 ORDER BY i.name,a.regulation_order",
    '09_APPCC': "SELECT recipe_id,sort_order,risk_family,hazard_type,main_hazard,preventive_measure,monitoring,corrective_action,record_reference,service_conservation FROM appcc_doc_blocks WHERE COALESCE(active,1)=1 ORDER BY recipe_id,sort_order",
    '10_VALIDACION_OBRADOR': "SELECT recipe_id,recipe_type,validation_date,responsible,group_module,practice_title,result_status,planned_quantity,actual_quantity,actual_yield,measured_yield_unit_id,notes,adjustments_required FROM workshop_validation_log ORDER BY created_at DESC",
    'CSV catalogo': "SELECT uid,source_type,source_id,name,family,subfamily,status,release_status,COALESCE(yield_quantity,base_servings,base_flour_g,'') AS rendimiento,total_cost FROM v_elaborations_unified WHERE COALESCE(active,1)=1 ORDER BY name COLLATE NOCASE",
    'CSV ingredientes': "SELECT id,name,family,subfamily,base_unit,purchase_price,purchase_net_quantity,waste_pct,cost_per_base_unit_after_waste,order_group,storage_zone,supplier,active FROM v_ingredients_cost ORDER BY name COLLATE NOCASE",
    'CSV alergenos': "SELECT i.id AS ingredient_id,i.name AS ingredient,a.id AS allergen_id,a.name AS allergen,a.regulation_order,ia.declaration_status FROM ingredient_allergens ia JOIN ingredients i ON i.id=ia.ingredient_id JOIN allergens a ON a.id=ia.allergen_id WHERE a.regulation_order BETWEEN 1 AND 14 ORDER BY a.regulation_order,i.name COLLATE NOCASE",
    'JSON meta': "SELECT key,value FROM app_meta ORDER BY key",
    'JSON recipes': "SELECT * FROM v_elaborations_unified WHERE COALESCE(active,1)=1 ORDER BY name COLLATE NOCASE",
    'JSON ingredients': "SELECT * FROM v_ingredients_cost ORDER BY name COLLATE NOCASE",
    'JSON allergens': "SELECT ia.*, i.name AS ingredient, a.name AS allergen FROM ingredient_allergens ia JOIN ingredients i ON i.id=ia.ingredient_id JOIN allergens a ON a.id=ia.allergen_id ORDER BY a.regulation_order,i.name",
}
for label, sql in excel_export_queries.items():
    try:
        rows = cur.execute(sql).fetchmany(3)
        ok(f'regresión exportación {label} ok: {len(rows)} filas leídas')
    except Exception as e:
        fail(f'regresión exportación {label} falla: {e}')
for table in ['culinary_recipes','bakery_recipes']:
    v=cur.execute(f"SELECT COUNT(*) FROM {table} WHERE active=1 AND release_status='validada'").fetchone()[0]
    ok(f'{table} activas sin validada') if v==0 else fail(f'{table} contiene {v} validada')
bad=cur.execute("SELECT COUNT(*) FROM bakery_recipes WHERE active=1 AND COALESCE(yield_status,'pending') NOT IN ('pending','tested','validated')").fetchone()[0]
ok('bakery yield_status solo pending/tested/validated') if bad==0 else fail(f'bakery yield_status incompatible: {bad}')
active_nonpending=cur.execute("SELECT COUNT(*) FROM bakery_recipes WHERE active=1 AND COALESCE(yield_status,'pending')<>'pending'").fetchone()[0]
ok('bakery yield_status pending en fichas activas') if active_nonpending==0 else fail(f'bakery yield_status no pending en fichas activas: {active_nonpending}')
for table in ['import_log','migrations_log','workshop_validation_log','media_assets','recipe_media','recipe_documentary_reviews']:
    ok(f'tabla {table} presente') if cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone()[0] else fail(f'tabla {table} ausente')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-QUICHE-LORRAINE' AND subrecipe_id='REC-PAST-QUEBRADA-DULCE'").fetchone(): fail('Quiche conserva masa quebrada dulce')
else: ok('Quiche sin masa quebrada dulce real')
choux=cur.execute("SELECT risk_family FROM appcc_doc_blocks WHERE recipe_id='REC-PAST-CHOUX' LIMIT 1").fetchone()
ok('Pasta choux APPCC corregido') if choux and 'Masa escaldada' in choux[0] else fail(f'Pasta choux APPCC no corregido: {choux}')
required_wv_cols = {'recipe_name_snapshot','group_module','practice_title','actual_quantity','target_flour_g','actual_flour_g','planned_raw_dough_g','actual_raw_dough_g','raw_piece_weight_g','baked_piece_weight_g','bake_loss_pct','tfm_c','fermentation_time_min','validation_data_json'}
wv_cols = {r[1] for r in cur.execute('PRAGMA table_info(workshop_validation_log)')}
missing_wv = sorted(required_wv_cols - wv_cols)
ok('workshop_validation_log 2.1 ampliada') if not missing_wv else fail(f'faltan columnas workshop_validation_log: {missing_wv}')
try:
    b_id = cur.execute("SELECT id FROM bakery_recipes WHERE active=1 LIMIT 1").fetchone()
    c_id = cur.execute("SELECT id FROM culinary_recipes WHERE active=1 LIMIT 1").fetchone()
    cur.execute('BEGIN')
    if b_id:
        cur.execute("UPDATE bakery_recipes SET workshop_validation_status='validada', release_status='validada', yield_status='validated' WHERE id=?", (b_id[0],))
        cur.execute("UPDATE bakery_recipes SET workshop_validation_status='probada_con_ajustes', release_status='pendiente', yield_status='tested' WHERE id=?", (b_id[0],))
        cur.execute("UPDATE bakery_recipes SET workshop_validation_status='requiere_revision', release_status='pendiente', yield_status='pending' WHERE id=?", (b_id[0],))
        ok('prueba yield_status panadero validated/tested/pending')
    if c_id:
        cur.execute("UPDATE culinary_recipes SET workshop_validation_status='validada', release_status='validada' WHERE id=?", (c_id[0],))
        ok('prueba validación culinaria transaccional')
    cur.execute('ROLLBACK')
except Exception as e:
    try: cur.execute('ROLLBACK')
    except Exception: pass
    fail(f'prueba transaccional validación obrador falla: {e}')
for bad_state in ['measured','adjusted']:
    try:
        cur.execute('BEGIN')
        if b_id:
            cur.execute("UPDATE bakery_recipes SET yield_status=? WHERE id=?", (bad_state, b_id[0]))
            fail(f'yield_status no permitido aceptado: {bad_state}')
        cur.execute('ROLLBACK')
    except Exception:
        try: cur.execute('ROLLBACK')
        except Exception: pass
        ok(f'yield_status no permitido bloqueado: {bad_state}')
blank_path = ROOT/'db/obradorr_blank.sqlite'
if blank_path.exists():
    bcon=sqlite3.connect(blank_path); bcur=bcon.cursor()
    ok('plantilla limpia presente')
    ok('plantilla limpia integrity_check ok') if bcur.execute('PRAGMA integrity_check').fetchone()[0]=='ok' else fail('plantilla limpia integrity_check falla')
    bfk=bcur.execute('PRAGMA foreign_key_check').fetchall()
    ok('plantilla limpia foreign_key_check sin errores') if not bfk else fail(f'plantilla limpia foreign_key_check: {bfk[:5]}')
    counts={t:bcur.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in ['culinary_recipes','bakery_recipes','ingredients','workshop_validation_log']}
    ok('plantilla limpia sin catálogo/ingredientes/validaciones') if all(v==0 for v in counts.values()) else fail(f'plantilla limpia contiene datos no esperados: {counts}')
    bmeta=dict(bcur.execute("SELECT key,value FROM app_meta WHERE key IN ('release_tag','cache_tag','blank_template')"))
    ok('plantilla limpia app_meta compatible') if bmeta.get('release_tag')=='2.1.0-rc7' and bmeta.get('cache_tag')=='obradorr-210-rc7-release-candidate' and bmeta.get('blank_template')=='1' else fail(f'plantilla limpia app_meta incorrecto: {bmeta}')
    bcon.close()
else:
    fail('falta db/obradorr_blank.sqlite')

# RC9: modelos imprimibles aplicados sobre subelaboraciones, panadería y escandallo.
closure_text = html + "\n" + print_view_html + "\n" + alljs + "\n" + css + "\n" + print_css
for token in ['obradorr-210-rc9-release-candidate', 'Sesión actual', 'Sesiones guardadas', 'Guía de uso', 'Eliminar elaboración', 'Eliminar ingrediente', 'Crear y editar', 'Modelo de ficha', 'Ficha de trabajo', 'Ficha técnica', 'Ficha técnica ampliada', 'Dossier completo de producción', 'Pedido de producción', 'Bloques imprimibles del modelo', 'Ajustes avanzados del modelo', 'ObradORRDocumentProfiles.resolve', 'printBlocks', 'printConfig', 'ObradORRPrintSections', 'SECTION_CONTRACT', 'renderDocumentBody', 'sectionPlan', 'RC9', 'print-view.html', 'ObradORRPrintView/2.1-rc9', 'createPrintViewPayload', 'escandalloBlockHtml', 'traceabilityBlockHtml', 'appccPrintMode', 'bakeryComponentsSummaryHtml', 'Escandallo técnico docente', 'Trazabilidad técnica', 'Componentes elaborados', 'resolveRecipeAllergens', 'resolveRecipeAllergenBundle', 'visitedWithoutCurrent', 'Detalle completo incluido en este modelo']:
    ok(f'RC9 token presente: {token}') if token in closure_text else fail(f'RC9 token ausente: {token}')
for old in ['obradorr-210-rc7-exports-discreet', 'data-import-template-excel', 'data-export-template-excel', 'excelImportFileInput', 'js/import/excel-import.js', 'Usar visor integrado', 'printFallbackButton', 'presentPrintDocumentFallbackIframe', 'se usa visor integrado']:
    ok(f'RC9 ausente: {old}') if old not in closure_text else fail(f'RC9 conserva resto obsoleto: {old}')
visible_print_sources = '\n'.join([html, (ROOT/'app/js/obradorr-app-classic.js').read_text(encoding='utf-8'), (ROOT/'app/js/domain/document-profiles.js').read_text(encoding='utf-8')])
for old_label in ['FPB ·', 'CM ·', 'GS ·', 'Ciclo Medio', 'Ciclo Superior', 'Nivel documental', 'Pedido consolidado']:
    ok(f'etiqueta visible retirada: {old_label}') if old_label not in visible_print_sources else fail(f'etiqueta visible antigua en impresión: {old_label}')
for entry_file in [ROOT/'index.html', ROOT/'Abrir_ObradORR.html', ROOT/'app/reset_local_data.html']:
    txt = entry_file.read_text(encoding='utf-8')
    ok(f'entrada actualizada: {entry_file.relative_to(ROOT)}') if 'obradorr-210-rc9-release-candidate' in txt and 'obradorr-210-rc7-exports-discreet' not in txt else fail(f'entrada obsoleta: {entry_file.relative_to(ROOT)}')

print_sections_path = ROOT/'app/js/print/print-sections.js'
ok('RC9 print-sections.js presente') if print_sections_path.exists() else fail('RC9 falta print-sections.js')
if print_sections_path.exists():
    pst = print_sections_path.read_text(encoding='utf-8')
    for token in ['SECTION_CONTRACT','document_header','recipe_sheets','production_order','renderDocumentBody','2.1.0-rc9']:
        ok(f'RC9 print-sections token presente: {token}') if token in pst else fail(f'RC9 print-sections token ausente: {token}')
ok('RC9 print-sections cargado en HTML') if 'js/print/print-sections.js' in html else fail('RC9 print-sections no cargado en HTML')

print_view_path = ROOT/'app/print-view.html'
ok('RC9 print-view.html presente') if print_view_path.exists() else fail('RC9 falta print-view.html')
if print_view_path.exists():
    pvt = print_view_path.read_text(encoding='utf-8')
    for token in ['ObradORRPrintView:', 'printBtn', 'docFrame', 'Imprimir / guardar PDF']:
        ok(f'RC9 print-view token presente: {token}') if token in pvt else fail(f'RC9 print-view token ausente: {token}')
for token in ['createPrintViewPayload', 'print-view.html?doc=', 'shouldShowIngredientLineCosts', 'escandalloBlockHtml', 'traceabilityBlockHtml', 'appccPrintMode', 'bakeryComponentsSummaryHtml', 'Escandallo técnico docente', 'Trazabilidad técnica', 'Componentes elaborados', 'resolveRecipeAllergens', 'resolveRecipeAllergenBundle', 'visitedWithoutCurrent', 'Detalle completo incluido en este modelo']:
    ok(f'RC9 app print-view token presente: {token}') if token in alljs else fail(f'RC9 app print-view token ausente: {token}')



print_css_path = ROOT/'app/css/print-document.css'
ok('RC9 print-document.css presente') if print_css_path.exists() else fail('RC9 falta app/css/print-document.css')
if print_css_path.exists():
    pct = print_css_path.read_text(encoding='utf-8')
    for token in ['@page{size:A4', 'RC9', 'print-color-adjust', '.sheet-head.has-photo', '.order-table', '.structured-appcc', '@media print']:
        ok(f'RC9 print CSS token presente: {token}') if token in pct else fail(f'RC9 print CSS token ausente: {token}')
for rel in ['app/js/obradorr-app-classic.js','app/js/obradorr-app.js']:
    src = (ROOT/rel).read_text(encoding='utf-8')
    ok(f'RC9 {rel} enlaza print-document.css') if 'css/print-document.css?v=obradorr-210-rc9-release-candidate' in src else fail(f'RC9 {rel} no enlaza print-document.css')
    shell_start = src.find('function printDocumentShell')
    shell_part = src[shell_start:shell_start+1400] if shell_start >= 0 else src
    ok(f'RC9 {rel} sin @page largo embebido en shell') if '@page{size:A4' not in shell_part else fail(f'RC9 {rel} conserva CSS @page embebido en shell')

if "IDB_DATA_DB = 'obradorr-data-210-rc7-release-candidate'" in alljs:
    ok('namespace IndexedDB RC7 conservado por compatibilidad')
else:
    fail('namespace IndexedDB inesperado; revisar compatibilidad de persistencia')


profiles_src = (ROOT/'app/js/domain/document-profiles.js').read_text(encoding='utf-8')
app_src = (ROOT/'app/js/obradorr-app-classic.js').read_text(encoding='utf-8')
ok('RC9 ficha ampliada incluye costes por defecto') if 'ficha_ampliada' in profiles_src and 'options: { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: "sheets"' in profiles_src else fail('RC9 ficha ampliada no activa costes por defecto')
ok('RC9 ficha ampliada sin escandallo') if 'costs: true, escandallo: false, validation: false' in profiles_src else fail('RC9 ficha ampliada mantiene escandallo/validación no deseados')
ok('RC9 escandallo reservado a dossier') if 'out.escandallo = costAllowed && !!options.includeCosts && profile === "dossier_completo"' in profiles_src else fail('RC9 escandallo no queda reservado a dossier')
ok('RC9 costes de líneas no duplican escandallo') if 'function shouldShowIngredientLineCosts' in app_src and '&& !shouldPrintEscandallo(opts)' in app_src else fail('RC9 falta control de duplicidad de costes de línea')

# RC9 · Release Candidate checks
classic_src = (ROOT / 'app/js/obradorr-app-classic.js').read_text(encoding='utf-8')
ok('RC9 no muestra modal si window.open abre print-view.html') if 'if (popupOpened)' in classic_src and 'return;\n    }\n    modalRoot.innerHTML' in classic_src else fail('RC9 no garantiza retorno sin modal tras apertura correcta')
ok('RC9 no conserva mensaje modal de apertura exitosa') if 'Vista de impresión abierta.' not in classic_src and 'Se abrió una pestaña independiente para imprimir o guardar PDF.' not in classic_src else fail('RC9 conserva modal de apertura exitosa')
ok('RC9 conserva apertura manual solo para bloqueo') if 'No se pudo abrir automáticamente la vista de impresión.' in classic_src and 'Abrir vista independiente' in classic_src else fail('RC9 no conserva apertura manual ante bloqueo')

con.close()
print('\nRESULTADO:', 'OK' if not errors else f'ERRORES={len(errors)}')
sys.exit(1 if errors else 0)
