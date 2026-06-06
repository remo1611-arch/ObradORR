(function () {
  "use strict";

  // RC9-C: modelos documentales neutrales + matriz explícita de bloques.
  // Los identificadores antiguos se conservan como alias para no romper
  // selecciones o preferencias guardadas en navegadores de prueba.
  const ALIASES = {
    aula_taller: "ficha_trabajo",
    fpb: "ficha_trabajo",
    cm: "ficha_tecnica",
    gs: "dossier_completo",
    docente_produccion: "ficha_ampliada",
    auditoria_completa: "dossier_completo"
  };

  const BLOCK_LABELS = {
    photo: "Foto",
    ingredients: "Ingredientes y cantidades",
    process: "Proceso",
    allergens: "Alérgenos",
    equipment: "Equipamiento",
    conservation: "Conservación / servicio",
    appcc: "APPCC docente",
    subrecipes: "Subelaboraciones",
    costs: "Costes",
    escandallo: "Escandallo",
    validation: "Validación documental",
    traceability: "Trazabilidad técnica",
    order: "Pedido de producción"
  };

  const MODELS = {
    ficha_trabajo: {
      id: "ficha_trabajo",
      label: "Ficha de trabajo",
      help: "Salida limpia para aula-taller: ingredientes, cantidades, foto si existe y proceso esencial. Sin escandallo.",
      compact: true,
      audit: false,
      options: { includeCosts: false, includeProcess: true, includeAppcc: false, subrecipeMode: "none", preflightMode: "summary" },
      blocks: { photo: true, ingredients: true, process: true, allergens: true, equipment: false, conservation: false, appcc: false, subrecipes: "none", costs: false, escandallo: false, validation: false, traceability: false, order: "optional" },
      print: { cover: true, index: false, order: "optional", subrecipes: "none", basesTecnicas: "folded", appcc: "none", preflight: "summary", traceability: false, language: "clear" }
    },
    ficha_tecnica: {
      id: "ficha_tecnica",
      label: "Ficha técnica",
      help: "Documento de práctica ordinaria: proceso, alérgenos, conservación/servicio y subelaboraciones resumidas.",
      compact: false,
      audit: false,
      options: { includeCosts: false, includeProcess: true, includeAppcc: true, subrecipeMode: "ingredients", preflightMode: "critical" },
      blocks: { photo: true, ingredients: true, process: true, allergens: true, equipment: true, conservation: true, appcc: "brief", subrecipes: "ingredients", costs: false, escandallo: false, validation: false, traceability: false, order: true },
      print: { cover: true, index: true, order: true, subrecipes: "ingredients", basesTecnicas: "folded", appcc: "brief", preflight: "critical", traceability: false }
    },
    ficha_ampliada: {
      id: "ficha_ampliada",
      label: "Ficha técnica ampliada",
      help: "Salida de producción docente con APPCC, rendimiento, subfichas y observaciones técnicas. Costes visibles, sin duplicar escandallo.",
      compact: false,
      audit: false,
      options: { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: "sheets", preflightMode: "critical_high" },
      blocks: { photo: true, ingredients: true, process: true, allergens: true, equipment: true, conservation: true, appcc: true, subrecipes: "sheets", costs: true, escandallo: false, validation: false, traceability: false, order: true },
      print: { cover: true, index: true, order: true, subrecipes: "sheets", basesTecnicas: "visible", appcc: "complete", preflight: "critical_high", traceability: false }
    },
    dossier_completo: {
      id: "dossier_completo",
      label: "Dossier completo de producción",
      help: "Documento completo para profesorado, auditoría o gestión: escandallo, costes, APPCC, validación y trazabilidad.",
      compact: false,
      audit: true,
      options: { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: "sheets", preflightMode: "complete" },
      blocks: { photo: true, ingredients: true, process: true, allergens: true, equipment: true, conservation: true, appcc: true, subrecipes: "sheets", costs: true, escandallo: true, validation: true, traceability: true, order: true },
      print: { cover: true, index: true, order: true, subrecipes: "sheets", basesTecnicas: "visible", appcc: "complete", preflight: "complete", traceability: true }
    },
    pedido: {
      id: "pedido",
      label: "Pedido de producción",
      help: "Documento operativo de aprovisionamiento: ingredientes consolidados para la sesión actual.",
      compact: true,
      audit: false,
      options: { includeCosts: false, includeProcess: false, includeAppcc: false, subrecipeMode: "ingredients", preflightMode: "summary_if_alerts" },
      blocks: { photo: false, ingredients: true, process: false, allergens: true, equipment: false, conservation: false, appcc: false, subrecipes: "ingredients", costs: "optional", escandallo: false, validation: false, traceability: false, order: true },
      print: { cover: false, index: false, order: true, subrecipes: "ingredients", appcc: "none", preflight: "summary_if_alerts", traceability: false }
    }
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function normalize(id) { return ALIASES[id] || id || "ficha_trabajo"; }
  function get(id) { return clone(MODELS[normalize(id)] || MODELS.ficha_trabajo); }
  function list() { return [MODELS.ficha_trabajo, MODELS.ficha_tecnica, MODELS.ficha_ampliada, MODELS.dossier_completo].map(clone); }
  function defaults(id, documentType) {
    const normalized = normalize(id);
    const p = get(normalized);
    const out = Object.assign({}, p.options || {});
    if (documentType === "pedido") {
      const pedido = MODELS.pedido.options;
      out.includeProcess = false;
      out.includeAppcc = false;
      out.subrecipeMode = "ingredients";
      if (normalized !== "dossier_completo") out.preflightMode = pedido.preflightMode;
      if (normalized !== "dossier_completo") out.includeCosts = false;
    }
    return out;
  }
  function printConfig(id, documentType) {
    const normalized = normalize(id);
    const p = get(documentType === "pedido" && normalized !== "dossier_completo" ? "pedido" : normalized);
    return Object.assign({}, p.print || {});
  }
  function modelBlocks(id, documentType) {
    const normalized = normalize(id);
    const p = get(documentType === "pedido" && normalized !== "dossier_completo" ? "pedido" : normalized);
    const blocks = Object.assign({}, p.blocks || {});
    if (documentType === "pedido") {
      blocks.order = true;
      blocks.process = false;
      blocks.appcc = false;
      blocks.subrecipes = "ingredients";
      blocks.photo = false;
      if (normalized !== "dossier_completo") {
        blocks.costs = false;
        blocks.escandallo = false;
        blocks.validation = false;
        blocks.traceability = false;
      }
    }
    if (documentType === "fichas") blocks.order = false;
    return blocks;
  }
  function applyOverridesToBlocks(blocks, options) {
    const out = Object.assign({}, blocks || {});
    const profile = normalize(options && options.documentProfile);
    const costAllowed = profile === "ficha_ampliada" || profile === "dossier_completo";
    if (options && options.documentType !== "pedido") {
      out.process = !!options.includeProcess;
      out.appcc = options.includeAppcc ? out.appcc : false;
      out.subrecipes = options.subrecipeMode || out.subrecipes || "none";
    }
    if (options) {
      out.costs = costAllowed && !!options.includeCosts;
      out.escandallo = costAllowed && !!options.includeCosts && profile === "dossier_completo";
      if (out.validation === "optional") out.validation = profile === "dossier_completo" && costAllowed && !!options.includeCosts;
    }
    if (options && options.documentType === "pedido") {
      out.order = true;
      out.process = false;
      out.appcc = false;
      out.subrecipes = "ingredients";
      if (profile !== "dossier_completo") {
        out.costs = false;
        out.escandallo = false;
        out.validation = false;
        out.traceability = false;
      }
    }
    return out;
  }
  function resolve(id, documentType, overrides) {
    const normalized = normalize(id);
    const base = defaults(normalized, documentType);
    const options = Object.assign({}, base, overrides || {}, { documentProfile: normalized, documentType: documentType || "fichas_pedido" });
    if (options.documentType === "pedido" && options.subrecipeMode === "sheets") options.subrecipeMode = "ingredients";
    options.expandSubrecipes = options.subrecipeMode !== "none";
    const blocks = applyOverridesToBlocks(modelBlocks(normalized, options.documentType), options);
    return { profile: get(normalized), options, blocks, print: printConfig(normalized, options.documentType) };
  }
  function blockLabel(k) { return BLOCK_LABELS[k] || k; }
  function blockValueLabel(value) {
    if (value === true) return "incluido";
    if (value === false || value === null || typeof value === "undefined") return "oculto";
    if (value === "optional") return "opcional";
    if (value === "none") return "no desarrollado";
    if (value === "ingredients") return "ingredientes";
    if (value === "sheets") return "subfichas";
    if (value === "brief") return "breve";
    return String(value);
  }
  function blockSummary(id, documentType, overrides) {
    const resolved = resolve(id, documentType, overrides || {});
    return Object.keys(BLOCK_LABELS).map(key => ({ key, label: blockLabel(key), value: resolved.blocks[key], valueLabel: blockValueLabel(resolved.blocks[key]) }));
  }
  function label(id) { return (MODELS[normalize(id)] || MODELS.ficha_trabajo).label; }
  function isAudit(id) { return !!(MODELS[normalize(id)] && MODELS[normalize(id)].audit); }
  function isCompact(id) { return !!(MODELS[normalize(id)] && MODELS[normalize(id)].compact); }
  function preflightMode(id, documentType) { return defaults(normalize(id), documentType || "fichas_pedido").preflightMode || "summary"; }
  window.ObradORRDocumentProfiles = { get, list, defaults, printConfig, modelBlocks, resolve, blockSummary, blockLabel, blockValueLabel, label, isAudit, isCompact, preflightMode, normalize, version: "2.1.0-rc9" };
})();
