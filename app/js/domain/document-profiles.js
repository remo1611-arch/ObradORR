(function () {
  "use strict";
  const PROFILES = {
    aula_taller: {
      id: "aula_taller",
      label: "Aula-taller alumnado",
      help: "Documento operativo compacto para aula-taller. Costes ocultos, proceso visible y comprobación documental resumida.",
      compact: true,
      audit: false,
      options: { includeCosts: false, includeProcess: true, includeAppcc: true, subrecipeMode: "none", preflightMode: "summary" },
      print: { cover: true, index: false, order: "optional", subrecipes: "none", basesTecnicas: "folded", appcc: "brief", preflight: "summary", traceability: false, language: "clear" }
    },
    fpb: {
      id: "fpb",
      label: "FPB · guía práctica",
      help: "Guía muy compacta: ingredientes, proceso guiado, alérgenos y seguridad mínima.",
      compact: true,
      audit: false,
      options: { includeCosts: false, includeProcess: true, includeAppcc: true, subrecipeMode: "none", preflightMode: "summary" },
      print: { cover: true, index: false, order: false, subrecipes: "none", basesTecnicas: "folded", appcc: "brief", preflight: "summary", traceability: false, language: "guided" }
    },
    cm: {
      id: "cm",
      label: "CM · ficha técnica",
      help: "Proceso técnico, pedido y APPCC medio. Costes ocultos por defecto y comprobación documental solo crítica.",
      compact: false,
      audit: false,
      options: { includeCosts: false, includeProcess: true, includeAppcc: true, subrecipeMode: "ingredients", preflightMode: "critical" },
      print: { cover: true, index: true, order: true, subrecipes: "ingredients", basesTecnicas: "folded", appcc: "medium", preflight: "critical", traceability: false }
    },
    gs: {
      id: "gs",
      label: "GS · producción y costes",
      help: "Costes, pedido, subrecetas relevantes, APPCC completo y avisos críticos/altos.",
      compact: false,
      audit: false,
      options: { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: "sheets", preflightMode: "critical_high" },
      print: { cover: true, index: true, order: true, subrecipes: "sensibles", basesTecnicas: "visible", appcc: "complete", preflight: "critical_high", traceability: true }
    },
    docente_produccion: {
      id: "docente_produccion",
      label: "Docente producción",
      help: "Documento docente completo de producción con costes y subrecetas sensibles, sin auditoría exhaustiva.",
      compact: false,
      audit: false,
      options: { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: "sheets", preflightMode: "critical_high" },
      print: { cover: true, index: true, order: true, subrecipes: "sensibles", basesTecnicas: "visible", appcc: "complete", preflight: "critical_high", traceability: true }
    },
    pedido: {
      id: "pedido",
      label: "Pedido / economato",
      help: "Documento operativo de compra: pedido consolidado, alérgenos globales y resumen de avisos solo si procede.",
      compact: true,
      audit: false,
      options: { includeCosts: false, includeProcess: false, includeAppcc: false, subrecipeMode: "ingredients", preflightMode: "summary_if_alerts" },
      print: { cover: false, index: false, order: true, subrecipes: "ingredients", appcc: "none", preflight: "summary_if_alerts", traceability: false }
    },
    auditoria_completa: {
      id: "auditoria_completa",
      label: "Auditoría documental",
      help: "Documento interno completo con trazabilidad, costes, subrecetas, APPCC, comprobación documental completa y avisos de estado.",
      compact: false,
      audit: true,
      options: { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: "sheets", preflightMode: "complete" },
      print: { cover: true, index: true, order: true, subrecipes: "all", basesTecnicas: "visible", appcc: "complete", preflight: "complete", traceability: true }
    }
  };
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function get(id) { return clone(PROFILES[id] || PROFILES.aula_taller); }
  function list() { return [PROFILES.aula_taller, PROFILES.fpb, PROFILES.cm, PROFILES.gs, PROFILES.docente_produccion, PROFILES.auditoria_completa].map(clone); }
  function defaults(id, documentType) {
    const p = get(id);
    const out = Object.assign({}, p.options || {});
    if (documentType === "pedido") {
      const pedido = PROFILES.pedido.options;
      out.includeProcess = false;
      out.includeAppcc = false;
      out.subrecipeMode = "ingredients";
      if (id !== "auditoria_completa") out.preflightMode = pedido.preflightMode;
      if (id !== "gs" && id !== "docente_produccion" && id !== "auditoria_completa") out.includeCosts = false;
    }
    return out;
  }
  function printConfig(id, documentType) {
    const p = get(documentType === "pedido" && id !== "auditoria_completa" ? "pedido" : id);
    return Object.assign({}, p.print || {});
  }
  function label(id) { return (PROFILES[id] || PROFILES.aula_taller).label; }
  function isAudit(id) { return !!(PROFILES[id] && PROFILES[id].audit); }
  function isCompact(id) { return !!(PROFILES[id] && PROFILES[id].compact); }
  function preflightMode(id, documentType) { return defaults(id, documentType || "fichas_pedido").preflightMode || "summary"; }
  window.ObradORRDocumentProfiles = { get, list, defaults, printConfig, label, isAudit, isCompact, preflightMode, version: "2.1.0" };
})();
