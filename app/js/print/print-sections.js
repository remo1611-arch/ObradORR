(function () {
  "use strict";

  // RC9-F: contrato de secciones imprimibles y CSS de impresión separado.
  // Esta capa no modifica datos ni maquetación final; ordena el render clásico
  // en secciones documentales explícitas para preparar print-view.html.
  const SECTION_CONTRACT = [
    {
      id: "document_header",
      label: "Encabezado documental",
      kind: "metadata",
      block: "cover",
      required: true,
      description: "Identifica práctica, modelo, fecha, grupo y responsable cuando proceda."
    },
    {
      id: "preflight",
      label: "Comprobación documental previa",
      kind: "quality",
      block: "validation",
      required: false,
      description: "Muestra avisos documentales según el modelo de ficha seleccionado."
    },
    {
      id: "recipe_index",
      label: "Índice de elaboraciones",
      kind: "navigation",
      block: "index",
      documentTypes: ["fichas", "fichas_pedido"],
      required: false,
      description: "Facilita la lectura cuando la sesión incluye varias fichas."
    },
    {
      id: "recipe_sheets",
      label: "Fichas de elaboración",
      kind: "recipe",
      block: "recipes",
      documentTypes: ["fichas", "fichas_pedido"],
      repeat: "items",
      required: false,
      description: "Renderiza las fichas individuales con los bloques permitidos por el modelo documental."
    },
    {
      id: "production_order",
      label: "Pedido de producción",
      kind: "order",
      block: "order",
      documentTypes: ["pedido", "fichas_pedido"],
      required: false,
      description: "Renderiza el pedido de producción con ingredientes consolidados para la sesión."
    }
  ];

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function documentType(model) { return (model && model.options && model.options.documentType) || "fichas_pedido"; }
  function blocks(model) { return (model && model.options && model.options.printBlocks) || {}; }
  function includesDocumentType(section, type) {
    return !section.documentTypes || section.documentTypes.indexOf(type) !== -1;
  }
  function blockEnabled(section, model) {
    const type = documentType(model);
    const b = blocks(model);
    if (!includesDocumentType(section, type)) return false;
    if (section.id === "document_header") return true;
    if (section.id === "preflight") return true;
    if (section.id === "recipe_index") return type !== "pedido";
    if (section.id === "recipe_sheets") return type !== "pedido";
    if (section.id === "production_order") return type !== "fichas" && b.order !== false;
    return true;
  }
  function reason(section, model) {
    const type = documentType(model);
    if (!includesDocumentType(section, type)) return "no_aplica_tipo_documento";
    if (section.id === "production_order" && blocks(model).order === false) return "bloque_pedido_oculto";
    return "incluida";
  }
  function buildPlan(model) {
    return SECTION_CONTRACT.map(section => Object.assign(clone(section), {
      enabled: blockEnabled(section, model),
      reason: reason(section, model)
    }));
  }
  function assertAdapter(adapters, name) {
    if (!adapters || typeof adapters[name] !== "function") throw new Error("Falta adaptador de impresión: " + name);
    return adapters[name];
  }
  async function renderSection(section, model, adapters) {
    if (!section || !section.enabled) return "";
    const opts = (model && model.options) || {};
    if (section.id === "document_header") {
      return assertAdapter(adapters, "printHeader")(opts);
    }
    if (section.id === "preflight") {
      return assertAdapter(adapters, "preflightPrintHtml")(model.preflight, opts);
    }
    if (section.id === "recipe_index") {
      return assertAdapter(adapters, "printIndexHtml")(model.items || [], opts);
    }
    if (section.id === "recipe_sheets") {
      const renderRecipe = assertAdapter(adapters, "recipeSheetHtml");
      const chunks = [];
      for (const item of (model.items || [])) {
        chunks.push(await renderRecipe(item, opts, true, model.context));
      }
      return chunks.join("\n");
    }
    if (section.id === "production_order") {
      return await assertAdapter(adapters, "orderHtml")(model.items || [], opts);
    }
    return "";
  }
  async function renderDocumentBody(model, adapters) {
    const plan = Array.isArray(model && model.sectionPlan) ? model.sectionPlan : buildPlan(model || {});
    const chunks = [];
    for (const section of plan) {
      const html = await renderSection(section, model, adapters);
      if (html) chunks.push(html);
    }
    return chunks.join("\n");
  }
  function sectionSummary(model) {
    return buildPlan(model).map(s => ({ id: s.id, label: s.label, kind: s.kind, enabled: !!s.enabled, reason: s.reason }));
  }

  window.ObradORRPrintSections = {
    version: "2.1.0-rc9",
    SECTION_CONTRACT,
    buildPlan,
    sectionSummary,
    renderSection,
    renderDocumentBody
  };
})();
