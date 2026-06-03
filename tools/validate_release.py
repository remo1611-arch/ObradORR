#!/usr/bin/env python3
from pathlib import Path
import sqlite3, subprocess, sys, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
errors = []

def ok(msg):
    print(f"[OK] {msg}")

def fail(msg):
    print(f"[ERROR] {msg}")
    errors.append(msg)

# JS syntax
for js in sorted((ROOT / 'app' / 'js').glob('*.js')):
    result = subprocess.run(['node', '--check', str(js)], capture_output=True, text=True)
    if result.returncode:
        fail(f"node --check falla en {js.relative_to(ROOT)}: {result.stderr.strip()}")
    else:
        ok(f"node --check {js.relative_to(ROOT)}")

# Static search
code_files = [p for p in (ROOT / 'app').rglob('*') if p.is_file() and p.suffix.lower() in {'.html','.js','.css'}]
window_open = []
legacy = []
legacy_re = re.compile('|'.join(['SwiftRemo','APP6','BOOTFIX','HOTFIX','sqlite\\.html','FINAL3','FINAL4','HISTORYFIX']), re.I)
for p in code_files:
    try:
        content = p.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    if 'window' + '.open' in content:
        window_open.append(str(p.relative_to(ROOT)))
    if legacy_re.search(content):
        legacy.append(str(p.relative_to(ROOT)))
if window_open:
    fail('uso de apertura de ventana encontrado en ' + ', '.join(window_open))
else:
    ok('sin apertura de ventana nueva en código')
if legacy:
    fail('restos nominales críticos en código: ' + ', '.join(sorted(set(legacy))[:20]))
else:
    ok('sin restos nominales críticos en código')

app_html = (ROOT / 'app' / 'obradorr.html').read_text(encoding='utf-8')
if 'iframe' in (ROOT / 'app' / 'js' / 'obradorr-app-classic.js').read_text(encoding='utf-8'):
    ok('iframe de impresión presente')
else:
    fail('no se encontró iframe de impresión')
if 'obradorr-100-rc3' in app_html:
    ok('cache tag RC3 en HTML')
else:
    fail('cache tag RC3 ausente en HTML')

# SQLite
con = sqlite3.connect(ROOT / 'db' / 'obradorr.sqlite')
cur = con.cursor()
integrity = cur.execute('PRAGMA integrity_check').fetchone()[0]
if integrity == 'ok':
    ok('SQLite integrity_check ok')
else:
    fail(f'SQLite integrity_check={integrity}')
fk = cur.execute('PRAGMA foreign_key_check').fetchall()
if not fk:
    ok('SQLite foreign_key_check sin errores')
else:
    fail(f'SQLite foreign_key_check: {fk[:5]}')

def value(sql):
    return cur.execute(sql).fetchone()[0]

checks = {
    'tables': "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    'views': "SELECT COUNT(*) FROM sqlite_master WHERE type='view'",
    'bakery_recipe_components': "SELECT COUNT(*) FROM bakery_recipe_components",
    'schema_migrations': "SELECT COUNT(*) FROM schema_migrations",
}
for label, sql in checks.items():
    n = value(sql)
    print(f"[INFO] {label}: {n}")
    if label in {'bakery_recipe_components','schema_migrations'} and n <= 0:
        fail(f'{label} vacío')

meta = dict(cur.execute("SELECT key,value FROM app_meta WHERE key IN ('app_version','release_tag','cache_tag','schema_version')"))
for key, expected in {'app_version':'1.0.0-rc.3','release_tag':'rc3','cache_tag':'obradorr-100-rc3','schema_version':'1.0.0-rc.3'}.items():
    if meta.get(key) == expected:
        ok(f'app_meta {key}={expected}')
    else:
        fail(f'app_meta {key}={meta.get(key)!r}, esperado {expected!r}')

