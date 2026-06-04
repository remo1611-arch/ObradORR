#!/usr/bin/env python3
from pathlib import Path
import sqlite3, subprocess, hashlib, sys
ROOT = Path(__file__).resolve().parents[1]
RC = "1.0.0-rc.28-stable-candidate"
TAG = "rc28-stable-candidate"
CACHE = "obradorr-100-rc28-stable-candidate"
B1_EXPECTED = 13
B2_EXPECTED = 39
B3_EXPECTED = 30
B4_EXPECTED = 97
errors = []
def ok(msg): print(f"[OK] {msg}")
def fail(msg):
    print(f"[ERROR] {msg}")
    errors.append(msg)
for js in sorted((ROOT / "app" / "js").glob("*.js")):
    res = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
    if res.returncode: fail(f"node --check falla en {js.relative_to(ROOT)}: {res.stderr.strip()}")
    else: ok(f"node --check {js.relative_to(ROOT)}")
html = (ROOT / "app" / "obradorr.html").read_text(encoding="utf-8")
appjs = (ROOT / "app" / "js" / "obradorr-app-classic.js").read_text(encoding="utf-8")
if CACHE in html and CACHE in appjs: ok("cache tag RC28-STABLE-CANDIDATE presente en HTML y JS")
else: fail("cache tag RC28-STABLE-CANDIDATE ausente en HTML o JS")
if "profileRadio" in appjs and "subrecipeCategory" in appjs and "effectivePrintOptions" in appjs: ok("perfil documental y clasificación de subrecetas presentes")
else: fail("perfil documental o clasificación de subrecetas ausente")
if "profileOptionDefaults" in appjs and "boolOption" in appjs and "Mostrar costes" in appjs and "Mostrar APPCC docente" in appjs and "minimalSafetyNoticeHtml" in appjs: ok("opciones manuales de costes/APPCC presentes")
else: fail("opciones manuales de costes/APPCC ausentes")
if "window.open" in appjs: fail("posible window.open detectado")
else: ok("sin window.open directo en app clásica")
if '<option value="validated"' in appjs or 'Validada</option>' in appjs:
    fail("el editor ordinario conserva opción Validada")
else:
    ok("editor ordinario sin opción Validada")
for token in ["release_status,yield_status", "'draft','pendiente','pending'", "status,release_status,process", "'draft','pendiente'"]:
    if token in appjs: ok(f"inserción JS protegida: {token}")
    else: fail(f"inserción JS no contiene token esperado: {token}")
con = sqlite3.connect(ROOT / "db" / "obradorr.sqlite")
cur = con.cursor()
integ = cur.execute("PRAGMA integrity_check").fetchone()[0]
if integ == "ok": ok("SQLite integrity_check ok")
else: fail(f"SQLite integrity_check={integ}")
fk = cur.execute("PRAGMA foreign_key_check").fetchall()
if not fk: ok("SQLite foreign_key_check sin errores")
else: fail(f"SQLite foreign_key_check: {fk[:10]}")
meta = dict(cur.execute("SELECT key,value FROM app_meta WHERE key IN ('app_version','release_tag','cache_tag','schema_version','validation_policy','b1_documentary_reviews','b2_documentary_reviews','b3_documentary_reviews','b4_documentary_reviews','rc22_0_preflight')"))
for k, exp in {'app_version':RC, 'schema_version':RC, 'release_tag':TAG, 'cache_tag':CACHE}.items():
    if meta.get(k) == exp: ok(f"app_meta {k}={exp}")
    else: fail(f"app_meta {k}={meta.get(k)!r}, esperado {exp!r}")
