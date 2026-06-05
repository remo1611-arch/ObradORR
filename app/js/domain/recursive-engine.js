(function () {
  "use strict";
  function q(db, sql, bind) { return db.query(sql, bind || {}); }
  function value(db, sql, bind) { return db.value(sql, bind || {}); }
  function n(v, fallback) { const x = Number(v); return Number.isFinite(x) ? x : (fallback || 0); }
  function unitBySymbol(db, symbol) {
    const s = String(symbol || "").toLowerCase();
    const fallback = { g:{symbol:"g",unit_type:"mass",to_base_factor:1}, kg:{symbol:"kg",unit_type:"mass",to_base_factor:1000}, ml:{symbol:"ml",unit_type:"volume",to_base_factor:1}, l:{symbol:"l",unit_type:"volume",to_base_factor:1000}, ud:{symbol:"ud",unit_type:"unit",to_base_factor:1}, unidad:{symbol:"ud",unit_type:"unit",to_base_factor:1} };
    return fallback[s] || q(db, "SELECT symbol, unit_type, to_base_factor FROM units WHERE lower(symbol)=lower($s) OR id=$s LIMIT 1", { $s: symbol })[0] || null;
  }
  function convertQuantity(db, qty, unit, targetUnit, density, targetUnitType) {
    const from = unitBySymbol(db, unit), to = unitBySymbol(db, targetUnit);
    const amount = n(qty);
    if (!to) return null;
    if (!from) return String(unit || "").toLowerCase() === String(targetUnit || "").toLowerCase() ? { quantity: amount, unit: targetUnit } : null;
    if (from.unit_type === to.unit_type) {
      const base = amount * n(from.to_base_factor, 1);
      return { quantity: base / n(to.to_base_factor, 1), unit: to.symbol };
    }
    const d = n(density, 0);
    if (!d) return null;
    if (from.unit_type === "mass" && to.unit_type === "volume") {
      const grams = amount * n(from.to_base_factor, 1);
      const ml = grams / d;
      return { quantity: ml / n(to.to_base_factor, 1), unit: to.symbol };
    }
    if (from.unit_type === "volume" && to.unit_type === "mass") {
      const ml = amount * n(from.to_base_factor, 1);
      const grams = ml * d;
      return { quantity: grams / n(to.to_base_factor, 1), unit: to.symbol };
    }
    return null;
  }
  function normalizeForOrder(db, line) {
    if (!line || !line.ingredient_id || !line.base_unit_symbol) return line;
    const converted = convertQuantity(db, line.rawQuantity ?? line.quantity, line.rawUnit ?? line.unit, line.base_unit_symbol, line.density_g_ml, line.base_unit_type);
    return converted ? Object.assign({}, line, { quantity: converted.quantity, unit: converted.unit, normalized: true }) : line;
  }
  function costFromQuantity(db, quantity, unit, baseUnit, costPerBase, density, baseUnitType) {
    const converted = convertQuantity(db, quantity, unit, baseUnit, density, baseUnitType);
    return converted ? n(converted.quantity) * n(costPerBase) : 0;
  }
  function scaleForCulinary(db, recipeId, qty) {
    const r = q(db, "SELECT base_servings,yield_quantity,default_production_mode FROM culinary_recipes WHERE id=$id", { $id: recipeId })[0] || {};
    const base = r.default_production_mode === "yield" ? n(r.yield_quantity, 1) : n(r.base_servings, 1);
    return n(qty, base) / (base || 1);
  }
  function culinaryExpandedLines(db, recipeId, scale, usedIn) {
    return q(db, `SELECT e.ingredient AS name, e.ingredient_id, e.quantity, e.unit, e.estimated_cost,
       COALESCE(og.name,'Otros productos alimentarios / nuevas tendencias') AS order_group,
       COALESCE(sz.name,'') AS storage_zone, e.technical_note, bu.symbol AS base_unit_symbol, bu.unit_type AS base_unit_type, i.density_g_ml
       FROM v_culinary_expanded_ingredient_lines e
       LEFT JOIN ingredients i ON i.id=e.ingredient_id
       LEFT JOIN units bu ON bu.id=i.base_unit_id
       LEFT JOIN order_groups og ON og.id=i.order_group_id
       LEFT JOIN storage_zones sz ON sz.id=i.storage_zone_id
       WHERE e.recipe_id=$id ORDER BY e.sort_order, e.ingredient COLLATE NOCASE`, { $id: recipeId })
      .filter(r => r.ingredient_id)
      .map(r => normalizeForOrder(db, Object.assign({}, r, { rawQuantity: n(r.quantity) * n(scale,1), rawUnit: r.unit, quantity: n(r.quantity) * n(scale,1), cost: n(r.estimated_cost) * n(scale,1), usedIn: usedIn || '', source: "culinary-expanded" })));
  }
  function culinarySubrecipes(db, recipeId) {
    return q(db, `SELECT l.subrecipe_id AS id, sr.name, l.quantity, u.symbol AS unit, sr.yield_quantity, yu.symbol AS yield_unit
      FROM culinary_recipe_lines l JOIN culinary_recipes sr ON sr.id=l.subrecipe_id
      LEFT JOIN units u ON u.id=l.unit_id LEFT JOIN units yu ON yu.id=sr.yield_unit_id
      WHERE l.recipe_id=$id AND l.line_type='subrecipe' ORDER BY l.sort_order,l.id`, { $id: recipeId });
  }
  function bakeryBaseMetrics(db, recipeId, flourG) {
    const row = q(db, "SELECT * FROM bakery_recipes WHERE id=$id", { $id: recipeId })[0] || {};
    const baseFlour = n(row.base_flour_g, 1000) || 1000;
    const scale = n(flourG, baseFlour) / baseFlour;
    const totalPct = n(value(db, "SELECT SUM(baker_pct) FROM bakery_recipe_lines WHERE recipe_id=$id AND line_group='dough' AND include_in_dough=1", { $id: recipeId }), 0);
    const rawBase = n(row.base_raw_weight_g, 0) || (baseFlour * totalPct / 100);
    const piecesBase = n(row.base_pieces, 0);
    const bakedBase = piecesBase && n(row.baked_piece_weight_g,0) ? piecesBase * n(row.baked_piece_weight_g) : rawBase * (100 - n(row.baking_loss_pct,0)) / 100;
    return { recipeId, flourG: n(flourG, baseFlour), baseFlour, scale, rawG: rawBase * scale, bakedG: bakedBase * scale, pieces: piecesBase * scale };
  }
  function bakeryFlourForItem(db, item) {
    const r = q(db, "SELECT base_flour_g,base_raw_weight_g,base_pieces,base_raw_piece_weight_g FROM bakery_recipes WHERE id=$id", { $id: item.sourceId })[0] || {};
    const baseFlour = n(r.base_flour_g, item.baseFlourG || item.baseValue || 1000) || 1000;
    const baseRaw = n(r.base_raw_weight_g, item.baseRawDoughG || 0) || baseFlour;
    const mode = item.baseMode === "pieces_weight" || (item.baseMode === "pieces" && n(item.pieceWeightG,0) > 0) ? "pieces_weight" : (item.baseMode === "raw_dough" ? "raw_dough" : (item.baseMode === "flour_g" || item.baseMode === "flour" ? "flour_g" : item.baseMode));
    if (mode === "flour_g") return n(item.flourG, n(item.qty, baseFlour));
    if (mode === "pieces_weight") {
      const targetRaw = n(item.rawDoughG, n(item.qty,0) * n(item.pieceWeightG, n(r.base_raw_piece_weight_g, 0)));
      return baseFlour * (targetRaw / (baseRaw || 1));
    }
    if (mode === "raw_dough") {
      const targetRaw = n(item.rawDoughG, n(item.qty, baseRaw));
      return baseFlour * (targetRaw / (baseRaw || 1));
    }
    if (item.baseMode === "pieces") return baseFlour * (n(item.qty, 0) / (n(r.base_pieces, item.baseValue || 1) || 1));
    return baseFlour * (n(item.qty, item.baseValue || 1) / (n(item.baseValue, 1) || 1));
  }
  function bakeryDirectLines(db, recipeId, flourG, usedIn) {
    const base = bakeryBaseMetrics(db, recipeId, flourG);
    return q(db, `SELECT brl.*, i.name AS ingredient_name, i.base_unit_id, i.density_g_ml,
      bu.symbol AS base_unit_symbol, bu.unit_type AS base_unit_type, bu.to_base_factor AS base_unit_factor,
      u.symbol AS unit_symbol, qu.symbol AS quantity_unit_symbol, qu.unit_type AS quantity_unit_type,
      COALESCE(og.name,'Otros productos alimentarios / nuevas tendencias') AS order_group,
      COALESCE(sz.name,'') AS storage_zone, COALESCE(ic.cost_per_base_unit_after_waste,0) AS cost_per_base
      FROM bakery_recipe_lines brl
      JOIN ingredients i ON i.id=brl.ingredient_id
      LEFT JOIN units u ON u.id=brl.unit_id
      LEFT JOIN units qu ON qu.id=brl.quantity_unit_id
      LEFT JOIN units bu ON bu.id=i.base_unit_id
      LEFT JOIN order_groups og ON og.id=i.order_group_id
      LEFT JOIN storage_zones sz ON sz.id=i.storage_zone_id
      LEFT JOIN v_ingredients_cost ic ON ic.id=i.id
      WHERE brl.recipe_id=$id ORDER BY brl.sort_order, brl.id`, { $id: recipeId }).map(l => {
        const calc = l.calculation_base || "baker_pct";
        let quantity = 0, unit = l.unit_symbol || "g";
        if (calc === "baker_pct") quantity = base.flourG * n(l.baker_pct) / 100;
        else if (calc === "flour_pct") quantity = base.flourG * n(l.quantity_value) / 100;
        else if (calc === "dough_pct") quantity = base.rawG * n(l.quantity_value) / 100;
        else if (calc === "baked_weight_pct") quantity = base.bakedG * n(l.quantity_value) / 100;
        else if (calc === "per_piece") quantity = base.pieces * n(l.quantity_value);
        else if (calc === "fixed") quantity = n(l.quantity_value) * base.scale;
        if (["baker_pct","flour_pct","dough_pct","baked_weight_pct"].includes(calc)) unit = "g";
        if (calc === "fixed" || calc === "per_piece") unit = l.quantity_unit_symbol || l.unit_symbol || unit;
        const cost = costFromQuantity(db, quantity, unit, l.base_unit_symbol, n(l.cost_per_base), l.density_g_ml, l.base_unit_type);
        const display = quantity >= 1000 && unit === "g" ? { quantity: quantity / 1000, unit: "kg" } : { quantity, unit };
        return normalizeForOrder(db, { name: l.ingredient_name, ingredient_id: l.ingredient_id, quantity: display.quantity, unit: display.unit, rawQuantity: quantity, rawUnit: unit, cost, order_group: l.order_group, storage_zone: l.storage_zone, base_unit_symbol: l.base_unit_symbol, base_unit_type: l.base_unit_type, density_g_ml: l.density_g_ml, usedIn: usedIn || '', source: "bakery-direct" });
      });
  }
  function componentFactor(db, row, parentBase) {
    let qv = n(row.quantity_value), unit = row.unit_symbol || "";
    if (row.calculation_base === "per_piece") qv = parentBase.pieces * n(row.quantity_value);
    else if (row.calculation_base === "flour_pct") { qv = parentBase.flourG * n(row.quantity_value) / 100; unit = "g"; }
    else if (row.calculation_base === "dough_pct") { qv = parentBase.rawG * n(row.quantity_value) / 100; unit = "g"; }
    else if (row.calculation_base === "baked_weight_pct") { qv = parentBase.bakedG * n(row.quantity_value) / 100; unit = "g"; }
    if (row.component_type === "culinary") {
      const sr = q(db, "SELECT yield_quantity,yield_unit_id FROM culinary_recipes WHERE id=$id", { $id: row.component_id })[0] || {};
      const yu = sr.yield_unit_id ? q(db, "SELECT symbol,unit_type,to_base_factor FROM units WHERE id=$id", { $id: sr.yield_unit_id })[0] : null;
      const lu = unitBySymbol(db, unit);
      if (!sr.yield_quantity || !yu || !lu) return { value: 1, warning: "falta rendimiento/unidad para componente culinario" };
      if (yu.unit_type !== lu.unit_type) return { value: 1, warning: "unidad incompatible para componente culinario" };
      return { value: (qv * n(lu.to_base_factor,1)) / (n(sr.yield_quantity,1) * n(yu.to_base_factor,1)), quantity: qv, unit };
    }
    if (row.component_type === "bakery") {
      const br = q(db, "SELECT base_flour_g,base_pieces FROM bakery_recipes WHERE id=$id", { $id: row.component_id })[0] || {};
      const lu = unitBySymbol(db, unit);
      if (lu && lu.unit_type === "mass") return { value: (qv * n(lu.to_base_factor,1)) / n(br.base_flour_g,1000), quantity: qv, unit };
      if (row.calculation_base === "per_piece" && br.base_pieces) return { value: qv / n(br.base_pieces,1), quantity: qv, unit };
      return { value: qv / n(br.base_flour_g,1000), quantity: qv, unit, warning: "factor panadero estimado por harina base" };
    }
    return { value: 1, quantity: qv, unit };
  }
  function bakeryComponents(db, recipeId, flourG) {
    const base = bakeryBaseMetrics(db, recipeId, flourG);
    return q(db, "SELECT * FROM v_bakery_recipe_components_print WHERE bakery_recipe_id=$id AND active=1 ORDER BY sort_order,id", { $id: recipeId }).map(r => Object.assign({}, r, { factor: componentFactor(db, r, base) }));
  }
  function bakeryExpandedLines(db, recipeId, flourG, usedIn, visited) {
    const key = `bakery:${recipeId}`;
    const seen = new Set(visited || []);
    if (seen.has(key)) return [];
    seen.add(key);
    const rows = bakeryDirectLines(db, recipeId, flourG, usedIn);
    for (const c of bakeryComponents(db, recipeId, flourG)) {
      if (!Number(c.include_in_order) || c.component_status !== "required") continue;
      if (c.factor && c.factor.warning) continue;
      if (c.component_type === "culinary") rows.push(...culinaryExpandedLines(db, c.component_id, c.factor.value, `${usedIn} · ${c.component_name}`));
      if (c.component_type === "bakery") {
        const child = q(db, "SELECT base_flour_g FROM bakery_recipes WHERE id=$id", { $id: c.component_id })[0] || {};
        rows.push(...bakeryExpandedLines(db, c.component_id, n(child.base_flour_g,1000) * c.factor.value, `${usedIn} · ${c.component_name}`, seen));
      }
    }
    return rows;
  }
  function ingredientAllergens(db, ingredientIds) {
    if (!ingredientIds || !ingredientIds.length) return [];
    const out = [], seen = new Set();
    for (const id of ingredientIds) {
      for (const r of q(db, `SELECT ia.ingredient_id, i.name AS ingredient, a.id AS allergen_id, a.name AS allergen, a.regulation_order, ia.declaration_status
         FROM ingredient_allergens ia JOIN allergens a ON a.id=ia.allergen_id JOIN ingredients i ON i.id=ia.ingredient_id
         WHERE ia.ingredient_id=$id AND a.regulation_order BETWEEN 1 AND 14 ORDER BY a.regulation_order`, { $id: id })) {
        const key = `${r.ingredient_id}:${r.allergen_id}:${r.declaration_status}`;
        if (!seen.has(key)) { seen.add(key); out.push(r); }
      }
    }
    return out;
  }
  function allergensFromLines(db, lines) { return ingredientAllergens(db, [...new Set((lines || []).map(l => l.ingredient_id).filter(Boolean))]); }
  function selectionOrderLines(db, items, opts) {
    const rows = [];
    for (const item of items || []) {
      if (item.sourceType === "culinary") rows.push(...culinaryExpandedLines(db, item.sourceId, scaleForCulinary(db, item.sourceId, item.qty), item.name));
      else if (item.sourceType === "bakery") rows.push(...bakeryExpandedLines(db, item.sourceId, bakeryFlourForItem(db, item), item.name, new Set()));
    }
    return rows;
  }
  function aggregate(lines) {
    const map = new Map();
    for (const l of lines || []) {
      if (!l.ingredient_id) continue;
      const unit = String(l.unit || "ud").toLowerCase();
      const key = `${l.order_group || 'Otros'}|${l.ingredient_id}|${unit}`;
      if (!map.has(key)) map.set(key, Object.assign({}, l, { quantity: 0, cost: 0, usedIn: new Set() }));
      const row = map.get(key);
      row.quantity += n(l.quantity); row.cost += n(l.cost); if (l.usedIn) row.usedIn.add(l.usedIn);
    }
    return [...map.values()].map(r => Object.assign({}, r, { usedIn: [...(r.usedIn || [])] }));
  }
  function groupAggregated(aggregated) {
    const groups = new Map();
    for (const row of aggregated || []) { if (!groups.has(row.order_group || 'Otros')) groups.set(row.order_group || 'Otros', []); groups.get(row.order_group || 'Otros').push(row); }
    return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([name, rows]) => ({ name, rows: rows.sort((a,b)=>(a.name||'').localeCompare(b.name||'','es')) }));
  }
  function validationCase(db, items) {
    const lines = selectionOrderLines(db, items || []);
    return { lines: lines.length, aggregated: aggregate(lines).length, allergens: allergensFromLines(db, lines).length };
  }
  window.ObradORRRecursiveEngine = {
    version: "2.1.0",
    canonical: true,
    scaleForCulinary, culinaryExpandedLines, culinarySubrecipes,
    bakeryBaseMetrics, bakeryDirectLines, bakeryComponents, bakeryExpandedLines,
    ingredientAllergens, allergensFromLines, selectionOrderLines, aggregate, groupAggregated, validationCase
  };
})();