torta = cur.execute("SELECT ingredient, grams_for_base_flour FROM v_print_bakery_formula WHERE recipe_id='torta-de-nata-pedro' AND ingredient IN ('Nata 35 % MG','Azúcar blanco')").fetchall()
print('[INFO] Torta de nata:', torta)
if not any(name == 'Nata 35 % MG' and float(qty or 0) > 0 for name, qty in torta):
    fail('Torta de nata sin Nata 35 % MG positiva')
else:
    ok('Torta de nata: Nata 35 % MG positiva')
if not any(name == 'Azúcar blanco' and float(qty or 0) > 0 for name, qty in torta):
    fail('Torta de nata sin Azúcar blanco positivo')
else:
    ok('Torta de nata: Azúcar blanco positivo')


# P0-D structured APPCC minimum
appcc_table = cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='appcc_doc_blocks'").fetchone()[0]
if appcc_table == 1:
    ok('tabla appcc_doc_blocks presente')
else:
    fail('tabla appcc_doc_blocks ausente')

missing_cul = cur.execute("""
SELECT COUNT(*) FROM culinary_recipes r
WHERE r.active=1 AND NOT EXISTS (
  SELECT 1 FROM appcc_doc_blocks b WHERE b.recipe_kind='culinary' AND b.recipe_id=r.id AND b.active=1
)
""").fetchone()[0]
missing_bak = cur.execute("""
SELECT COUNT(*) FROM bakery_recipes r
WHERE r.active=1 AND NOT EXISTS (
  SELECT 1 FROM appcc_doc_blocks b WHERE b.recipe_kind='bakery' AND b.recipe_id=r.id AND b.active=1
)
""").fetchone()[0]
if missing_cul == 0 and missing_bak == 0:
    ok('APPCC docente mínimo presente para recetas activas')
else:
    fail(f'APPCC docente mínimo ausente: cocina={missing_cul}, panadería={missing_bak}')

empty_appcc = cur.execute("""
SELECT COUNT(*) FROM appcc_doc_blocks
WHERE active=1 AND (
  TRIM(COALESCE(risk_family,''))='' OR TRIM(COALESCE(hazard_type,''))='' OR
  TRIM(COALESCE(main_hazard,''))='' OR TRIM(COALESCE(preventive_measure,''))='' OR
  TRIM(COALESCE(monitoring,''))='' OR TRIM(COALESCE(corrective_action,''))='' OR
  TRIM(COALESCE(record_reference,''))='' OR TRIM(COALESCE(service_conservation,''))=''
)
""").fetchone()[0]
if empty_appcc == 0:
    ok('APPCC docente mínimo sin campos obligatorios vacíos')
else:
    fail(f'APPCC docente mínimo con campos vacíos: {empty_appcc}')

js_code = (ROOT / 'app' / 'js' / 'obradorr-app-classic.js').read_text(encoding='utf-8')
for marker in ['appccRowsFor', 'APPCC docente mínimo', 'appcc_doc_blocks', 'appcc-table']:
    if marker in js_code:
        ok(f'marcador APPCC impresión: {marker}')
    else:
        fail(f'marcador APPCC impresión ausente: {marker}')

# P0-E pedido SQL/JS equivalente
for view_name in ['v_bakery_order_lines','v_class_bakery_item_lines','v_class_culinary_item_lines','v_class_order_lines']:
    exists = cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name=?", (view_name,)).fetchone()[0]
    if exists:
        ok(f'vista pedido P0-E presente: {view_name}')
    else:
        fail(f'vista pedido P0-E ausente: {view_name}')