if "prueba real de obrador" in meta.get("validation_policy", ""): ok("app_meta validation_policy presente")
else: fail("app_meta validation_policy ausente")
if "release_status default pendiente" in meta.get("rc22_0_preflight", ""): ok("app_meta rc22_0_preflight presente")
else: fail("app_meta rc22_0_preflight ausente")
for key, expected, label in [("b1_documentary_reviews", B1_EXPECTED, "B1"), ("b2_documentary_reviews", B2_EXPECTED, "B2"), ("b3_documentary_reviews", B3_EXPECTED, "B3"), ("b4_documentary_reviews", B4_EXPECTED, "B4")]:
    val = meta.get(key, "")
    if str(expected) in val: ok(f"app_meta {key} presente")
    else: fail(f"app_meta {key} ausente o sin recuento esperado: {val!r}")
for table in ["culinary_recipes", "bakery_recipes"]:
    schema = cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()[0]
    if "DEFAULT 'pendiente'" in schema and "release_status IN ('pendiente', 'no_apta', 'validada')" in schema:
        ok(f"{table} release_status blindado")
    else:
        fail(f"{table} release_status no blindado")
    rows = cur.execute(f"SELECT release_status, COUNT(*) FROM {table} GROUP BY release_status ORDER BY release_status").fetchall()
    print(f"[INFO] {table} release_status: {rows}")
    val = cur.execute(f"SELECT COUNT(*) FROM {table} WHERE active=1 AND release_status='validada'").fetchone()[0]
    if val == 0: ok(f"{table} activas sin release_status validada")
    else: fail(f"{table} mantiene {val} fichas activas validada")
if "yield_status IN ('pending', 'tested', 'validated')" in cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bakery_recipes'").fetchone()[0]:
    ok("bakery_recipes yield_status blindado")
else:
    fail("bakery_recipes yield_status no blindado")
# Smoke tests with rollback
cur.execute('BEGIN')
try:
    cur.execute("INSERT INTO culinary_recipes (id,name,family_id,base_servings,production_kind,default_production_mode,status,process,service_notes,appcc_notes,notes,active) VALUES ('TEST_VALIDATE_RC22_CUL','TEST VALIDATE RC22 CUL',NULL,10,'final_servings','servings','draft','','','','',1)")
    cul_default = cur.execute("SELECT release_status FROM culinary_recipes WHERE id='TEST_VALIDATE_RC22_CUL'").fetchone()[0]
    cur.execute("INSERT INTO bakery_recipes (id,name,family_id,base_flour_g,base_pieces,baking_loss_pct,status,fermentation_notes,notes,active) VALUES ('TEST_VALIDATE_RC22_BAK','TEST VALIDATE RC22 BAK',NULL,1000,10,0,'draft','','',1)")
    bak_default = cur.execute("SELECT release_status,yield_status FROM bakery_recipes WHERE id='TEST_VALIDATE_RC22_BAK'").fetchone()
    if cul_default == 'pendiente': ok("smoke culinary default release_status=pendiente")
    else: fail(f"smoke culinary default release_status={cul_default!r}")
    if bak_default == ('pendiente','pending'): ok("smoke bakery default release_status/yield_status=pendiente/pending")
    else: fail(f"smoke bakery default release/yield={bak_default!r}")
finally:
    cur.execute('ROLLBACK')
checks = [("bakery_recipes", "Mezcla de harinas sin gluten base")]
for table, name in checks:
    row = cur.execute(f"SELECT release_status FROM {table} WHERE name=?", (name,)).fetchone()
    if row and row[0] == "no_apta": ok(f"no_apta preservada: {name}")
    else: fail(f"estado incorrecto en {name}: {row}")
# P0 DATA1: Pad thai y Quiche quedan reformulados y pendientes, no validados.
for rid in ["REC-PAD-THAI", "REC-QUICHE-LORRAINE"]:
    row = cur.execute("SELECT release_status FROM culinary_recipes WHERE id=?", (rid,)).fetchone()
    if row and row[0] == "pendiente": ok(f"P0 reformulada como pendiente: {rid}")
    else: fail(f"P0 con estado incorrecto: {rid} -> {row}")
