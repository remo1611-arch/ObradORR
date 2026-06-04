(function () {
  "use strict";
  function q(db, sql, bind) { return db.query(sql, bind || {}); }
  function usageImpact(db, sourceType, sourceId) {
    const usedBy = [];
    if (sourceType === "culinary") {
      for (const r of q(db, `SELECT cr.id, cr.name FROM culinary_recipe_lines l JOIN culinary_recipes cr ON cr.id=l.recipe_id WHERE l.line_type='subrecipe' AND l.subrecipe_id=$id AND COALESCE(cr.active,1)=1 ORDER BY cr.name`, { $id: sourceId })) usedBy.push({ type: "culinary", id: r.id, name: r.name });
      for (const r of q(db, `SELECT br.id, br.name, c.usage_role, c.component_status FROM bakery_recipe_components c JOIN bakery_recipes br ON br.id=c.bakery_recipe_id WHERE c.component_culinary_recipe_id=$id AND COALESCE(br.active,1)=1 ORDER BY br.name`, { $id: sourceId })) usedBy.push({ type: "bakery", id: r.id, name: r.name, role: r.usage_role, status: r.component_status });
    }
    if (sourceType === "bakery") {
      for (const r of q(db, `SELECT br.id, br.name, c.usage_role, c.component_status FROM bakery_recipe_components c JOIN bakery_recipes br ON br.id=c.bakery_recipe_id WHERE c.component_bakery_recipe_id=$id AND COALESCE(br.active,1)=1 ORDER BY br.name`, { $id: sourceId })) usedBy.push({ type: "bakery", id: r.id, name: r.name, role: r.usage_role, status: r.component_status });
    }
    return usedBy;
  }
  function allergenImpactForLine(db, lineTable, lineId) {
    const row = lineTable === 'bakery'
      ? q(db, `SELECT i.id AS ingredient_id, i.name FROM bakery_recipe_lines l JOIN ingredients i ON i.id=l.ingredient_id WHERE l.id=$id`, { $id: lineId })[0]
      : q(db, `SELECT i.id AS ingredient_id, i.name FROM culinary_recipe_lines l JOIN ingredients i ON i.id=l.ingredient_id WHERE l.id=$id`, { $id: lineId })[0];
    if (!row) return [];
    return q(db, `SELECT a.name FROM ingredient_allergens ia JOIN allergens a ON a.id=ia.allergen_id WHERE ia.ingredient_id=$id ORDER BY a.regulation_order`, { $id: row.ingredient_id }).map(a => a.name);
  }
  function riskSummary(db, sourceType, sourceId) {
    const usedBy = usageImpact(db, sourceType, sourceId);
    const recipe = sourceType === "culinary" ? q(db, "SELECT release_status,yield_quantity FROM culinary_recipes WHERE id=$id", { $id: sourceId })[0] || {} : q(db, "SELECT release_status,yield_status,base_flour_g,base_pieces FROM bakery_recipes WHERE id=$id", { $id: sourceId })[0] || {};
    const risks = [];
    if (usedBy.length) risks.push({ level: "ALTO", text: `Usada por ${usedBy.length} ficha(s): los cambios afectan a pedido, coste, alérgenos e impresión.` });
    if (sourceType === "culinary" && recipe.yield_quantity) risks.push({ level: "MEDIO", text: "Tiene rendimiento base: cambiarlo altera escalado recursivo." });
    if (sourceType === "bakery") risks.push({ level: "MEDIO", text: "Fórmula panadera: cambios en harina, piezas o porcentajes alteran cálculo y pedido." });
    if (recipe.release_status === "validada") risks.push({ level: "CRITICO", text: "No debería editarse una ficha validada sin registro de revisión docente." });
    return { usedBy, risks };
  }
  function warningHtml(db, escapeHtml, sourceType, sourceId) {
    const impact = riskSummary(db, sourceType, sourceId);
    if (!impact.usedBy.length && !impact.risks.length) return '<div class="safe-editor ok"><b>Vista de impacto:</b> no se detectan dependencias activas ni riesgos estructurales.</div>';
    const top = impact.usedBy.slice(0, 12).map(r => `<li>${escapeHtml(r.name)} <small>(${escapeHtml(r.type)}${r.role ? ' · '+escapeHtml(r.role) : ''})</small></li>`).join('');
    const more = impact.usedBy.length > 12 ? `<li>...y ${impact.usedBy.length - 12} más</li>` : '';
    const risks = impact.risks.map(r => `<li><b>${escapeHtml(r.level)}</b> · ${escapeHtml(r.text)}</li>`).join('');
    return `<div class="safe-editor warning"><b>Editor seguro · vista de impacto</b><ul>${risks}${top}${more}</ul><small>Antes de editar rendimiento, ingredientes, APPCC, alérgenos o fórmula panadera, descarga una copia SQLite.</small></div>`;
  }
  function confirmRiskySave(db, sourceType, sourceId, ctx) {
    const impact = riskSummary(db, sourceType, sourceId);
    if (!impact.usedBy.length && !impact.risks.some(r => r.level === "ALTO" || r.level === "CRITICO")) return true;
    return confirm(`Editor seguro: esta ficha tiene impacto en ${impact.usedBy.length} ficha(s) o contiene riesgos técnicos.\n\nGuarda solo si has descargado copia y aceptas recalcular pedido/costes/alérgenos derivados.`);
  }
  function confirmDeleteLine(db, sourceType, lineId) {
    const allergens = allergenImpactForLine(db, sourceType === 'bakery' ? 'bakery' : 'culinary', lineId);
    const msg = allergens.length ? `La línea contiene alérgenos declarados (${allergens.join(', ')}). Eliminarla puede ocultar alérgenos directos/derivados. ¿Continuar?` : '¿Eliminar esta línea?';
    return confirm(msg);
  }
  function confirmDeleteComponent(db, componentId) {
    const c = q(db, "SELECT component_status,include_in_order,include_in_cost FROM bakery_recipe_components WHERE id=$id", { $id: componentId })[0] || {};
    const risky = c.component_status === 'required' || Number(c.include_in_order) || Number(c.include_in_cost);
    return confirm(risky ? 'Componente requerido o incluido en pedido/coste. Eliminarlo alterará pedido, coste y alérgenos derivados. ¿Continuar?' : '¿Eliminar este componente elaborado?');
  }
  window.ObradORRSafeEditor = { version: "2.0.0", usageImpact, riskSummary, warningHtml, confirmRiskySave, confirmDeleteLine, confirmDeleteComponent };
})();
