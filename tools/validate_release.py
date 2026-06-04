#!/usr/bin/env python3
from pathlib import Path
import sqlite3, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
VERSION='2.0.0-stable-candidate'
CACHE='obradorr-200-stable-candidate'
errors=[]
def ok(m): print('[OK]',m)
def fail(m): print('[ERROR]',m); errors.append(m)
for js in sorted((ROOT/'app/js').rglob('*.js')):
    r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
    ok(f'node --check {js.relative_to(ROOT)}') if r.returncode==0 else fail(f'node --check falla {js.relative_to(ROOT)}: {r.stderr}')
html=(ROOT/'app/obradorr.html').read_text(encoding='utf-8')
alljs='\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'app/js').rglob('*.js'))
for token in [VERSION,CACHE,'ObradORRExportTools','exportPracticeZip','setupEditorComfort','duplicateRecipe','ObradORRRecursiveEngine','ObradORRPreflight','ObradORRSafeEditor','ObradORRFileTools','ObradORRImportMerge','dbMergeFileInput','spanishLongDate','safeDownloadName','getIsoTimestampForFilename','printDocumentFilenameBase','sheet-head-photo']:
    ok(f'token presente: {token}') if token in (html+'\n'+alljs) else fail(f'token ausente: {token}')
con=sqlite3.connect(ROOT/'db/obradorr.sqlite')
cur=con.cursor()
if cur.execute('PRAGMA integrity_check').fetchone()[0]=='ok': ok('SQLite integrity_check ok')
else: fail('SQLite integrity_check falla')
fk=cur.execute('PRAGMA foreign_key_check').fetchall()
ok('SQLite foreign_key_check sin errores') if not fk else fail(f'foreign_key_check: {fk[:5]}')
meta=dict(cur.execute("SELECT key,value FROM app_meta WHERE key IN ('app_version','schema_version','release_tag','cache_tag','rc2_backup_import_export','safe_merge_import','rc3_cierre_pdf_maquetacion','rc3_1_hotfix_maquetacion','stable_candidate')"))
for k in ['app_version','schema_version','release_tag']:
    ok(f'app_meta {k}={VERSION}') if meta.get(k)==VERSION else fail(f'app_meta {k}={meta.get(k)}')
ok('app_meta cache_tag correcto') if meta.get('cache_tag')==CACHE else fail(f"cache_tag incorrecto: {meta.get('cache_tag')}")
ok('app_meta rc2_backup_import_export=1') if meta.get('rc2_backup_import_export')=='1' else fail('marca rc2 ausente')
ok('app_meta safe_merge_import=1') if meta.get('safe_merge_import')=='1' else fail('marca importación segura ausente')
ok('app_meta rc3_cierre_pdf_maquetacion=1') if meta.get('rc3_cierre_pdf_maquetacion')=='1' else fail('marca rc3 maquetación ausente')
for table in ['culinary_recipes','bakery_recipes']:
    v=cur.execute(f"SELECT COUNT(*) FROM {table} WHERE active=1 AND release_status='validada'").fetchone()[0]
    ok(f'{table} activas sin validada') if v==0 else fail(f'{table} contiene {v} validada')
bad=cur.execute("SELECT COUNT(*) FROM bakery_recipes WHERE active=1 AND COALESCE(yield_status,'pending')<>'pending'").fetchone()[0]
ok('bakery yield_status pending') if bad==0 else fail(f'bakery yield_status no pending: {bad}')
for table in ['import_log','migrations_log']:
    ok(f'tabla {table} presente') if cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone()[0] else fail(f'tabla {table} ausente')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260604_200_rc2_backup_import_export'").fetchone(): ok('migración RC2 registrada')
else: fail('migración RC2 no registrada')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260604_200_rc3_cierre_pdf_maquetacion'").fetchone(): ok('migración RC3 registrada')
else: fail('migración RC3 no registrada')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260604_200_rc3_1_hotfix_maquetacion'").fetchone(): ok('migración RC3.1 registrada')
else: fail('migración RC3.1 no registrada')
if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260604_200_stable_candidate'").fetchone(): ok('migración STABLE-CANDIDATE registrada')
else: fail('migración STABLE-CANDIDATE no registrada')
ok('app_meta stable_candidate=1') if meta.get('stable_candidate')=='1' else fail('marca stable_candidate ausente')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-QUICHE-LORRAINE' AND subrecipe_id='REC-PAST-QUEBRADA-DULCE'").fetchone(): fail('Quiche conserva masa quebrada dulce')
else: ok('Quiche sin masa quebrada dulce real')
app_js = (ROOT/'app/js/obradorr-app-classic.js').read_text(encoding='utf-8')
css = (ROOT/'app/css/obradorr.css').read_text(encoding='utf-8')
ok('fecha visible española mantiene coma') if 'Jueves, 4 de junio de 2026' in (ROOT/'PRINT_LAYOUT_RC3_1.md').read_text(encoding='utf-8') else fail('documentación fecha con coma ausente')
ok('foto cabecera usa object-fit contain') if 'object-fit:contain' in app_js and 'sheet-head-photo' in app_js else fail('foto cabecera RC3 no detectada')
ok('título PDF con ISO') if 'printDocumentFilenameBase' in app_js and 'document.title = suggestedTitle' in app_js else fail('nombre PDF/document.title RC3 no detectado')
ok('APPCC breve no tabular presente') if 'appcc-brief-card' in app_js else fail('appcc-brief-card ausente')
ok('sub-sheet-intro presente') if 'sub-sheet-intro' in app_js else fail('sub-sheet-intro ausente')
ok('cabecera foto forzada en print') if 'sheet-head.has-photo' in app_js and 'grid-template-columns:minmax(0,1fr) 44mm' in app_js else fail('cabecera foto RC3.1 no detectada')
con.close()
print('\nRESULTADO:', 'OK' if not errors else f'ERRORES={len(errors)}')
sys.exit(1 if errors else 0)