if not cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-PAD-THAI' AND ingredient_id IN ('ING-TAMARINDO-PASTA','ING-CACAHUETE-TOSTADO') LIMIT 1").fetchone():
    fail("Pad thai no contiene tamarindo/cacahuete corregidos")
else: ok("Pad thai contiene componentes técnicos corregidos")
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-PAD-THAI' AND ingredient_id IN ('FRT020','FRX014') LIMIT 1").fetchone():
    fail("Pad thai conserva uva o nueces")
else: ok("Pad thai sin uva/nueces")
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-QUICHE-LORRAINE' AND subrecipe_id='REC-PAST-QUEBRADA-DULCE' LIMIT 1").fetchone():
    fail("Quiche conserva pasta quebrada dulce")
else: ok("Quiche sin pasta quebrada dulce")
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-QUICHE-LORRAINE' AND ingredient_id='PAS053' LIMIT 1").fetchone(): ok("Quiche usa masa quebrada refrigerada/neutral")
else: fail("Quiche no contiene masa quebrada corregida")

# RC23-DATA2: subrecetas madre P1 corregidas o reforzadas.
rc23_targets = ['REC-FUMET-PESCADO','REC-FONDO-OSCURO-TERNERA','REC-FONDO-BLANCO-AVE','REC-SALSA-TOMATE','REC-BOUQUET-GARNI','REC-SALSA-TARTARA','REC-SALSA-BRAVA','REC-SOFRITO-BASE','REC-SALSA-CHORON']
for rid in rc23_targets:
    row = cur.execute("SELECT release_status FROM culinary_recipes WHERE id=?", (rid,)).fetchone()
    if row and row[0] == 'pendiente': ok(f"RC23-DATA2 pendiente preservado: {rid}")
    else: fail(f"RC23-DATA2 estado incorrecto: {rid} -> {row}")
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-BOUQUET-GARNI' AND ingredient_id='HER-TOMILLO-FRESCO'").fetchone(): ok('Bouquet garni contiene tomillo')
else: fail('Bouquet garni no contiene tomillo')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-BOUQUET-GARNI' AND ingredient_id='TEC-ESTRAGON'").fetchone(): fail('Bouquet garni conserva estragón')
else: ok('Bouquet garni sin estragón')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-SALSA-BRAVA' AND ingredient_id='CON055'").fetchone(): ok('Salsa brava contiene pimentón picante')
else: fail('Salsa brava sin pimentón picante')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-SOFRITO-BASE' AND ingredient_id='aceite-de-oliva-virgen'").fetchone(): ok('Sofrito usa aceite de oliva virgen')
else: fail('Sofrito no usa aceite de oliva virgen')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-SOFRITO-BASE' AND ingredient_id='GRA003'").fetchone(): fail('Sofrito conserva girasol alto oleico')
else: ok('Sofrito sin girasol alto oleico')
choron_service = cur.execute("SELECT service_notes FROM culinary_recipes WHERE id='REC-SALSA-CHORON'").fetchone()[0]
if 'Servicio inmediato' in choron_service and 'No conservar' in choron_service: ok('Choron marcada como servicio inmediato/no reutilización')
else: fail('Choron sin servicio inmediato claro')
for rid in rc23_targets:
    review_id = 'REV_RC23_DATA2_' + rid.replace('REC-','').replace('-','_')
    if cur.execute("SELECT 1 FROM recipe_documentary_reviews WHERE id=?", (review_id,)).fetchone(): ok(f"review RC23 presente: {review_id}")
    else: fail(f"review RC23 ausente: {review_id}")
rc23_meta = cur.execute("SELECT value FROM app_meta WHERE key='rc23_data2_subrecetas_madre'").fetchone()
if rc23_meta and 'applied: corrección conceptual P1 de 9 subrecetas madre' in rc23_meta[0]: ok('app_meta rc23_data2_subrecetas_madre presente')
else: fail('app_meta rc23_data2_subrecetas_madre ausente')


