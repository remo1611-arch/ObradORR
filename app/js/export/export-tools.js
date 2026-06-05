(function(){
  "use strict";
  const VERSION = "2.1.0";
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
  // CRC62 + ZIP sin compresión, suficiente para exportaciones docentes offline sin dependencia externa.
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


  // ──────────────────────────────────────────────────────────────────────────
  // Exportación XLSX sin macros ni dependencias externas.
  // El libro Excel es un formato de trabajo/intercambio; SQLite sigue siendo
  // la fuente de verdad. Las fórmulas del Excel son avisos preventivos: la app
  // volverá a validar cualquier importación futura.
  // ──────────────────────────────────────────────────────────────────────────
  function colName(n){ let s=''; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }
  function cellRef(c,r){ return colName(c)+String(r); }
  function cleanXmlText(v){ return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,' ').slice(0,32000); }
  function escXml(v){ return cleanXmlText(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function isNum(v){ return typeof v === 'number' && Number.isFinite(v); }
  function xCell(value, style){ return {v:value, s:style || 0}; }
  function xFormula(f, style){ return {f, s:style || 0}; }
  function xRows(values, style){ return values.map(r => r.map(v => xCell(v, style || 0))); }
  function rowHasData(row){ return row && row.some(c => c && c.v !== '' && c.v != null || c && c.f); }
  function xlsxSheetXml(sheet){
    const rows = sheet.rows || [];
    const cols = Math.max(1, ...rows.map(r => r.length || 0));
    const last = Math.max(1, rows.length);
    const widths = sheet.widths || [];
    const colsXml = widths.length ? `<cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${Number(w)||14}" customWidth="1"/>`).join('')}</cols>` : '';
    const sheetViews = sheet.freeze ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.freeze}" topLeftCell="A${Number(sheet.freeze)+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    const rowXml = rows.map((row, ri) => {
      const r = ri + 1;
      const cells = (row || []).map((cell, ci) => {
        if(cell == null) cell = xCell('');
        if(typeof cell !== 'object' || Array.isArray(cell)) cell = xCell(cell);
        const ref = cellRef(ci+1, r);
        const sAttr = cell.s ? ` s="${cell.s}"` : '';
        if(cell.f) return `<c r="${ref}"${sAttr}><f>${escXml(cell.f)}</f></c>`;
        const v = cell.v;
        if(v == null || v === '') return `<c r="${ref}"${sAttr}/>`;
        if(isNum(v)) return `<c r="${ref}"${sAttr}><v>${v}</v></c>`;
        return `<c r="${ref}" t="inlineStr"${sAttr}><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
      }).join('');
      return `<row r="${r}">${cells}</row>`;
    }).join('');
    const filter = sheet.autofilter ? `<autoFilter ref="A${sheet.autofilter}:${colName(cols)}${last}"/>` : '';
    const validations = (sheet.validations || []).length ? `<dataValidations count="${sheet.validations.length}">${sheet.validations.map(v => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${v.range}"><formula1>${escXml(v.formula)}</formula1></dataValidation>`).join('')}</dataValidations>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${colName(cols)}${last}"/>${sheetViews}${colsXml}<sheetData>${rowXml}</sheetData>${filter}${validations}<pageMargins left="0.5" right="0.5" top="0.7" bottom="0.7" header="0.3" footer="0.3"/></worksheet>`;
  }
  function xlsxStylesXml(){
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <fonts count="5"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="16"/><name val="Aptos Display"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font><font><b/><sz val="10"/><name val="Aptos"/></font><font><i/><sz val="9"/><color rgb="FF6B7280"/><name val="Aptos"/></font></fonts>
      <fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF111827"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/></patternFill></fill></fills>
      <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="4" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyFont="1"/></cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
  function xlsxWorkbookBytes(sheets){
    const files = [];
    const workbookSheets = sheets.map((s,i)=>`<sheet name="${escXml(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"${s.hidden?' state="hidden"':''}/>`).join('');
    const rels = sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('') + `<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
    files.push({name:'[Content_Types].xml', bytes: encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`)});
    files.push({name:'_rels/.rels', bytes: encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`)});
    files.push({name:'xl/workbook.xml', bytes: encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr date1904="false"/><sheets>${workbookSheets}</sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`)});
    files.push({name:'xl/_rels/workbook.xml.rels', bytes: encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`)});
    files.push({name:'xl/styles.xml', bytes: encodeText(xlsxStylesXml())});
    sheets.forEach((sheet,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`, bytes: encodeText(xlsxSheetXml(sheet))}));
    const now = new Date().toISOString();
    files.push({name:'docProps/core.xml', bytes: encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>ObradORR Excel</dc:title><dc:creator>ObradORR</dc:creator><cp:lastModifiedBy>ObradORR</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`)});
    files.push({name:'docProps/app.xml', bytes: encodeText(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ObradORR</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company>Uso docente</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>2.1</AppVersion></Properties>`)});
    return zipStore(files);
  }
  function addRowsWithValidationFormulas(rows, dataStart, statusCol, avisoCol, formulaFactory, templateRows=0){
    const total = Math.max(rows.length, templateRows ? dataStart + templateRows - 1 : rows.length);
    for(let i=dataStart;i<=total;i++){
      if(!rows[i-1]) rows[i-1] = [];
      rows[i-1][statusCol-1] = xFormula(formulaFactory(i, 'status'), 4);
      rows[i-1][avisoCol-1] = xFormula(formulaFactory(i, 'avisos'), 6);
    }
  }
  function auxRows(db){
    const rows = [];
    rows.push([xCell('Hoja auxiliar de validación ObradORR',1)]);
    rows.push([xCell('Uso',2),xCell('Valor',2),xCell('Descripción',2)]);
    const add = (kind, value, desc='') => rows.push([xCell(kind),xCell(value),xCell(desc)]);
    ['mantener','alta','actualizar','desactivar'].forEach(v=>add('accion',v));
    ['culinary','bakery'].forEach(v=>add('recipe_kind',v));
    ['producto_final','base_tecnica','subreceta','componente','formulacion'].forEach(v=>add('rol_documental',v));
    ['raciones_rendimiento','formulacion'].forEach(v=>add('mundo_escalado',v));
    ['pendiente','no_apta','validada'].forEach(v=>add('release_status',v));
    ['propuesta_documental','contrastada','pendiente_revision'].forEach(v=>add('documentary_status',v));
    ['no_validada','probada_con_ajustes','requiere_revision','validada'].forEach(v=>add('workshop_validation_status',v));
    ['pending','tested','validated'].forEach(v=>add('yield_status',v));
    for(const r of q(db, `SELECT id, symbol || ' · ' || name AS label FROM units ORDER BY id`)) add('unidad', r.id, r.label);
    for(const r of q(db, `SELECT id, name FROM technical_families ORDER BY name COLLATE NOCASE`)) add('familia', r.id, r.name);
    for(const r of q(db, `SELECT id, name FROM technical_subfamilies ORDER BY name COLLATE NOCASE`)) add('subfamilia', r.id, r.name);
    for(const r of q(db, `SELECT name FROM allergens WHERE regulation_order BETWEEN 1 AND 14 ORDER BY regulation_order`)) add('alergeno_normativo', r.name);
    rows.push([]);
    rows.push([xCell('Leyenda de severidades',2),xCell('',2),xCell('',2)]);
    add('CRITICO','No importable','Bloquea importación futura hasta corregir.');
    add('ALTO','Importable con revisión','Requiere confirmación o revisión técnica.');
    add('MEDIO','Advertencia','No bloquea, pero conviene revisar.');
    add('OK','Sin aviso','Sin incoherencia básica detectada por Excel.');
    return rows;
  }
  function readmeRows(kind){
    return xRows([
      ['ObradORR 2.1 RC8 · Refinamiento HTML/UX'],
      ['Tipo de archivo', kind === 'blank' ? 'Plantilla técnica no usada en interfaz' : 'Catálogo completo exportado'],
      ['Regla principal', 'Este Excel no valida fichas ni sustituye a la SQLite. Sirve para revisión, auditoría y control documental.'],
      ['Estados', 'Cualquier alta o cambio estructural debe entrar por la aplicación o por parche SQLite controlado, manteniendo estado pendiente salvo prueba real de obrador.'],
      ['Avisos', 'Las fórmulas del Excel son preventivas. No convierten el archivo en formato maestro de edición.'],
      ['Hoja 99_AUX_VALIDACION', 'Oculta por defecto. Contiene listas y comprobaciones auxiliares documentadas.'],
      ['Importación Excel', 'Retirada de la interfaz. El Excel queda como salida de consulta, auditoría y trazabilidad.']
    ],0).map((r,i)=>r.map(c=> i===0 ? {...c,s:1} : c));
  }
  function listRows(db){
    const rows = xRows([['tipo','valor','descripcion']],2);
    for(const r of auxRows(db).slice(2)) if(r.length>=2 && r[0].v && !String(r[0].v).startsWith('Leyenda')) rows.push(r);
    return rows;
  }
  function elaborationSheetRows(db, blank){
    const header = ['accion','recipe_kind','recipe_id','codigo_externo','nombre_visible','familia','subfamilia','rol_documental','mundo_escalado','rendimiento_base','unidad_rendimiento','raciones_base','release_status','documentary_status','workshop_validation_status','yield_status','notas','estado_fila','avisos'];
    const rows = [header.map(h=>xCell(h,2))];
    if(!blank){
      // SQLite no permite ORDER BY <expresión> directamente sobre un SELECT compuesto
      // si el término no coincide literalmente con una columna de salida. Envolvemos
      // el UNION ALL para conservar la ordenación alfabética del catálogo XLSX.
      const sql = `SELECT * FROM (SELECT 'culinary' AS recipe_kind, c.id, c.name, COALESCE(f.name,c.family_id,'') AS family, COALESCE(sf.name,c.subfamily_id,'') AS subfamily, c.base_servings, c.yield_quantity, c.yield_unit_id, c.release_status, c.documentary_status, c.workshop_validation_status, '' AS yield_status, c.notes, 'raciones_rendimiento' AS mundo FROM culinary_recipes c LEFT JOIN technical_families f ON f.id=c.family_id LEFT JOIN technical_subfamilies sf ON sf.id=c.subfamily_id WHERE COALESCE(c.active,1)=1 UNION ALL SELECT 'bakery', b.id, b.name, COALESCE(f.name,b.family_id,''), COALESCE(sf.name,b.subfamily_id,''), b.base_pieces, b.base_raw_weight_g, 'g', b.release_status, b.documentary_status, b.workshop_validation_status, b.yield_status, b.notes, 'formulacion' FROM bakery_recipes b LEFT JOIN technical_families f ON f.id=b.family_id LEFT JOIN technical_subfamilies sf ON sf.id=b.subfamily_id WHERE COALESCE(b.active,1)=1) ORDER BY name COLLATE NOCASE`;
      for(const r of q(db, sql)) rows.push([xCell('mantener'),xCell(r.recipe_kind),xCell(r.id),xCell(r.id),xCell(r.name),xCell(r.family),xCell(r.subfamily),xCell(r.recipe_kind==='bakery'?'formulacion':'producto_final'),xCell(r.mundo),xCell(r.yield_quantity ?? r.base_servings ?? ''),xCell(r.yield_unit_id || ''),xCell(r.base_servings || ''),xCell(r.release_status),xCell(r.documentary_status),xCell(r.workshop_validation_status),xCell(r.yield_status || ''),xCell(r.notes || '')]);
    }
    addRowsWithValidationFormulas(rows,2,18,19,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:Q${r})=0,"",IF(OR(B${r}="",E${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:Q${r})=0,"",TEXTJOIN(" | ",TRUE,IF(COUNTIF($E:$E,E${r})>1,"Nombre duplicado",""),IF(B${r}="","Falta tipo",""),IF(E${r}="","Falta nombre",""),IF(AND(I${r}="formulacion",J${r}=""),"Formulación sin rendimiento/base",""),IF(M${r}="validada","No importar validada sin prueba","")))`, blank?250:0);
    return rows;
  }
  function ingredientsSheetRows(db, blank){
    const rows = [[ 'codigo_ingrediente','nombre','familia','subfamilia','unidad_base','zona','alergenos_normativos','coste_unitario','notas','estado_fila','avisos' ].map(h=>xCell(h,2))];
    if(!blank) for(const r of q(db, `SELECT v.id,v.name,v.family,v.subfamily,v.base_unit,v.storage_zone,v.cost_per_base_unit_after_waste,i.notes FROM v_ingredients_cost v LEFT JOIN ingredients i ON i.id=v.id ORDER BY v.name COLLATE NOCASE`)) rows.push([xCell(r.id),xCell(r.name),xCell(r.family),xCell(r.subfamily),xCell(r.base_unit),xCell(r.storage_zone),xCell(''),xCell(r.cost_per_base_unit_after_waste),xCell(r.notes||'')]);
    addRowsWithValidationFormulas(rows,2,10,11,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:I${r})=0,"",IF(OR(B${r}="",E${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:I${r})=0,"",TEXTJOIN(" | ",TRUE,IF(COUNTIF($B:$B,B${r})>1,"Ingrediente duplicado",""),IF(B${r}="","Falta nombre",""),IF(E${r}="","Falta unidad","")))`, blank?400:0);
    return rows;
  }
  function culinaryLineRows(db){
    const rows = [[ 'codigo_elaboracion','codigo_ingrediente_o_subreceta','tipo_linea','cantidad','unidad','bloque','obligatorio','nota','estado_fila','avisos' ].map(h=>xCell(h,2))];
    for(const r of q(db, `SELECT l.recipe_id, COALESCE(l.ingredient_id,l.subrecipe_id,'') AS ref, l.line_type, l.quantity, l.unit_id, '' AS block, 1 AS obligatory, l.technical_note FROM culinary_recipe_lines l ORDER BY l.recipe_id,l.sort_order`)) rows.push([xCell(r.recipe_id),xCell(r.ref),xCell(r.line_type),xCell(r.quantity),xCell(r.unit_id),xCell(r.block),xCell(r.obligatory),xCell(r.technical_note||'')]);
    addRowsWithValidationFormulas(rows,2,9,10,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:H${r})=0,"",IF(OR(A${r}="",B${r}="",D${r}="",E${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:H${r})=0,"",TEXTJOIN(" | ",TRUE,IF(A${r}="","Falta elaboración",""),IF(B${r}="","Falta ingrediente/subreceta",""),IF(D${r}="","Falta cantidad",""),IF(E${r}="","Falta unidad","")))`, 0);
    return rows;
  }
  function processRows(db, blank){
    const rows = [[ 'codigo_elaboracion','orden','bloque','paso','estado_fila','avisos' ].map(h=>xCell(h,2))];
    if(!blank){
      for(const r of q(db, `SELECT id AS recipe_id, 'proceso' AS block, process AS instruction FROM culinary_recipes WHERE COALESCE(active,1)=1 AND COALESCE(process,'')<>'' ORDER BY name COLLATE NOCASE`)) rows.push([xCell(r.recipe_id),xCell(1),xCell(r.block),xCell(r.instruction)]);
      for(const r of q(db, `SELECT recipe_id, step_number, block, instruction FROM bakery_process_steps ORDER BY recipe_id,block,step_number`)) rows.push([xCell(r.recipe_id),xCell(r.step_number),xCell(r.block),xCell(r.instruction)]);
    }
    addRowsWithValidationFormulas(rows,2,5,6,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:D${r})=0,"",IF(OR(A${r}="",D${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:D${r})=0,"",TEXTJOIN(" | ",TRUE,IF(A${r}="","Falta elaboración",""),IF(D${r}="","Falta paso","")))`, blank?300:0);
    return rows;
  }
  function bakeryFormulaRows(db, blank){
    const rows = [[ 'codigo_elaboracion','harina_base_g','masa_cruda_base_g','piezas_base','peso_unitario_base_g','tipo_prefermento','hidratacion_prefermento_pct','harina_prefermentada_pct','yield_status','estado_fila','avisos' ].map(h=>xCell(h,2))];
    if(!blank) for(const r of q(db, `SELECT id,base_flour_g,base_raw_weight_g,base_pieces,base_raw_piece_weight_g,preferment_type,yield_status FROM bakery_recipes WHERE COALESCE(active,1)=1 ORDER BY name COLLATE NOCASE`)) rows.push([xCell(r.id),xCell(r.base_flour_g),xCell(r.base_raw_weight_g),xCell(r.base_pieces),xCell(r.base_raw_piece_weight_g),xCell(r.preferment_type||''),xCell(''),xCell(''),xCell(r.yield_status||'pending')]);
    addRowsWithValidationFormulas(rows,2,10,11,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:I${r})=0,"",IF(OR(A${r}="",B${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:I${r})=0,"",TEXTJOIN(" | ",TRUE,IF(A${r}="","Falta elaboración",""),IF(B${r}="","Formulación sin harina base",""),IF(AND(D${r}<>"",E${r}=""),"Piezas sin peso unitario",""),IF(I${r}<>"pending","Importación inicial debe quedar pending","")))`, blank?200:0);
    return rows;
  }
  function componentsRows(db, blank){
    const rows = [[ 'codigo_elaboracion','codigo_componente','tipo_componente','rol_uso','base_calculo','cantidad','unidad','obligatorio','estado_fila','avisos' ].map(h=>xCell(h,2))];
    if(!blank) for(const r of q(db, `SELECT bakery_recipe_id, COALESCE(component_culinary_recipe_id,component_bakery_recipe_id,'') AS component, CASE WHEN component_bakery_recipe_id IS NOT NULL THEN 'bakery' ELSE 'culinary' END AS component_type, usage_role, calculation_base, quantity_value, unit_id, component_status FROM bakery_recipe_components WHERE COALESCE(active,1)=1 ORDER BY bakery_recipe_id,sort_order`)) rows.push([xCell(r.bakery_recipe_id),xCell(r.component),xCell(r.component_type),xCell(r.usage_role),xCell(r.calculation_base),xCell(r.quantity_value),xCell(r.unit_id),xCell(r.component_status)]);
    addRowsWithValidationFormulas(rows,2,9,10,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:H${r})=0,"",IF(OR(A${r}="",B${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:H${r})=0,"",TEXTJOIN(" | ",TRUE,IF(A${r}="","Falta elaboración",""),IF(B${r}="","Falta componente","")))`, blank?150:0);
    return rows;
  }
  function allergensSheetRows(db, blank){
    const rows = [[ 'codigo_ingrediente','alergeno_normativo','estado','observaciones','estado_fila','avisos' ].map(h=>xCell(h,2))];
    if(!blank) for(const r of q(db, `SELECT i.id AS ingredient_id,a.name AS allergen,ia.declaration_status,ia.notes FROM ingredient_allergens ia JOIN ingredients i ON i.id=ia.ingredient_id JOIN allergens a ON a.id=ia.allergen_id WHERE a.regulation_order BETWEEN 1 AND 14 ORDER BY i.name,a.regulation_order`)) rows.push([xCell(r.ingredient_id),xCell(r.allergen),xCell(r.declaration_status),xCell(r.notes||'')]);
    addRowsWithValidationFormulas(rows,2,5,6,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:D${r})=0,"",IF(OR(A${r}="",B${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:D${r})=0,"",TEXTJOIN(" | ",TRUE,IF(A${r}="","Falta ingrediente",""),IF(B${r}="","Falta alérgeno","")))`, blank?300:0);
    return rows;
  }
  function appccRows(db, blank){
    const rows = [[ 'codigo_elaboracion','orden','familia_riesgo','tipo_peligro','peligro','medida_preventiva','vigilancia','correccion','registro','conservacion_servicio','estado_fila','avisos' ].map(h=>xCell(h,2))];
    if(!blank) for(const r of q(db, `SELECT recipe_id,sort_order,risk_family,hazard_type,main_hazard,preventive_measure,monitoring,corrective_action,record_reference,service_conservation FROM appcc_doc_blocks WHERE COALESCE(active,1)=1 ORDER BY recipe_id,sort_order`)) rows.push([xCell(r.recipe_id),xCell(r.sort_order),xCell(r.risk_family),xCell(r.hazard_type),xCell(r.main_hazard),xCell(r.preventive_measure),xCell(r.monitoring),xCell(r.corrective_action),xCell(r.record_reference),xCell(r.service_conservation)]);
    addRowsWithValidationFormulas(rows,2,11,12,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:J${r})=0,"",IF(OR(A${r}="",E${r}=""),"CRITICO","OK"))` : `IF(COUNTA(A${r}:J${r})=0,"",TEXTJOIN(" | ",TRUE,IF(A${r}="","Falta elaboración",""),IF(E${r}="","Falta peligro",""),IF(F${r}="","Falta medida","")))`, blank?200:0);
    return rows;
  }
  function validationRows(db, blank){
    const rows = [[ 'recipe_id','recipe_kind','fecha_prueba','responsable','grupo_modulo','practica','resultado_prueba','cantidad_prevista','cantidad_real','rendimiento_real','unidad_rendimiento','observaciones','ajustes_necesarios','estado_fila','avisos' ].map(h=>xCell(h,2))];
    if(!blank) for(const r of q(db, `SELECT recipe_id,recipe_type,validation_date,responsible,group_module,practice_title,result_status,planned_quantity,actual_quantity,actual_yield,measured_yield_unit_id,notes,adjustments_required FROM workshop_validation_log ORDER BY created_at DESC`)) rows.push([xCell(r.recipe_id),xCell(r.recipe_type),xCell(r.validation_date),xCell(r.responsible),xCell(r.group_module),xCell(r.practice_title),xCell(r.result_status),xCell(r.planned_quantity),xCell(r.actual_quantity),xCell(r.actual_yield),xCell(r.measured_yield_unit_id),xCell(r.notes||''),xCell(r.adjustments_required||'')]);
    addRowsWithValidationFormulas(rows,2,14,15,(r,k)=> k==='status' ? `IF(COUNTA(A${r}:M${r})=0,"",IF(AND(G${r}="validada",OR(C${r}="",D${r}="")),"CRITICO","OK"))` : `IF(COUNTA(A${r}:M${r})=0,"",TEXTJOIN(" | ",TRUE,IF(A${r}="","Falta ficha",""),IF(G${r}="validada","Validación exige evidencia completa",""),IF(AND(G${r}="validada",C${r}=""),"Validada sin fecha",""),IF(AND(G${r}="validada",D${r}=""),"Validada sin responsable","")))`, blank?150:0);
    return rows;
  }
  function warningsRows(){
    return [[xCell('Resumen de avisos Excel',1)],[xCell('Hoja',2),xCell('Críticos',2),xCell('Avisos',2),xCell('Interpretación',2)],
      [xCell('02_ELABORACIONES'),xFormula(`COUNTIF('02_ELABORACIONES'!R:R,"CRITICO")`),xFormula(`COUNTIF('02_ELABORACIONES'!S:S,"*duplicado*")+COUNTIF('02_ELABORACIONES'!S:S,"*Falta*")`),xCell('Revisar nombres, tipo y estados.')],
      [xCell('03_INGREDIENTES'),xFormula(`COUNTIF('03_INGREDIENTES'!J:J,"CRITICO")`),xFormula(`COUNTIF('03_INGREDIENTES'!K:K,"*duplicado*")+COUNTIF('03_INGREDIENTES'!K:K,"*Falta*")`),xCell('Revisar nombre, unidad y duplicados.')],
      [xCell('04_LINEAS_RECETA'),xFormula(`COUNTIF('04_LINEAS_RECETA'!I:I,"CRITICO")`),xFormula(`COUNTIF('04_LINEAS_RECETA'!J:J,"*Falta*")`),xCell('Revisar ingredientes, cantidades y unidades.')],
      [xCell('05_PROCESOS'),xFormula(`COUNTIF('05_PROCESOS'!E:E,"CRITICO")`),xFormula(`COUNTIF('05_PROCESOS'!F:F,"*Falta*")`),xCell('Revisar pasos técnicos.')],
      [xCell('06_FORMULACION_PANADERA'),xFormula(`COUNTIF('06_FORMULACION_PANADERA'!J:J,"CRITICO")`),xFormula(`COUNTIF('06_FORMULACION_PANADERA'!K:K,"*Formulación*")+COUNTIF('06_FORMULACION_PANADERA'!K:K,"*Piezas*")`),xCell('Revisar harina base, piezas y yield_status.')],
      [xCell('09_APPCC'),xFormula(`COUNTIF('09_APPCC'!K:K,"CRITICO")`),xFormula(`COUNTIF('09_APPCC'!L:L,"*Falta*")`),xCell('Revisar peligros y medidas.')],
      [xCell('10_VALIDACION_OBRADOR'),xFormula(`COUNTIF('10_VALIDACION_OBRADOR'!N:N,"CRITICO")`),xFormula(`COUNTIF('10_VALIDACION_OBRADOR'!O:O,"*Validada*")`),xCell('La validación exige prueba real.')] ];
  }
  function excelSheets(db, blank){
    const dataVal = (range, formula) => ({range, formula});
    const common = {freeze:1, autofilter:1};
    return [
      {name:'00_LEEME', rows:readmeRows(blank?'blank':'full'), widths:[28,90], freeze:0},
      {name:'01_LISTAS_VALIDAS', rows:listRows(db), widths:[24,34,70], freeze:1, autofilter:1},
      {name:'02_ELABORACIONES', rows:elaborationSheetRows(db,blank), widths:[14,12,22,22,34,22,22,18,20,16,16,14,18,20,22,14,45,14,60], ...common},
      {name:'03_INGREDIENTES', rows:ingredientsSheetRows(db,blank), widths:[22,34,20,20,14,18,32,14,45,14,60], ...common},
      {name:'04_LINEAS_RECETA', rows:blank ? culinaryLineRows({query:()=>[]}) : culinaryLineRows(db), widths:[22,34,14,12,10,16,12,45,14,60], ...common},
      {name:'05_PROCESOS', rows:processRows(db,blank), widths:[22,10,18,80,14,60], ...common},
      {name:'06_FORMULACION_PANADERA', rows:bakeryFormulaRows(db,blank), widths:[24,16,18,14,18,22,18,18,14,14,70], ...common},
      {name:'07_COMPONENTES_SUBRECETAS', rows:componentsRows(db,blank), widths:[24,28,16,18,16,12,10,14,14,60], ...common},
      {name:'08_ALERGENOS', rows:allergensSheetRows(db,blank), widths:[28,28,18,50,14,60], ...common},
      {name:'09_APPCC', rows:appccRows(db,blank), widths:[24,10,26,18,45,55,45,45,28,45,14,60], ...common},
      {name:'10_VALIDACION_OBRADOR', rows:validationRows(db,blank), widths:[24,14,16,26,24,28,24,20,20,20,14,55,55,14,70], ...common},
      {name:'11_AVISOS', rows:warningsRows(), widths:[32,16,16,70], freeze:1},
      {name:'99_AUX_VALIDACION', rows:auxRows(db), widths:[28,36,90], freeze:1, autofilter:1, hidden:true}
    ];
  }
  function exportCatalogExcel(db){ const bytes = xlsxWorkbookBytes(excelSheets(db,false)); downloadBlob(`ObradORR_catalogo_completo_${iso()}.xlsx`, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); }

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
      schema: 'ObradORRPracticeExport/2.1-rc7',
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
      schema: 'ObradORRTechnicalExport/2.1-rc7', generatedAt: new Date().toISOString(), appVersion: VERSION,
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
      {name:'README_BACKUP.txt', bytes: encodeText('Backup completo ObradORR 2.1. No acredita validación de obrador. Generado: '+new Date().toISOString()+'\n')},
      {name:'obradorr.sqlite', bytes: db.exportBytes()},
      {name:'tecnico.json', bytes: encodeText(JSON.stringify(technicalJson(db,state),null,2))},
      {name:'practica_actual.json', bytes: encodeText(JSON.stringify(currentPracticeJson(db,state,opts || {}),null,2))},
      {name:'pedido_consolidado.csv', bytes: encodeText(delimited(selectionOrderRows(db,state,opts || {})))}
    ];
    await window.ObradORRFileTools.saveBlob(window.ObradORRFileTools.filename('ObradORR_Backup_Completo','datos','zip'), zipStore(files), 'application/zip'); alert('Copia ZIP creada.');
  }
  window.ObradORRExportTools = { version: VERSION, delimited, catalogRows, ingredientsRows, allergensRows, selectionOrderRows, selectionAllergensRows, currentPracticeJson, technicalJson, exportCatalogCsv, exportIngredientsCsv, exportAllergensCsv, exportCatalogExcel, exportOrderDelimited, exportPracticeJson, exportTechnicalJson, exportPracticeZip, chooseBackupDirectory, saveBackupSqlite, saveBackupJson, saveBackupZip };
})();
