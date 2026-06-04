(function () {
  "use strict";
  function norm(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function q(db, sql, bind) { return db.query(sql, bind || {}); }
  function add(out, uid, severity, code, title, detail) {
    const w = { uid, severity, code, title, detail };
    out.warnings.push(w);
    if (!out.byRecipe[uid]) out.byRecipe[uid] = [];
    out.byRecipe[uid].push(w);
  }
  function ingredientsRows(db, item) {
    return item.sourceType === "culinary"
      ? q(db, "SELECT line_name AS name, ingredient_id, subrecipe_id, line_type, technical_note FROM v_elaboration_lines_unified WHERE source_type='culinary' AND source_id=$id", { $id: item.sourceId })
      : q(db, "SELECT i.name, brl.ingredient_id, NULL AS subrecipe_id, 'ingredient' AS line_type, brl.technical_note FROM bakery_recipe_lines brl JOIN ingredients i ON i.id=brl.ingredient_id WHERE brl.recipe_id=$id", { $id: item.sourceId });
  }
  function ingredientsText(db, item) { return norm(ingredientsRows(db, item).map(r => r.name).join(" | ")); }
  function liveLineText(db, item) { return norm(ingredientsRows(db, item).map(r => [r.name, r.subrecipe_id].filter(Boolean).join(" ")).join(" | ")); }
  function detail(db, item) { return item.sourceType === "culinary" ? (q(db, "SELECT * FROM culinary_recipes WHERE id=$id", { $id: item.sourceId })[0] || {}) : (q(db, "SELECT * FROM bakery_recipes WHERE id=$id", { $id: item.sourceId })[0] || {}); }
  function allergensForItem(db, item) {
    if (!window.ObradORRRecursiveEngine) return [];
    const lines = window.ObradORRRecursiveEngine.selectionOrderLines(db, [item], {});
    return window.ObradORRRecursiveEngine.allergensFromLines(db, lines);
  }
  function hasAllergen(allergens, words) { const t = norm((allergens || []).map(a => a.allergen + ' ' + a.ingredient).join(' | ')); return words.some(w => t.includes(norm(w))); }
  function run({ db, items, options }) {
    const out = { version: "2.0.0", generatedAt: new Date().toISOString(), warnings: [], byRecipe: {}, summary: { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 }, meta: { pendingRecipes: 0 } };
    for (const item of items || []) {
      const uid = item.uid || `${item.sourceType}:${item.sourceId}`;
      const d = detail(db, item);
      const name = norm(item.name || d.name);
      const text = ingredientsText(db, item);
      const live = liveLineText(db, item);
      const notes = norm([d.process, d.appcc_notes, d.service_notes, d.notes, d.fermentation_notes].filter(Boolean).join(" | "));
      const allergens = allergensForItem(db, item);
      if ((d.release_status || "") === "validada" && (d.workshop_validation_status || "") !== "validada") add(out, uid, "CRITICO", "VALIDADA_SIN_OBRADOR", "Ficha marcada como validada", "No consta registro real de validación por profesorado en obrador.");
      if ((d.release_status || "") === "pendiente") out.meta.pendingRecipes += 1;
      if (item.sourceType === "bakery" && d.yield_status && d.yield_status !== "pending") add(out, uid, "ALTO", "YIELD_NO_PENDING", "Rendimiento panadero no pendiente", "No debe cambiarse yield_status sin prueba real de obrador.");
      if (name.includes("banoffee") && !text.includes("platano") && !text.includes("banana")) add(out, uid, "CRITICO", "BANOFFEE_SIN_PLATANO", "Banoffee sin plátano", "La denominación no se defiende si no hay plátano/banana.");
      if (name.includes("quiche") && (live.includes("quebrada dulce") || live.includes("past quebrada dulce") || live.includes("rec-past-quebrada-dulce"))) add(out, uid, "CRITICO", "QUICHE_MASA_DULCE", "Quiche con masa dulce", "Una quiche salada no debe apoyarse en masa quebrada dulce.");
      if ((name.includes("sin gluten") || notes.includes("sin gluten")) && /(trigo|centeno|cebada|espelta|kamut)/.test(text)) add(out, uid, "CRITICO", "SIN_GLUTEN_CON_GLUTEN", "Sin gluten con cereal con gluten", "Contradicción documental grave; requiere revisión antes de uso.");
      if (/(ceviche|sushi|maki|tartar|marinado)/.test(name + " " + notes) && !/(anisakis|congelacion|congelación)/.test(notes)) add(out, uid, "ALTO", "PESCADO_CRUDO_SIN_ANISAKIS", "Preparación cruda/marinada sin aviso anisakis", "Añadir control docente de proveedor, congelación previa cuando proceda y cadena de frío.");
      if (/(mayonesa|tartara|tártara|salsa fria|salsa fría)/.test(name + " " + notes) && (hasAllergen(allergens, ["huevo"]) || /(huevo|yema|ovoproducto)/.test(text + " " + notes)) && !/(pasteuriz|frio|frío|refriger|no reutiliz)/.test(notes)) add(out, uid, "ALTO", "SALSA_FRIA_HUEVO_APPCC", "Salsa fría con huevo sin APPCC específico", "Debe advertir ovoproducto/huevo pasteurizado cuando proceda, frío y no reutilización de sobrantes.");
      if (/(holandesa|bearnesa|beárnesa|choron)/.test(name + " " + notes) && !/(servicio inmediato|no reutiliz|templada)/.test(notes)) add(out, uid, "ALTO", "EMULSION_TEMPLADA", "Emulsión templada sin servicio inmediato", "Debe quedar claro el servicio inmediato y la no reutilización.");
      if (item.sourceType === "culinary") {
        for (const sr of q(db, `SELECT sr.name,l.quantity,u.symbol AS unit,sr.yield_quantity FROM culinary_recipe_lines l JOIN culinary_recipes sr ON sr.id=l.subrecipe_id LEFT JOIN units u ON u.id=l.unit_id WHERE l.recipe_id=$id AND l.line_type='subrecipe'`, { $id: item.sourceId })) {
          if (!sr.yield_quantity) add(out, uid, "MEDIO", "SUBRECETA_SIN_RENDIMIENTO", "Subreceta sin rendimiento base", `${sr.name} puede requerir revisión de escalado documental.`);
        }
      }
      if ((allergens || []).some(a => /pend/i.test(a.declaration_status || ""))) add(out, uid, "MEDIO", "ALERGENO_PENDIENTE", "Alérgeno pendiente de proveedor", "Hay alérgenos con declaración pendiente; revisar proveedor/ficha técnica.");
      if (hasAllergen(allergens, ["gluten"]) && name.includes("sin gluten")) add(out, uid, "CRITICO", "ALERGENO_GLUTEN_DERIVADO", "Alérgeno derivado incompatible", "El motor recursivo detecta gluten directo o derivado en una ficha sin gluten.");
    }
    if (out.meta.pendingRecipes > 0) add(out, "selection", "BAJO", "PENDIENTE_GLOBAL", "Fichas pendientes de obrador", "Las fichas incluidas son propuestas documentales contrastadas, pendientes de prueba y validación por profesorado en obrador.");
    for (const w of out.warnings) out.summary[w.severity] = (out.summary[w.severity] || 0) + 1;
    return out;
  }
  window.ObradORRPreflight = { version: "2.0.0", run };
})();