# RC24-DATA3: platos finales recursivos.
rc24_targets = ['REC-CHOCOS-ARROZ','REC-ARROZ-MARINERO','REC-ARROZ-PILAF','REC-BACALAO-VIZCAINA','REC-BLANQUETA-TERNERA','REC-CALAMARES-TINTA','REC-CARRILLERAS-VINO-TINTO','REC-COQ-AU-VIN','REC-FIDEUA-MARISCO','REC-FRICANDO','REC-MERLUZA-SALSA-VERDE-CLASICA','REC-PATATAS-BRAVAS','REC-PIZZA-MARGARITA','REC-RABO-TORO','REC-RISOTTO-SETAS','REC-RODABALLO-HORNO-PANADERA','REC-SUQUET-PEIX','REC-XARRETE-TERNERA-GLASEADO','REC-ZARZUELA-MARISCO']
for rid in rc24_targets:
    row = cur.execute("SELECT release_status, process, appcc_notes FROM culinary_recipes WHERE id=?", (rid,)).fetchone()
    if row and row[0] == 'pendiente' and 'RC24-DATA3' in (cur.execute("SELECT notes FROM culinary_recipes WHERE id=?", (rid,)).fetchone()[0] or ''):
        ok(f"RC24-DATA3 pendiente y trazado: {rid}")
    else:
        fail(f"RC24-DATA3 estado/traza incorrectos: {rid} -> {row}")
for rid in rc24_targets:
    review_id = 'REV_RC24_DATA3_' + rid.replace('REC-','').replace('-','_')
    if cur.execute("SELECT 1 FROM recipe_documentary_reviews WHERE id=?", (review_id,)).fetchone(): ok(f"review RC24 presente: {review_id}")
    else: fail(f"review RC24 ausente: {review_id}")
if cur.execute("SELECT ingredient_id FROM culinary_recipe_lines WHERE recipe_id='REC-ARROZ-PILAF' AND sort_order=10").fetchone()[0] == 'CER004': ok('Arroz pilaf usa arroz largo/basmati')
else: fail('Arroz pilaf no usa arroz largo/basmati')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-CHOCOS-ARROZ' AND ingredient_id='PES060'").fetchone(): ok('Arroz con chocos contiene tinta de calamar')
else: fail('Arroz con chocos sin tinta de calamar')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-CALAMARES-TINTA' AND ingredient_id='aceite-de-oliva-virgen'").fetchone(): ok('Calamares en tinta usan aceite de oliva virgen')
else: fail('Calamares en tinta no usan aceite de oliva virgen')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-CALAMARES-TINTA' AND ingredient_id='GRA003'").fetchone(): fail('Calamares en tinta conservan girasol alto oleico')
else: ok('Calamares en tinta sin girasol alto oleico')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-SUQUET-PEIX' AND ingredient_id='PES064'").fetchone(): fail('Suquet conserva salmón')
else: ok('Suquet sin salmón')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-SUQUET-PEIX' AND ingredient_id='PES004'").fetchone(): ok('Suquet usa pescado blanco firme')
else: fail('Suquet no usa pescado blanco firme')
if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id='REC-FRICANDO' AND ingredient_id='FRX010'").fetchone(): ok('Fricandó usa avellana en picada')
else: fail('Fricandó sin avellana en picada')
rc24_meta = cur.execute("SELECT value FROM app_meta WHERE key='rc24_data3_platos_finales'").fetchone()
if rc24_meta and '19 platos finales recursivos' in rc24_meta[0]: ok('app_meta rc24_data3_platos_finales presente')
else: fail('app_meta rc24_data3_platos_finales ausente')