# Validación transaccional de pedido de sesión: componentes required sí, optional no.
try:
    cur.execute('BEGIN')
    cur.execute("INSERT INTO class_sessions(id,title) VALUES ('QA-P0E','QA P0-E')")
    for idx, rid in enumerate(['babka-chocolate','croissant-con-poolish','torta-de-nata-pedro','larpeira-gallega'], start=1):
        cur.execute("""
        INSERT INTO class_session_items(id,session_id,item_type,bakery_recipe_id,production_mode,flour_g,sort_order)
        VALUES (?,?,?,?,?,?,?)
        """, (f'QA-P0E-{idx}', 'QA-P0E', 'bakery', rid, 'flour', 1000, idx))
    required_component_rows = cur.execute("""
      SELECT COUNT(*) FROM v_class_order_lines
      WHERE session_id='QA-P0E' AND recipe_id='babka-chocolate' AND source_type='component' AND component_status='required'
    """).fetchone()[0]
    optional_component_rows = cur.execute("""
      SELECT COUNT(*) FROM v_class_order_lines
      WHERE session_id='QA-P0E' AND recipe_id IN ('croissant-con-poolish','torta-de-nata-pedro') AND source_type='component'
    """).fetchone()[0]
    if required_component_rows > 0:
        ok('pedido SQL incluye componente required de Babka')
    else:
        fail('pedido SQL no incluye componente required de Babka')
    if optional_component_rows == 0:
        ok('pedido SQL excluye componentes optional de Croissant/Torta')
    else:
        fail(f'pedido SQL incluye componentes optional: {optional_component_rows}')
finally:
    cur.execute('ROLLBACK')

js_code_p0e = (ROOT / 'app' / 'js' / 'obradorr-app-classic.js').read_text(encoding='utf-8')
for marker in ["c.component_status !== 'required'", "source_type: 'component'", "included_in_base_order"]:
    if marker in js_code_p0e:
        ok(f'marcador P0-E JS: {marker}')
    else:
        fail(f'marcador P0-E JS ausente: {marker}')


# P0-F persistencia/autoguardado/importación/reset
p0f_meta = cur.execute("SELECT value FROM app_meta WHERE key='p0f_correction'").fetchone()
if p0f_meta and 'persistencia' in p0f_meta[0]:
    ok('metadato P0-F presente')
else:
    fail('metadato P0-F ausente')

reset_html = (ROOT / 'app' / 'reset_local_data.html').read_text(encoding='utf-8')
for marker in ['confirmReset', 'Confirmación final', 'descarga una copia SQLite', 'obradorr-data-100-rc3']:
    if marker in reset_html:
        ok(f'marcador reset seguro: {marker}')
    else:
        fail(f'marcador reset seguro ausente: {marker}')

for marker in ['beforeunload', 'hasUnsavedWork', 'confirmBackupBeforeDestructiveAction', 'Error al guardar recuperación local', 'Copia SQLite descargada manualmente', 'IndexedDB no disponible', 'data-safety']:
    if marker in js_code_p0e:
        ok(f'marcador P0-F JS: {marker}')
    else:
        fail(f'marcador P0-F JS ausente: {marker}')

css_p0f = (ROOT / 'app' / 'css' / 'obradorr.css').read_text(encoding='utf-8')
for marker in ['data-safety', 'safe-action', 'danger-zone']:
    if marker in css_p0f:
        ok(f'marcador P0-F CSS: {marker}')
    else:
        fail(f'marcador P0-F CSS ausente: {marker}')


# RC3 copyright/footer validation
notice = '© 2026 Remo José Pereira González · Uso docente personal autorizado · Sin licencia abierta de redistribución o explotación comercial.'
for path in ['app/js/obradorr-app-classic.js', 'app/css/obradorr.css', 'README.md', 'NOTICE.md']:
    content = (ROOT / path).read_text(encoding='utf-8')
    if notice in content:
        ok(f'aviso autoría presente en {path}')
    else:
        fail(f'aviso autoría ausente en {path}')
if 'print-legal-footer' in js_code_p0e:
    ok('pie legal de impresión presente')
else:
    fail('pie legal de impresión ausente')

con.close()

if errors:
    print('\nVALIDACIÓN FALLIDA')
    sys.exit(1)
print('\nVALIDACIÓN OK')
