(function () {
  "use strict";
  function q(db, sql, bind) { return db.query(sql, bind || {}); }
  function detail(db, item) {
    if (item.sourceType === "culinary") return q(db, "SELECT * FROM culinary_recipes WHERE id=$id", { $id: item.sourceId })[0] || {};
    return q(db, "SELECT * FROM bakery_recipes WHERE id=$id", { $id: item.sourceId })[0] || {};
  }
  function directIngredients(db, item) {
    if (item.sourceType === "culinary") return q(db, `SELECT line_name AS name, ingredient_id, quantity, unit, technical_note FROM v_elaboration_lines_unified WHERE source_type='culinary' AND source_id=$id AND ingredient_id IS NOT NULL ORDER BY sort_order`, { $id: item.sourceId });
    return q(db, `SELECT i.name, brl.ingredient_id, brl.quantity_value AS quantity, COALESCE(u.symbol,'g') AS unit, brl.technical_note FROM bakery_recipe_lines brl JOIN ingredients i ON i.id=brl.ingredient_id LEFT JOIN units u ON u.id=brl.quantity_unit_id WHERE brl.recipe_id=$id ORDER BY brl.sort_order`, { $id: item.sourceId });
  }
  function subrecipes(db, item) { return item.sourceType === "culinary" && window.ObradORRRecursiveEngine ? window.ObradORRRecursiveEngine.culinarySubrecipes(db, item.sourceId) : []; }
  function components(db, item) { return item.sourceType === "bakery" ? q(db, `SELECT component_type,component_id,component_name,usage_role,component_status,include_in_order,include_in_cost FROM v_bakery_recipe_components_print WHERE bakery_recipe_id=$id AND active=1 ORDER BY sort_order,id`, { $id: item.sourceId }) : []; }
  function normalizeRecipe(db, item, preflight) {
    const d = detail(db, item), direct = directIngredients(db, item);
    return {
      uid: item.uid, sourceType: item.sourceType, sourceId: item.sourceId, name: item.name || d.name,
      quantity: item.qty, unitLabel: item.unitLabel,
      identity: {
        family: d.family_id || item.categoryLabel || "",
        productionKind: d.production_kind || item.production_kind || "",
        releaseStatus: d.release_status || "pendiente",
        documentaryStatus: d.documentary_status || "contrastada",
        workshopValidation: d.workshop_validation_status || "no_validada",
        yieldStatus: d.yield_status || (item.sourceType === "bakery" ? "pending" : "not_applicable")
      },
      directIngredients: direct,
      subrecipes: subrecipes(db, item),
      components: components(db, item),
      process: d.process || d.fermentation_notes || "",
      appcc: d.appcc_notes || "",
      notes: d.notes || "",
      preflight: (preflight && preflight.byRecipe && preflight.byRecipe[item.uid]) || []
    };
  }
  function normalizeSelection({ db, items, options, preflight }) {
    const profiles = window.ObradORRDocumentProfiles;
    const recursive = window.ObradORRRecursiveEngine;
    const orderLines = recursive ? recursive.selectionOrderLines(db, items, options) : [];
    const aggregated = recursive ? recursive.aggregate(orderLines) : [];
    return {
      schema: "ObradORRDocumentModel/2.1",
      generatedAt: new Date().toISOString(),
      profile: profiles ? profiles.get(options.documentProfile || "aula_taller") : null,
      profilePrint: profiles ? profiles.printConfig(options.documentProfile || "aula_taller", options.documentType || "fichas_pedido") : null,
      recipes: (items || []).map(item => normalizeRecipe(db, item, preflight)),
      order: { engine: recursive ? recursive.version : "classic", lines: orderLines, aggregated },
      allergens: recursive ? recursive.allergensFromLines(db, orderLines) : [],
      warnings: preflight ? preflight.warnings : []
    };
  }
  window.ObradORRDocumentModel = { version: "2.1.0", normalizeSelection };
})();