# RC25-DATA4: panadería/pastelería puente en culinary_recipes.
rc25_targets = ['REC-FOCACCIA','REC-MASA-EMPANADA','REC-MASA-PIZZA','REC-PAN-BASICO','REC-PAN-GALLEGO','REC-PAST-ALMIBAR-30','REC-PAST-MANZANA-COMPOTA','REC-PAST-GENOVES','REC-PAST-BIZCOCHO-PLANCHA','REC-PAST-QUEBRADA-DULCE','REC-PAST-HOJALDRE-BASE','REC-PAST-MERENGUE-FRANCES','REC-PAST-MERENGUE-ITALIANO']
for rid in rc25_targets:
    row = cur.execute("SELECT release_status, process, notes FROM culinary_recipes WHERE id=?", (rid,)).fetchone()
    if row and row[0] == 'pendiente' and 'RC25-DATA4' in (row[2] or ''):
        ok(f"RC25-DATA4 pendiente y trazado: {rid}")
    else:
        fail(f"RC25-DATA4 estado/traza incorrectos: {rid} -> {row}")
    review_id = 'REV_RC25_DATA4_' + rid.replace('REC-','').replace('-','_')
    if cur.execute("SELECT 1 FROM recipe_documentary_reviews WHERE id=? AND obrador_validation_required=1", (review_id,)).fetchone():
        ok(f"review RC25 presente: {review_id}")
    else:
        fail(f"review RC25 ausente o sin obrador_validation_required: {review_id}")
alm = cur.execute("SELECT name,yield_quantity FROM culinary_recipes WHERE id='REC-PAST-ALMIBAR-30'").fetchone()
sugar = cur.execute("SELECT quantity FROM culinary_recipe_lines WHERE recipe_id='REC-PAST-ALMIBAR-30' AND ingredient_id='PAS047'").fetchone()
if alm and '30 °Brix orientativo' in alm[0] and alm[1] is None and sugar and abs(float(sugar[0])-0.30) < 0.0001:
    ok('Almíbar 30 °Brix corregido a 300 g azúcar / rendimiento no validado')
else:
    fail(f'Almíbar 30 °Brix no corregido como esperado: name/yield={alm}, sugar={sugar}')
qb = cur.execute("SELECT process FROM culinary_recipes WHERE id='REC-PAST-QUEBRADA-DULCE'").fetchone()[0]
if 'sablage' in qb and 'No usar para quiche' in qb:
    ok('Pasta quebrada dulce corregida con sablage y restricción salada')
else:
    fail('Pasta quebrada dulce sin sablage/restricción salada')
hoj = cur.execute("SELECT process FROM culinary_recipes WHERE id='REC-PAST-HOJALDRE-BASE'").fetchone()[0]
if 'vueltas' in hoj and 'reposos en frío' in hoj:
    ok('Hojaldre contiene vueltas y reposos en frío')
else:
    fail('Hojaldre sin vueltas/reposos en frío')
gen = cur.execute("SELECT process FROM culinary_recipes WHERE id='REC-PAST-GENOVES'").fetchone()[0]
if 'punto de cinta' in gen or 'rubán' in gen:
    ok('Genovés contiene punto de cinta/rubán')
else:
    fail('Genovés sin punto de cinta/rubán')
mi = cur.execute("SELECT process FROM culinary_recipes WHERE id='REC-PAST-MERENGUE-ITALIANO'").fetchone()[0]
if '118-121 °C' in mi and 'termómetro' in mi:
    ok('Merengue italiano mantiene control 118-121 °C y termómetro')
else:
    fail('Merengue italiano sin control técnico')
rc25_meta = cur.execute("SELECT value FROM app_meta WHERE key='rc25_data4_panaderia_pasteleria_puentes'").fetchone()
if rc25_meta and '13 fichas puente' in rc25_meta[0]: ok('app_meta rc25_data4 presente')
else: fail('app_meta rc25_data4 ausente')

for table in ["documentary_sources", "recipe_documentary_reviews"]:
    exists = cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()
    if exists: ok(f"tabla documental presente: {table}")
    else: fail(f"tabla documental ausente: {table}")
