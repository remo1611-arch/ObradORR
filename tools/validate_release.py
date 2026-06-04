#!/usr/bin/env python3
from pathlib import Path
import sqlite3, subprocess, sys
ROOT = Path(__file__).resolve().parents[1]
errors=[]
def ok(m): print('[OK]',m)
def fail(m): print('[ERROR]',m); errors.append(m)
for js in sorted((ROOT/'app/js').rglob('*.js')):
    r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
    ok(f'node --check {js.relative_to(ROOT)}') if r.returncode==0 else fail(f'node --check falla {js.relative_to(ROOT)}: {r.stderr}')
html=(ROOT/'app/obradorr.html').read_text(encoding='utf-8')
alljs='\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'app/js').rglob('*.js'))
css=(ROOT/'app/css/obradorr.css').read_text(encoding='utf-8')
for token in ['2.0.0','2.0.0-stable','obradorr-200-stable','ObradORRExportTools','exportPracticeZip','ObradORRRecursiveEngine','ObradORRPreflight','ObradORRSafeEditor','ObradORRImportMerge','findIngredientNameDuplicate','findRecipeNameDuplicate','friendlyDbErrorMessage','Comprobación documental previa','Criterio de revisión documental','Sistema de guardado disponible','Base incluida en la aplicación cargada','pagehide','visibilitychange','previous-db-1']:
    ok(f'token presente: {token}') if token in (html+'\n'+alljs+css) else fail(f'token ausente: {token}')
for forbidden in ['Preflight documental experimental','Vía B ·','B1 ·','B2 ·','B3 ·','B4 ·']:
    if forbidden in (html+'\n'+alljs): fail(f'texto público no limpiado: {forbidden}')
    else: ok(f'texto público ausente: {forbidden}')
con=sqlite3.connect(ROOT/'db/obradorr.sqlite')
cur=con.cursor()
if cur.execute('PRAGMA integrity_check').fetchone()[0]=='ok': ok('SQLite integrity_check ok')
else: fail('SQLite integrity_check falla')
fk=cur.execute('PRAGMA foreign_key_check').fetchall()
ok('SQLite foreign_key_check sin errores') if not fk else fail(f'foreign_key_check: {fk[:5]}')
meta=dict(cur.execute("SELECT key,value FROM app_meta WHERE key IN ('app_version','schema_version','release_tag','cache_tag','stable','public_github_ready')"))
for k,v in [('app_version','2.0.0'),('schema_version','2.0.0'),('release_tag','2.0.0-stable'),('cache_tag','obradorr-200-stable'),('stable','1'),('public_github_ready','1')]:
    ok(f'app_meta {k}={v}') if meta.get(k)==v else fail(f'app_meta {k} incorrecto: {meta.get(k)}')
for table in ['culinary_recipes','bakery_recipes']:
    v=cur.execute(f"SELECT COUNT(*) FROM {table} WHERE active=1 AND release_status='validada'").fetchone()[0]
    ok(f'{table} activas sin validada') if v==0 else fail(f'{table} contiene {v} validada')
bad=cur.execute("SELECT COUNT(*) FROM bakery_recipes WHERE active=1 AND COALESCE(yield_status,'pending')<>'pending'").fetchone()[0]
ok('bakery yield_status pending') if bad==0 else fail(f'bakery yield_status no pending: {bad}')
for table in ['import_log','migrations_log']:
    ok(f'tabla {table} presente') if cur.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone()[0] else fail(f'tabla {table} ausente')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-QUICHE-LORRAINE' AND subrecipe_id='REC-PAST-QUEBRADA-DULCE'").fetchone(): fail('Quiche conserva masa quebrada dulce')
else: ok('Quiche sin masa quebrada dulce real')
ok('migración limpieza pública registrada') if cur.execute("SELECT 1 FROM migrations_log WHERE id='20260604_200_public_github_ready'").fetchone() else fail('migración limpieza pública ausente')
con.close()
print('\nRESULTADO:', 'OK' if not errors else f'ERRORES={len(errors)}')
sys.exit(1 if errors else 0)