sources = cur.execute("SELECT COUNT(*) FROM documentary_sources").fetchone()[0]
reviews = cur.execute("SELECT COUNT(*) FROM recipe_documentary_reviews").fetchone()[0]
b1 = cur.execute("SELECT COUNT(*) FROM recipe_documentary_reviews WHERE id LIKE 'REV_B1_%_RC13'").fetchone()[0]
b2 = cur.execute("SELECT COUNT(*) FROM recipe_documentary_reviews WHERE id LIKE 'REV_B2_%_RC14'").fetchone()[0]
b3 = cur.execute("SELECT COUNT(*) FROM recipe_documentary_reviews WHERE id LIKE 'REV_B3_%_RC15'").fetchone()[0]
b4 = cur.execute("SELECT COUNT(*) FROM recipe_documentary_reviews WHERE id LIKE 'REV_B4_%_RC16'").fetchone()[0]
active_bakery = cur.execute("SELECT COUNT(*) FROM bakery_recipes WHERE active=1").fetchone()[0]
print(f"[INFO] documentary_sources={sources} reviews={reviews} b1={b1} b2={b2} b3={b3} b4={b4} active_bakery={active_bakery}")
if sources >= 19: ok("fuentes documentales ampliadas presentes")
else: fail("fuentes documentales insuficientes")
if b1 == B1_EXPECTED: ok(f"B1 contiene {B1_EXPECTED} revisiones documentales")
else: fail(f"B1 contiene {b1} revisiones, esperado {B1_EXPECTED}")
if b2 == B2_EXPECTED: ok(f"B2 contiene {B2_EXPECTED} revisiones documentales")
else: fail(f"B2 contiene {b2} revisiones, esperado {B2_EXPECTED}")
if b3 == B3_EXPECTED: ok(f"B3 contiene {B3_EXPECTED} revisiones documentales")
else: fail(f"B3 contiene {b3} revisiones, esperado {B3_EXPECTED}")
if b4 == B4_EXPECTED: ok(f"B4 contiene {B4_EXPECTED} revisiones documentales")
else: fail(f"B4 contiene {b4} revisiones, esperado {B4_EXPECTED}")
if b4 == active_bakery: ok("B4 cubre todas las fichas activas de bakery_recipes")
else: fail(f"B4 no cubre todas las fichas activas: b4={b4}, active_bakery={active_bakery}")
for rid in ['REV_B4_CROISSANT_DIRECTO_RC16','REV_B4_BAGUETTE_CON_POOLISH_RC16','REV_B4_PAN_SIN_GLUTEN_BASICO_RC16','REV_B4_DOSA_FERMENTADA_RC16','REV_B4_MEZCLA_DE_HARINAS_SIN_GLUTEN_BASE_RC16']:
    if cur.execute("SELECT 1 FROM recipe_documentary_reviews WHERE id=?", (rid,)).fetchone(): ok(f"review presente: {rid}")
    else: fail(f"review ausente: {rid}")

# RC26: escalado operativo de subrecetas sin rendimiento validado en pedido consolidado.
rc26_meta = cur.execute("SELECT value FROM app_meta WHERE key='rc26_final_print_review'").fetchone()
if rc26_meta and 'escalado' in rc26_meta[0].lower(): ok('app_meta rc26_final_print_review presente')
else: fail('app_meta rc26_final_print_review ausente')
calado = cur.execute("""SELECT ingredient_id, quantity, unit FROM v_culinary_expanded_ingredient_lines
WHERE recipe_id='REC-PAST-TARTA-SAN-MARCOS' AND technical_note LIKE '%calado%'
ORDER BY ingredient_id""").fetchall()
calado_map = {r[0]: float(r[1]) for r in calado}
if abs(calado_map.get('PAS047', -1) - 0.105) < 0.0001 and abs(calado_map.get('TEC-AGUA', -1) - 0.245) < 0.0001:
    ok('RC26 escalado de almíbar en pedido consolidado: 0,35 l -> 0,105 kg azúcar / 0,245 l agua')
else:
    fail(f'RC26 escalado de almíbar incorrecto: {calado}')


# RC27-DATA5-7: macrofase de refinamiento global.
rc27_meta = cur.execute("SELECT value FROM app_meta WHERE key='rc27_data5_7_refinamiento_global'").fetchone()
if rc27_meta and 'DATA5' in rc27_meta[0] and 'DATA6' in rc27_meta[0] and 'DATA7' in rc27_meta[0]: ok('app_meta rc27_data5_7_refinamiento_global presente')
else: fail('app_meta rc27_data5_7_refinamiento_global ausente o incompleto')
rc28_meta = cur.execute("SELECT value FROM app_meta WHERE key='rc28_stable_candidate'").fetchone()
if rc28_meta and 'cierre documental' in rc28_meta[0] and 'sin cambios de fórmula' in rc28_meta[0]: ok('app_meta rc28_stable_candidate presente')
else: fail('app_meta rc28_stable_candidate ausente o incompleto')
cul_valid = cur.execute("SELECT COUNT(*) FROM culinary_recipes WHERE active=1 AND release_status='validada'").fetchone()[0]
bak_valid = cur.execute("SELECT COUNT(*) FROM bakery_recipes WHERE active=1 AND release_status='validada'").fetchone()[0]
bak_non_pending = cur.execute("SELECT COUNT(*) FROM bakery_recipes WHERE active=1 AND yield_status<>'pending'").fetchone()[0]
if cul_valid == 0 and bak_valid == 0: ok('RC27 mantiene 0 fichas activas validadas')
else: fail(f'RC27 detecta fichas activas validadas: culinary={cul_valid}, bakery={bak_valid}')
if bak_non_pending == 0: ok('RC27 mantiene yield_status pending en bakery activo')
else: fail(f'RC27 detecta bakery yield_status no pending: {bak_non_pending}')
for rid, ing in [('REC-FABADA-ASTURIANA','CER046'),('REC-TORTILLA-PAISANA','HOR049'),('REC-ZORZA-PATATAS','POR019')]:
    if cur.execute("SELECT 1 FROM culinary_recipe_lines WHERE recipe_id=? AND ingredient_id=?", (rid,ing)).fetchone(): ok(f'RC27 DATA5 cambio específico presente: {rid} -> {ing}')
    else: fail(f'RC27 DATA5 cambio específico ausente: {rid} -> {ing}')
if cur.execute("SELECT name FROM culinary_recipes WHERE id='REC-ZAMBURINAS-GRATINADAS'").fetchone()[0].startswith('Volandeiras gratinadas'): ok('RC27 DATA5 renombre volandeiras/zamburiñas presente')
else: fail('RC27 DATA5 renombre volandeiras/zamburiñas ausente')
for key, expected_min in [('REV_RC27_DATA5_', 50), ('REV_RC27_DATA6_BAK_', 90), ('REV_RC27_DATA7_CUL_', 200)]:
    cnt = cur.execute("SELECT COUNT(*) FROM recipe_documentary_reviews WHERE id LIKE ?", (key+'%',)).fetchone()[0]
    if cnt >= expected_min: ok(f'RC27 reviews {key} presentes: {cnt}')
    else: fail(f'RC27 reviews {key} insuficientes: {cnt}, esperado mínimo {expected_min}')
for source_id in ['SRC_REG_852_2004','SRC_REG_2073_2005','SRC_REG_UE_1169_2011','SRC_RD_1021_2022','SRC_AESAN_ANISAKIS','SRC_AESAN_TIEMPO_TEMPERATURA']:
    if cur.execute("SELECT 1 FROM documentary_sources WHERE id=?", (source_id,)).fetchone(): ok(f'RC27 fuente documental presente: {source_id}')
    else: fail(f'RC27 fuente documental ausente: {source_id}')
for rel in ['RELEASE_NOTES_RC27_DATA5_7.md','docs/RC27_DATA5_7_REFINAMIENTO_GLOBAL_LOG.md','docs/RC27_DATA5_7_MODIFIED_RECIPES_MATRIX.csv','docs/RC27_DATA5_7_APPCC_ALERGENOS_MATRIX.csv','docs/RC27_DATA5_TARGETED_CHANGES.csv','docs/RC27_DATA8_PENDIENTE_OBRADOR.md','RELEASE_NOTES_RC28_STABLE_CANDIDATE.md','docs/RC28_CIERRE_PRIMERA_VERSION.md','docs/RC28_LIMITACIONES_Y_ESTADOS.md','docs/RC28_MATRIZ_VALIDACION.md','docs/RC28_GUIA_TERMUX.md','docs/RC28_GUIA_WINDOWS.md','docs/RC28_DATA8_HOJA_DE_PRUEBA_OBRADOR.md','docs/RC28_CHANGELOG_RC21_RC28.md']:
    if (ROOT / rel).exists(): ok(f'documento RC27 presente: {rel}')
    else: fail(f'documento RC27 ausente: {rel}')

for rel in ["RELEASE_NOTES_RC26.md", "RELEASE_NOTES_RC25_DATA4.md", "docs/RC26_REVISION_FINAL_IMPRESION_LOG.md", "docs/RC25_DATA4_PANADERIA_PASTELERIA_PUENTES_LOG.md", "docs/RC25_DATA4_PANADERIA_PASTELERIA_PUENTES_MATRIX.csv", "docs/RC22_DATA1_P0_CORRECTION_LOG.md", "docs/RC22_DATA1_P0_CORRECTION_MATRIX.csv", "docs/PRINT_PROFILES.md", "docs/PRINT_MODEL.md", "docs/B4_REVISION_DOCUMENTAL_PANADERIA_BOLLERIA.md", "docs/RC23_DATA2_SUBRECETAS_MADRE_LOG.md", "docs/RC23_DATA2_SUBRECETAS_MADRE_MATRIX.csv", "docs/FUENTES_Y_CRITERIOS_GASTRONOMICOS.md"]:
    if (ROOT / rel).exists(): ok(f"documento presente: {rel}")
    else: fail(f"documento ausente: {rel}")
# Profile/options rendering checks inherited from RC21
for token in ["documentProfile: 'aula_taller'", "profileRadio('aula_taller'", "profileRadio('docente_produccion'", "profileRadio('auditoria_completa'", "buildPrintDocumentModel", "renderPrintDocumentModel", "renderedSubrecipes", "subrecipeReferenceHtml", "appccBriefRowsHtml", "technical-base-collapsed", "document-status-warning", "profileOptionDefaults", "minimalSafetyNoticeHtml", "printOutputSummaryHtml", "Pedido consolidado", "Aviso mínimo de seguridad alimentaria", "Mostrar costes", "Mostrar APPCC docente"]:
    if token in appjs: ok(f"token de impresión/documento presente: {token}")
    else: fail(f"token de impresión/documento ausente: {token}")
manifest = ROOT / "docs" / "MANIFEST_PUBLIC_SHA256.txt"
if manifest.exists():
    bad = []
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip(): continue
        sha, rel = line.split(None, 1)
        p = ROOT / rel
        if not p.exists(): bad.append((rel, "missing")); continue
        got = hashlib.sha256(p.read_bytes()).hexdigest()
        if got != sha: bad.append((rel, "sha"))
    if bad: fail(f"manifest SHA errores: {bad[:8]}")
    else: ok("manifest SHA correcto")
if errors:
    print(f"\nVALIDACIÓN FALLIDA: {len(errors)} error(es)")
    sys.exit(1)
print("\nVALIDACIÓN OK · ObradORR 1.0.0-rc.28-stable-candidate")
