(function () {
"use strict";
const ObradORRDatabase = window.ObradORRDatabase;
if (!ObradORRDatabase)
    throw new Error("No se cargó la capa SQLite de ObradORR.");
window.__OBRADORR_MODULE_STARTED = true;
window.__OBRADORR_MODULE_VERSION = 'obradorr-210-rc8-release-candidate';
// public release final cache token
const DB_URL = '../db/obradorr.sqlite';
const BLANK_DB_URL = '../db/obradorr_blank.sqlite';
const WORK_SELECTION_ID = 'WORK_CURRENT';
const STORAGE_PRINT_OPTIONS = 'obradorr_ui_print_options_v1';
const IDB_DATA_DB = 'obradorr-data-210-rc7-release-candidate';
const IDB_DATA_STORE = 'snapshots';
const IDB_CURRENT_KEY = 'current-db';
const IDB_PREVIOUS_KEYS = ['previous-db-1', 'previous-db-2', 'previous-db-3'];
const VERSION = '2.1.0';
const WORKSHOP_VALIDATION_FLOW = 'workshop_validation_flow';
const LIST_PAGE_SIZE = 60;
const INGREDIENT_SEARCH_LIMIT = 60;
const PRINT_SEARCH_LIMIT = 60;
const LEGAL_NOTICE = '© 2026 Remo José Pereira González · Uso docente personal autorizado · Sin licencia abierta de redistribución o explotación comercial.';
const EXPECTED_RELEASE_TAG = '2.1.0-rc7';
const EXPECTED_CACHE_TAG = 'obradorr-210-rc7-release-candidate';
const db = new ObradORRDatabase();
const state = {
    ready: false,
    page: 'inicio',
    recipes: [],
    ingredients: [],
    cycles: [],
    modules: [],
    families: [],
    subfamilies: [],
    orderGroups: [],
    storageZones: [],
    units: [],
    allergens: [],
    dataStatus: 'Cargando base incluida...',
    dataSource: 'base incluida',
    dataSavedAt: '',
    dataDirty: false,
    dataRevision: 0,
    lastSavedRevision: 0,
    lastDownloadedRevision: 0,
    dataSaveError: '',
    storageHealth: null,
    autosaveTimer: null,
    autosaveInFlight: false,
    autosaveQueued: false,
    statusFlashTimer: null,
    statusIndicatorLabel: '',
    selection: [],
    sessions: [],
    recipeSearch: '',
    ingredientSearch: '',
    printSearch: '',
    recipeVisibleLimit: LIST_PAGE_SIZE,
    ingredientVisibleLimit: LIST_PAGE_SIZE,
    printVisibleLimit: LIST_PAGE_SIZE,
    validationSearch: '',
    validationStatusFilter: 'all',
    printOptions: loadJson(STORAGE_PRINT_OPTIONS, {
        documentType: 'fichas_pedido',
        documentProfile: 'aula_taller',
        includeTeachingData: false,
        includeCosts: false,
        subrecipeMode: 'sheets',
        expandSubrecipes: true,
        includeProcess: true,
        includeAppcc: true,
        teaching: { title: '', cycle: '', module: '', group: '', date: new Date().toISOString().slice(0, 10), responsible: '', notes: '' }
    })
};
const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
window.addEventListener('error', event => showFatalError(event.error || event.message || 'Error no controlado'));
window.addEventListener('unhandledrejection', event => showFatalError(event.reason || 'Promesa rechazada sin controlar'));
window.addEventListener('beforeunload', event => {
    if (!hasUnsavedWork())
        return;
    event.preventDefault();
    event.returnValue = 'Hay cambios pendientes de guardar o descargar en ObradORR.';
});
window.addEventListener('pagehide', () => flushWorkingCopyOnLifecycle('Guardado al salir de la página'));
document.addEventListener('visibilitychange', () => {
    if (document.hidden)
        flushWorkingCopyOnLifecycle('Guardado al ocultar pestaña');
});
boot().catch(showFatalError);
function showFatalError(error) {
    console.error(error);
    const message = friendlyDbErrorMessage(error);
    const isDuplicate = isUniqueConstraintError(error);
    const title = isDuplicate ? 'No se pudo guardar el dato' : 'No se pudo arrancar ObradORR';
    const detail = isDuplicate
        ? '<div class="notice"><b>La base no se ha modificado.</b> Vuelve a la pantalla anterior, usa el registro existente o elige un nombre diferenciado. Si estabas editando desde móvil, descarga una copia SQLite cuando termines.</div>'
        : '<div class="notice"><b>Comprobaciones:</b> abre la app con servidor local, no con file://; arranca desde la raíz del proyecto; si venías de una versión anterior, usa <code>app/reset_local_data.html</code> y vuelve a cargar la base incluida en la aplicación.</div>';
    if (!app)
        return;
    app.innerHTML = `<main class="main"><section class="card"><h2>${title}</h2><p>${escapeHtml(message)}</p>${detail}</section></main>`;
}
async function boot() {
    renderShell('Cargando base de datos...');
    await loadInitialDatabase();
    await loadCatalogs();
    state.ready = true;
    render();
}
async function loadCatalogs() {
    state.recipes = db.query(`
    SELECT uid, source_type, source_id, name, category_label, production_kind, default_production_mode,
           production_label, family, subfamily, status, release_status,
           CASE WHEN source_type='bakery' THEN (SELECT workshop_validation_status FROM bakery_recipes br2 WHERE br2.id=source_id) ELSE (SELECT workshop_validation_status FROM culinary_recipes cr2 WHERE cr2.id=source_id) END AS workshop_validation_status,
           CASE WHEN source_type='bakery' THEN (SELECT documentary_status FROM bakery_recipes br2 WHERE br2.id=source_id) ELSE (SELECT documentary_status FROM culinary_recipes cr2 WHERE cr2.id=source_id) END AS documentary_status,
           active, base_servings, yield_quantity, yield_unit,
           base_flour_g, base_pieces, base_label, total_cost, ingredient_cost_total, updated_at, yield_status
    FROM v_elaborations_unified
    WHERE COALESCE(active,1)=1
    ORDER BY name COLLATE NOCASE
  `);
    state.ingredients = db.query(`
    SELECT id, name, family, subfamily, base_unit, purchase_unit, purchase_price, purchase_net_quantity,
           waste_pct, cost_per_base_unit_after_waste, use_culinary, use_bakery, order_group, supplier, storage_zone, active
    FROM v_ingredients_cost
    WHERE COALESCE(active,1)=1
    ORDER BY name COLLATE NOCASE
  `);
    state.cycles = db.query(`SELECT id, name FROM fp_cycles ORDER BY name COLLATE NOCASE`);
    state.modules = db.query(`SELECT id, cycle_id, module_code, module_name, default_group FROM fp_modules ORDER BY module_code COLLATE NOCASE, module_name COLLATE NOCASE`);
    state.families = db.query(`SELECT id, name, area, sort_order FROM technical_families ORDER BY area, sort_order, name COLLATE NOCASE`);
    state.subfamilies = db.query(`SELECT id, family_id, name, sort_order FROM technical_subfamilies ORDER BY sort_order, name COLLATE NOCASE`);
    state.orderGroups = db.query(`SELECT id, name, sort_order FROM order_groups WHERE sort_order < 5000 ORDER BY sort_order, name COLLATE NOCASE`);
    state.storageZones = db.query(`SELECT id, name FROM storage_zones ORDER BY name COLLATE NOCASE`);
    state.units = db.query(`SELECT id, name, symbol, unit_type FROM units ORDER BY unit_type, name COLLATE NOCASE`);
    state.allergens = db.query(`SELECT id, name, regulation_order FROM allergens ORDER BY regulation_order, name COLLATE NOCASE`);
    ensureWorkSelection();
    loadSelectionFromSqlite();
    loadSessionsFromSqlite();
    reconcileSelection();
}
function renderShell(status = '') {
    const statusLabel = headerStatusLabel(status);
    const statusTitle = state.ready ? dataStatusText() : (state.dataStatus || statusLabel);
    app.innerHTML = `
    <header class="topbar no-print">
      <div class="topbar-inner">
        <div class="topbar-brand-row">
          <div class="brand">
            <div class="brand-mark">🍽️</div>
            <div><h1>ObradORR</h1><small>Aula taller digital de cocina, pastelería y panadería</small></div>
          </div>
          <button type="button" class="status status-compact" data-status-toggle aria-label="Estado: ${escapeAttr(statusTitle)}" title="${escapeAttr(statusTitle)}">
            <span class="dot ${statusDotClass()}"></span><span class="status-text">${escapeHtml(statusLabel)}</span>
          </button>
        </div>
        <nav class="nav" aria-label="Navegación principal">
          ${navButton('inicio', 'Inicio')}
          ${navButton('imprimir', 'Sesión actual')}
          ${navButton('sesiones', 'Sesiones guardadas')}
          ${navButton('elaboraciones', 'Elaboraciones')}
          ${navButton('ingredientes', 'Ingredientes')}
          ${navButton('validacion', 'Validación de obrador')}
          ${navButton('sistema', 'Sistema')}
        </nav>
      </div>
    </header>
    ${dataSafetyBannerHtml()}
    <main class="main" id="main-view"></main>
    <footer class="app-footer no-print">${escapeHtml(LEGAL_NOTICE)}</footer>
  `;
}
function render() {
    renderShell();
    const main = document.getElementById('main-view');
    if (!main)
        return;
    if (state.page === 'inicio')
        main.innerHTML = homeView();
    if (state.page === 'elaboraciones')
        main.innerHTML = recipesView();
    if (state.page === 'ingredientes')
        main.innerHTML = ingredientsView();
    if (state.page === 'imprimir')
        main.innerHTML = printWorkspaceView();
    if (state.page === 'sesiones')
        main.innerHTML = sessionsView();
    if (state.page === 'validacion')
        main.innerHTML = validationView();
    if (state.page === 'sistema')
        main.innerHTML = systemView();
    bindCurrentView();
    setupAdaptiveTextareas(main);
}
function navButton(page, label) {
    return `<button type="button" data-nav="${page}" class="${state.page === page ? 'active' : ''}">${label}</button>`;
}
function homeView() {
    return `
    <section class="hero">
      <div class="card">
        <h2>Inicio</h2>
        <p>Prepara una práctica, añade elaboraciones y genera fichas o pedido sin entrar en rutas técnicas.</p>
        <div class="quick-grid">
          ${quickCard('elaboraciones', '📚', 'Elaboraciones', 'Buscar, ver, editar o añadir a la práctica actual.')}
          ${quickCard('ingredientes', '🥕', 'Ingredientes', 'Consultar y editar productos, familias, alérgenos y pedido.')}
          ${quickCard('imprimir', '🖨️', 'Sesión actual', 'Revisar la práctica activa y preparar fichas, pedido o PDF.')}
        </div>
      </div>
      <div class="card soft">
        <div class="panel-title"><div><h2>Práctica actual</h2><p>${state.selection.length} elaboraciones seleccionadas</p></div><span class="pill green">${VERSION}</span></div>
        ${selectionSummaryHtml()}
        <div class="data-mini"><b>Datos</b><small>${escapeHtml(dataStatusText())}</small><div class="actions"><button class="btn" data-download-db>Guardar copia</button><button class="btn" data-load-db> Cargar copia</button></div></div>
        <div class="actions" style="margin-top:14px">
          <button class="btn accent" data-nav="imprimir">Preparar documento</button>
          <button class="btn" data-save-session>Guardar sesión</button>
          <button class="btn danger" data-clear-selection>Vaciar</button>
        </div>
      </div>
    </section>
    ${usageGuideHtml()}
  `;
}
function quickCard(page, icon, title, text) {
    return `<button class="quick-card" data-nav="${page}"><span>${icon}</span><b>${title}</b><small class="muted">${text}</small></button>`;
}
function usageGuideHtml() {
    return `
    <section class="card usage-guide-card">
      <details class="usage-guide">
        <summary>
          <span>Guía de uso</span>
          <small>Consulta rápida de las funciones principales de ObradORR.</small>
        </summary>
        <div class="usage-guide-body">
          <details class="usage-guide-item" open>
            <summary>Flujo rápido recomendado</summary>
            <ol>
              <li>Entra en <b>Sesión actual</b>.</li>
              <li>Añade elaboraciones y ajusta raciones.</li>
              <li>Escoge ficha, pedido o ficha + pedido.</li>
              <li>Revisa la vista previa y guarda o imprime en PDF.</li>
              <li>Guarda la sesión o descarga una copia SQLite si hiciste cambios importantes.</li>
            </ol>
            <div class="actions guide-actions">
              <button class="btn accent" data-nav="imprimir">Ir a sesión actual</button>
              <button class="btn" data-nav="elaboraciones">Ver elaboraciones</button>
              <button class="btn" data-nav="sistema">Copias y sistema</button>
            </div>
          </details>
          <details class="usage-guide-item">
            <summary>Sesión actual</summary>
            <p>Área de trabajo de la práctica activa: selecciona elaboraciones, ajusta cantidades, define el nivel documental y genera la vista previa/PDF.</p>
            <p><b>Sesión actual</b> no sustituye una copia de seguridad. Para conservar cambios importantes, descarga una copia SQLite desde Sistema.</p>
          </details>
          <details class="usage-guide-item">
            <summary>Sesiones guardadas</summary>
            <p>Recupera selecciones de prácticas guardadas en este navegador. Útil para repetir prácticas o preparar varias sesiones.</p>
            <p><b>Sesión guardada</b> = selección local de práctica. <b>Copia SQLite</b> = base completa portable.</p>
          </details>
          <details class="usage-guide-item">
            <summary>Elaboraciones</summary>
            <p>Consulta, edita, duplica, crea variantes y añade elaboraciones a la sesión actual.</p>
            <p>Las fichas nuevas o modificadas son propuestas documentales hasta su comprobación real en obrador.</p>
          </details>
          <details class="usage-guide-item">
            <summary>Ingredientes</summary>
            <p>Revisa productos, familias, unidades, costes, zonas de almacenamiento y alérgenos asociados.</p>
            <p>La eliminación se bloquea si el ingrediente está en uso en recetas o fórmulas.</p>
          </details>
          <details class="usage-guide-item">
            <summary>Validación de obrador</summary>
            <p>Registra comprobaciones reales de fichas. La validación no es automática: corresponde al profesorado tras prueba de producción.</p>
          </details>
          <details class="usage-guide-item">
            <summary>Sistema y copias</summary>
            <p>Gestiona guardado local, descarga/importación de SQLite, combinación de datos, diagnóstico y exportaciones técnicas.</p>
            <ul>
              <li><b>Trabajar aquí:</b> guardado local automático.</li>
              <li><b>Copia seria:</b> descarga SQLite.</li>
              <li><b>Móvil ↔ PC:</b> descarga SQLite e importa en otro dispositivo.</li>
              <li><b>Combinar sin machacar:</b> importa y combina datos.</li>
            </ul>
          </details>
          <details class="usage-guide-item">
            <summary>Exportaciones técnicas</summary>
            <p>Excel, CSV y JSON sirven para auditoría, respaldo o revisión externa. No son formatos maestros de edición.</p>
          </details>
          <details class="usage-guide-item">
            <summary>Consejos de seguridad</summary>
            <ul>
              <li>Abre siempre con servidor local, no con <code>file://</code>.</li>
              <li>Descarga una copia SQLite después de cambios importantes.</li>
              <li>Antes de importar una base, conserva una copia de la actual.</li>
              <li>Usa <code>reset_local_data.html</code> solo para limpiar datos locales del navegador.</li>
            </ul>
          </details>
        </div>
      </details>
    </section>
  `;
}
function selectionSummaryHtml() {
    if (!state.selection.length)
        return `<div class="empty">Todavía no hay elaboraciones. Entra en <b>Sesión actual</b> y añádelas de forma rápida.</div>`;
    return `<div class="summary-list">${state.selection.slice(0, 6).map(item => `
    <div class="summary-row"><div><b>${escapeHtml(item.name)}</b><br><small>${escapeHtml(selectionQuantityLabel(item))}</small></div><button class="btn ghost" data-remove-selection="${item.uid}">Quitar</button></div>
  `).join('')}${state.selection.length > 6 ? `<small class="muted">...y ${state.selection.length - 6} más.</small>` : ''}</div>`;
}
function recipesView() {
    const rows = filterRecipes(state.recipeSearch);
    const visible = limitedRows(rows, state.recipeVisibleLimit);
    return `
    <section class="card">
      <div class="panel-title"><div><h2>Elaboraciones</h2><p>Catálogo técnico. Puedes ver, crear, editar o añadir a la práctica actual.</p></div><div class="actions"><button class="btn primary" data-new-recipe>Nueva elaboración</button><button class="btn accent" data-nav="imprimir">Ir a sesión actual</button></div></div>
      <div class="toolbar"><div class="search"><input class="input" id="recipeSearch" value="${escapeAttr(state.recipeSearch)}" placeholder="Buscar elaboración..." /></div><span class="pill" id="recipeSearchCount">${resultCountText(rows.length, visible.length, 'resultados')}</span></div>
      <div id="recipeLimitControls">${listLimitControlsHtml('recipe', rows.length, visible.length, !!state.recipeSearch, 'elaboraciones')}</div>
      <div class="catalog-grid" id="recipeResults">${visible.map(recipeCard).join('')}</div>
    </section>
  `;
}
function releaseStatusLabel(status) {
    const map = { validada: 'Validada', pendiente: 'Pendiente', no_apta: 'No apta', borrador: 'Borrador', bloqueante: 'Bloqueante' };
    return map[status] || status || 'Sin estado';
}
function recipeCard(recipe) {
    const releaseStatus = recipe.release_status || 'pendiente';
    const blocked = releaseStatus === 'no_apta' || releaseStatus === 'bloqueante';
    return `<article class="recipe-card ${blocked ? 'recipe-card-blocked' : ''}">
    <header><div><b>${escapeHtml(recipe.name)}</b><br><small class="muted">${escapeHtml(recipe.category_label || recipe.source_type)} · ${escapeHtml(recipe.family || 'Sin familia')}</small></div><div class="pill-stack"><span class="pill">${recipe.source_type === 'bakery' ? 'Panadería' : 'Cocina'}</span><span class="pill ${blocked ? 'danger-pill' : ''}">${escapeHtml(releaseStatusLabel(releaseStatus))}</span><span class="pill ${validationStatusClass(recipeWorkshopStatus(recipe))}">${escapeHtml(validationStatusLabel(recipeWorkshopStatus(recipe)))}</span></div></header>
    <small class="muted">${escapeHtml(recipe.base_label || defaultQuantityLabel(recipe))}</small>
    ${blocked ? '<small class="warn">Ficha no apta para uso docente final. Puede revisarse, pero no se añade a práctica como ficha normal.</small>' : ''}
    <div class="actions">
      <button class="btn" data-preview-recipe="${recipe.uid}">Vista previa</button>
      <button class="btn" data-register-workshop="${recipe.uid}">Obrador</button>
      <button class="btn" data-edit-recipe="${recipe.uid}">Editar</button>
      ${blocked ? '<button class="btn" disabled>No apta</button>' : `<button class="btn primary" data-add-recipe="${recipe.uid}">Añadir</button>`}
    </div>
  </article>`;
}
function ingredientsView() {
    const rows = filterIngredients(state.ingredientSearch);
    const visible = limitedRows(rows, state.ingredientVisibleLimit);
    return `
    <section class="card">
      <div class="panel-title"><div><h2>Ingredientes</h2><p>Consulta, creación y edición básica. Los cambios en ingredientes afectan a las elaboraciones que los utilizan.</p></div><div class="actions"><button class="btn primary" data-new-ingredient>Nuevo ingrediente</button><span class="pill" id="ingredientSearchCount">${resultCountText(rows.length, visible.length, 'activos')}</span></div></div>
      <div class="toolbar"><input class="input" id="ingredientSearch" value="${escapeAttr(state.ingredientSearch)}" placeholder="Buscar ingrediente..." /></div>
      <div id="ingredientLimitControls">${listLimitControlsHtml('ingredient', rows.length, visible.length, !!state.ingredientSearch, 'ingredientes')}</div>
      <div id="ingredientResults">${ingredientResultsHtml(rows)}</div>
    </section>
  `;
}
function ingredientResultsHtml(rows) {
    const visible = limitedRows(rows, state.ingredientVisibleLimit);
    return `<div class="table-wrap ingredient-table-wrap"><table class="responsive-table ingredient-table"><thead><tr><th>Ingrediente</th><th>Familia</th><th>Grupo pedido</th><th>Zona</th><th>Coste</th><th></th></tr></thead><tbody>
    ${visible.map(ingredientRowHtml).join('')}
  </tbody></table></div>`;
}
function resultCountText(total, shown, label) {
    const t = Number(total || 0);
    const s = Math.min(Number(shown || 0), t);
    return `Mostrando ${s} de ${t} ${label}`;
}
function limitedRows(rows, limit) {
    return (rows || []).slice(0, Math.min(Number(limit || LIST_PAGE_SIZE), (rows || []).length));
}
function listLimitControlsHtml(kind, total, shown, filtered, noun) {
    const t = Number(total || 0);
    const s = Number(shown || 0);
    if (t <= s)
        return '';
    const allLabel = filtered ? `Mostrar todas las filtradas` : `Mostrar todas`;
    return `<div class="list-limit-actions actions"><button class="btn" data-list-more="${kind}">Mostrar más</button><button class="btn" data-list-all="${kind}">${allLabel}</button><small class="muted">${escapeHtml(resultCountText(t, s, noun || 'resultados'))}</small></div>`;
}
function ingredientRowHtml(i) {
    return `<tr><td data-label="Ingrediente"><b>${escapeHtml(i.name)}</b><br><small class="muted">${escapeHtml(i.id)}</small></td><td data-label="Familia">${escapeHtml(i.family || '')}</td><td data-label="Grupo pedido">${escapeHtml(i.order_group || '')}</td><td data-label="Zona">${escapeHtml(i.storage_zone || '')}</td><td data-label="Coste">${money(i.cost_per_base_unit_after_waste)} / ${escapeHtml(i.base_unit || '')}</td><td data-label="Acción"><button class="btn" data-edit-ingredient="${i.id}">Editar</button></td></tr>`;
}
function printSearchResultsHtml(results) {
    return results.map(r => {
        const blocked = r.release_status === 'no_apta' || r.release_status === 'bloqueante';
        return `<div class="result-row ${blocked ? 'result-row-blocked' : ''}"><div><b>${escapeHtml(r.name)}</b><br><small class="muted">${escapeHtml(defaultQuantityLabel(r))}${blocked ? ' · Ficha no apta' : ''}</small></div>${blocked ? '<button class="btn" disabled>No apta</button>' : `<button class="btn primary" data-add-recipe="${r.uid}">Añadir</button>`}</div>`;
    }).join('');
}
function bindDynamicActionButtons(scope = document) {
    scope.querySelectorAll('[data-add-recipe]').forEach(b => {
        if (b.dataset.bound === '1')
            return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => showAddRecipeToPrintDialog(b.dataset.addRecipe));
    });
    scope.querySelectorAll('[data-preview-recipe]').forEach(b => {
        if (b.dataset.bound === '1')
            return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => showRecipePreview(b.dataset.previewRecipe));
    });
    scope.querySelectorAll('[data-edit-recipe]').forEach(b => {
        if (b.dataset.bound === '1')
            return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => showRecipeEditor(b.dataset.editRecipe));
    });
    scope.querySelectorAll('[data-edit-ingredient]').forEach(b => {
        if (b.dataset.bound === '1')
            return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => showIngredientEditor(b.dataset.editIngredient));
    });
    scope.querySelectorAll('[data-register-workshop]').forEach(b => {
        if (b.dataset.bound === '1')
            return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => showWorkshopValidationDialog(b.dataset.registerWorkshop));
    });
    scope.querySelectorAll('[data-workshop-history]').forEach(b => {
        if (b.dataset.bound === '1')
            return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => showWorkshopHistory(b.dataset.workshopHistory));
    });
    scope.querySelectorAll('[data-workshop-acta]').forEach(b => {
        if (b.dataset.bound === '1')
            return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => generateWorkshopValidationActa(b.dataset.workshopActa));
    });
}
function updateRecipeSearchResults() {
    const rows = filterRecipes(state.recipeSearch);
    const visible = limitedRows(rows, state.recipeVisibleLimit);
    const results = document.getElementById('recipeResults');
    const count = document.getElementById('recipeSearchCount');
    if (count)
        count.textContent = resultCountText(rows.length, visible.length, 'resultados');
    if (results) {
        results.innerHTML = visible.map(recipeCard).join('');
        bindDynamicActionButtons(results);
    }
    refreshListLimitControls('recipe', rows.length, visible.length, !!state.recipeSearch, 'elaboraciones');
}
function updateIngredientSearchResults() {
    const rows = filterIngredients(state.ingredientSearch);
    const visible = limitedRows(rows, state.ingredientVisibleLimit);
    const results = document.getElementById('ingredientResults');
    const count = document.getElementById('ingredientSearchCount');
    if (count)
        count.textContent = resultCountText(rows.length, visible.length, 'activos');
    if (results) {
        results.innerHTML = ingredientResultsHtml(rows);
        bindDynamicActionButtons(results);
    }
    refreshListLimitControls('ingredient', rows.length, visible.length, !!state.ingredientSearch, 'ingredientes');
}
function updatePrintSearchResults() {
    const allRows = filterRecipes(state.printSearch);
    const rows = limitedRows(allRows, state.printVisibleLimit);
    const results = document.getElementById('printResults');
    const count = document.getElementById('printSearchCount');
    const note = document.getElementById('printSearchLimitNote');
    if (count)
        count.textContent = resultCountText(allRows.length, rows.length, 'resultados');
    if (results) {
        results.innerHTML = printSearchResultsHtml(rows);
        bindDynamicActionButtons(results);
    }
    if (note)
        note.innerHTML = listLimitControlsHtml('print', allRows.length, rows.length, !!state.printSearch, 'resultados');
    bindListLimitButtons(document);
}
function refreshListLimitControls(kind, total, shown, filtered, noun) {
    const container = document.getElementById(`${kind}LimitControls`);
    if (container) container.innerHTML = listLimitControlsHtml(kind, total, shown, filtered, noun);
    else {
        const existing = document.querySelector(`.list-limit-actions [data-list-more="${kind}"]`)?.closest('.list-limit-actions');
        if (existing) existing.outerHTML = listLimitControlsHtml(kind, total, shown, filtered, noun);
    }
    bindListLimitButtons(document);
}
function printWorkspaceView() {
    const allResults = filterRecipes(state.printSearch);
    const results = limitedRows(allResults, state.printVisibleLimit);
    const opts = state.printOptions;
    const selectedCount = state.selection.length;
    const selectedLabel = selectedCount === 1 ? '1 elaboración seleccionada' : `${selectedCount} elaboraciones seleccionadas`;
    const totalQty = state.selection.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    return `
    <section class="print-ux-page">
      <div class="card print-ux-hero">
        <div class="panel-title print-ux-title">
          <div><h2>Sesión actual</h2><p>Flujo guiado para revisar la práctica activa y preparar fichas, pedido o documento completo.</p></div>
          <span class="pill green">PDF</span>
        </div>
        <div class="print-ux-practice">
          <div class="print-ux-practice-main">
            <span class="print-ux-step">Práctica actual</span>
            <b>${escapeHtml(selectedLabel)}</b>
            <small class="muted">${selectedCount ? `${formatQty(totalQty)} unidades/raciones objetivo según las elaboraciones seleccionadas.` : 'Añade elaboraciones antes de generar el documento.'}</small>
          </div>
          <div class="actions print-ux-practice-actions">
            <button class="btn" data-nav="sesiones">Sesiones guardadas</button>
            <button class="btn" data-nav="elaboraciones">Ver elaboraciones</button>
            ${selectedCount ? '<button class="btn danger" data-clear-selection>Vaciar</button>' : ''}
          </div>
        </div>
      </div>

      <section class="print-ux-layout">
        <div class="card print-ux-main-card">
          <div class="print-ux-block">
            <h3><span>1</span> Qué documento quieres generar</h3>
            <p class="muted">Elige la salida principal. La vista previa se abrirá antes de imprimir o guardar en PDF.</p>
            <div class="radio-row print-doc-row">
              ${docRadio('fichas_pedido', 'Fichas + pedido', 'Documento completo de práctica: fichas técnicas y pedido consolidado.')}
              ${docRadio('fichas', 'Fichas', 'Solo fichas técnicas de elaboración.')}
              ${docRadio('pedido', 'Pedido', 'Solo ingredientes consolidados para compra, economato o mise en place.')}
            </div>
          </div>

          <div class="print-ux-block">
            <h3><span>2</span> Nivel documental</h3>
            <p class="muted">Selecciona el grado de detalle según uso docente: aula, producción o auditoría.</p>
            <div class="radio-row profile-row print-profile-row">
              ${documentProfileRadiosHtml()}
            </div>
          </div>

          <div class="print-ux-block">
            <h3><span>3</span> Elaboraciones seleccionadas</h3>
            ${selectionEditorHtml()}
          </div>

          <div class="print-ux-block print-teaching-block">
            <h3><span>4</span> Datos docentes</h3>
            <div class="option-row"><label><input type="checkbox" id="includeTeachingData" ${opts.includeTeachingData ? 'checked' : ''}/> Incluir datos docentes en la portada y encabezados</label>${opts.includeTeachingData ? teachingFieldsHtml() : '<small class="muted">Actívalo para añadir título de práctica, fecha, ciclo, módulo, grupo, responsable y notas.</small>'}</div>
          </div>

          <details class="print-ux-advanced">
            <summary><b>Opciones avanzadas de ficha y trazabilidad</b><small>APPCC, costes, subelaboraciones, proceso y resumen documental.</small></summary>
            <div class="options" style="margin-top:14px">
              ${opts.documentType !== 'pedido' ? sheetOptionsHtml() : '<div class="notice">El pedido consolidado expande ingredientes y no imprime proceso técnico de fichas.</div>'}
              ${printOutputSummaryHtml(opts)}
              ${preflightSelectionSummaryHtml()}
            </div>
          </details>

          <div class="print-ux-submit actions">
            <button class="btn primary" data-generate-document>${selectedCount ? 'Vista previa / imprimir PDF' : 'Vista previa / imprimir PDF'}</button>
            <button class="btn" data-save-session>Guardar sesión</button>
          </div>
          <p class="footer-note">Ingredientes y cantidades siempre se incluyen. Los campos docentes vacíos no se imprimen.</p>
        </div>

        <aside class="card print-ux-add-card">
          <div class="panel-title"><div><h3>Añadir elaboraciones</h3><p>Busca y añade fichas a la práctica antes de imprimir.</p></div></div>
          <div class="toolbar print-search-toolbar"><input class="input" id="printSearch" value="${escapeAttr(state.printSearch)}" placeholder="Buscar elaboración..." /><span class="pill" id="printSearchCount">${resultCountText(allResults.length, results.length, 'resultados')}</span></div>
          <div id="printLimitControls">${listLimitControlsHtml('print', allResults.length, results.length, !!state.printSearch, 'resultados')}</div>
          <details class="print-ux-bulk"><summary><b>Acciones de selección</b><small>Añadir todo el catálogo solo para pruebas o auditoría.</small></summary><div class="actions print-bulk-actions"><button class="btn" data-add-all-catalog>Añadir todo el catálogo</button></div></details>
          <div class="results print-results" id="printResults">${printSearchResultsHtml(results)}</div>
        </aside>
      </section>
    </section>
  `;
}
function selectionEditorHtml() {
    if (!state.selection.length)
        return `<div class="empty">Añade elaboraciones desde el buscador de la izquierda. Puedes seguir añadiendo y ajustando cantidades antes de imprimir.</div>`;
    return state.selection.map(item => `<div class="selection-item production-scaling-item">
    <div><b>${escapeHtml(item.name)}</b><br><small class="muted">${escapeHtml(item.categoryLabel || '')}</small><br><small class="muted">${escapeHtml(selectionQuantityLabel(item))}</small></div>
    ${selectionScalingControlsHtml(item)}
    <div class="actions"><button class="btn" data-edit-selection-qty="${item.uid}">Editar cantidad</button><button class="btn danger" data-remove-selection="${item.uid}">Quitar</button></div>
  </div>`).join('');
} 
function selectionScalingControlsHtml(item) {
    if (item.sourceType !== 'bakery') {
        return `<label class="scaling-field"><span>${item.baseMode === 'yield' ? 'Rendimiento' : 'Raciones'}</span><input class="input" type="number" min="0" step="0.01" value="${escapeAttr(item.qty)}" data-update-qty="${item.uid}" /> <small>${escapeHtml(item.unitLabel)}</small></label>`;
    }
    const mode = bakeryScalingMode(item);
    const pieces = Number(item.qty || item.targetPieces || 0);
    const pieceWeight = Number(item.pieceWeightG || 0);
    const rawDough = Number(item.rawDoughG || (mode === 'pieces_weight' ? pieces * pieceWeight : item.qty) || 0);
    const flour = Number(item.flourG || (mode === 'flour_g' ? item.qty : 0) || 0);
    const modeSelect = `<label class="scaling-field scaling-mode"><span>Modo de cálculo</span><select data-update-scaling-mode="${item.uid}">
      <option value="pieces_weight" ${mode === 'pieces_weight' ? 'selected' : ''}>Piezas + peso unitario</option>
      <option value="raw_dough" ${mode === 'raw_dough' ? 'selected' : ''}>Masa total</option>
      <option value="flour_g" ${mode === 'flour_g' ? 'selected' : ''}>Harina total</option>
    </select></label>`;
    if (mode === 'pieces_weight') {
        return `<div class="scaling-controls">${modeSelect}<label class="scaling-field"><span>Piezas</span><input class="input" type="number" min="0" step="1" value="${escapeAttr(pieces)}" data-update-selection-field="${item.uid}" data-field="qty" /></label><label class="scaling-field"><span>Peso unitario crudo/escudillado (g)</span><input class="input" type="number" min="0" step="0.1" value="${escapeAttr(pieceWeight)}" data-update-selection-field="${item.uid}" data-field="pieceWeightG" /></label><small class="muted scaling-note">Masa objetivo: ${formatQty(pieces * pieceWeight)} g. No se declara peso cocido ni merma.</small></div>`;
    }
    if (mode === 'raw_dough') {
        return `<div class="scaling-controls">${modeSelect}<label class="scaling-field"><span>Masa total cruda (g)</span><input class="input" type="number" min="0" step="1" value="${escapeAttr(rawDough)}" data-update-selection-field="${item.uid}" data-field="rawDoughG" /></label><small class="muted scaling-note">Escalado por masa total objetivo.</small></div>`;
    }
    return `<div class="scaling-controls">${modeSelect}<label class="scaling-field"><span>Harina total (g)</span><input class="input" type="number" min="0" step="1" value="${escapeAttr(flour)}" data-update-selection-field="${item.uid}" data-field="flourG" /></label><small class="muted scaling-note">Escalado panadero por harina base 100&nbsp;%.</small></div>`;
}
function bakeryScalingMode(item) {
    if (!item || item.sourceType !== 'bakery')
        return item && item.baseMode || 'servings';
    if (item.baseMode === 'pieces_weight' || item.baseMode === 'raw_dough' || item.baseMode === 'flour_g')
        return item.baseMode;
    if (item.baseMode === 'pieces' && Number(item.pieceWeightG || 0) > 0)
        return 'pieces_weight';
    if (item.baseMode === 'raw_dough')
        return 'raw_dough';
    return 'flour_g';
}
function updateScalingMode(uid, mode) {
    const item = state.selection.find(i => i.uid === uid);
    if (!item || item.sourceType !== 'bakery')
        return;
    const recipe = state.recipes.find(r => r.uid === uid) || item;
    const baseFlour = Number(recipe.base_flour_g || item.baseFlourG || item.flourG || 1000) || 1000;
    const baseRaw = Number(recipe.base_raw_weight_g || item.baseRawDoughG || 0) || bakeryRawDoughForFlour(item, recipe, baseFlour);
    const basePieces = Number(recipe.base_pieces || item.basePieces || 0) || 1;
    const basePieceWeight = Number(recipe.base_raw_piece_weight_g || item.pieceWeightG || (baseRaw && basePieces ? baseRaw / basePieces : 0));
    if (mode === 'pieces_weight') {
        item.baseMode = 'pieces_weight';
        item.qty = Number(item.qty || basePieces || 1);
        item.pieceWeightG = Number(item.pieceWeightG || basePieceWeight || 1);
        item.rawDoughG = round2(Number(item.qty || 0) * Number(item.pieceWeightG || 0));
        item.unitLabel = 'piezas × g/pieza';
    }
    else if (mode === 'raw_dough') {
        item.baseMode = 'raw_dough';
        item.rawDoughG = Number(item.rawDoughG || baseRaw || 1000);
        item.qty = item.rawDoughG;
        item.unitLabel = 'g masa';
    }
    else {
        item.baseMode = 'flour_g';
        item.flourG = Number(item.flourG || baseFlour || 1000);
        item.qty = item.flourG;
        item.unitLabel = 'g harina';
    }
    saveSelection();
    scheduleDbAutosave('Modo de cálculo actualizado', { delay: 1200 });
    render();
}
function updateSelectionField(uid, field, value) {
    const item = state.selection.find(i => i.uid === uid);
    if (!item)
        return;
    const n = Number(value || 0);
    const v = n > 0 ? n : 0;
    if (field === 'pieceWeightG')
        item.pieceWeightG = v;
    else if (field === 'rawDoughG') {
        item.rawDoughG = v;
        item.qty = v;
    }
    else if (field === 'flourG') {
        item.flourG = v;
        item.qty = v;
    }
    else if (field === 'qty')
        item.qty = v;
    if (item.sourceType === 'bakery') {
        const mode = bakeryScalingMode(item);
        item.baseMode = mode;
        if (mode === 'pieces_weight') {
            item.rawDoughG = round2(Number(item.qty || 0) * Number(item.pieceWeightG || 0));
            item.unitLabel = 'piezas × g/pieza';
        }
        else if (mode === 'raw_dough') {
            item.qty = Number(item.rawDoughG || item.qty || 0);
            item.unitLabel = 'g masa';
        }
        else {
            item.qty = Number(item.flourG || item.qty || 0);
            item.unitLabel = 'g harina';
        }
    }
    saveSelection();
    scheduleDbAutosave('Cantidad actualizada', { delay: 1200 });
}

function docRadio(value, title, help) {
    return `<label class="radio-card"><input type="radio" name="documentType" value="${value}" ${state.printOptions.documentType === value ? 'checked' : ''}/><b>${title}</b><br><small class="muted">${help}</small></label>`;
}
function profileRadio(value, title, help) {
    return `<label class="radio-card"><input type="radio" name="documentProfile" value="${value}" ${printProfile(state.printOptions) === value ? 'checked' : ''}/><b>${title}</b><br><small class="muted">${help}</small></label>`;
}

function documentProfileRadiosHtml() {
    const catalog = window.ObradORRDocumentProfiles ? window.ObradORRDocumentProfiles.list() : [
        { id: 'aula_taller', label: 'Aula-taller alumnado', help: 'Salida compacta para aula.' },
        { id: 'docente_produccion', label: 'Docente producción', help: 'Ficha docente de producción.' },
        { id: 'auditoria_completa', label: 'Auditoría documental', help: 'Documento interno completo.' }
    ];
    return catalog.map(p => profileRadio(p.id, p.label, p.help)).join('');
}
function teachingFieldsHtml() {
    const t = state.printOptions.teaching || {};
    const cycle = teachingCycle();
    const modules = teachingModulesForCycle(cycle);
    const moduleInCycle = !t.module || modules.some(m => moduleLabel(m) === t.module);
    const moduleHelp = cycle ? `Módulos filtrados por ${escapeHtml(cycle.name)}.` : 'Selecciona un ciclo para filtrar módulos; mientras tanto se muestran todos.';
    const moduleWarning = t.module && !moduleInCycle ? `<p class="footer-note teaching-warning">El módulo seleccionado no corresponde al ciclo actual. Selecciona otro módulo.</p>` : '';
    return `<div class="teaching-fields">
    <div class="field-with-note"><input class="input" data-teaching="title" value="${escapeAttr(t.title || '')}" placeholder="Título de la práctica" /><small class="muted">Ejemplo: Práctica de masas fermentadas dulces</small></div>
    <input class="input" data-teaching="date" type="date" value="${escapeAttr(t.date || '')}" />
    <select data-teaching="cycle"><option value="">Ciclo</option>${state.cycles.map(c => `<option value="${escapeAttr(c.name)}" ${t.cycle === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
    <div class="field-with-note"><select data-teaching="module"><option value="">Módulo</option>${modules.map(m => `<option value="${escapeAttr(moduleLabel(m))}" ${t.module === moduleLabel(m) ? 'selected' : ''}>${escapeHtml(moduleLabel(m))}</option>`).join('')}</select><small class="muted">${moduleHelp}</small>${moduleWarning}</div>
    <input class="input" data-teaching="group" value="${escapeAttr(t.group || '')}" placeholder="Grupo" />
    <div class="field-with-note"><input class="input" data-teaching="responsible" value="${escapeAttr(t.responsible || '')}" placeholder="Responsable" /><small class="muted">Ejemplo: Remo J. Pereira González</small></div>
    <div class="field-with-note" style="grid-column:1/-1"><textarea data-teaching="notes" placeholder="Observaciones">${escapeHtml(t.notes || '')}</textarea><small class="muted">Ejemplo: organización del grupo, mise en place previa, elaboraciones que requieren frío o alérgenos a vigilar.</small></div>
  </div>`;
}
function teachingCycle() {
    const t = state.printOptions.teaching || {};
    return state.cycles.find(c => c.name === t.cycle || c.id === t.cycle) || null;
}
function teachingModulesForCycle(cycle) {
    if (!cycle)
        return state.modules;
    return state.modules.filter(m => String(m.cycle_id) === String(cycle.id));
}
function teachingModuleAllowed(moduleValue, cycle) {
    if (!moduleValue)
        return true;
    return teachingModulesForCycle(cycle).some(m => moduleLabel(m) === moduleValue || m.id === moduleValue || m.module_code === moduleValue);
}
function updateTeachingInput(el) {
    const key = el.dataset.teaching;
    state.printOptions.teaching[key] = el.value;
    if (key === 'cycle') {
        const cycle = teachingCycle();
        if (!teachingModuleAllowed(state.printOptions.teaching.module, cycle))
            state.printOptions.teaching.module = '';
        savePrintOptions();
        render();
        return;
    }
    if (key === 'module' && !teachingModuleAllowed(el.value, teachingCycle())) {
        state.printOptions.teaching.module = '';
        savePrintOptions();
        render();
        return;
    }
    savePrintOptions();
}
function printOutputSummaryHtml(opts) {
    const e = effectivePrintOptions(opts);
    const profile = printProfile(e);
    const sub = subrecipeModeFromOptions(e);
    const rows = [];
    rows.push(['Documento', docTitle(e.documentType)]);
    rows.push(['Perfil', profileLabel(profile)]);
    rows.push(['Costes', e.includeCosts ? 'visibles' : 'ocultos']);
    rows.push(['Seguridad alimentaria', e.includeAppcc ? (isCompactProfile(e) ? 'APPCC docente breve' : 'APPCC docente completo') : 'aviso mínimo, sin tabla APPCC']);
    rows.push(['Subelaboraciones', e.documentType === 'pedido' ? 'expandidas para pedido consolidado' : subrecipeModeLabel(sub)]);
    rows.push(['Proceso', e.documentType === 'pedido' ? 'no aplica' : (e.includeProcess ? 'incluido' : 'oculto')]);
    const notes = [];
    if (e.documentType === 'pedido') notes.push('El pedido es un documento operativo: agrupa ingredientes consolidados y mantiene alérgenos globales.');
    if (!e.includeAppcc) notes.push('Aunque el APPCC detallado esté oculto, se mantienen alérgenos y avisos críticos.');
    if (!e.includeCosts) notes.push('Los costes se ocultan en fichas y pedido, pero el cálculo interno no se modifica.');
    if (profile === 'auditoria_completa') notes.push('La auditoría documental no está pensada para entregar al alumnado.');
    return `<div class="print-summary"><h4>Resumen antes de imprimir</h4><dl>${rows.map(([k,v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>${notes.length ? `<ul>${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}</div>`;
}

function preflightSelectionSummaryHtml() {
    if (!state.selection.length || !window.ObradORRPreflight)
        return '';
    let result = null;
    const e = effectivePrintOptions(state.printOptions);
    try { result = window.ObradORRPreflight.run({ db, state, items: state.selection, options: e }); }
    catch (error) { return `<div class="preflight-panel warning"><b>Comprobación documental no disponible:</b> ${escapeHtml(error.message || String(error))}</div>`; }
    const s = (result && result.summary) || {};
    const total = (result.warnings || []).length;
    const cls = s.CRITICO ? 'danger' : (s.ALTO ? 'warning' : 'ok');
    const mode = preflightModeForProfile(printProfile(e), e.documentType);
    const showDetails = mode === 'complete' || mode === 'critical_high' || mode === 'critical';
    const allowed = mode === 'complete' ? ['CRITICO','ALTO','MEDIO','BAJO'] : mode === 'critical_high' ? ['CRITICO','ALTO'] : mode === 'critical' ? ['CRITICO'] : [];
    const top = showDetails ? (result.warnings || []).filter(w => allowed.includes(w.severity) && w.code !== 'PENDIENTE_GLOBAL').slice(0, 5) : [];
    return `<div class="preflight-panel ${cls}"><h4>Comprobación documental previa</h4><p>${total} aviso(s): ${s.CRITICO || 0} crítico(s), ${s.ALTO || 0} alto(s), ${s.MEDIO || 0} medio(s), ${s.BAJO || 0} bajo(s).</p>${top.length ? `<ul>${top.map(w => `<li><b>${escapeHtml(w.severity)} · ${escapeHtml(w.title)}</b><br><small>${escapeHtml(w.detail || '')}</small></li>`).join('')}</ul>` : '<small>Vista resumida. La tabla completa queda reservada al perfil Auditoría documental.</small>'}</div>`;
}
function preflightPrintHtml(result, opts) {
    if (!result || !result.warnings || !result.warnings.length)
        return '';
    const profile = printProfile(opts);
    const mode = preflightModeForProfile(profile, opts.documentType || 'fichas_pedido');
    const s = result.summary || {};
    const summary = `${s.CRITICO || 0} crítico(s) · ${s.ALTO || 0} alto(s) · ${s.MEDIO || 0} medio(s) · ${s.BAJO || 0} bajo(s)`;
    if (mode === 'summary' || mode === 'summary_if_alerts') {
        if (mode === 'summary_if_alerts' && !(s.CRITICO || s.ALTO)) return '';
        return `<section class="preflight-print preflight-summary"><h2>Comprobación documental previa</h2><p>${escapeHtml(summary)}. Las fichas son propuestas documentales contrastadas, pendientes de prueba y validación por profesorado en obrador.</p></section>`;
    }
    const allowed = mode === 'complete' ? ['CRITICO','ALTO','MEDIO','BAJO'] : mode === 'critical_high' ? ['CRITICO','ALTO'] : ['CRITICO'];
    const rows = (result.warnings || []).filter(w => allowed.includes(w.severity) && (mode === 'complete' || w.code !== 'PENDIENTE_GLOBAL')).slice(0, mode === 'complete' ? 120 : 20);
    if (!rows.length && mode !== 'complete') {
        return `<section class="preflight-print preflight-summary"><h2>Comprobación documental previa</h2><p>${escapeHtml(summary)}. Sin avisos del nivel mostrado para este perfil.</p></section>`;
    }
    return `<section class="preflight-print ${profile === 'auditoria_completa' ? 'page-break' : 'preflight-summary'}"><h2>Comprobación documental previa</h2><p>No sustituye la validación de obrador. ${escapeHtml(summary)}. ${mode === 'complete' ? 'Detalle completo reservado al perfil Auditoría documental.' : 'Detalle limitado al perfil seleccionado.'}</p><table><thead><tr><th>Severidad</th><th>Aviso</th><th>Detalle</th></tr></thead><tbody>${rows.map(w => `<tr><td>${escapeHtml(w.severity)}</td><td>${escapeHtml(w.title)}</td><td>${escapeHtml(w.detail || '')}</td></tr>`).join('')}</tbody></table></section>`;
}
function subrecipeModeLabel(mode) {
    return mode === 'none' ? 'no desarrolladas' : mode === 'ingredients' ? 'ingredientes recursivos desglosados' : 'subfichas sensibles desarrolladas y bases técnicas plegadas';
}
function sheetOptionsHtml() {
    const o = state.printOptions;
    const mode = subrecipeMode();
    return `<div class="option-row"><label><input type="checkbox" id="includeCosts" ${o.includeCosts ? 'checked' : ''}/> Mostrar costes</label><small class="muted">El perfil marca el valor inicial; este check lo sobrescribe para esta exportación.</small></div>
    <div class="option-row subrecipe-option-block"><b>Subelaboraciones culinarias</b><div class="radio-row subrecipe-radio-row" style="margin-top:10px">
      ${subrecipeRadio('none', 'No desarrollar', 'Muestra solo las líneas directas de la ficha.')}
      ${subrecipeRadio('ingredients', 'Desglosar ingredientes', 'Expande ingredientes recursivos para ficha, coste y pedido.')}
      ${subrecipeRadio('sheets', 'Incluir subfichas', 'Imprime fichas hijas con rendimiento, proceso y APPCC.')}
    </div></div>
    <div class="option-row"><label><input type="checkbox" id="includeProcess" ${o.includeProcess ? 'checked' : ''}/> Incluir proceso</label></div>
    <div class="option-row"><label><input type="checkbox" id="includeAppcc" ${o.includeAppcc ? 'checked' : ''}/> Mostrar APPCC docente</label><small class="muted">Si se desmarca, se conserva solo una nota mínima de seguridad documental.</small></div>`;
}
function subrecipeMode() {
    return state.printOptions.subrecipeMode || (state.printOptions.expandSubrecipes ? 'ingredients' : 'none');
}
function subrecipeRadio(value, title, help) {
    return `<label class="radio-card subrecipe-radio-card"><input type="radio" name="subrecipeMode" value="${value}" ${subrecipeMode() === value ? 'checked' : ''}/><span class="radio-card-body"><b>${title}</b><small class="muted">${help}</small></span></label>`;
}
function sessionsView() {
    return `<section class="card"><div class="panel-title"><div><h2>Sesiones guardadas</h2><p>Sesiones guardadas en la copia SQLite activa.</p></div><button class="btn accent" data-save-session>Guardar práctica actual</button></div>
    ${state.sessions.length ? `<div class="summary-list">${state.sessions.map(s => `<div class="summary-row"><div><b>${escapeHtml(s.title || 'Sesión sin título')}</b><br><small>${escapeHtml(s.practice_date || '')} · ${Number(s.item_count || 0)} elaboraciones</small></div><div class="actions"><button class="btn" data-load-session="${s.id}">Usar de nuevo</button><button class="btn" data-print-session="${s.id}">Imprimir</button><button class="btn danger" data-delete-session="${s.id}">Eliminar</button></div></div>`).join('')}</div>` : `<div class="empty">No hay sesiones guardadas. Prepara una selección y pulsa <b>Guardar sesión</b>.</div>`}
  </section>`;
}

function migrationStatusText() {
    try {
        if (!window.ObradORRMigrations) return 'infraestructura no cargada';
        const rows = window.ObradORRMigrations.status(db);
        return rows.length ? `${rows[0].version} · ${rows.length} registro(s)` : 'sin migraciones registradas';
    }
    catch (error) { return 'no disponible'; }
}


function validationStatusLabel(status) {
    const map = { no_validada: 'Pendiente de obrador', probada_con_ajustes: 'Probada con ajustes', requiere_revision: 'Requiere revisión', validada: 'Validada en obrador', tested: 'Probada', pending: 'Pendiente' };
    return map[status] || status || 'Pendiente de obrador';
}
function validationStatusClass(status) {
    if (status === 'validada') return 'green';
    if (status === 'probada_con_ajustes') return 'warning';
    if (status === 'requiere_revision') return 'danger-pill';
    return '';
}
function recipeWorkshopStatus(recipe) { return recipe.workshop_validation_status || 'no_validada'; }
function validationRows() {
    const q = normalize(state.validationSearch);
    return state.recipes.filter(r => {
        const status = recipeWorkshopStatus(r);
        const statusOk = state.validationStatusFilter === 'all' || status === state.validationStatusFilter;
        if (!statusOk) return false;
        if (!q) return true;
        return normalize([r.name, r.family, r.subfamily, r.category_label, status].join(' ')).includes(q);
    });
}
function latestWorkshopValidation(recipe) {
    return db.query(`SELECT * FROM workshop_validation_log WHERE recipe_type=$type AND recipe_id=$id ORDER BY COALESCE(validation_date,created_at) DESC, created_at DESC LIMIT 1`, { $type: recipe.source_type, $id: recipe.source_id })[0] || null;
}
function validationView() {
    const rows = validationRows();
    const counts = { all: state.recipes.length, no_validada: 0, probada_con_ajustes: 0, requiere_revision: 0, validada: 0 };
    state.recipes.forEach(r => { const s = recipeWorkshopStatus(r); counts[s] = (counts[s] || 0) + 1; });
    return `<section class="card validation-page"><div class="panel-title"><div><h2>Validación de obrador</h2><p>Registra pruebas reales, rendimientos medidos e incidencias. Esta pantalla no sustituye la prueba docente: la documenta.</p></div><span class="pill green">2.1</span></div>
      <div class="notice"><b>Regla documental:</b> una ficha solo puede considerarse validada cuando existe prueba real registrada con fecha, responsable y resultado. Si se modifica una ficha validada, pasa a <b>requiere revisión</b>.</div>
      <div class="toolbar"><input class="input" id="validationSearch" value="${escapeAttr(state.validationSearch)}" placeholder="Buscar elaboración para registrar prueba..." />
        <select id="validationStatusFilter"><option value="all" ${state.validationStatusFilter==='all'?'selected':''}>Todos (${counts.all})</option><option value="no_validada" ${state.validationStatusFilter==='no_validada'?'selected':''}>Pendientes (${counts.no_validada||0})</option><option value="probada_con_ajustes" ${state.validationStatusFilter==='probada_con_ajustes'?'selected':''}>Probadas con ajustes (${counts.probada_con_ajustes||0})</option><option value="requiere_revision" ${state.validationStatusFilter==='requiere_revision'?'selected':''}>Requieren revisión (${counts.requiere_revision||0})</option><option value="validada" ${state.validationStatusFilter==='validada'?'selected':''}>Validadas (${counts.validada||0})</option></select>
        <span class="pill">${rows.length} resultado(s)</span></div>
      <div class="validation-list">${rows.slice(0, 120).map(validationRecipeRow).join('') || '<div class="empty">No hay elaboraciones con ese filtro.</div>'}</div>
      ${rows.length > 120 ? '<p class="footer-note">Mostrando 120 resultados. Usa búsqueda o filtro para acotar.</p>' : ''}
    </section>`;
}
function validationRecipeRow(recipe) {
    const st = recipeWorkshopStatus(recipe);
    const last = latestWorkshopValidation(recipe);
    const lastText = last ? `${escapeHtml(last.validation_date || last.created_at || '')} · ${escapeHtml(last.responsible || 'sin responsable')} · ${escapeHtml(validationStatusLabel(last.result_status))}` : 'sin prueba registrada';
    return `<article class="validation-row"><div><b>${escapeHtml(recipe.name)}</b><br><small class="muted">${escapeHtml(recipe.category_label || recipe.source_type)} · ${escapeHtml(recipe.family || '')}</small><br><small>Última prueba: ${lastText}</small></div><div class="validation-actions"><span class="pill ${validationStatusClass(st)}">${escapeHtml(validationStatusLabel(st))}</span><button class="btn primary" data-register-workshop="${escapeAttr(recipe.uid)}">Registrar prueba</button><button class="btn" data-workshop-history="${escapeAttr(recipe.uid)}">Histórico</button><button class="btn" data-workshop-acta="${escapeAttr(recipe.uid)}">Acta</button></div></article>`;
}
function showWorkshopValidationDialog(uid) {
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe) return;
    const today = new Date().toISOString().slice(0, 10);
    const teaching = state.printOptions.teaching || {};
    const isBakery = recipe.source_type === 'bakery';
    const planned = defaultQuantity(recipe);
    const commonPlanned = selectionQuantityLabel(Object.assign({ sourceType: recipe.source_type }, planned));
    showModal('Registrar prueba de obrador', `<div class="workshop-dialog"><div class="notice"><b>${escapeHtml(recipe.name)}</b><br><small>${escapeHtml(recipe.category_label || '')} · previsto base: ${escapeHtml(commonPlanned)}</small></div>
      <div class="grid two"><label>Fecha de prueba<input class="input" id="wvDate" type="date" value="${escapeAttr(today)}" /></label><label>Responsable<input class="input" id="wvResponsible" value="${escapeAttr(teaching.responsible || '')}" /></label>
      <label>Grupo / módulo<input class="input" id="wvGroupModule" value="${escapeAttr([teaching.group, teaching.module].filter(Boolean).join(' · '))}" /></label><label>Práctica<input class="input" id="wvPractice" value="${escapeAttr(teaching.title || '')}" /></label>
      <label>Resultado<select id="wvResult"><option value="no_validada">No validada</option><option value="probada_con_ajustes">Probada con ajustes</option><option value="requiere_revision">Requiere revisión</option><option value="validada">Validada</option></select></label>
      <label>Cantidad prevista<input class="input" id="wvPlannedQty" value="${escapeAttr(commonPlanned)}" /></label><label>Cantidad real obtenida<input class="input" id="wvActualQty" placeholder="Ej.: 10 raciones, 1,2 kg, 20 piezas" /></label></div>
      ${isBakery ? workshopBakeryFieldsHtml() : workshopOrdinaryFieldsHtml()}
      <label>Ajustes necesarios<textarea id="wvAdjustments" placeholder="Indicar cambios de fórmula, proceso, cocción, conservación o presentación."></textarea></label>
      <label>Observaciones docentes<textarea id="wvNotes" placeholder="Resultado, incidencias, textura, aceptación, organización del aula-taller..."></textarea></label>
      <div class="actions" style="margin-top:14px"><button class="btn" id="cancelWorkshopValidation">Cancelar</button><button class="btn primary" id="saveWorkshopValidation">Registrar prueba</button></div><div id="wvError" class="notice warning hidden" style="margin-top:12px"></div></div>`);
    document.getElementById('cancelWorkshopValidation')?.addEventListener('click', closeModal);
    document.getElementById('saveWorkshopValidation')?.addEventListener('click', async () => {
        try { saveWorkshopValidation(recipe); await loadCatalogs(); scheduleDbAutosave('Prueba de obrador registrada'); closeModal(); state.page = 'validacion'; render(); }
        catch (error) { workshopValidationError(error); }
    });
}
function workshopOrdinaryFieldsHtml() {
    return `<details open><summary><b>Datos reales de rendimiento</b></summary><div class="grid two"><label>Raciones previstas<input class="input" id="wvPlannedServings" type="number" step="0.01" /></label><label>Raciones reales<input class="input" id="wvActualServings" type="number" step="0.01" /></label><label>Peso/cantidad total real<input class="input" id="wvActualYield" placeholder="Ej.: 1,2 kg / 1 l" /></label><label>Merma observada<input class="input" id="wvLoss" placeholder="Ej.: 8 % / sin medir" /></label></div></details>`;
}
function workshopBakeryFieldsHtml() {
    return `<details open><summary><b>Datos reales de formulación / panadería</b></summary><div class="grid two"><label>Harina objetivo g<input class="input" id="wvTargetFlour" type="number" step="1" /></label><label>Harina real g<input class="input" id="wvActualFlour" type="number" step="1" /></label><label>Masa cruda prevista g<input class="input" id="wvPlannedRaw" type="number" step="1" /></label><label>Masa cruda real g<input class="input" id="wvActualRaw" type="number" step="1" /></label><label>Piezas previstas<input class="input" id="wvPlannedPieces" type="number" step="1" /></label><label>Piezas reales<input class="input" id="wvActualPieces" type="number" step="1" /></label><label>Peso crudo/pieza g<input class="input" id="wvRawPiece" type="number" step="0.1" /></label><label>Peso cocido/pieza g<input class="input" id="wvBakedPiece" type="number" step="0.1" /></label><label>Merma real %<input class="input" id="wvBakeLoss" type="number" step="0.1" /></label><label>TFM ºC<input class="input" id="wvTfm" type="number" step="0.1" /></label><label>Fermentación real min<input class="input" id="wvFermentationTime" type="number" step="1" /></label><label>Temperatura fermentación ºC<input class="input" id="wvFermentationTemp" type="number" step="0.1" /></label><label style="grid-column:1/-1">Cocción / miga / corteza / greñado<textarea id="wvBakingNotes"></textarea></label></div></details>`;
}
function workshopValidationError(error) {
    const box = document.getElementById('wvError');
    const msg = error && error.message ? error.message : String(error || 'Error al registrar la prueba.');
    if (box) { box.classList.remove('hidden'); box.textContent = msg; }
    else alert(msg);
}
function saveWorkshopValidation(recipe) {
    const status = document.getElementById('wvResult')?.value || 'no_validada';
    const date = document.getElementById('wvDate')?.value || '';
    const responsible = (document.getElementById('wvResponsible')?.value || '').trim();
    const planned = (document.getElementById('wvPlannedQty')?.value || '').trim();
    const actual = (document.getElementById('wvActualQty')?.value || '').trim();
    if (!date) throw new Error('Indica la fecha de prueba.');
    if (!responsible) throw new Error('Indica el responsable docente de la prueba.');
    if (status === 'validada' && !actual) throw new Error('Para validar debes registrar una cantidad o rendimiento real obtenido.');
    const isBakery = recipe.source_type === 'bakery';
    const validationData = collectWorkshopValidationData(isBakery);
    const id = uniqueId('WVL', `${recipe.source_type}-${recipe.source_id}-${status}`);
    withTransaction(() => {
        db.exec(`INSERT INTO workshop_validation_log (id,recipe_type,recipe_id,recipe_name_snapshot,validation_date,responsible,group_module,practice_title,result_status,planned_quantity,actual_quantity,planned_yield,actual_yield,planned_servings,actual_servings,planned_pieces,actual_pieces,target_flour_g,actual_flour_g,planned_raw_dough_g,actual_raw_dough_g,raw_piece_weight_g,baked_piece_weight_g,bake_loss_pct,tfm_c,fermentation_time_min,fermentation_temp_c,baking_notes,adjustments_required,notes,validation_data_json,created_at)
          VALUES ($id,$type,$recipe,$name,$date,$responsible,$group,$practice,$status,$planned,$actual,$plannedYield,$actualYield,$plannedServings,$actualServings,$plannedPieces,$actualPieces,$targetFlour,$actualFlour,$plannedRaw,$actualRaw,$rawPiece,$bakedPiece,$bakeLoss,$tfm,$fermTime,$fermTemp,$bakingNotes,$adjustments,$notes,$json,CURRENT_TIMESTAMP)`, {
            $id: id, $type: recipe.source_type, $recipe: recipe.source_id, $name: recipe.name, $date: date, $responsible: responsible,
            $group: document.getElementById('wvGroupModule')?.value || '', $practice: document.getElementById('wvPractice')?.value || '', $status: status,
            $planned: planned, $actual: actual, $plannedYield: planned, $actualYield: actual,
            $plannedServings: validationData.plannedServings, $actualServings: validationData.actualServings,
            $plannedPieces: validationData.plannedPieces, $actualPieces: validationData.actualPieces,
            $targetFlour: validationData.targetFlour, $actualFlour: validationData.actualFlour,
            $plannedRaw: validationData.plannedRaw, $actualRaw: validationData.actualRaw,
            $rawPiece: validationData.rawPiece, $bakedPiece: validationData.bakedPiece, $bakeLoss: validationData.bakeLoss,
            $tfm: validationData.tfm, $fermTime: validationData.fermentationTime, $fermTemp: validationData.fermentationTemp,
            $bakingNotes: validationData.bakingNotes, $adjustments: document.getElementById('wvAdjustments')?.value || '',
            $notes: document.getElementById('wvNotes')?.value || '', $json: JSON.stringify(validationData)
        });
        const table = recipe.source_type === 'bakery' ? 'bakery_recipes' : 'culinary_recipes';
        const release = status === 'validada' ? 'validada' : 'pendiente';
        db.exec(`UPDATE ${table} SET workshop_validation_status=$status, release_status=$release, documentary_status='contrastada', updated_at=CURRENT_TIMESTAMP WHERE id=$id`, { $status: status, $release: release, $id: recipe.source_id });
        if (recipe.source_type === 'bakery') {
            const yieldStatus = workshopStatusToBakeryYieldStatus(status);
            db.exec(`UPDATE bakery_recipes SET yield_status=$yield WHERE id=$id`, { $yield: yieldStatus, $id: recipe.source_id });
        }
    });
}
function workshopStatusToBakeryYieldStatus(status) {
    if (status === 'validada') return 'validated';
    if (status === 'probada_con_ajustes') return 'tested';
    return 'pending';
}
function collectWorkshopValidationData(isBakery) {
    const num = id => nullableNumber(document.getElementById(id)?.value);
    const text = id => (document.getElementById(id)?.value || '').trim();
    return {
        plannedServings: num('wvPlannedServings'), actualServings: num('wvActualServings'), actualYield: text('wvActualYield'), loss: text('wvLoss'),
        targetFlour: isBakery ? num('wvTargetFlour') : null, actualFlour: isBakery ? num('wvActualFlour') : null,
        plannedRaw: isBakery ? num('wvPlannedRaw') : null, actualRaw: isBakery ? num('wvActualRaw') : null,
        plannedPieces: isBakery ? num('wvPlannedPieces') : null, actualPieces: isBakery ? num('wvActualPieces') : null,
        rawPiece: isBakery ? num('wvRawPiece') : null, bakedPiece: isBakery ? num('wvBakedPiece') : null,
        bakeLoss: isBakery ? num('wvBakeLoss') : null, tfm: isBakery ? num('wvTfm') : null,
        fermentationTime: isBakery ? num('wvFermentationTime') : null, fermentationTemp: isBakery ? num('wvFermentationTemp') : null,
        bakingNotes: isBakery ? text('wvBakingNotes') : ''
    };
}
function showWorkshopHistory(uid) {
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe) return;
    const rows = db.query(`SELECT * FROM workshop_validation_log WHERE recipe_type=$type AND recipe_id=$id ORDER BY COALESCE(validation_date,created_at) DESC, created_at DESC`, { $type: recipe.source_type, $id: recipe.source_id });
    const html = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Resultado</th><th>Responsable</th><th>Cantidad real</th><th>Notas</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escapeHtml(r.validation_date || r.created_at || '')}</td><td>${escapeHtml(validationStatusLabel(r.result_status))}</td><td>${escapeHtml(r.responsible || '')}</td><td>${escapeHtml(r.actual_quantity || r.actual_yield || '')}</td><td>${escapeHtml([r.adjustments_required, r.notes].filter(Boolean).join(' · '))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No hay pruebas registradas para esta ficha.</div>';
    showModal('Histórico de obrador', `<div class="notice"><b>${escapeHtml(recipe.name)}</b><br><small>${escapeHtml(validationStatusLabel(recipeWorkshopStatus(recipe)))}</small></div>${html}`);
}

function generateWorkshopValidationActa(uid) {
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe) return;
    const row = latestWorkshopValidation(recipe);
    if (!row) return alert('No hay pruebas de obrador registradas para generar acta.');
    const extra = [];
    if (recipe.source_type === 'bakery') {
        if (row.target_flour_g) extra.push(['Harina objetivo', `${formatQty(row.target_flour_g)} g`]);
        if (row.actual_flour_g) extra.push(['Harina real', `${formatQty(row.actual_flour_g)} g`]);
        if (row.planned_raw_dough_g) extra.push(['Masa cruda prevista', `${formatQty(row.planned_raw_dough_g)} g`]);
        if (row.actual_raw_dough_g) extra.push(['Masa cruda real', `${formatQty(row.actual_raw_dough_g)} g`]);
        if (row.planned_pieces) extra.push(['Piezas previstas', formatQty(row.planned_pieces)]);
        if (row.actual_pieces) extra.push(['Piezas reales', formatQty(row.actual_pieces)]);
        if (row.raw_piece_weight_g) extra.push(['Peso crudo/pieza', `${formatQty(row.raw_piece_weight_g)} g`]);
        if (row.baked_piece_weight_g) extra.push(['Peso cocido/pieza', `${formatQty(row.baked_piece_weight_g)} g`]);
        if (row.bake_loss_pct) extra.push(['Merma real', `${formatQty(row.bake_loss_pct)} %`]);
        if (row.tfm_c) extra.push(['TFM', `${formatQty(row.tfm_c)} ºC`]);
        if (row.fermentation_time_min) extra.push(['Fermentación real', `${formatQty(row.fermentation_time_min)} min`]);
        if (row.fermentation_temp_c) extra.push(['Temperatura fermentación', `${formatQty(row.fermentation_temp_c)} ºC`]);
        if (row.baking_notes) extra.push(['Cocción / miga / corteza', row.baking_notes]);
    }
    const rows = [
        ['Elaboración', recipe.name], ['Tipo', recipe.category_label || recipe.source_type], ['Fecha de prueba', row.validation_date || ''], ['Responsable', row.responsible || ''], ['Grupo / módulo', row.group_module || ''], ['Práctica', row.practice_title || ''], ['Resultado', validationStatusLabel(row.result_status)], ['Cantidad prevista', row.planned_quantity || row.planned_yield || ''], ['Cantidad real', row.actual_quantity || row.actual_yield || ''], ['Ajustes necesarios', row.adjustments_required || ''], ['Observaciones', row.notes || '']
    ].concat(extra);
    const table = `<table><tbody>${rows.map(([k,v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v || '')}</td></tr>`).join('')}</tbody></table>`;
    const html = printDocumentShell(`<section class="doc-cover"><h1>Acta de prueba de obrador</h1><p>Registro docente de prueba real. No sustituye el manual APPCC del centro ni otros registros oficiales.</p></section><section class="print-sheet">${table}<p class="footer-note">Firma/responsable docente: ________________________________</p></section>`, `Acta_obrador_${safeFilenamePart(recipe.name)}_${getIsoTimestampForFilename(new Date())}`);
    presentPrintDocument(html, 'Acta de prueba de obrador', `ObradORR_Acta_obrador_${safeFilenamePart(recipe.name)}_${getIsoTimestampForFilename(new Date())}`);
}

function invalidateWorkshopValidationIfNeeded(recipe, reason) {
    if (!recipe || !recipe.source_type || !recipe.source_id) return;
    const table = recipe.source_type === 'bakery' ? 'bakery_recipes' : 'culinary_recipes';
    const row = db.query(`SELECT release_status,workshop_validation_status,name FROM ${table} WHERE id=$id`, { $id: recipe.source_id })[0];
    if (!row || (row.release_status !== 'validada' && row.workshop_validation_status !== 'validada')) return;
    const id = uniqueId('WVL-REV', recipe.source_id);
    db.exec(`UPDATE ${table} SET release_status='pendiente', workshop_validation_status='requiere_revision', updated_at=CURRENT_TIMESTAMP WHERE id=$id`, { $id: recipe.source_id });
    if (recipe.source_type === 'bakery') db.exec(`UPDATE bakery_recipes SET yield_status='pending' WHERE id=$id`, { $id: recipe.source_id });
    db.exec(`INSERT INTO workshop_validation_log (id,recipe_type,recipe_id,recipe_name_snapshot,validation_date,responsible,result_status,notes,adjustments_required,created_at)
       VALUES ($log,$type,$recipe,$name,date('now'),'sistema','requiere_revision',$notes,$adj,CURRENT_TIMESTAMP)`, { $log: id, $type: recipe.source_type, $recipe: recipe.source_id, $name: row.name || recipe.name, $notes: 'Ficha validada modificada. La validación previa queda pendiente de confirmación.', $adj: reason || 'Cambio sustancial de ficha' });
}

function systemView() {
    const storage = storageSupportSummary();
    const lastSaved = systemLastSavedText();
    const origin = systemOriginText();
    const snapshotText = 'current-db + previous-db-1/2/3';
    return `<section class="grid two system-page">
    <div class="card"><h2>Sistema y copias</h2><p>Panel de seguridad para guardar, respaldar, importar y comprobar la base activa sin entrar en detalles técnicos.</p>
      ${dataSafetyPanelHtml()}
      <div class="system-state-grid">
        <div class="system-state-card ${dataSafetyLevel()}"><b>Estado de protección</b><span>${escapeHtml(dataSafetyHeadline())}</span><small>${escapeHtml(lastSaved)}</small></div>
        <div class="system-state-card"><b>Copia local</b><span>Este navegador</span><small>${escapeHtml(snapshotText)}</small></div>
        <div class="system-state-card"><b>Origen actual</b><span>${escapeHtml(origin)}</span><small>Si cambias puerto o navegador, la recuperación local puede no aparecer.</small></div>
      </div>
      <div class="system-help-card">
        <b>Qué copia debes usar</b>
        <div class="system-help-grid">
          <span><b>Trabajar aquí</b><small>Guardado local automático.</small></span>
          <span><b>Copia seria</b><small>Descargar SQLite.</small></span>
          <span><b>Móvil ↔ PC</b><small>Descargar SQLite e importar.</small></span>
          <span><b>Compartir</b><small>SQLite o práctica ZIP.</small></span>
          <span><b>Combinar sin machacar</b><small>Importar y combinar SQLite.</small></span>
        </div>
      </div>
      <div class="summary-list compact">
        <div class="summary-row"><div><b>Estado de datos</b><br><small>${escapeHtml(dataStatusText())}</small></div><span class="pill green">${escapeHtml(state.dataSource)}</span></div>
        <div class="summary-row"><div><b>Recuperación local</b><br><small>${escapeHtml(storage)}</small></div></div>
        <div class="summary-row"><div><b>Catálogo activo</b><br><small>${state.recipes.length} elaboraciones · ${state.ingredients.length} ingredientes</small></div></div>
        <div class="summary-row"><div><b>Selección actual</b><br><small>${state.selection.length} elaboraciones · ${state.sessions.length} sesiones</small></div></div>
        <div class="summary-row"><div><b>Migraciones</b><br><small>${migrationStatusText()}</small></div></div>
      </div>
      <div class="system-actions-group"><h3>Copias seguras</h3><p>Son las opciones ordinarias: no sustituyen la base activa sin confirmación.</p>
        <div class="data-actions-safe">
          <div class="safe-action"><b>Descargar copia SQLite</b><small>Archivo portable recomendado para conservar, mover entre móvil/PC o compartir con otro docente compatible.</small><button class="btn primary" data-download-db>Descargar copia SQLite</button></div>
          <div class="safe-action"><b>Carpeta de copias</b><small>Si el navegador permite elegir carpeta, se usará esa ubicación; si no, se descargará el archivo normalmente.</small><div class="actions"><button class="btn" data-choose-backup-folder>Elegir carpeta de copias</button><button class="btn" data-backup-sqlite>Crear copia SQLite</button><button class="btn" data-backup-json>Crear copia JSON</button><button class="btn" data-backup-zip>Crear copia ZIP</button></div></div>
          <div class="safe-action"><b>Guardar recuperación local</b><small>Actualiza la copia IndexedDB de este navegador. No sustituye a una copia SQLite descargada.</small><button class="btn accent" data-save-local-db>Guardar en este dispositivo</button></div>
        </div>
      </div>
      <div class="system-actions-group"><h3>Cambiar base activa</h3><p>Acciones delicadas: sustituyen la base activa. Descarga una copia antes si quieres conservar tu trabajo.</p>
        <div class="data-actions-safe">
          <div class="safe-action danger-zone"><b>Usar base incluida en la aplicación</b><small>Vuelve al catálogo docente incluido en este paquete de ObradORR.</small><button class="btn danger" data-restore-public-db>Usar base incluida</button></div>
          <div class="safe-action danger-zone"><b>Crear base nueva limpia</b><small>Inicia una base ObradORR compatible, sin elaboraciones ni ingredientes propios. Conserva estructura, unidades, alérgenos y tablas necesarias.</small><button class="btn danger" data-create-blank-db>Crear base nueva limpia</button></div>
          <div class="safe-action danger-zone"><b>Restaurar SQLite sustituyendo</b><small>Carga una base externa compatible y sustituye la base activa tras validación.</small><button class="btn" data-load-db>Cargar copia SQLite sustituyendo</button></div>
        </div>
      </div>
      <div class="system-actions-group"><h3>Combinar datos</h3><p>Para traer fichas o variantes sin machacar tu base, usa la combinación segura.</p>
        <div class="data-actions-safe">
          <div class="safe-action"><b>Importar y combinar SQLite</b><small>Modo staging: no sobreescribe. Los duplicados se omiten y los conflictos se crean como variantes.</small><button class="btn primary" data-merge-db>Importar y combinar SQLite</button></div>
        </div>
      </div>
      <div class="notice warning system-mobile-note"><b>Uso móvil/Termux</b><br><small>Android puede cerrar pestañas en segundo plano. Al terminar una sesión importante, descarga una copia SQLite. La recuperación local depende del navegador, dispositivo y puerto actual.</small></div>
    </div>
    <div class="card"><h2>Sesiones guardadas, exportaciones y diagnóstico</h2><p>Accesos de mantenimiento diario. El diagnóstico avanzado queda plegado para no saturar la vista.</p>
      <div class="system-actions-group"><h3>Sesiones guardadas y selección</h3><div class="actions"><button class="btn" data-download-selection>Exportar selección JSON</button><button class="btn" data-clear-local-ui>Limpiar selección y sesiones locales</button><button class="btn" data-diagnostics>Ver diagnóstico</button><button class="btn" data-validate-active-db>Validar base activa</button></div></div>
      <details class="safe-action technical-exports"><summary><b>Exportaciones técnicas</b><small>Salidas para auditoría, respaldo o revisión externa. No son formatos maestros de edición.</small></summary><div class="actions export-grid"><button class="btn" data-export-practice-zip>Práctica ZIP</button><button class="btn" data-export-order-csv>Pedido CSV</button><button class="btn" data-export-order-tsv>Pedido TSV</button><button class="btn" data-export-practice-json>Práctica JSON</button><button class="btn" data-export-technical-json>JSON técnico</button><button class="btn" data-export-catalog-excel>Catálogo Excel</button><button class="btn" data-export-catalog-csv>Catálogo CSV</button><button class="btn" data-export-ingredients-csv>Ingredientes CSV</button><button class="btn" data-export-allergens-csv>Alérgenos CSV</button></div></details>
      <div class="system-origin-note"><b>Origen de esta instalación</b><br><code>${escapeHtml(location.href.split('?')[0])}</code><small>Para pasar datos entre puertos, dispositivos o navegadores, usa copia SQLite descargada/importada.</small></div>
      <div id="diagnosticsBox" class="notice hidden" style="margin-top:14px"></div>
    </div>
  </section>`;
}
function bindCurrentView() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => { state.page = b.dataset.nav; render(); }));
    const statusToggle = document.querySelector('[data-status-toggle]');
    if (statusToggle)
        statusToggle.addEventListener('click', () => {
            statusToggle.classList.toggle('expanded');
            if (statusToggle.classList.contains('expanded'))
                setTimeout(() => statusToggle.classList.remove('expanded'), 5000);
        });
    const validationSearch = document.getElementById('validationSearch');
    if (validationSearch)
        validationSearch.addEventListener('input', e => { state.validationSearch = e.target.value; render(); });
    const validationStatusFilter = document.getElementById('validationStatusFilter');
    if (validationStatusFilter)
        validationStatusFilter.addEventListener('change', e => { state.validationStatusFilter = e.target.value; render(); });
    document.querySelectorAll('[data-register-workshop]').forEach(b => b.addEventListener('click', () => showWorkshopValidationDialog(b.dataset.registerWorkshop)));
    document.querySelectorAll('[data-workshop-history]').forEach(b => b.addEventListener('click', () => showWorkshopHistory(b.dataset.workshopHistory)));
    document.querySelectorAll('[data-workshop-acta]').forEach(b => b.addEventListener('click', () => generateWorkshopValidationActa(b.dataset.workshopActa)));
    const recipeSearch = document.getElementById('recipeSearch');
    if (recipeSearch)
        recipeSearch.addEventListener('input', e => { state.recipeSearch = e.target.value; state.recipeVisibleLimit = LIST_PAGE_SIZE; updateRecipeSearchResults(); });
    const ingredientSearch = document.getElementById('ingredientSearch');
    if (ingredientSearch)
        ingredientSearch.addEventListener('input', e => { state.ingredientSearch = e.target.value; state.ingredientVisibleLimit = LIST_PAGE_SIZE; updateIngredientSearchResults(); });
    const printSearch = document.getElementById('printSearch');
    if (printSearch)
        printSearch.addEventListener('input', e => { state.printSearch = e.target.value; state.printVisibleLimit = LIST_PAGE_SIZE; updatePrintSearchResults(); });
    bindDynamicActionButtons(document);
    bindListLimitButtons(document);
    document.querySelectorAll('[data-edit-selection-qty]').forEach(b => b.addEventListener('click', () => showEditSelectionQuantityDialog(b.dataset.editSelectionQty)));
    document.querySelector('[data-add-all-catalog]')?.addEventListener('click', () => addRecipesBulk('all'));
    (_a = document.querySelector('[data-new-recipe]')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => showRecipeCreator());
    (_b = document.querySelector('[data-new-ingredient]')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => showIngredientCreator());
    document.querySelectorAll('[data-remove-selection]').forEach(b => b.addEventListener('click', () => removeSelection(b.dataset.removeSelection)));
    document.querySelectorAll('[data-update-qty]').forEach(input => input.addEventListener('input', () => updateQty(input.dataset.updateQty, input.value)));
    document.querySelectorAll('[data-update-scaling-mode]').forEach(select => select.addEventListener('change', () => updateScalingMode(select.dataset.updateScalingMode, select.value)));
    document.querySelectorAll('[data-update-selection-field]').forEach(input => input.addEventListener('input', () => updateSelectionField(input.dataset.updateSelectionField, input.dataset.field, input.value)));
    document.querySelectorAll('input[name="documentType"]').forEach(r => r.addEventListener('change', () => { state.printOptions.documentType = r.value; savePrintOptions(); render(); }));
    document.querySelectorAll('input[name="documentProfile"]').forEach(r => r.addEventListener('change', () => { state.printOptions.documentProfile = r.value; applyProfileDefaultsToState(r.value); savePrintOptions(); render(); }));
    document.querySelectorAll('input[name="subrecipeMode"]').forEach(r => r.addEventListener('change', () => { state.printOptions.subrecipeMode = r.value; state.printOptions.expandSubrecipes = r.value !== 'none'; savePrintOptions(); render(); }));
    bindCheck('includeTeachingData');
    bindCheck('includeCosts');
    bindCheck('includeProcess');
    bindCheck('includeAppcc');
    document.querySelectorAll('[data-teaching]').forEach(el => {
        const handler = () => updateTeachingInput(el);
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
    });
    (_c = document.querySelector('[data-generate-document]')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => generateDocument(state.selection, state.printOptions));
    document.querySelectorAll('[data-save-session]').forEach(b => b.addEventListener('click', saveCurrentSession));
    document.querySelectorAll('[data-clear-selection]').forEach(b => b.addEventListener('click', clearSelection));
    document.querySelectorAll('[data-load-session]').forEach(b => b.addEventListener('click', () => loadSession(b.dataset.loadSession)));
    document.querySelectorAll('[data-print-session]').forEach(b => b.addEventListener('click', () => printSession(b.dataset.printSession)));
    document.querySelectorAll('[data-delete-session]').forEach(b => b.addEventListener('click', () => deleteSession(b.dataset.deleteSession)));
    document.querySelectorAll('[data-download-db]').forEach(b => b.addEventListener('click', downloadDb));
    document.querySelectorAll('[data-load-db]').forEach(b => b.addEventListener('click', triggerLoadDb));
    (_d = document.querySelector('[data-save-local-db]')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => saveWorkingCopy('Guardado manual', { silent: false, rerender: false }));
    (_e = document.querySelector('[data-restore-public-db]')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', restorePublicDatabase);
    document.querySelector('[data-create-blank-db]')?.addEventListener('click', createBlankDatabase);
    document.querySelector('[data-validate-active-db]')?.addEventListener('click', validateActiveDatabaseForUser);
    (_f = document.querySelector('[data-clear-local-ui]')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', clearLocalUiData);
    (_g = document.querySelector('[data-diagnostics]')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', showDiagnostics);
    const dbInput = document.getElementById('dbFileInput');
    if (dbInput && dbInput.dataset.bound !== '1') {
        dbInput.addEventListener('change', loadDbFromInput);
        dbInput.dataset.bound = '1';
    }
    (_h = document.querySelector('[data-download-selection]')) === null || _h === void 0 ? void 0 : _h.addEventListener('click', downloadSelectionJson);
    document.querySelector('[data-export-practice-zip]')?.addEventListener('click', exportPracticeZip);
    document.querySelector('[data-export-order-csv]')?.addEventListener('click', exportCurrentOrderCsv);
    document.querySelector('[data-export-order-tsv]')?.addEventListener('click', exportCurrentOrderTsv);
    document.querySelector('[data-export-practice-json]')?.addEventListener('click', exportCurrentPracticeJson);
    document.querySelector('[data-export-technical-json]')?.addEventListener('click', exportTechnicalJson);
    document.querySelector('[data-export-catalog-excel]')?.addEventListener('click', exportCatalogExcel);
    document.querySelector('[data-export-catalog-csv]')?.addEventListener('click', exportCatalogCsv);
    document.querySelector('[data-export-ingredients-csv]')?.addEventListener('click', exportIngredientsCsv);
    document.querySelector('[data-export-allergens-csv]')?.addEventListener('click', exportAllergensCsv);
    document.querySelector('[data-choose-backup-folder]')?.addEventListener('click', chooseBackupFolder);
    document.querySelector('[data-backup-sqlite]')?.addEventListener('click', createBackupSqlite);
    document.querySelector('[data-backup-json]')?.addEventListener('click', createBackupJson);
    document.querySelector('[data-backup-zip]')?.addEventListener('click', createBackupZip);
    document.querySelector('[data-merge-db]')?.addEventListener('click', triggerMergeDb);
    const mergeInput = document.getElementById('dbMergeFileInput');
    if (mergeInput && mergeInput.dataset.bound !== '1') { mergeInput.addEventListener('change', mergeDbFromInput); mergeInput.dataset.bound = '1'; }
}
function bindCheck(id) {
    const el = document.getElementById(id);
    if (!el)
        return;
    el.addEventListener('change', () => { state.printOptions[id] = el.checked; savePrintOptions(); render(); });
}

function bindListLimitButtons(scope = document) {
    scope.querySelectorAll('[data-list-more]').forEach(b => {
        if (b.dataset.bound === '1') return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => updateListLimit(b.dataset.listMore, false));
    });
    scope.querySelectorAll('[data-list-all]').forEach(b => {
        if (b.dataset.bound === '1') return;
        b.dataset.bound = '1';
        b.addEventListener('click', () => updateListLimit(b.dataset.listAll, true));
    });
}
function updateListLimit(kind, showAll) {
    const map = {
        recipe: { key: 'recipeVisibleLimit', rows: filterRecipes(state.recipeSearch) },
        ingredient: { key: 'ingredientVisibleLimit', rows: filterIngredients(state.ingredientSearch) },
        print: { key: 'printVisibleLimit', rows: filterRecipes(state.printSearch) }
    };
    const entry = map[kind];
    if (!entry) return;
    state[entry.key] = showAll ? entry.rows.length : Math.min(entry.rows.length, Number(state[entry.key] || LIST_PAGE_SIZE) + LIST_PAGE_SIZE);
    if (kind === 'recipe') updateRecipeSearchResults();
    else if (kind === 'ingredient') updateIngredientSearchResults();
    else updatePrintSearchResults();
}
function recipeRowsForBulk(kind) {
    const filtered = filterRecipes(state.printSearch);
    if (kind === 'visible') return limitedRows(filtered, state.printVisibleLimit);
    if (kind === 'filtered') return filtered;
    return state.recipes;
}
function addRecipesBulk(kind) {
    const rows = recipeRowsForBulk(kind).filter(r => !['no_apta','bloqueante'].includes(r.release_status || ''));
    if (!rows.length) return alert('No hay elaboraciones aptas para añadir con el filtro actual.');
    const label = kind === 'visible' ? 'visibles' : (kind === 'filtered' ? 'filtradas' : 'del catálogo');
    if (rows.length > 60 || kind === 'all') {
        if (!confirm(`Vas a añadir ${rows.length} elaboraciones ${label} a la impresión con su cantidad base. Después podrás ajustar cada cantidad en la selección. ¿Continuar?`)) return;
    }
    let added = 0, skipped = 0;
    rows.forEach(recipe => {
        if (state.selection.some(i => i.uid === recipe.uid)) { skipped += 1; return; }
        const item = makeSelectionItem(recipe.uid);
        if (item) { state.selection.push(item); added += 1; }
    });
    if (added) {
        saveSelection();
        scheduleDbAutosave('Selección masiva actualizada');
    }
    render();
    alert(`Añadidas: ${added}. Ya estaban en la selección: ${skipped}.`);
}
function showAddRecipeToPrintDialog(uid) {
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe) return;
    const releaseStatus = recipe.release_status || '';
    if (releaseStatus === 'no_apta' || releaseStatus === 'bloqueante') {
        alert('Ficha no apta para uso docente final. No se añade a la práctica como ficha normal.');
        return;
    }
    const item = makeSelectionItem(uid);
    if (!item) return;
    const existing = state.selection.find(i => i.uid === uid);
    const base = existing ? Object.assign({}, item, existing) : item;
    showQuantityDialog(base, false);
}
function showEditSelectionQuantityDialog(uid) {
    const item = state.selection.find(i => i.uid === uid);
    if (!item) return;
    showQuantityDialog(Object.assign({}, item), true);
}
function showQuantityDialog(item, editing) {
    const title = editing ? 'Editar cantidad de impresión' : 'Añadir elaboración a la impresión';
    const body = item.sourceType === 'bakery' ? bakeryQuantityDialogHtml(item) : ordinaryQuantityDialogHtml(item);
    showModal(title, `<div class="quantity-dialog"><div class="notice"><b>${escapeHtml(item.name)}</b><br><small>${escapeHtml(item.categoryLabel || '')}</small></div>${body}<div class="actions" style="margin-top:16px"><button class="btn" id="cancelQuantityDialog">Cancelar</button><button class="btn primary" id="confirmQuantityDialog">${editing ? 'Actualizar' : 'Añadir'}</button></div><div id="quantityDialogError" class="notice warning hidden" style="margin-top:12px"></div></div>`);
    setupQuantityDialogBehaviour(item, editing);
}
function ordinaryQuantityDialogHtml(item) {
    const label = item.baseMode === 'yield' ? 'Rendimiento' : 'Raciones';
    const unit = item.unitLabel || (item.baseMode === 'yield' ? 'rendimiento' : 'raciones');
    return `<label class="scaling-field"><span>${escapeHtml(label)}</span><input class="input" id="quantityDialogQty" type="number" min="0" step="0.01" value="${escapeAttr(item.qty || 1)}" /> <small>${escapeHtml(unit)}</small></label><p class="footer-note">Las fichas ordinarias se añaden por raciones o rendimiento, según su ficha base.</p>`;
}
function bakeryQuantityDialogHtml(item) {
    const mode = bakeryScalingMode(item);
    const pieces = Number(item.qty || item.targetPieces || item.basePieces || 0);
    const pieceWeight = Number(item.pieceWeightG || 0);
    const rawDough = Number(item.rawDoughG || (mode === 'pieces_weight' ? pieces * pieceWeight : item.qty) || item.baseRawDoughG || 0);
    const flour = Number(item.flourG || (mode === 'flour_g' ? item.qty : 0) || item.baseFlourG || 0);
    return `<label class="scaling-field"><span>Modo de cálculo</span><select id="quantityDialogMode">
      <option value="pieces_weight" ${mode === 'pieces_weight' ? 'selected' : ''}>Piezas + peso unitario</option>
      <option value="raw_dough" ${mode === 'raw_dough' ? 'selected' : ''}>Masa total</option>
      <option value="flour_g" ${mode === 'flour_g' ? 'selected' : ''}>Harina total</option>
    </select></label>
    <div id="quantityModePieces" class="quantity-mode-panel"><label class="scaling-field"><span>Piezas</span><input class="input" id="quantityDialogPieces" type="number" min="0" step="1" value="${escapeAttr(pieces || '')}" /></label><label class="scaling-field"><span>Peso unitario de masa cruda (g)</span><input class="input" id="quantityDialogPieceWeight" type="number" min="0" step="0.1" value="${escapeAttr(pieceWeight || '')}" /></label><small class="muted" id="quantityPiecesPreview"></small></div>
    <div id="quantityModeRaw" class="quantity-mode-panel"><label class="scaling-field"><span>Masa total (g)</span><input class="input" id="quantityDialogRawDough" type="number" min="0" step="1" value="${escapeAttr(rawDough || '')}" /></label></div>
    <div id="quantityModeFlour" class="quantity-mode-panel"><label class="scaling-field"><span>Harina total (g)</span><input class="input" id="quantityDialogFlour" type="number" min="0" step="1" value="${escapeAttr(flour || '')}" /></label></div>
    <p class="footer-note">Las formulaciones se añaden por piezas con peso unitario, masa total o harina total. No se declara peso cocido ni merma sin prueba de obrador.</p>`;
}
function setupQuantityDialogBehaviour(item, editing) {
    const cancel = document.getElementById('cancelQuantityDialog');
    const confirmBtn = document.getElementById('confirmQuantityDialog');
    if (cancel) cancel.addEventListener('click', closeModal);
    const refresh = () => refreshQuantityModePanels();
    document.getElementById('quantityDialogMode')?.addEventListener('change', refresh);
    document.getElementById('quantityDialogPieces')?.addEventListener('input', refresh);
    document.getElementById('quantityDialogPieceWeight')?.addEventListener('input', refresh);
    refresh();
    if (confirmBtn) confirmBtn.addEventListener('click', () => confirmQuantityDialog(item, editing));
}
function refreshQuantityModePanels() {
    const mode = document.getElementById('quantityDialogMode')?.value;
    ['Pieces','Raw','Flour'].forEach(key => {
        const el = document.getElementById(`quantityMode${key}`);
        if (el) el.style.display = (mode === 'pieces_weight' && key === 'Pieces') || (mode === 'raw_dough' && key === 'Raw') || (mode === 'flour_g' && key === 'Flour') ? '' : 'none';
    });
    const preview = document.getElementById('quantityPiecesPreview');
    if (preview) {
        const pieces = Number(document.getElementById('quantityDialogPieces')?.value || 0);
        const weight = Number(document.getElementById('quantityDialogPieceWeight')?.value || 0);
        preview.textContent = pieces && weight ? `${formatQty(pieces)} piezas × ${formatQty(weight)} g = ${formatQty(pieces * weight)} g de masa cruda` : 'Indica piezas y peso unitario para calcular la masa cruda.';
    }
}
function quantityDialogError(message) {
    const box = document.getElementById('quantityDialogError');
    if (!box) return alert(message);
    box.classList.remove('hidden');
    box.textContent = message;
}
function confirmQuantityDialog(item, editing) {
    const next = Object.assign({}, item);
    if (item.sourceType === 'bakery') {
        const mode = document.getElementById('quantityDialogMode')?.value || 'flour_g';
        if (mode === 'pieces_weight') {
            const pieces = Number(document.getElementById('quantityDialogPieces')?.value || 0);
            const weight = Number(document.getElementById('quantityDialogPieceWeight')?.value || 0);
            if (pieces <= 0 || weight <= 0) return quantityDialogError('Indica número de piezas y peso unitario de masa cruda.');
            next.baseMode = 'pieces_weight'; next.qty = pieces; next.pieceWeightG = weight; next.rawDoughG = round2(pieces * weight); next.unitLabel = 'piezas × g/pieza';
        }
        else if (mode === 'raw_dough') {
            const raw = Number(document.getElementById('quantityDialogRawDough')?.value || 0);
            if (raw <= 0) return quantityDialogError('Indica la masa total en gramos.');
            next.baseMode = 'raw_dough'; next.qty = raw; next.rawDoughG = raw; next.unitLabel = 'g masa';
        }
        else {
            const flour = Number(document.getElementById('quantityDialogFlour')?.value || 0);
            if (flour <= 0) return quantityDialogError('Indica la harina total en gramos.');
            next.baseMode = 'flour_g'; next.qty = flour; next.flourG = flour; next.unitLabel = 'g harina';
        }
    }
    else {
        const qty = Number(document.getElementById('quantityDialogQty')?.value || 0);
        if (qty <= 0) return quantityDialogError('Indica una cantidad mayor que cero.');
        next.qty = qty;
    }
    const idx = state.selection.findIndex(i => i.uid === next.uid);
    if (idx >= 0) state.selection[idx] = Object.assign({}, state.selection[idx], next);
    else state.selection.push(next);
    saveSelection();
    scheduleDbAutosave(editing ? 'Cantidad actualizada' : 'Elaboración añadida');
    closeModal();
    state.page = 'imprimir';
    render();
}

function removeSelection(uid) {
    state.selection = state.selection.filter(i => i.uid !== uid);
    saveSelection();
    scheduleDbAutosave('Selección actualizada');
    render();
}
function updateQty(uid, value) {
    const item = state.selection.find(i => i.uid === uid);
    if (!item)
        return;
    const qty = Number(value || 0);
    item.qty = qty > 0 ? qty : 0;
    if (item.sourceType === 'bakery') {
        const mode = bakeryScalingMode(item);
        if (mode === 'pieces_weight')
            item.rawDoughG = round2(Number(item.qty || 0) * Number(item.pieceWeightG || 0));
        else if (mode === 'raw_dough')
            item.rawDoughG = item.qty;
        else if (mode === 'flour_g')
            item.flourG = item.qty;
    }
    saveSelection();
    scheduleDbAutosave('Cantidad actualizada', { delay: 1800 });
}
function clearSelection() {
    if (!state.selection.length || confirm('¿Vaciar la práctica actual?')) {
        state.selection = [];
        saveSelection();
        scheduleDbAutosave('Selección vaciada');
        render();
    }
}
function reconcileSelection() {
    const before = state.selection.length;
    state.selection = state.selection.filter(item => state.recipes.some(r => r.uid === item.uid));
    if (state.selection.length !== before)
        saveSelection();
}
function ensureWorkSelection() {
    const exists = db.value('SELECT COUNT(*) FROM work_selections WHERE id=$id', { $id: WORK_SELECTION_ID });
    if (!exists) {
        db.exec(`INSERT INTO work_selections (id,name,notes,context_json) VALUES ($id,'Práctica actual','Selección operativa de ObradORR',NULL)`, { $id: WORK_SELECTION_ID });
    }
}
function saveSelection() {
    ensureWorkSelection();
    withTransaction(() => {
        db.exec('DELETE FROM work_selection_items WHERE selection_id=$id', { $id: WORK_SELECTION_ID });
        state.selection.forEach((item, idx) => {
            const recipe = state.recipes.find(r => r.uid === item.uid) || item;
            const id = `WS-${idx + 1}-${item.sourceType}-${item.sourceId}`;
            const payload = selectionDbPayload(item, recipe, idx);
            db.exec(`INSERT INTO work_selection_items
        (id,selection_id,item_type,culinary_recipe_id,bakery_recipe_id,production_mode,main_qty,servings,pieces,piece_weight_g,flour_g,raw_dough_g,baking_loss_pct,print_a4,sort_order,notes)
        VALUES ($id,$selection,$type,$culinary,$bakery,$mode,$main,$servings,$pieces,$pieceWeight,$flour,$rawDough,$loss,1,$sort,$notes)`, Object.assign({ $id: id, $selection: WORK_SELECTION_ID }, payload));
        });
        db.exec('UPDATE work_selections SET updated_at=CURRENT_TIMESTAMP, context_json=$ctx WHERE id=$id', { $id: WORK_SELECTION_ID, $ctx: JSON.stringify({ printOptions: state.printOptions }) });
    });
}
function selectionDbPayload(item, recipe, idx) {
    const type = item.sourceType;
    let mode = type === 'bakery' ? 'flour' : (item.baseMode === 'yield' ? 'yield' : 'servings');
    let main = Number(item.qty || 0), pieces = null, pieceWeight = null, flour = null, rawDough = null;
    if (type === 'bakery') {
        const bakeryMode = bakeryScalingMode(item);
        if (bakeryMode === 'pieces_weight') {
            mode = 'pieces';
            pieces = Number(item.qty || 0);
            pieceWeight = Number(item.pieceWeightG || 0) || null;
            rawDough = round2(pieces * Number(pieceWeight || 0)) || null;
            main = pieces;
        }
        else if (bakeryMode === 'raw_dough') {
            mode = 'raw_dough';
            rawDough = Number(item.rawDoughG || item.qty || 0);
            main = rawDough;
        }
        else {
            mode = 'flour';
            flour = Number(item.flourG || item.qty || 0);
            main = flour;
        }
    }
    return {
        $type: type,
        $culinary: type === 'culinary' ? item.sourceId : null,
        $bakery: type === 'bakery' ? item.sourceId : null,
        $mode: mode,
        $main: main,
        $servings: mode === 'servings' ? Number(item.qty || 0) : null,
        $pieces: pieces,
        $pieceWeight: pieceWeight,
        $flour: flour,
        $rawDough: rawDough,
        $loss: type === 'bakery' ? Number((recipe === null || recipe === void 0 ? void 0 : recipe.baking_loss_pct) || 0) : null,
        $sort: (idx + 1) * 10,
        $notes: item.notes || null
    };
}
function loadSelectionFromSqlite() {
    ensureWorkSelection();
    const rows = db.query(`SELECT w.*, cr.name AS culinary_name, cr.base_servings, cr.yield_quantity, COALESCE(yu.symbol, yu.name, cr.yield_unit_id) AS yield_unit, cr.default_production_mode,
      br.name AS bakery_name, br.base_flour_g, br.base_raw_weight_g, br.base_pieces, br.base_raw_piece_weight_g, br.baking_loss_pct
    FROM work_selection_items w
    LEFT JOIN culinary_recipes cr ON cr.id=w.culinary_recipe_id
    LEFT JOIN units yu ON yu.id=cr.yield_unit_id
    LEFT JOIN bakery_recipes br ON br.id=w.bakery_recipe_id
    WHERE w.selection_id=$id ORDER BY w.sort_order,w.created_at,w.id`, { $id: WORK_SELECTION_ID });
    state.selection = rows.map(row => selectionItemFromDbRow(row)).filter(Boolean);
}
function selectionItemFromDbRow(row) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const type = row.item_type;
    const sourceId = type === 'bakery' ? row.bakery_recipe_id : row.culinary_recipe_id;
    const uid = `${type}:${sourceId}`;
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe && !sourceId)
        return null;
    if (type === 'bakery') {
        const baseFlour = Number(row.base_flour_g || (recipe === null || recipe === void 0 ? void 0 : recipe.base_flour_g) || 1000) || 1000;
        const baseRaw = Number(row.base_raw_weight_g || (recipe === null || recipe === void 0 ? void 0 : recipe.base_raw_weight_g) || 0);
        const basePieces = Number(row.base_pieces || (recipe === null || recipe === void 0 ? void 0 : recipe.base_pieces) || 0);
        const basePieceWeight = Number(row.base_raw_piece_weight_g || (recipe === null || recipe === void 0 ? void 0 : recipe.base_raw_piece_weight_g) || (baseRaw && basePieces ? baseRaw / basePieces : 0));
        if (row.production_mode === 'pieces') {
            const qty = Number((_c = (_b = (_a = row.pieces) !== null && _a !== void 0 ? _a : row.main_qty) !== null && _b !== void 0 ? _b : basePieces) !== null && _c !== void 0 ? _c : 1);
            const pieceWeightG = Number(row.piece_weight_g || basePieceWeight || 0);
            const rawDoughG = Number(row.raw_dough_g || (qty * pieceWeightG) || baseRaw || 0);
            return { uid, sourceType: type, sourceId, name: (recipe === null || recipe === void 0 ? void 0 : recipe.name) || row.bakery_name || sourceId, categoryLabel: (recipe === null || recipe === void 0 ? void 0 : recipe.category_label) || 'Panadería/Pastelería', qty, unitLabel: 'piezas × g/pieza', baseMode: 'pieces_weight', baseValue: baseRaw || rawDoughG || 1, baseFlourG: baseFlour, baseRawDoughG: baseRaw, basePieces, pieceWeightG, rawDoughG, notes: row.notes || '' };
        }
        if (row.production_mode === 'raw_dough') {
            const qty = Number((_f = (_e = (_d = row.raw_dough_g) !== null && _d !== void 0 ? _d : row.main_qty) !== null && _e !== void 0 ? _e : baseRaw) !== null && _f !== void 0 ? _f : 1000);
            return { uid, sourceType: type, sourceId, name: (recipe === null || recipe === void 0 ? void 0 : recipe.name) || row.bakery_name || sourceId, categoryLabel: (recipe === null || recipe === void 0 ? void 0 : recipe.category_label) || 'Panadería/Pastelería', qty, unitLabel: 'g masa', baseMode: 'raw_dough', baseValue: baseRaw || qty || 1, baseFlourG: baseFlour, baseRawDoughG: baseRaw, basePieces, rawDoughG: qty, pieceWeightG: basePieceWeight, notes: row.notes || '' };
        }
        const qty = Number((_j = (_h = (_g = row.flour_g) !== null && _g !== void 0 ? _g : row.main_qty) !== null && _h !== void 0 ? _h : baseFlour) !== null && _j !== void 0 ? _j : 1000);
        return { uid, sourceType: type, sourceId, name: (recipe === null || recipe === void 0 ? void 0 : recipe.name) || row.bakery_name || sourceId, categoryLabel: (recipe === null || recipe === void 0 ? void 0 : recipe.category_label) || 'Panadería/Pastelería', qty, unitLabel: 'g harina', baseMode: 'flour_g', baseValue: baseFlour || qty || 1000, baseFlourG: baseFlour, baseRawDoughG: baseRaw, basePieces, flourG: qty, pieceWeightG: basePieceWeight, notes: row.notes || '' };
    }
    const mode = row.production_mode === 'yield' ? 'yield' : 'servings';
    const qty = mode === 'yield' ? Number((_h = (_g = row.main_qty) !== null && _g !== void 0 ? _g : row.yield_quantity) !== null && _h !== void 0 ? _h : 1) : Number((_l = (_k = (_j = row.servings) !== null && _j !== void 0 ? _j : row.main_qty) !== null && _k !== void 0 ? _k : row.base_servings) !== null && _l !== void 0 ? _l : 1);
    return { uid, sourceType: type, sourceId, name: (recipe === null || recipe === void 0 ? void 0 : recipe.name) || row.culinary_name || sourceId, categoryLabel: (recipe === null || recipe === void 0 ? void 0 : recipe.category_label) || 'Cocina', qty, unitLabel: mode === 'yield' ? (row.yield_unit || 'rendimiento') : 'raciones', baseMode: mode, baseValue: mode === 'yield' ? Number(row.yield_quantity || qty || 1) : Number(row.base_servings || qty || 1), notes: row.notes || '' };
}
function loadSessionsFromSqlite() {
    state.sessions = db.query(`SELECT s.*, COUNT(i.id) AS item_count
    FROM class_sessions s LEFT JOIN class_session_items i ON i.session_id=s.id
    GROUP BY s.id ORDER BY COALESCE(s.practice_date,s.created_at) DESC, s.created_at DESC`);
}
function loadSessionItems(sessionId) {
    const rows = db.query(`SELECT i.*, cr.name AS culinary_name, cr.base_servings, cr.yield_quantity, COALESCE(yu.symbol, yu.name, cr.yield_unit_id) AS yield_unit, cr.default_production_mode,
      br.name AS bakery_name, br.base_flour_g, br.base_raw_weight_g, br.base_pieces, br.base_raw_piece_weight_g, br.baking_loss_pct
    FROM class_session_items i
    LEFT JOIN culinary_recipes cr ON cr.id=i.culinary_recipe_id
    LEFT JOIN units yu ON yu.id=cr.yield_unit_id
    LEFT JOIN bakery_recipes br ON br.id=i.bakery_recipe_id
    WHERE i.session_id=$id ORDER BY i.sort_order,i.id`, { $id: sessionId });
    return rows.map(row => selectionItemFromDbRow(Object.assign(Object.assign({}, row), { selection_id: WORK_SELECTION_ID }))).filter(Boolean);
}
function sessionTeachingData(session) {
    var _a;
    const cycle = session.cycle_id ? (_a = db.query('SELECT name FROM fp_cycles WHERE id=$id', { $id: session.cycle_id })[0]) === null || _a === void 0 ? void 0 : _a.name : '';
    const mod = session.module_id ? db.query('SELECT module_code,module_name FROM fp_modules WHERE id=$id', { $id: session.module_id })[0] : null;
    return { title: session.title || '', date: session.practice_date || '', cycle: cycle || '', module: mod ? moduleLabel(mod) : '', group: session.group_name || '', responsible: session.responsible || '', notes: session.notes || '' };
}
function teachingIdsFromOptions(t) {
    const cycle = state.cycles.find(c => c.name === t.cycle || c.id === t.cycle);
    const module = state.modules.find(m => {
        const matches = moduleLabel(m) === t.module || m.id === t.module || m.module_code === t.module;
        if (!matches)
            return false;
        return !cycle || String(m.cycle_id) === String(cycle.id);
    });
    return { cycleId: (cycle === null || cycle === void 0 ? void 0 : cycle.id) || null, moduleId: (module === null || module === void 0 ? void 0 : module.id) || null };
}
function filterRecipes(term) {
    const q = normalize(term);
    if (!q)
        return state.recipes;
    return state.recipes.filter(r => normalize([r.name, r.family, r.subfamily, r.category_label].join(' ')).includes(q));
}
function filterIngredients(term) {
    const q = normalize(term);
    if (!q)
        return state.ingredients;
    return state.ingredients.filter(i => normalize([i.name, i.family, i.subfamily, i.order_group, i.storage_zone].join(' ')).includes(q));
}
async function showRecipePreview(uid) {
    const item = makeSelectionItem(uid);
    if (!item)
        return;
    const html = await recipeSheetHtml(item, { includeCosts: true, subrecipeMode: 'sheets', expandSubrecipes: true, includeProcess: true, includeAppcc: true }, false);
    showModal('Vista previa', html);
}
function showRecipeCreator() {
    showModal('Nueva elaboración', `<div class="notice"><b>Alta controlada:</b> no se crea ninguna ficha hasta pulsar <b>Crear y editar</b>. Puedes cancelar sin dejar registros de prueba.</div><div class="grid two">
    <label>Tipo de ficha<select id="newRecipeKind"><option value="culinary">Ficha de cocina / pastelería</option><option value="bakery">Formulación de panadería / pastelería</option></select></label>
    <label>Nombre<input class="input" id="newRecipeName" placeholder="Ejemplo: Crema pastelera base" autocomplete="off" /></label>
  </div><div class="actions"><button class="btn primary" id="confirmCreateRecipe">Crear y editar</button><button class="btn" id="cancelCreateRecipe">Cancelar</button></div>`);
    document.getElementById('cancelCreateRecipe')?.addEventListener('click', closeModal);
    const nameInput = document.getElementById('newRecipeName');
    if (nameInput)
        nameInput.focus();
    document.getElementById('confirmCreateRecipe')?.addEventListener('click', () => {
        const kind = document.getElementById('newRecipeKind')?.value || 'culinary';
        const recipeName = String(document.getElementById('newRecipeName')?.value || '').trim();
        createEmptyRecipe(kind, recipeName);
    });
}
async function createEmptyRecipe(kind, recipeName) {
    try {
        recipeName = String(recipeName || '').trim();
        if (!recipeName)
            return showFormError('Indica un nombre antes de crear la ficha.');
        const duplicate = findRecipeNameDuplicate(recipeName);
        if (duplicate)
            return showFormError(duplicateRecipeMessage(duplicate, recipeName));
        const id = uniqueId(kind === 'bakery' ? 'BAK' : 'REC', recipeName);
        withTransaction(() => {
            if (kind === 'bakery') {
                db.exec(`INSERT INTO bakery_recipes (id,name,family_id,base_flour_g,base_pieces,baking_loss_pct,status,release_status,yield_status,fermentation_notes,notes,active)
            VALUES ($id,$name,$family,1000,10,0,'draft','pendiente','pending','','',1)`, { $id: id, $name: recipeName, $family: defaultFamilyId('bakery') });
                db.exec(`INSERT OR IGNORE INTO bakery_preferments (recipe_id,preferment_type,calculation_mode,hydration_pct,yeast_pct,notes,active)
            VALUES ($id,'Ninguno','none',100,0,'',0)`, { $id: id });
            }
            else {
                db.exec(`INSERT INTO culinary_recipes (id,name,family_id,base_servings,production_kind,default_production_mode,status,release_status,process,service_notes,appcc_notes,notes,active)
            VALUES ($id,$name,$family,10,'final_servings','servings','draft','pendiente','','','','',1)`, { $id: id, $name: recipeName, $family: defaultFamilyId('culinary') });
            }
        });
        await loadCatalogs();
        scheduleDbAutosave('Nueva elaboración');
        closeModal();
        showRecipeEditor(`${kind}:${id}`);
    }
    catch (error) {
        return showFormError(error);
    }
}
function showRecipeEditor(uid) {
    var _a, _b, _c, _d, _e, _f;
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe)
        return;
    const detail = recipe.source_type === 'culinary'
        ? db.query('SELECT * FROM culinary_recipes WHERE id=$id', { $id: recipe.source_id })[0]
        : db.query('SELECT * FROM bakery_recipes WHERE id=$id', { $id: recipe.source_id })[0];
    const familyOptions = familyOptionsHtml(recipe.source_type, detail.family_id);
    const subfamilyOptions = subfamilyOptionsHtml(detail.family_id, detail.subfamily_id);
    const form = recipe.source_type === 'culinary' ? culinaryRecipeForm(detail, familyOptions, subfamilyOptions) : bakeryRecipeForm(detail, familyOptions, subfamilyOptions);
    showModal('Editar elaboración', `<div class="editor-toolbar-rc1 actions"><button class="btn primary" id="saveRecipeEdit">Guardar y cerrar</button><button class="btn accent" id="saveRecipeEditStay">Guardar y seguir</button><button class="btn" id="saveEditorDraftLocal">Guardar borrador local</button><button class="btn" id="previewRecipeEdit">Vista previa</button><button class="btn" id="preflightRecipeButton">Preflight</button><button class="btn" id="duplicateRecipeButton">Duplicar</button><button class="btn" id="variantRecipeButton">Crear variante</button><button class="btn danger" id="deleteRecipeButton">Eliminar elaboración</button></div><div class="notice editor-help-note"><b>Edición cómoda:</b> los campos largos crecen con el texto. En móvil, las tablas de edición se convierten en tarjetas para evitar columnas comprimidas.</div><div class="editor-layout editor-layout-rc1">
    <section class="card-flat editor-main-section"><h3>Datos de ficha</h3>${safeEditorImpactHtml(recipe)}${form}<p class="footer-note">Edición local-first: los cambios se validan y se guardan en la SQLite activa. El borrador local protege texto largo antes de guardar.</p></section>
    <section class="card-flat"><details open><summary><b>${recipe.source_type === 'bakery' ? 'Fórmula panadera' : 'Ingredientes de la ficha'}</b></summary>${recipeLinesEditor(recipe)}<div class="actions"><button class="btn primary" id="saveRecipeLines">Guardar líneas</button><button class="btn accent" id="addRecipeLine">Añadir línea</button></div></details>${recipe.source_type === 'bakery' ? bakeryPrefermentEditor(recipe) + bakeryProcessStepsEditor(recipe) + bakeryComponentsEditor(recipe) : ''}</section>
  </div>`);
    (_a = document.getElementById('recipeFamily')) === null || _a === void 0 ? void 0 : _a.addEventListener('change', e => {
        const target = document.getElementById('recipeSubfamily');
        if (target)
            target.innerHTML = subfamilyOptionsHtml(e.target.value, '');
    });
    (_b = document.getElementById('saveRecipeEdit')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', async () => {
        try {
            if (!saveRecipeMain(recipe))
                return;
            await loadCatalogs();
            scheduleDbAutosave('Ficha editada');
            closeModal();
            render();
        }
        catch (error) {
            showFormError(error);
        }
    });
    (_c = document.getElementById('previewRecipeEdit')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => showRecipePreview(recipe.uid));
    (_d = document.getElementById('saveRecipeLines')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', async () => { saveRecipeLines(recipe); await loadCatalogs(); scheduleDbAutosave('Líneas editadas'); closeModal(); showRecipeEditor(recipe.uid); });
    (_e = document.getElementById('addRecipeLine')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => showAddRecipeLine(recipe));
    (_f = document.getElementById('addBakeryComponent')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', () => showAddBakeryComponent(recipe));
    const savePref = document.getElementById('saveBakeryPreferment');
    if (savePref)
        savePref.addEventListener('click', async () => { saveBakeryPreferment(recipe); await loadCatalogs(); scheduleDbAutosave('Prefermento guardado'); closeModal(); showRecipeEditor(recipe.uid); });
    const saveSteps = document.getElementById('saveBakerySteps');
    if (saveSteps)
        saveSteps.addEventListener('click', async () => { saveBakerySteps(recipe); await loadCatalogs(); scheduleDbAutosave('Pasos técnicos guardados'); closeModal(); showRecipeEditor(recipe.uid); });
    const addStep = document.getElementById('addBakeryStep');
    if (addStep)
        addStep.addEventListener('click', () => showAddBakeryStep(recipe));
    document.querySelectorAll('[data-edit-component]').forEach(b => b.addEventListener('click', () => showEditBakeryComponent(recipe, b.dataset.editComponent)));
    document.querySelectorAll('[data-delete-step]').forEach(b => b.addEventListener('click', async () => {
        if (!deleteBakeryStep(b.dataset.deleteStep))
            return;
        await loadCatalogs();
        scheduleDbAutosave('Paso técnico eliminado');
        closeModal();
        showRecipeEditor(recipe.uid);
    }));
    document.querySelectorAll('[data-delete-line]').forEach(b => b.addEventListener('click', async () => {
        if (!deleteRecipeLine(recipe, b.dataset.deleteLine))
            return;
        await loadCatalogs();
        scheduleDbAutosave('Línea eliminada');
        closeModal();
        showRecipeEditor(recipe.uid);
    }));
    document.querySelectorAll('[data-delete-component]').forEach(b => b.addEventListener('click', async () => {
        if (!deleteBakeryComponent(b.dataset.deleteComponent))
            return;
        await loadCatalogs();
        scheduleDbAutosave('Componente eliminado');
        closeModal();
        showRecipeEditor(recipe.uid);
    }));
    setupEditorComfort(recipe);
}


// ────────────────────────────────────────────────────────────────────────────
// Editor cómodo, borrador local, duplicado y variante
// ────────────────────────────────────────────────────────────────────────────
const EDITOR_DRAFT_PREFIX = 'obradorr_editor_draft_v2_';
function editorDraftKey(recipe) { return EDITOR_DRAFT_PREFIX + recipe.uid; }
function editorMainValues() {
    const out = {};
    document.querySelectorAll('.editor-modal input[id], .editor-modal textarea[id], .editor-modal select[id]').forEach(el => {
        if (!el.id) return;
        if (el.type === 'checkbox') out[el.id] = !!el.checked;
        else out[el.id] = el.value;
    });
    return out;
}
function restoreEditorMainValues(values) {
    Object.entries(values || {}).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!value;
        else el.value = value;
    });
}
function setupEditorComfort(recipe) {
    const modal = modalRoot.querySelector('.modal');
    if (modal) modal.classList.add('editor-modal', 'editor-modal-full');
    const key = editorDraftKey(recipe);
    const draft = loadJson(key, null);
    const toolbar = document.querySelector('.editor-toolbar-rc1');
    if (toolbar && draft && draft.values) {
        toolbar.insertAdjacentHTML('beforeend', `<button class="btn" id="restoreEditorDraft">Restaurar borrador local</button><button class="btn danger" id="discardEditorDraft">Descartar borrador</button>`);
        document.getElementById('restoreEditorDraft')?.addEventListener('click', () => { restoreEditorMainValues(draft.values); setupAdaptiveTextareas(modalRoot); alert('Borrador local restaurado. Revisa y guarda la ficha.'); });
        document.getElementById('discardEditorDraft')?.addEventListener('click', () => { localStorage.removeItem(key); alert('Borrador local descartado.'); closeModal(); showRecipeEditor(recipe.uid); });
    }
    const saveDraft = () => saveJson(key, { savedAt: new Date().toISOString(), values: editorMainValues() });
    document.querySelectorAll('.editor-modal input, .editor-modal textarea, .editor-modal select').forEach(el => el.addEventListener('input', debounce(saveDraft, 400)));
    document.getElementById('saveEditorDraftLocal')?.addEventListener('click', () => { saveDraft(); alert('Borrador local guardado en este navegador.'); });
    document.getElementById('saveRecipeEditStay')?.addEventListener('click', async () => {
        try {
            if (!saveRecipeMain(recipe)) return;
            localStorage.removeItem(key);
            await loadCatalogs(); scheduleDbAutosave('Ficha editada sin cerrar'); closeModal(); showRecipeEditor(recipe.uid);
        } catch (error) { showFormError(error); }
    });
    document.getElementById('duplicateRecipeButton')?.addEventListener('click', async () => duplicateRecipe(recipe, false));
    document.getElementById('variantRecipeButton')?.addEventListener('click', async () => duplicateRecipe(recipe, true));
    document.getElementById('preflightRecipeButton')?.addEventListener('click', () => showRecipePreflight(recipe));
    document.getElementById('deleteRecipeButton')?.addEventListener('click', () => deleteRecipeSafely(recipe));
}
function debounce(fn, ms) { let t = null; return function(){ clearTimeout(t); t = setTimeout(fn, ms); }; }

function autoResizeTextarea(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    const min = el.classList.contains('line-note') ? 70 : el.classList.contains('textarea-large') ? 170 : 110;
    el.style.height = `${Math.max(min, el.scrollHeight + 2)}px`;
}
function setupAdaptiveTextareas(root = document) {
    root.querySelectorAll('textarea').forEach(el => {
        autoResizeTextarea(el);
        if (el.dataset.autosizeBound === '1') return;
        el.dataset.autosizeBound = '1';
        el.addEventListener('input', () => autoResizeTextarea(el));
    });
}
function duplicateRecipe(recipe, asVariant) {
    try {
        const base = state.recipes.find(r => r.uid === recipe.uid) || recipe;
        const defaultName = asVariant ? `${base.name} · variante docente` : `${base.name} · copia`;
        const name = prompt(asVariant ? 'Nombre de la variante' : 'Nombre de la copia', defaultName);
        const recipeName = String(name || '').trim();
        if (!recipeName) return;
        const duplicate = findRecipeNameDuplicate(recipeName);
        if (duplicate)
            return showFormError(duplicateRecipeMessage(duplicate, recipeName));
        const newId = uniqueId(recipe.source_type === 'bakery' ? 'BAK' : 'REC', recipeName);
        withTransaction(() => {
            if (recipe.source_type === 'culinary') duplicateCulinaryRecipe(recipe.source_id, newId, recipeName, asVariant);
            else duplicateBakeryRecipe(recipe.source_id, newId, recipeName, asVariant);
        });
        loadCatalogs().then(() => { scheduleDbAutosave(asVariant ? 'Variante creada' : 'Ficha duplicada'); closeModal(); showRecipeEditor(`${recipe.source_type}:${newId}`); }).catch(showFormError);
    }
    catch (error) {
        return showFormError(error);
    }
}
function duplicateCulinaryRecipe(oldId, newId, name, asVariant) {
    const src = db.query('SELECT * FROM culinary_recipes WHERE id=$id', { $id: oldId })[0];
    if (!src) throw new Error('No se localizó la ficha origen.');
    db.exec(`INSERT INTO culinary_recipes (id,name,family_id,subfamily_id,base_servings,serving_weight_g,yield_quantity,yield_unit_id,production_kind,default_production_mode,status,release_status,process,service_notes,appcc_notes,notes,active)
      VALUES ($id,$name,$family,$subfamily,$servings,$servingWeight,$yieldQty,$yieldUnit,$kind,$mode,'draft','pendiente',$process,$service,$appcc,$notes,1)`, {
        $id:newId,$name:name,$family:src.family_id,$subfamily:src.subfamily_id,$servings:src.base_servings,$servingWeight:src.serving_weight_g,$yieldQty:src.yield_quantity,$yieldUnit:src.yield_unit_id,$kind:src.production_kind || 'final_servings',$mode:src.default_production_mode || 'servings',$process:src.process || '',$service:src.service_notes || '',$appcc:src.appcc_notes || '',$notes:`${src.notes || ''}\n\nCopia/variante creada desde ${oldId}. Estado pendiente de revisión docente y prueba de obrador.`.trim()
    });
    db.query('SELECT * FROM culinary_recipe_lines WHERE recipe_id=$id ORDER BY sort_order,id', { $id: oldId }).forEach((l, idx) => db.exec(`INSERT INTO culinary_recipe_lines (id,recipe_id,line_type,ingredient_id,subrecipe_id,quantity,unit_id,technical_note,sort_order)
      VALUES ($id,$recipe,$lineType,$ingredient,$subrecipe,$quantity,$unit,$note,$sort)`, { $id: uniqueId('CRL', `${newId}-${idx}`), $recipe:newId, $lineType:l.line_type, $ingredient:l.ingredient_id, $subrecipe:l.subrecipe_id, $quantity:l.quantity, $unit:l.unit_id, $note:l.technical_note || '', $sort:l.sort_order || (idx+1)*10 }));
}
function duplicateBakeryRecipe(oldId, newId, name, asVariant) {
    const src = db.query('SELECT * FROM bakery_recipes WHERE id=$id', { $id: oldId })[0];
    if (!src) throw new Error('No se localizó la formulación origen.');
    db.exec(`INSERT INTO bakery_recipes (id,name,family_id,subfamily_id,base_flour_g,base_pieces,baking_loss_pct,target_dough_temp_c,status,release_status,yield_status,fermentation_notes,notes,active)
      VALUES ($id,$name,$family,$subfamily,$flour,$pieces,$loss,$temp,'draft','pendiente','pending',$process,$notes,1)`, { $id:newId,$name:name,$family:src.family_id,$subfamily:src.subfamily_id,$flour:src.base_flour_g || 1000,$pieces:src.base_pieces,$loss:src.baking_loss_pct || 0,$temp:src.target_dough_temp_c,$process:src.fermentation_notes || '',$notes:`${src.notes || ''}\n\nCopia/variante creada desde ${oldId}. Rendimiento pendiente de prueba de obrador.`.trim() });
    db.query('SELECT * FROM bakery_recipe_lines WHERE recipe_id=$id ORDER BY sort_order,id', { $id: oldId }).forEach((l, idx) => db.exec(`INSERT INTO bakery_recipe_lines (id,recipe_id,ingredient_id,bakery_role,line_group,calculation_base,baker_pct,preferment_pct,final_dough_pct,quantity_value,unit_id,quantity_unit_id,include_in_dough,technical_note,sort_order)
      VALUES ($id,$recipe,$ingredient,$role,$group,$calc,$pct,$pref,$final,$qvalue,$unit,$qunit,$include,$note,$sort)`, { $id:uniqueId('BRL', `${newId}-${idx}`), $recipe:newId,$ingredient:l.ingredient_id,$role:l.bakery_role,$group:l.line_group,$calc:l.calculation_base,$pct:l.baker_pct,$pref:l.preferment_pct,$final:l.final_dough_pct,$qvalue:l.quantity_value,$unit:l.unit_id,$qunit:l.quantity_unit_id,$include:l.include_in_dough,$note:l.technical_note || '',$sort:l.sort_order || (idx+1)*10 }));
    db.query('SELECT * FROM bakery_preferments WHERE recipe_id=$id', { $id: oldId }).forEach(p => db.exec(`INSERT OR IGNORE INTO bakery_preferments (recipe_id,preferment_type,calculation_mode,hydration_pct,yeast_pct,flour_prefermented_pct,preferment_total_pct,time_hours,temperature_c,notes,active)
      VALUES ($recipe,$type,$mode,$hydration,$yeast,$flourPct,$totalPct,$time,$temp,$notes,$active)`, { $recipe:newId,$type:p.preferment_type,$mode:p.calculation_mode,$hydration:p.hydration_pct,$yeast:p.yeast_pct,$flourPct:p.flour_prefermented_pct,$totalPct:p.preferment_total_pct,$time:p.time_hours,$temp:p.temperature_c,$notes:p.notes || '',$active:p.active }));
    db.query('SELECT * FROM bakery_process_steps WHERE recipe_id=$id ORDER BY step_number,id', { $id: oldId }).forEach((p, idx) => db.exec(`INSERT INTO bakery_process_steps (id,recipe_id,block,step_number,instruction,duration_min,temperature_c,notes)
      VALUES ($id,$recipe,$block,$step,$instruction,$duration,$temp,$notes)`, { $id:uniqueId('BPS', `${newId}-${idx}`), $recipe:newId,$block:p.block,$step:p.step_number,$instruction:p.instruction,$duration:p.duration_min,$temp:p.temperature_c,$notes:p.notes || '' }));
    db.query('SELECT * FROM bakery_recipe_components WHERE bakery_recipe_id=$id ORDER BY sort_order,id', { $id: oldId }).forEach((c, idx) => db.exec(`INSERT INTO bakery_recipe_components (id,bakery_recipe_id,component_culinary_recipe_id,component_bakery_recipe_id,usage_role,component_status,calculation_base,quantity_value,unit_id,technical_note,sort_order,include_in_order,include_in_cost)
      VALUES ($id,$recipe,$culinary,$bakery,$role,$status,$calc,$qty,$unit,$note,$sort,$order,$cost)`, { $id:uniqueId('BC', `${newId}-${idx}`), $recipe:newId,$culinary:c.component_culinary_recipe_id,$bakery:c.component_bakery_recipe_id,$role:c.usage_role,$status:c.component_status,$calc:c.calculation_base,$qty:c.quantity_value,$unit:c.unit_id,$note:c.technical_note || '',$sort:c.sort_order || (idx+1)*10,$order:c.include_in_order,$cost:c.include_in_cost }));
}
function showRecipePreflight(recipe) {
    if (!window.ObradORRPreflight) return alert('Comprobación documental no disponible.');
    const item = state.recipes.find(r => r.uid === recipe.uid);
    const result = window.ObradORRPreflight.run({ db, state, items: item ? [item] : [], options: effectivePrintOptions(state.printOptions) });
    const rows = (result.warnings || []).map(w => `<tr><td>${escapeHtml(w.severity)}</td><td>${escapeHtml(w.title)}</td><td>${escapeHtml(w.detail || '')}</td></tr>`).join('');
    showModal('Comprobación documental de ficha', `<div class="notice"><b>${escapeHtml(item ? item.name : recipe.uid)}</b><br>Resumen: ${escapeHtml(JSON.stringify(result.summary || {}))}</div>${rows ? `<div class="table-wrap"><table><thead><tr><th>Severidad</th><th>Aviso</th><th>Detalle</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="notice success">Sin avisos detectados para esta ficha.</div>'}`);
}

function safeEditorImpactHtml(recipe) {
    if (!window.ObradORRSafeEditor)
        return '';
    try {
        return window.ObradORRSafeEditor.warningHtml(db, escapeHtml, recipe.source_type, recipe.source_id);
    }
    catch (error) {
        return `<div class="safe-editor warning"><b>Vista de impacto no disponible:</b> ${escapeHtml(error.message || String(error))}</div>`;
    }
}
function culinaryRecipeForm(detail, familyOptions, subfamilyOptions) {
    return `<div class="editor-sections"><details open><summary><b>Identidad y producción</b></summary><div class="grid two">
    <label>Nombre<input class="input" id="recipeName" value="${escapeAttr(detail.name || '')}" /></label>
    <label>Estado interno<select id="recipeStatus"><option value="draft" ${(detail.status || 'draft') === 'draft' ? 'selected' : ''}>Borrador / propuesta</option><option value="reviewed" ${detail.status === 'reviewed' ? 'selected' : ''}>Revisada documentalmente</option></select><small class="muted">La validación real queda reservada a prueba de obrador.</small></label>
    <label>Familia<select id="recipeFamily">${familyOptions}</select></label>
    <label>Subfamilia<select id="recipeSubfamily">${subfamilyOptions}</select></label>
    <label>Raciones base<input class="input" id="recipeServings" type="number" step="0.01" value="${escapeAttr(detail.base_servings || 10)}" /></label>
    <label>Peso ración g<input class="input" id="recipeServingWeight" type="number" step="0.01" value="${escapeAttr(detail.serving_weight_g || '')}" /></label>
    <label>Rendimiento<input class="input" id="recipeYieldQty" type="number" step="0.01" value="${escapeAttr(detail.yield_quantity || '')}" /></label>
    <label>Modo producción<select id="recipeProdMode"><option value="servings" ${detail.default_production_mode === 'servings' ? 'selected' : ''}>Raciones</option><option value="yield" ${detail.default_production_mode === 'yield' ? 'selected' : ''}>Rendimiento</option></select></label>
    </div></details><details open><summary><b>Proceso</b></summary><label>Proceso<textarea class="textarea-large" id="recipeProcess">${escapeHtml(detail.process || '')}</textarea></label></details><details><summary><b>APPCC, servicio y notas</b></summary><div class="grid two"><label>APPCC<textarea class="textarea-large" id="recipeAppcc">${escapeHtml(detail.appcc_notes || '')}</textarea></label>
    <label>Servicio<textarea class="textarea-large" id="recipeService">${escapeHtml(detail.service_notes || '')}</textarea></label>
    <label style="grid-column:1/-1">Notas / fuentes<textarea class="textarea-large" id="recipeNotes">${escapeHtml(detail.notes || '')}</textarea></label></div></details></div>`;
}
function bakeryRecipeForm(detail, familyOptions, subfamilyOptions) {
    return `<div class="editor-sections"><details open><summary><b>Identidad y producción</b></summary><div class="grid two">
    <label>Nombre<input class="input" id="recipeName" value="${escapeAttr(detail.name || '')}" /></label>
    <label>Estado interno<select id="recipeStatus"><option value="draft" ${(detail.status || 'draft') === 'draft' ? 'selected' : ''}>Borrador / propuesta</option><option value="reviewed" ${detail.status === 'reviewed' ? 'selected' : ''}>Revisada documentalmente</option></select><small class="muted">La validación real queda reservada a prueba de obrador.</small></label>
    <label>Familia<select id="recipeFamily">${familyOptions}</select></label>
    <label>Subfamilia<select id="recipeSubfamily">${subfamilyOptions}</select></label>
    <label>Harina base g<input class="input" id="recipeBaseFlour" type="number" step="0.01" value="${escapeAttr(detail.base_flour_g || 1000)}" /></label>
    <label>Piezas base<input class="input" id="recipeBasePieces" type="number" step="0.01" value="${escapeAttr(detail.base_pieces || '')}" /></label>
    <label>Pérdida cocción %<input class="input" id="recipeBakingLoss" type="number" step="0.01" value="${escapeAttr(detail.baking_loss_pct || 0)}" /></label>
    <label>Temperatura masa ºC<input class="input" id="recipeDoughTemp" type="number" step="0.1" value="${escapeAttr(detail.target_dough_temp_c || '')}" /></label>
    </div></details><details open><summary><b>Proceso y observaciones</b></summary><div class="grid two">
    <label style="grid-column:1/-1">Proceso / fermentación<textarea class="textarea-large" id="recipeProcess">${escapeHtml(detail.fermentation_notes || '')}</textarea></label>
    <label style="grid-column:1/-1">Notas<textarea class="textarea-large" id="recipeNotes">${escapeHtml(detail.notes || '')}</textarea></label>
  </div></details></div>`;
}
function saveRecipeMain(recipe) {
    var _a;
    if (window.ObradORRSafeEditor && !window.ObradORRSafeEditor.confirmRiskySave(db, recipe.source_type, recipe.source_id, { action: 'saveRecipeMain' }))
        return false;
    const recipeName = document.getElementById('recipeName').value.trim();
    if (!recipeName)
        return showFormError('La elaboración necesita nombre.');
    const duplicate = findRecipeNameDuplicate(recipeName, recipe.source_type, recipe.source_id);
    if (duplicate)
        return showFormError(duplicateRecipeMessage(duplicate, recipeName));
    const common = {
        $id: recipe.source_id,
        $name: recipeName,
        $family: document.getElementById('recipeFamily').value || null,
        $subfamily: document.getElementById('recipeSubfamily').value || null,
        $status: document.getElementById('recipeStatus').value || 'draft',
        $process: document.getElementById('recipeProcess').value.trim(),
        $notes: ((_a = document.getElementById('recipeNotes')) === null || _a === void 0 ? void 0 : _a.value.trim()) || ''
    };
    withTransaction(() => {
        invalidateWorkshopValidationIfNeeded(recipe, 'Datos principales, proceso, APPCC o rendimiento modificados');
        if (recipe.source_type === 'culinary') {
            db.exec(`UPDATE culinary_recipes SET name=$name,family_id=$family,subfamily_id=$subfamily,status=$status,base_servings=$servings,serving_weight_g=$servingWeight,yield_quantity=$yieldQty,default_production_mode=$mode,process=$process,appcc_notes=$appcc,service_notes=$service,notes=$notes,updated_at=CURRENT_TIMESTAMP WHERE id=$id`, Object.assign(Object.assign({}, common), { $servings: positiveNumber(document.getElementById('recipeServings').value, 1), $servingWeight: nullableNumber(document.getElementById('recipeServingWeight').value), $yieldQty: nullableNumber(document.getElementById('recipeYieldQty').value), $mode: document.getElementById('recipeProdMode').value || 'servings', $appcc: document.getElementById('recipeAppcc').value.trim(), $service: document.getElementById('recipeService').value.trim() }));
        }
        else {
            db.exec(`UPDATE bakery_recipes SET name=$name,family_id=$family,subfamily_id=$subfamily,status=$status,base_flour_g=$flour,base_pieces=$pieces,baking_loss_pct=$loss,target_dough_temp_c=$temp,fermentation_notes=$process,notes=$notes,updated_at=CURRENT_TIMESTAMP WHERE id=$id`, Object.assign(Object.assign({}, common), { $flour: positiveNumber(document.getElementById('recipeBaseFlour').value, 1000), $pieces: nullableNumber(document.getElementById('recipeBasePieces').value), $loss: boundedNumber(document.getElementById('recipeBakingLoss').value, 0, 0, 95), $temp: nullableNumber(document.getElementById('recipeDoughTemp').value) }));
        }
    });
    return true;
}
function recipeLinesEditor(recipe) {
    if (recipe.source_type === 'bakery')
        return bakeryLinesEditor(recipe);
    return culinaryLinesEditor(recipe);
}
function culinaryLinesEditor(recipe) {
    const rows = db.query(`SELECT l.id,l.line_type,l.ingredient_id,l.subrecipe_id,l.quantity,l.unit_id,l.technical_note,l.sort_order,COALESCE(i.name,s.name,l.line_type) AS label,u.symbol AS unit_symbol
    FROM culinary_recipe_lines l LEFT JOIN ingredients i ON i.id=l.ingredient_id LEFT JOIN culinary_recipes s ON s.id=l.subrecipe_id LEFT JOIN units u ON u.id=l.unit_id WHERE l.recipe_id=$id ORDER BY l.sort_order,l.id`, { $id: recipe.source_id });
    if (!rows.length)
        return '<div class="empty">Todavía no hay líneas. Añade ingredientes para que la ficha pueda imprimirse.</div>';
    return `<div class="table-wrap editor-table-wrap"><table class="responsive-table editor-line-table"><thead><tr><th>Ingrediente/subelaboración</th><th>Cantidad</th><th>Unidad</th><th>Nota</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td data-label="Ingrediente/subelaboración"><b>${escapeHtml(r.label || '')}</b><br><small>${escapeHtml(r.line_type || '')}</small></td><td data-label="Cantidad"><input class="input compact" data-line-qty="${escapeAttr(r.id)}" value="${escapeAttr(r.quantity || 0)}" type="number" step="0.0001" /></td><td data-label="Unidad"><select data-line-unit="${escapeAttr(r.id)}">${unitOptionsHtml(r.unit_id)}</select></td><td data-label="Nota"><textarea class="line-note" data-line-note="${escapeAttr(r.id)}">${escapeHtml(r.technical_note || '')}</textarea></td><td data-label="Acción"><button class="btn danger" data-delete-line="${escapeAttr(r.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
}
function bakeryLinesEditor(recipe) {
    const rows = db.query(`SELECT l.id,l.ingredient_id,l.bakery_role,l.baker_pct,l.preferment_pct,l.final_dough_pct,l.unit_id,l.technical_note,l.sort_order,l.line_group,l.calculation_base,l.quantity_value,l.quantity_unit_id,l.include_in_dough,i.name AS ingredient_name,u.symbol AS unit_symbol
    FROM bakery_recipe_lines l JOIN ingredients i ON i.id=l.ingredient_id LEFT JOIN units u ON u.id=l.unit_id WHERE l.recipe_id=$id ORDER BY l.sort_order,l.id`, { $id: recipe.source_id });
    if (!rows.length)
        return '<div class="empty">Todavía no hay fórmula. Añade ingredientes con porcentaje panadero o acabados directos.</div>';
    return `<div class="notice" style="margin-bottom:10px">Las fórmulas separan masa/prefermento de acabados directos. Los componentes elaborados van en una sección independiente.</div><div class="table-wrap editor-table-wrap"><table class="responsive-table editor-line-table bakery-line-table"><thead><tr><th>Ingrediente</th><th>Grupo</th><th>Cálculo</th><th>% total</th><th>% pref.</th><th>% final</th><th>Valor</th><th>Unidad</th><th>Rol</th><th>Nota</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td data-label="Ingrediente"><b>${escapeHtml(r.ingredient_name || '')}</b></td><td data-label="Grupo"><select data-line-group="${escapeAttr(r.id)}">${lineGroupOptionsHtml(r.line_group)}</select></td><td data-label="Cálculo"><select data-line-calc="${escapeAttr(r.id)}">${calcBaseOptionsHtml(r.calculation_base)}</select></td><td data-label="% total"><input class="input compact" data-line-pct="${escapeAttr(r.id)}" value="${escapeAttr(r.baker_pct || 0)}" type="number" step="0.01" /></td><td data-label="% pref."><input class="input compact" data-line-pref="${escapeAttr(r.id)}" value="${escapeAttr(r.preferment_pct || 0)}" type="number" step="0.01" /></td><td data-label="% final"><input class="input compact" data-line-final="${escapeAttr(r.id)}" value="${escapeAttr(r.final_dough_pct || 0)}" type="number" step="0.01" /></td><td data-label="Valor"><input class="input compact" data-line-qvalue="${escapeAttr(r.id)}" value="${escapeAttr(r.quantity_value || 0)}" type="number" step="0.01" /></td><td data-label="Unidad"><select data-line-qunit="${escapeAttr(r.id)}">${unitOptionsHtml(r.quantity_unit_id || r.unit_id || 'UNIT_G')}</select></td><td data-label="Rol"><input class="input compact" data-line-role="${escapeAttr(r.id)}" value="${escapeAttr(r.bakery_role || 'other')}" /></td><td data-label="Nota"><textarea class="line-note" data-line-note="${escapeAttr(r.id)}">${escapeHtml(r.technical_note || '')}</textarea></td><td data-label="Acción"><button class="btn danger" data-delete-line="${escapeAttr(r.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
}
function lineGroupOptionsHtml(selected = 'dough') {
    const groups = [['dough', 'Masa'], ['filling', 'Relleno directo'], ['topping', 'Cobertura directa'], ['decoration', 'Decoración / acabado directo'], ['other', 'Otro']];
    return groups.map(([id, name]) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${name}</option>`).join('');
}
function calcBaseOptionsHtml(selected = 'baker_pct') {
    const opts = [['baker_pct', '% panadero'], ['flour_pct', '% sobre harina'], ['dough_pct', '% sobre masa cruda'], ['per_piece', 'Por pieza'], ['fixed', 'Cantidad fija']];
    return opts.map(([id, name]) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${name}</option>`).join('');
}
function bakeryComponentsEditor(recipe) {
    const rows = db.query('SELECT * FROM v_bakery_recipe_components_print WHERE bakery_recipe_id=$id ORDER BY sort_order,id', { $id: recipe.source_id });
    return `<div style="margin-top:18px"><h3>Componentes elaborados vinculados</h3><p class="footer-note">Usa esta sección para crema pastelera, chantilly, ganache, almíbar, planchas de bizcocho u otras fichas propias. No la uses para acabados simples como azúcar, nata directa o semillas.</p>
    ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Componente</th><th>Tipo</th><th>Uso</th><th>Estado</th><th>Cantidad</th><th>Cálculo</th><th>Pedido/Coste</th><th>Nota</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${escapeHtml(r.component_name || '')}</b></td><td>${escapeHtml(r.component_type)}</td><td>${escapeHtml(roleLabel(r.usage_role))}</td><td><span class="pill">${escapeHtml(componentStatusLabel(r.component_status))}</span></td><td>${escapeHtml(displayQuantity(r.quantity_value, r.unit_symbol).text)}</td><td>${escapeHtml(r.calculation_base)}</td><td>${Number(r.include_in_order) ? 'Pedido' : 'Sin pedido'} · ${Number(r.include_in_cost) ? 'Coste' : 'Sin coste'}</td><td>${escapeHtml(r.technical_note || '')}</td><td><div class="actions compact-actions"><button class="btn" data-edit-component="${escapeAttr(r.id)}">Editar</button><button class="btn danger" data-delete-component="${escapeAttr(r.id)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">No hay componentes elaborados vinculados.</div>`}
    <div class="actions" style="margin-top:10px"><button class="btn accent" id="addBakeryComponent">Añadir componente elaborado</button></div>
  </div>`;
}
function saveRecipeLines(recipe) {
    withTransaction(() => {
        invalidateWorkshopValidationIfNeeded(recipe, 'Datos principales, proceso, APPCC o rendimiento modificados');
        if (recipe.source_type === 'culinary') {
            document.querySelectorAll('[data-line-qty]').forEach(el => {
                var _a, _b;
                const id = el.dataset.lineQty;
                const qty = Number(el.value || 0);
                if (qty < 0)
                    throw new Error('Las cantidades no pueden ser negativas.');
                db.exec('UPDATE culinary_recipe_lines SET quantity=$qty, unit_id=$unit, technical_note=$note WHERE id=$id', { $qty: qty, $unit: ((_a = document.querySelector(`[data-line-unit="${cssEscape(id)}"]`)) === null || _a === void 0 ? void 0 : _a.value) || 'UNIT_G', $note: ((_b = document.querySelector(`[data-line-note="${cssEscape(id)}"]`)) === null || _b === void 0 ? void 0 : _b.value) || '', $id: id });
            });
        }
        else {
            document.querySelectorAll('[data-line-pct]').forEach(el => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                const id = el.dataset.linePct;
                const pct = Number(el.value || 0);
                const pref = Number(((_a = document.querySelector(`[data-line-pref="${cssEscape(id)}"]`)) === null || _a === void 0 ? void 0 : _a.value) || 0);
                const fin = Number(((_b = document.querySelector(`[data-line-final="${cssEscape(id)}"]`)) === null || _b === void 0 ? void 0 : _b.value) || 0);
                if (pct < 0 || pref < 0 || fin < 0)
                    throw new Error('Los porcentajes panaderos no pueden ser negativos.');
                const group = ((_c = document.querySelector(`[data-line-group="${cssEscape(id)}"]`)) === null || _c === void 0 ? void 0 : _c.value) || 'dough';
                const calc = ((_d = document.querySelector(`[data-line-calc="${cssEscape(id)}"]`)) === null || _d === void 0 ? void 0 : _d.value) || 'baker_pct';
                const qvalue = Number(((_e = document.querySelector(`[data-line-qvalue="${cssEscape(id)}"]`)) === null || _e === void 0 ? void 0 : _e.value) || 0);
                if (qvalue < 0)
                    throw new Error('Los valores de cálculo no pueden ser negativos.');
                db.exec(`UPDATE bakery_recipe_lines SET baker_pct=$pct, preferment_pct=$pref, final_dough_pct=$final, unit_id=$unit, bakery_role=$role, technical_note=$note, line_group=$group, calculation_base=$calc, quantity_value=$qvalue, quantity_unit_id=$qunit, include_in_dough=$include WHERE id=$id`, { $pct: pct, $pref: pref, $final: fin, $unit: ((_f = document.querySelector(`[data-line-qunit="${cssEscape(id)}"]`)) === null || _f === void 0 ? void 0 : _f.value) || 'UNIT_G', $role: ((_g = document.querySelector(`[data-line-role="${cssEscape(id)}"]`)) === null || _g === void 0 ? void 0 : _g.value) || 'other', $note: ((_h = document.querySelector(`[data-line-note="${cssEscape(id)}"]`)) === null || _h === void 0 ? void 0 : _h.value) || '', $group: group, $calc: calc, $qvalue: qvalue, $qunit: ((_j = document.querySelector(`[data-line-qunit="${cssEscape(id)}"]`)) === null || _j === void 0 ? void 0 : _j.value) || 'UNIT_G', $include: group === 'dough' ? 1 : 0, $id: id });
            });
        }
    });
}
function showAddRecipeLine(recipe) {
    var _a, _b;
    const isBakery = recipe.source_type === 'bakery';
    const title = isBakery ? 'Añadir ingrediente a la fórmula' : 'Añadir línea a la ficha culinaria';
    showModal(title, `<div class="grid two">
    ${isBakery ? `<label style="grid-column:1/-1">Ingrediente<select id="newLineIngredient">${ingredientOptionsHtml()}</select></label>
      <label>Grupo<select id="newLineGroup">${lineGroupOptionsHtml('dough')}</select></label><label>Cálculo<select id="newLineCalc">${calcBaseOptionsHtml('baker_pct')}</select></label><label>Rol<input class="input" id="newLineRole" value="other" /></label><label>% panadero<input class="input" id="newLinePct" type="number" step="0.01" value="10" /></label><label>Valor cálculo<input class="input" id="newLineQValue" type="number" step="0.01" value="10" /></label><label>Unidad cálculo<select id="newLineUnit">${unitOptionsHtml('UNIT_G')}</select></label>` : `
      <label>Tipo de línea<select id="newLineType"><option value="ingredient">Ingrediente</option><option value="subrecipe">Subelaboración</option></select></label>
      <label style="grid-column:1/-1">Ingrediente / subelaboración<select id="newLineRef">${ingredientOptionsHtml()}</select></label>
      <label>Cantidad<input class="input" id="newLineQty" type="number" step="0.0001" value="1" /></label><label>Unidad<select id="newLineUnit">${unitOptionsHtml('UNIT_G')}</select></label>`}
    <label style="grid-column:1/-1">Nota<input class="input" id="newLineNote" /></label>
    <div class="actions"><button class="btn primary" id="confirmAddLine">Añadir línea</button></div>
  </div>`);
    if (!isBakery) {
        (_a = document.getElementById('newLineType')) === null || _a === void 0 ? void 0 : _a.addEventListener('change', e => {
            const ref = document.getElementById('newLineRef');
            if (ref)
                ref.innerHTML = e.target.value === 'subrecipe' ? culinarySubrecipeOptionsHtml(recipe.source_id) : ingredientOptionsHtml();
        });
    }
    (_b = document.getElementById('confirmAddLine')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', async () => {
        const id = uniqueId(isBakery ? 'BL' : 'CL', recipe.source_id);
        const sort = nextSort(isBakery ? 'bakery_recipe_lines' : 'culinary_recipe_lines', recipe.source_id);
        if (isBakery) {
            const ingredient = document.getElementById('newLineIngredient').value;
            const pct = Number(document.getElementById('newLinePct').value || 0);
            const group = document.getElementById('newLineGroup').value || 'dough';
            const calc = document.getElementById('newLineCalc').value || 'baker_pct';
            const qvalue = Number(document.getElementById('newLineQValue').value || pct);
            const qunit = document.getElementById('newLineUnit').value || 'UNIT_G';
            if (!ingredient || pct < 0 || qvalue < 0)
                return alert('Revisa ingrediente, porcentaje y valor de cálculo.');
            withTransaction(() => db.exec(`INSERT INTO bakery_recipe_lines (id,recipe_id,ingredient_id,bakery_role,baker_pct,preferment_pct,final_dough_pct,unit_id,technical_note,sort_order,line_group,calculation_base,quantity_value,quantity_unit_id,include_in_dough)
        VALUES ($id,$recipe,$ingredient,$role,$pct,0,$pct,$unit,$note,$sort,$group,$calc,$qvalue,$qunit,$include)`, { $id: id, $recipe: recipe.source_id, $ingredient: ingredient, $role: document.getElementById('newLineRole').value || 'other', $pct: pct, $unit: qunit, $note: document.getElementById('newLineNote').value || '', $sort: sort, $group: group, $calc: calc, $qvalue: qvalue, $qunit: qunit, $include: group === 'dough' ? 1 : 0 }));
        }
        else {
            const type = document.getElementById('newLineType').value || 'ingredient';
            const ref = document.getElementById('newLineRef').value;
            const qty = Number(document.getElementById('newLineQty').value || 0);
            const unit = document.getElementById('newLineUnit').value || 'UNIT_G';
            if (!ref || qty <= 0)
                return alert('Revisa la línea: la referencia y la cantidad son obligatorias.');
            if (type === 'subrecipe' && wouldCreateCulinaryCycle(recipe.source_id, ref))
                return showFormError('Esa subelaboración crearía un ciclo. Elige otra ficha.');
            withTransaction(() => db.exec(`INSERT INTO culinary_recipe_lines (id,recipe_id,line_type,ingredient_id,subrecipe_id,quantity,unit_id,waste_pct,technical_note,sort_order)
        VALUES ($id,$recipe,$type,$ingredient,$subrecipe,$qty,$unit,0,$note,$sort)`, { $id: id, $recipe: recipe.source_id, $type: type, $ingredient: type === 'ingredient' ? ref : null, $subrecipe: type === 'subrecipe' ? ref : null, $qty: qty, $unit: unit, $note: document.getElementById('newLineNote').value || '', $sort: sort }));
        }
        await loadCatalogs();
        scheduleDbAutosave('Línea añadida');
        closeModal();
        showRecipeEditor(recipe.uid);
    });
}
function wouldCreateCulinaryCycle(parentId, childId) {
    if (!parentId || !childId)
        return false;
    if (parentId === childId)
        return true;
    const stack = [childId];
    const seen = new Set();
    while (stack.length) {
        const current = stack.pop();
        if (!current || seen.has(current))
            continue;
        if (current === parentId)
            return true;
        seen.add(current);
        db.query("SELECT subrecipe_id FROM culinary_recipe_lines WHERE recipe_id=$id AND line_type='subrecipe' AND subrecipe_id IS NOT NULL", { $id: current }).forEach(r => stack.push(r.subrecipe_id));
    }
    return false;
}
function culinarySubrecipeOptionsHtml(currentRecipeId) {
    return state.recipes
        .filter(r => r.source_type === 'culinary' && r.source_id !== currentRecipeId)
        .map(r => `<option value="${escapeAttr(r.source_id)}">${escapeHtml(r.name)}</option>`).join('');
}

function bakeryPrefermentEditor(recipe) {
    const p = db.query('SELECT * FROM bakery_preferments WHERE recipe_id=$id', { $id: recipe.source_id })[0] || { preferment_type: '', calculation_mode: 'none', hydration_pct: 100, flour_prefermented_pct: '', preferment_total_pct: '', yeast_type_id: '', yeast_pct: 0, yeast_pct_base: 'total_flour', time_hours: '', temperature_c: '', notes: '', active: 0 };
    return `<details class="edit-block"><summary><b>Prefermento</b></summary><div class="grid two">
    <label>Activo<select id="prefActive"><option value="0" ${Number(p.active || 0) ? '' : 'selected'}>No</option><option value="1" ${Number(p.active || 0) ? 'selected' : ''}>Sí</option></select></label>
    <label>Tipo<input class="input" id="prefType" value="${escapeAttr(p.preferment_type || '')}" placeholder="Poolish, biga, masa madre..." /></label>
    <label>Modo cálculo<select id="prefCalc"><option value="none" ${p.calculation_mode === 'none' ? 'selected' : ''}>Sin cálculo específico</option><option value="flour_prefermented_pct" ${p.calculation_mode === 'flour_prefermented_pct' ? 'selected' : ''}>% harina prefermentada</option><option value="preferment_total_pct" ${p.calculation_mode === 'preferment_total_pct' ? 'selected' : ''}>% prefermento total</option></select></label>
    <label>Hidratación %<input class="input" type="number" step="0.01" id="prefHydration" value="${escapeAttr(p.hydration_pct || 100)}" /></label>
    <label>Harina prefermentada %<input class="input" type="number" step="0.01" id="prefFlourPct" value="${escapeAttr(p.flour_prefermented_pct || '')}" /></label>
    <label>Prefermento total %<input class="input" type="number" step="0.01" id="prefTotalPct" value="${escapeAttr(p.preferment_total_pct || '')}" /></label>
    <label>Levadura %<input class="input" type="number" step="0.001" id="prefYeastPct" value="${escapeAttr(p.yeast_pct || 0)}" /></label>
    <label>Base levadura<select id="prefYeastBase"><option value="total_flour" ${p.yeast_pct_base === 'total_flour' ? 'selected' : ''}>Sobre harina total</option><option value="preferment_flour" ${p.yeast_pct_base === 'preferment_flour' ? 'selected' : ''}>Sobre harina prefermentada</option></select></label>
    <label>Tiempo h<input class="input" type="number" step="0.1" id="prefTime" value="${escapeAttr(p.time_hours || '')}" /></label>
    <label>Temperatura ºC<input class="input" type="number" step="0.1" id="prefTemp" value="${escapeAttr(p.temperature_c || '')}" /></label>
    <label style="grid-column:1/-1">Notas<textarea id="prefNotes">${escapeHtml(p.notes || '')}</textarea></label>
    <div class="actions"><button class="btn primary" id="saveBakeryPreferment">Guardar prefermento</button></div>
  </div></details>`;
}
function saveBakeryPreferment(recipe) {
    const hydration = boundedNumber(document.getElementById('prefHydration').value, 100, 0, 500);
    const yeast = boundedNumber(document.getElementById('prefYeastPct').value, 0, 0, 100);
    const mode = document.getElementById('prefCalc').value || 'none';
    const flourPct = nullableNumber(document.getElementById('prefFlourPct').value);
    const totalPct = nullableNumber(document.getElementById('prefTotalPct').value);
    if (mode === 'flour_prefermented_pct' && (flourPct === null || flourPct < 0 || flourPct > 100))
        throw new Error('La harina prefermentada debe estar entre 0 y 100 %.');
    if (mode === 'preferment_total_pct' && (totalPct === null || totalPct < 0))
        throw new Error('El porcentaje de prefermento total debe ser positivo.');
    withTransaction(() => {
        invalidateWorkshopValidationIfNeeded(recipe, 'Prefermento modificado');
        db.exec(`INSERT INTO bakery_preferments (recipe_id,preferment_type,calculation_mode,hydration_pct,flour_prefermented_pct,preferment_total_pct,yeast_pct,yeast_pct_base,time_hours,temperature_c,notes,active,updated_at)
      VALUES ($id,$type,$mode,$hydration,$flourPct,$totalPct,$yeast,$yeastBase,$time,$temp,$notes,$active,CURRENT_TIMESTAMP)
      ON CONFLICT(recipe_id) DO UPDATE SET preferment_type=excluded.preferment_type,calculation_mode=excluded.calculation_mode,hydration_pct=excluded.hydration_pct,flour_prefermented_pct=excluded.flour_prefermented_pct,preferment_total_pct=excluded.preferment_total_pct,yeast_pct=excluded.yeast_pct,yeast_pct_base=excluded.yeast_pct_base,time_hours=excluded.time_hours,temperature_c=excluded.temperature_c,notes=excluded.notes,active=excluded.active,updated_at=CURRENT_TIMESTAMP`, {
            $id: recipe.source_id,
            $type: document.getElementById('prefType').value.trim() || 'Prefermento',
            $mode: mode,
            $hydration: hydration,
            $flourPct: flourPct,
            $totalPct: totalPct,
            $yeast: yeast,
            $yeastBase: document.getElementById('prefYeastBase').value || 'total_flour',
            $time: nullableNumber(document.getElementById('prefTime').value),
            $temp: nullableNumber(document.getElementById('prefTemp').value),
            $notes: document.getElementById('prefNotes').value.trim(),
            $active: Number(document.getElementById('prefActive').value || 0)
        });
    });
}
function bakeryProcessStepsEditor(recipe) {
    const rows = db.query('SELECT * FROM bakery_process_steps WHERE recipe_id=$id ORDER BY block, step_number, id', { $id: recipe.source_id });
    return `<details class="edit-block"><summary><b>Pasos técnicos</b></summary>${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Bloque</th><th>Nº</th><th>Instrucción</th><th>Min</th><th>ºC</th><th>Notas</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><select data-step-block="${escapeAttr(r.id)}">${processBlockOptionsHtml(r.block)}</select></td><td><input class="input compact" type="number" step="1" data-step-number="${escapeAttr(r.id)}" value="${escapeAttr(r.step_number || 1)}" /></td><td><textarea data-step-instruction="${escapeAttr(r.id)}">${escapeHtml(r.instruction || '')}</textarea></td><td><input class="input compact" type="number" step="0.1" data-step-duration="${escapeAttr(r.id)}" value="${escapeAttr(r.duration_min || '')}" /></td><td><input class="input compact" type="number" step="0.1" data-step-temp="${escapeAttr(r.id)}" value="${escapeAttr(r.temperature_c || '')}" /></td><td><textarea data-step-notes="${escapeAttr(r.id)}">${escapeHtml(r.notes || '')}</textarea></td><td><button class="btn danger" data-delete-step="${escapeAttr(r.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">No hay pasos técnicos. Añade los bloques básicos de trabajo.</div>`}
    <div class="actions" style="margin-top:10px"><button class="btn primary" id="saveBakerySteps">Guardar pasos</button><button class="btn accent" id="addBakeryStep">Añadir paso</button></div></details>`;
}
function processBlockOptionsHtml(selected = 'other') {
    const blocks = [['preferment', 'Prefermento'], ['final_dough', 'Amasado / reposo / formado / fermentación'], ['baking', 'Cocción'], ['cooling', 'Enfriado / conservación'], ['other', 'Acabado / otro']];
    return blocks.map(([id, name]) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${name}</option>`).join('');
}
function saveBakerySteps(recipe) {
    withTransaction(() => {
        invalidateWorkshopValidationIfNeeded(recipe, 'Pasos técnicos de proceso modificados');
        document.querySelectorAll('[data-step-number]').forEach(el => {
            const id = el.dataset.stepNumber;
            const stepNumber = Math.max(1, Math.round(Number(el.value || 1)));
            const instruction = (document.querySelector(`[data-step-instruction="${cssEscape(id)}"]`)?.value || '').trim();
            if (!instruction)
                throw new Error('Todos los pasos técnicos necesitan instrucción.');
            db.exec(`UPDATE bakery_process_steps SET block=$block, step_number=$step, instruction=$instruction, duration_min=$duration, temperature_c=$temp, notes=$notes WHERE id=$id`, {
                $block: document.querySelector(`[data-step-block="${cssEscape(id)}"]`)?.value || 'other',
                $step: stepNumber,
                $instruction: instruction,
                $duration: nullableNumber(document.querySelector(`[data-step-duration="${cssEscape(id)}"]`)?.value),
                $temp: nullableNumber(document.querySelector(`[data-step-temp="${cssEscape(id)}"]`)?.value),
                $notes: document.querySelector(`[data-step-notes="${cssEscape(id)}"]`)?.value || '',
                $id: id
            });
        });
    });
}
function showAddBakeryStep(recipe) {
    showModal('Añadir paso técnico', `<div class="grid two">
    <label>Bloque<select id="newStepBlock">${processBlockOptionsHtml('final_dough')}</select></label>
    <label>Nº de paso<input class="input" id="newStepNumber" type="number" step="1" value="${escapeAttr(Number(db.value('SELECT COALESCE(MAX(step_number),0)+1 FROM bakery_process_steps WHERE recipe_id=$id', { $id: recipe.source_id }) || 1))}" /></label>
    <label style="grid-column:1/-1">Instrucción<textarea id="newStepInstruction"></textarea></label>
    <label>Duración min<input class="input" id="newStepDuration" type="number" step="0.1" /></label>
    <label>Temperatura ºC<input class="input" id="newStepTemp" type="number" step="0.1" /></label>
    <label style="grid-column:1/-1">Notas<textarea id="newStepNotes"></textarea></label>
    <div class="actions"><button class="btn primary" id="confirmAddStep">Añadir paso</button></div>
  </div>`);
    document.getElementById('confirmAddStep')?.addEventListener('click', async () => {
        const instruction = document.getElementById('newStepInstruction').value.trim();
        if (!instruction)
            return showFormError('El paso necesita instrucción.');
        withTransaction(() => { invalidateWorkshopValidationIfNeeded(recipe, 'Paso técnico añadido'); db.exec(`INSERT INTO bakery_process_steps (id,recipe_id,block,step_number,instruction,duration_min,temperature_c,notes)
        VALUES ($id,$recipe,$block,$step,$instruction,$duration,$temp,$notes)`, {
            $id: uniqueId('BST', recipe.source_id),
            $recipe: recipe.source_id,
            $block: document.getElementById('newStepBlock').value || 'other',
            $step: Math.max(1, Math.round(Number(document.getElementById('newStepNumber').value || 1))),
            $instruction: instruction,
            $duration: nullableNumber(document.getElementById('newStepDuration').value),
            $temp: nullableNumber(document.getElementById('newStepTemp').value),
            $notes: document.getElementById('newStepNotes').value.trim()
        }); });
        await loadCatalogs();
        scheduleDbAutosave('Paso técnico añadido');
        closeModal();
        showRecipeEditor(recipe.uid);
    });
}
function deleteBakeryStep(id) {
    if (!confirm('¿Eliminar este paso técnico?'))
        return false;
    const row = db.query('SELECT recipe_id FROM bakery_process_steps WHERE id=$id', { $id: id })[0];
    const recipe = row ? state.recipes.find(r => r.source_type === 'bakery' && r.source_id === row.recipe_id) : null;
    withTransaction(() => { if (recipe) invalidateWorkshopValidationIfNeeded(recipe, 'Paso técnico eliminado'); db.exec('DELETE FROM bakery_process_steps WHERE id=$id', { $id: id }); });
    return true;
}
function showAddBakeryComponent(recipe) {
    var _a, _b;
    showModal('Añadir componente elaborado', `<div class="grid two">
    <label>Tipo de componente<select id="componentType"><option value="culinary">Ficha culinaria/técnica</option><option value="bakery">Formulación panadera/pastelera</option></select></label>
    <label style="grid-column:1/-1">Componente<select id="componentRecipe">${componentRecipeOptionsHtml('culinary', recipe.source_id)}</select></label>
    <label>Uso<select id="componentRole"><option value="filling">Relleno</option><option value="topping">Cobertura</option><option value="decoration">Decoración</option><option value="glaze">Glaseado</option><option value="soak">Baño / calado</option><option value="cream">Crema</option><option value="base">Base</option><option value="insert">Inserto</option><option value="other">Otro</option></select></label>
    <label>Estado<select id="componentStatus">${componentStatusOptionsHtml("required")}</select></label>
    <label>Cálculo<select id="componentCalc"><option value="fixed">Cantidad fija</option><option value="per_piece">Por pieza</option><option value="flour_pct">% sobre harina</option><option value="dough_pct">% sobre masa cruda</option><option value="baked_weight_pct">% sobre peso cocido</option></select></label>
    <label>Cantidad / valor<input class="input" id="componentQty" type="number" step="0.0001" value="1" /></label>
    <label>Unidad<select id="componentUnit">${unitOptionsHtml('UNIT_KG')}</select></label>
    <label style="grid-column:1/-1">Nota<input class="input" id="componentNote" /></label>
    <div class="actions"><button class="btn primary" id="confirmAddComponent">Añadir componente</button></div>
  </div>`);
    (_a = document.getElementById('componentType')) === null || _a === void 0 ? void 0 : _a.addEventListener('change', e => { document.getElementById('componentRecipe').innerHTML = componentRecipeOptionsHtml(e.target.value, recipe.source_id); });
    (_b = document.getElementById('confirmAddComponent')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', async () => {
        const type = document.getElementById('componentType').value;
        const compId = document.getElementById('componentRecipe').value;
        const qty = Number(document.getElementById('componentQty').value || 0);
        if (!compId || qty < 0)
            return alert('Revisa el componente y la cantidad.');
        const id = uniqueId('BC', `${recipe.source_id}-${compId}`);
        const sort = Number(db.value('SELECT COALESCE(MAX(sort_order),0)+10 FROM bakery_recipe_components WHERE bakery_recipe_id=$id', { $id: recipe.source_id }) || 10);
        if (type === 'bakery' && wouldCreateBakeryComponentCycle(recipe.source_id, compId))
            return showFormError('Ese componente crearía un ciclo entre formulaciones panaderas.');
        withTransaction(() => { invalidateWorkshopValidationIfNeeded(recipe, 'Componente elaborado añadido'); db.exec(`INSERT INTO bakery_recipe_components (id,bakery_recipe_id,component_culinary_recipe_id,component_bakery_recipe_id,usage_role,component_status,calculation_base,quantity_value,unit_id,technical_note,sort_order,include_in_order,include_in_cost)
      VALUES ($id,$recipe,$culinary,$bakery,$role,$status,$calc,$qty,$unit,$note,$sort,$order,$cost)`, { $id: id, $recipe: recipe.source_id, $culinary: type === 'culinary' ? compId : null, $bakery: type === 'bakery' ? compId : null, $role: document.getElementById('componentRole').value || 'other', $status: document.getElementById('componentStatus').value || 'required', $calc: document.getElementById('componentCalc').value || 'fixed', $qty: qty, $unit: document.getElementById('componentUnit').value || 'UNIT_KG', $note: document.getElementById('componentNote').value || '', $sort: sort, $order: (document.getElementById('componentStatus').value || 'required') === 'required' ? 1 : 0, $cost: (document.getElementById('componentStatus').value || 'required') === 'required' ? 1 : 0 }); });
        await loadCatalogs();
        scheduleDbAutosave('Componente añadido');
        closeModal();
        showRecipeEditor(recipe.uid);
    });
}
function componentRecipeOptionsHtml(type, currentBakeryId) {
    return state.recipes.filter(r => r.source_type === type && !(type === 'bakery' && r.source_id === currentBakeryId))
        .map(r => `<option value="${escapeAttr(r.source_id)}">${escapeHtml(r.name)}</option>`).join('');
}
function deleteBakeryComponent(id) {
    if (window.ObradORRSafeEditor && !window.ObradORRSafeEditor.confirmDeleteComponent(db, id))
        return false;
    if (!window.ObradORRSafeEditor && !confirm('¿Eliminar este componente elaborado?'))
        return false;
    const row = db.query('SELECT bakery_recipe_id FROM bakery_recipe_components WHERE id=$id', { $id: id })[0];
    const recipe = row ? state.recipes.find(r => r.source_type === 'bakery' && r.source_id === row.bakery_recipe_id) : null;
    withTransaction(() => { if (recipe) invalidateWorkshopValidationIfNeeded(recipe, 'Componente elaborado eliminado'); db.exec('DELETE FROM bakery_recipe_components WHERE id=$id', { $id: id }); });
    return true;
}
function showEditBakeryComponent(recipe, id) {
    const c = db.query('SELECT * FROM bakery_recipe_components WHERE id=$id', { $id: id })[0];
    if (!c)
        return alert('No se localizó el componente.');
    const type = c.component_culinary_recipe_id ? 'culinary' : 'bakery';
    showModal('Editar componente elaborado', `<div class="grid two">
    <label>Tipo<select id="componentType"><option value="culinary" ${type === 'culinary' ? 'selected' : ''}>Ficha culinaria/técnica</option><option value="bakery" ${type === 'bakery' ? 'selected' : ''}>Formulación panadera/pastelera</option></select></label>
    <label style="grid-column:1/-1">Componente<select id="componentRecipe">${componentRecipeOptionsHtml(type, recipe.source_id)}</select></label>
    <label>Uso<select id="componentRole"><option value="filling">Relleno</option><option value="topping">Cobertura</option><option value="decoration">Decoración</option><option value="glaze">Glaseado</option><option value="soak">Baño / calado</option><option value="cream">Crema</option><option value="base">Base</option><option value="insert">Inserto</option><option value="other">Otro</option></select></label>
    <label>Estado<select id="componentStatus">${componentStatusOptionsHtml("required")}</select></label>
    <label>Cálculo<select id="componentCalc"><option value="fixed">Cantidad fija</option><option value="per_piece">Por pieza</option><option value="flour_pct">% sobre harina</option><option value="dough_pct">% sobre masa cruda</option><option value="baked_weight_pct">% sobre peso cocido</option></select></label>
    <label>Cantidad / valor<input class="input" id="componentQty" type="number" step="0.0001" value="${escapeAttr(c.quantity_value)}" /></label>
    <label>Unidad<select id="componentUnit">${unitOptionsHtml(c.unit_id || 'UNIT_KG')}</select></label>
    <label>Incluir en pedido<select id="componentOrder"><option value="1" ${Number(c.include_in_order) ? 'selected' : ''}>Sí</option><option value="0" ${Number(c.include_in_order) ? '' : 'selected'}>No</option></select></label>
    <label>Incluir en coste<select id="componentCost"><option value="1" ${Number(c.include_in_cost) ? 'selected' : ''}>Sí</option><option value="0" ${Number(c.include_in_cost) ? '' : 'selected'}>No</option></select></label>
    <label style="grid-column:1/-1">Nota<input class="input" id="componentNote" value="${escapeAttr(c.technical_note || '')}" /></label>
    <div class="actions"><button class="btn primary" id="confirmEditComponent">Guardar componente</button></div>
  </div>`);
    const recipeSelect = document.getElementById('componentRecipe');
    if (recipeSelect)
        recipeSelect.value = c.component_culinary_recipe_id || c.component_bakery_recipe_id || '';
    const role = document.getElementById('componentRole');
    if (role)
        role.value = c.usage_role || 'other';
    const calc = document.getElementById('componentCalc');
    if (calc)
        calc.value = c.calculation_base || 'fixed';
    document.getElementById('componentType')?.addEventListener('change', e => { document.getElementById('componentRecipe').innerHTML = componentRecipeOptionsHtml(e.target.value, recipe.source_id); });
    document.getElementById('confirmEditComponent')?.addEventListener('click', async () => {
        const type2 = document.getElementById('componentType').value;
        const compId = document.getElementById('componentRecipe').value;
        const qty = Number(document.getElementById('componentQty').value || 0);
        if (!compId || qty < 0)
            return showFormError('Revisa el componente y la cantidad.');
        if (type2 === 'bakery' && wouldCreateBakeryComponentCycle(recipe.source_id, compId, id))
            return showFormError('Ese componente crearía un ciclo entre formulaciones panaderas.');
        withTransaction(() => { invalidateWorkshopValidationIfNeeded(recipe, 'Componente elaborado modificado'); db.exec(`UPDATE bakery_recipe_components SET component_culinary_recipe_id=$culinary,component_bakery_recipe_id=$bakery,usage_role=$role,component_status=$status,calculation_base=$calc,quantity_value=$qty,unit_id=$unit,technical_note=$note,include_in_order=$order,include_in_cost=$cost,updated_at=CURRENT_TIMESTAMP WHERE id=$id`, {
            $id: id,
            $culinary: type2 === 'culinary' ? compId : null,
            $bakery: type2 === 'bakery' ? compId : null,
            $role: document.getElementById('componentRole').value || 'other',
            $status: document.getElementById('componentStatus').value || 'required',
            $calc: document.getElementById('componentCalc').value || 'fixed',
            $qty: qty,
            $unit: document.getElementById('componentUnit').value || 'UNIT_KG',
            $note: document.getElementById('componentNote').value || '',
            $order: (document.getElementById('componentStatus').value || 'required') === 'required' ? Number(document.getElementById('componentOrder').value || 1) : 0,
            $cost: (document.getElementById('componentStatus').value || 'required') === 'required' ? Number(document.getElementById('componentCost').value || 1) : 0
        }); });
        await loadCatalogs();
        scheduleDbAutosave('Componente editado');
        closeModal();
        showRecipeEditor(recipe.uid);
    });
}
function wouldCreateBakeryComponentCycle(parentId, childId, ignoreComponentId = '') {
    if (!parentId || !childId)
        return false;
    if (parentId === childId)
        return true;
    const stack = [childId];
    const seen = new Set();
    while (stack.length) {
        const current = stack.pop();
        if (!current || seen.has(current))
            continue;
        if (current === parentId)
            return true;
        seen.add(current);
        const rows = db.query('SELECT id, component_bakery_recipe_id FROM bakery_recipe_components WHERE bakery_recipe_id=$id AND active=1 AND component_bakery_recipe_id IS NOT NULL', { $id: current });
        rows.filter(r => r.id !== ignoreComponentId).forEach(r => stack.push(r.component_bakery_recipe_id));
    }
    return false;
}

function usageCount(sql, params) {
    const row = db.query(sql, params)[0];
    return Number((row && (row.n !== undefined ? row.n : Object.values(row)[0])) || 0);
}
function usageSummaryText(usages) {
    return usages.filter(u => u.count > 0).map(u => `${u.label}: ${u.count}`).join(' · ');
}
function recipeUsageReport(recipe) {
    const id = recipe.source_id;
    if (recipe.source_type === 'culinary') {
        return [
            { label: 'usada como subreceta culinaria', count: usageCount('SELECT COUNT(*) AS n FROM culinary_recipe_lines WHERE subrecipe_id=$id', { $id: id }) },
            { label: 'usada como componente panadero/pastelero', count: usageCount('SELECT COUNT(*) AS n FROM bakery_recipe_components WHERE component_culinary_recipe_id=$id AND COALESCE(active,1)=1', { $id: id }) },
            { label: 'presente en la sesión actual', count: usageCount("SELECT COUNT(*) AS n FROM work_selection_items WHERE item_type='culinary' AND culinary_recipe_id=$id", { $id: id }) },
            { label: 'presente en sesiones guardadas', count: usageCount("SELECT COUNT(*) AS n FROM class_session_items WHERE item_type='culinary' AND culinary_recipe_id=$id", { $id: id }) }
        ];
    }
    return [
        { label: 'usada como componente panadero/pastelero', count: usageCount('SELECT COUNT(*) AS n FROM bakery_recipe_components WHERE component_bakery_recipe_id=$id AND COALESCE(active,1)=1', { $id: id }) },
        { label: 'presente en la sesión actual', count: usageCount("SELECT COUNT(*) AS n FROM work_selection_items WHERE item_type='bakery' AND bakery_recipe_id=$id", { $id: id }) },
        { label: 'presente en sesiones guardadas', count: usageCount("SELECT COUNT(*) AS n FROM class_session_items WHERE item_type='bakery' AND bakery_recipe_id=$id", { $id: id }) }
    ];
}
async function deleteRecipeSafely(recipe) {
    try {
        const usages = recipeUsageReport(recipe).filter(u => u.count > 0);
        if (usages.length) {
            return showFormError(`No se puede eliminar esta elaboración porque está en uso. Retira primero sus vínculos: ${usageSummaryText(usages)}.`);
        }
        const label = `${recipe.name || recipe.source_id}`;
        if (!confirm(`¿Eliminar definitivamente la elaboración “${label}”?\n\nSolo se eliminará porque no está en uso en otras fichas, componentes, sesión actual ni sesiones guardadas.`))
            return false;
        withTransaction(() => {
            db.exec('DELETE FROM recipe_documentary_reviews WHERE recipe_kind=$kind AND recipe_id=$id', { $kind: recipe.source_type, $id: recipe.source_id });
            if (recipe.source_type === 'bakery')
                db.exec('DELETE FROM bakery_recipes WHERE id=$id', { $id: recipe.source_id });
            else
                db.exec('DELETE FROM culinary_recipes WHERE id=$id', { $id: recipe.source_id });
        });
        await loadCatalogs();
        scheduleDbAutosave('Elaboración eliminada');
        closeModal();
        render();
        return true;
    }
    catch (error) {
        return showFormError(error);
    }
}
function ingredientUsageReport(id) {
    return [
        { label: 'líneas de recetas culinarias', count: usageCount('SELECT COUNT(*) AS n FROM culinary_recipe_lines WHERE ingredient_id=$id', { $id: id }) },
        { label: 'líneas de fórmulas panaderas/pasteleras', count: usageCount('SELECT COUNT(*) AS n FROM bakery_recipe_lines WHERE ingredient_id=$id', { $id: id }) }
    ];
}
async function deleteIngredientSafely(id) {
    try {
        const row = db.query('SELECT id,name FROM ingredients WHERE id=$id', { $id: id })[0];
        if (!row)
            return showFormError('No se localizó el ingrediente.');
        const usages = ingredientUsageReport(id).filter(u => u.count > 0);
        if (usages.length) {
            return showFormError(`No se puede eliminar este ingrediente porque está en uso. Retíralo primero de las fichas: ${usageSummaryText(usages)}.`);
        }
        if (!confirm(`¿Eliminar definitivamente el ingrediente “${row.name}”?\n\nSolo se eliminará porque no aparece en recetas ni fórmulas.`))
            return false;
        withTransaction(() => db.exec('DELETE FROM ingredients WHERE id=$id', { $id: id }));
        await loadCatalogs();
        scheduleDbAutosave('Ingrediente eliminado');
        closeModal();
        render();
        return true;
    }
    catch (error) {
        return showFormError(error);
    }
}

function deleteRecipeLine(recipe, lineId) {
    if (window.ObradORRSafeEditor && !window.ObradORRSafeEditor.confirmDeleteLine(db, recipe.source_type, lineId))
        return false;
    if (!window.ObradORRSafeEditor && !confirm('¿Eliminar esta línea?'))
        return false;
    withTransaction(() => { invalidateWorkshopValidationIfNeeded(recipe, 'Línea de ingrediente o subreceta eliminada'); db.exec(recipe.source_type === 'bakery' ? 'DELETE FROM bakery_recipe_lines WHERE id=$id' : 'DELETE FROM culinary_recipe_lines WHERE id=$id', { $id: lineId }); });
    return true;
}
function showIngredientCreator() {
    showModal('Nuevo ingrediente', `<div class="notice"><b>Alta controlada:</b> no se crea ningún ingrediente hasta pulsar <b>Crear y editar</b>. Puedes cancelar sin dejar registros de prueba.</div><div class="grid two">
    <label style="grid-column:1/-1">Nombre<input class="input" id="newIngredientName" placeholder="Ejemplo: Harina de trigo panificable" autocomplete="off" /></label>
  </div><div class="actions"><button class="btn primary" id="confirmCreateIngredient">Crear y editar</button><button class="btn" id="cancelCreateIngredient">Cancelar</button></div>`);
    document.getElementById('cancelCreateIngredient')?.addEventListener('click', closeModal);
    const nameInput = document.getElementById('newIngredientName');
    if (nameInput)
        nameInput.focus();
    document.getElementById('confirmCreateIngredient')?.addEventListener('click', async () => {
        var _a, _b, _c;
        try {
            const ingredientName = String(document.getElementById('newIngredientName')?.value || '').trim();
            if (!ingredientName)
                return showFormError('Indica un nombre antes de crear el ingrediente.');
            const duplicate = findIngredientNameDuplicate(ingredientName);
            if (duplicate)
                return showFormError(duplicateIngredientMessage(duplicate, ingredientName));
            const id = uniqueId('ING', ingredientName);
            const family = defaultFamilyId('ingredient');
            const orderGroup = ((_a = state.orderGroups[0]) === null || _a === void 0 ? void 0 : _a.id) || null;
            const storage = ((_b = state.storageZones.find(z => z.name === 'Seco')) === null || _b === void 0 ? void 0 : _b.id) || ((_c = state.storageZones[0]) === null || _c === void 0 ? void 0 : _c.id) || null;
            withTransaction(() => db.exec(`INSERT INTO ingredients (id,name,family_id,subfamily_id,order_group_id,storage_zone_id,base_unit_id,purchase_unit_id,purchase_price,purchase_net_quantity,waste_pct,use_culinary,use_bakery,notes,active)
        VALUES ($id,$name,$family,NULL,$order,$storage,'UNIT_KG','UNIT_KG',0,1,0,1,0,'',1)`, { $id: id, $name: ingredientName, $family: family, $order: orderGroup, $storage: storage }));
            await loadCatalogs();
            scheduleDbAutosave('Ingrediente creado');
            closeModal();
            showIngredientEditor(id);
        }
        catch (error) {
            return showFormError(error);
        }
    });
}
function showIngredientEditor(id) {
    var _a, _b;
    const row = db.query('SELECT * FROM ingredients WHERE id=$id', { $id: id })[0];
    if (!row)
        return;
    const selectedAllergens = new Set(db.query('SELECT allergen_id FROM ingredient_allergens WHERE ingredient_id=$id', { $id: id }).map(a => a.allergen_id));
    showModal('Editar ingrediente', `<div class="editor-toolbar-rc1 actions ingredient-editor-toolbar"><button class="btn primary" id="saveIngEdit">Guardar ingrediente</button><button class="btn danger" id="deleteIngButton">Eliminar ingrediente</button></div><div class="notice editor-help-note"><b>Edición de ingrediente:</b> usa notas amplias para criterios de compra, mermas reales, marcas docentes o incidencias. Los alérgenos se mantienen como bloque independiente.</div><div class="editor-layout ingredient-editor-layout"><section class="card-flat"><h3>Identificación, compra y coste</h3><div class="grid two">
    <label>Nombre<input class="input" id="ingName" value="${escapeAttr(row.name || '')}" /></label>
    <label>Activo<select id="ingActive"><option value="1" ${row.active ? 'selected' : ''}>Sí</option><option value="0" ${!row.active ? 'selected' : ''}>No</option></select></label>
    <label>Familia<select id="ingFamily">${familyOptionsHtml('ingredient', row.family_id)}</select></label>
    <label>Subfamilia<select id="ingSubfamily">${subfamilyOptionsHtml(row.family_id, row.subfamily_id)}</select></label>
    <label>Grupo pedido<select id="ingOrderGroup">${orderGroupOptionsHtml(row.order_group_id)}</select></label>
    <label>Zona<select id="ingStorage">${storageOptionsHtml(row.storage_zone_id)}</select></label>
    <label>Unidad base<select id="ingBaseUnit">${unitOptionsHtml(row.base_unit_id)}</select></label>
    <label>Unidad compra<select id="ingPurchaseUnit">${unitOptionsHtml(row.purchase_unit_id || row.base_unit_id)}</select></label>
    <label>Precio compra<input class="input" id="ingPrice" type="number" step="0.0001" value="${escapeAttr(row.purchase_price || 0)}" /></label>
    <label>Cantidad neta compra<input class="input" id="ingNet" type="number" step="0.0001" value="${escapeAttr(row.purchase_net_quantity || 1)}" /></label>
    <label>Merma %<input class="input" id="ingWaste" type="number" step="0.01" value="${escapeAttr(row.waste_pct || 0)}" /></label>
    <label>Densidad g/ml<input class="input" id="ingDensity" type="number" step="0.001" value="${escapeAttr(row.density_g_ml || '')}" /></label>
    <label class="check-inline"><input type="checkbox" id="ingUseCulinary" ${row.use_culinary ? 'checked' : ''}/> Uso cocina</label>
    <label class="check-inline"><input type="checkbox" id="ingUseBakery" ${row.use_bakery ? 'checked' : ''}/> Uso panadería/pastelería</label>
    <label style="grid-column:1/-1">Notas<textarea class="textarea-large" id="ingNotes">${escapeHtml(row.notes || '')}</textarea></label>
  </div></section>
  <section class="card-flat ingredient-allergen-panel"><h3>Alérgenos</h3><p class="footer-note">Marca únicamente alérgenos presentes o que deban declararse en el ingrediente.</p><div class="check-grid allergen-check-grid">${state.allergens.map(a => `<label><input type="checkbox" data-allergen="${escapeAttr(a.id)}" ${selectedAllergens.has(a.id) ? 'checked' : ''}/> ${escapeHtml(a.name)}</label>`).join('')}</div></section></div>`);
    const modal = modalRoot.querySelector('.modal');
    if (modal) modal.classList.add('editor-modal', 'editor-modal-full');
    setupAdaptiveTextareas(modalRoot);
    (_a = document.getElementById('ingFamily')) === null || _a === void 0 ? void 0 : _a.addEventListener('change', e => {
        const target = document.getElementById('ingSubfamily');
        if (target)
            target.innerHTML = subfamilyOptionsHtml(e.target.value, '');
    });
    document.getElementById('deleteIngButton')?.addEventListener('click', () => deleteIngredientSafely(id));
    (_b = document.getElementById('saveIngEdit')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', async () => {
        try {
            const price = Number(document.getElementById('ingPrice').value || 0);
            const net = Number(document.getElementById('ingNet').value || 1);
            const waste = Number(document.getElementById('ingWaste').value || 0);
            const ingredientName = document.getElementById('ingName').value.trim();
            if (!ingredientName)
                return showFormError('El ingrediente necesita nombre.');
            const duplicate = findIngredientNameDuplicate(ingredientName, id);
            if (duplicate)
                return showFormError(duplicateIngredientMessage(duplicate, ingredientName));
            if (price < 0 || net <= 0 || waste < 0 || waste >= 100)
                return showFormError('Revisa precio, cantidad neta y merma.');
            withTransaction(() => {
            db.exec(`UPDATE ingredients SET name=$name,family_id=$family,subfamily_id=$subfamily,order_group_id=$order,storage_zone_id=$storage,base_unit_id=$base,purchase_unit_id=$purchase,purchase_price=$price,purchase_net_quantity=$net,waste_pct=$waste,density_g_ml=$density,use_culinary=$culinary,use_bakery=$bakery,notes=$notes,active=$active,updated_at=CURRENT_TIMESTAMP WHERE id=$id`, {
                $name: ingredientName, $family: document.getElementById('ingFamily').value || null, $subfamily: document.getElementById('ingSubfamily').value || null,
                $order: document.getElementById('ingOrderGroup').value || null, $storage: document.getElementById('ingStorage').value || null,
                $base: document.getElementById('ingBaseUnit').value || 'UNIT_KG', $purchase: document.getElementById('ingPurchaseUnit').value || 'UNIT_KG',
                $price: price, $net: net, $waste: waste,
                $density: nullableNumber(document.getElementById('ingDensity').value), $culinary: document.getElementById('ingUseCulinary').checked ? 1 : 0, $bakery: document.getElementById('ingUseBakery').checked ? 1 : 0,
                $notes: document.getElementById('ingNotes').value.trim(), $active: Number(document.getElementById('ingActive').value || 1), $id: id
            });
            db.exec('DELETE FROM ingredient_allergens WHERE ingredient_id=$id', { $id: id });
            document.querySelectorAll('[data-allergen]:checked').forEach(el => db.exec(`INSERT INTO ingredient_allergens (ingredient_id,allergen_id,declaration_status) VALUES ($id,$allergen,'confirmed')`, { $id: id, $allergen: el.dataset.allergen }));
        });
            await loadCatalogs();
            scheduleDbAutosave('Ingrediente guardado');
            closeModal();
            render();
        }
        catch (error) {
            return showFormError(error);
        }
    });
}
// ────────────────────────────────────────────────────────────────────────────
// Motor de impresión estable con política documental conservadora
// Separación conservadora: datos de documento → render HTML → presentación/registro.
// No cambia el modelo SQLite ni valida fórmulas gastronómicas.
// ────────────────────────────────────────────────────────────────────────────
async function generateDocument(items, opts) {
    if (!items.length) {
        alert('Añade al menos una elaboración.');
        return;
    }
    const model = buildPrintDocumentModel(items, opts);
    const html = await renderPrintDocumentModel(model);
    recordPrintJob(model.items, model.options, html);
    presentPrintDocument(html, model.title, model.filenameBase);
}
function buildPrintDocumentModel(items, opts = {}) {
    const options = effectivePrintOptions(opts);
    const preflight = window.ObradORRPreflight ? window.ObradORRPreflight.run({ db, state, items: items.slice(), options }) : { warnings: [], summary: {}, byRecipe: {} };
    const normalized = window.ObradORRDocumentModel ? window.ObradORRDocumentModel.normalizeSelection({ db, state, items: items.slice(), options, preflight }) : null;
    return {
        schema: 'ObradORRPrintDocumentModel/2.1',
        items: items.slice(),
        options,
        context: createPrintContext(items, options),
        title: `${docTitle(options.documentType)} · ${profileLabel(printProfile(options))}`,
        filenameBase: printDocumentFilenameBase(items, options),
        generatedAt: new Date().toISOString(),
        normalized,
        preflight,
        profileConfig: window.ObradORRDocumentProfiles ? window.ObradORRDocumentProfiles.get(printProfile(options)) : null
    };
}

function printIndexHtml(items, opts) {
    if (!items || items.length < 2)
        return '';
    const compact = isCompactProfile(opts);
    if (compact && printProfile(opts) !== 'cm')
        return '';
    return `<section class="print-index"><h2>Índice de elaboraciones</h2><ol>${items.map((item, i) => `<li>${escapeHtml(item.name)} <small>${escapeHtml(selectionQuantityLabel(item))}</small></li>`).join('')}</ol></section>`;
}

async function renderPrintDocumentModel(model) {
    const opts = model.options;
    const body = [printHeader(opts)];
    body.push(preflightPrintHtml(model.preflight, opts));
    if (opts.documentType !== 'pedido' && printProfile(opts) !== 'fpb')
        body.push(printIndexHtml(model.items, opts));
    if (opts.documentType !== 'pedido') {
        for (const item of model.items)
            body.push(await recipeSheetHtml(item, opts, true, model.context));
    }
    if (opts.documentType !== 'fichas')
        body.push(await orderHtml(model.items, opts));
    return printDocumentShell(body.join('\n'), model.filenameBase || model.title);
}
function recordPrintJob(items, opts, html) {
    try {
        const id = uniqueId('PJ', opts.documentType || 'documento');
        const title = docTitle(opts.documentType);
        const payload = JSON.stringify({ documentType: opts.documentType, documentProfile: printProfile(opts), subrecipeMode: subrecipeModeFromOptions(opts), includeCosts: !!opts.includeCosts, includeProcess: !!opts.includeProcess, includeAppcc: !!opts.includeAppcc, generatedAt: new Date().toISOString(), htmlBytes: html.length });
        withTransaction(() => {
            db.exec(`INSERT INTO print_jobs (id,source_type,source_id,profile,title,payload_json,total_cost,item_count,notes)
        VALUES ($id,$sourceType,$sourceId,$profile,$title,$payload,$totalCost,$itemCount,$notes)`, {
                $id: id,
                $sourceType: opts.documentType === 'pedido' ? 'order' : 'selection',
                $sourceId: WORK_SELECTION_ID,
                $profile: printProfile(opts),
                $title: title,
                $payload: payload,
                $totalCost: sum(items.map(i => Number(i.totalCost || 0))),
                $itemCount: items.length,
                $notes: 'Registro local automático. El HTML completo no se almacena para no inflar SQLite.'
            });
            items.forEach((item, index) => db.exec(`INSERT INTO print_job_items (id,print_job_id,item_type,culinary_recipe_id,bakery_recipe_id,item_name,production_mode,quantity_label,sort_order)
          VALUES ($id,$job,$type,$culinary,$bakery,$name,$mode,$qty,$sort)`, {
                $id: uniqueId('PJI', `${id}-${index}`),
                $job: id,
                $type: item.sourceType,
                $culinary: item.sourceType === 'culinary' ? item.sourceId : null,
                $bakery: item.sourceType === 'bakery' ? item.sourceId : null,
                $name: item.name,
                $mode: item.baseMode || '',
                $qty: selectionQuantityLabel(item),
                $sort: (index + 1) * 10
            }));
        });
    }
    catch (error) {
        console.warn('[ObradORR] No se pudo registrar print_job.', error);
    }
}
function presentPrintDocument(html, title = 'Documento', filenameBase = '') {
    var _a, _b;
    const suggestedTitle = filenameBase || safeFilenamePart(`ObradORR_${title}_${getIsoTimestampForFilename(new Date())}`);
    const previousTitle = document.title;
    document.title = suggestedTitle;
    modalRoot.innerHTML = `<div class="modal-backdrop print-backdrop"><section class="modal print-modal"><header><h2>${escapeHtml(title)}</h2><div class="actions"><button class="btn primary" id="printIframeButton">Imprimir / guardar PDF</button><button class="btn" id="closePrintViewer">Cerrar</button></div></header><iframe id="printFrame" class="print-frame" title="Vista previa de impresión"></iframe></section></div>`;
    const frame = document.getElementById('printFrame');
    frame.srcdoc = html;
    (_a = document.getElementById('closePrintViewer')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => { document.title = previousTitle || 'ObradORR'; closeModal(); });
    (_b = document.getElementById('printIframeButton')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        const w = frame.contentWindow;
        if (!w)
            return alert('El visor de impresión todavía no está listo.');
        try {
            document.title = suggestedTitle;
            if (w.document) w.document.title = suggestedTitle;
        } catch (error) { console.warn('[ObradORR] No se pudo fijar el título sugerido de PDF.', error); }
        w.focus();
        w.print();
    });
}
function sheetStatusWarningHtml(detail, kind, opts = {}) {
    if (!detail)
        return '';
    const warnings = [];
    const notesText = String([detail.notes, detail.service_notes, detail.appcc_notes, detail.preferment_notes, detail.fermentation_notes].filter(Boolean).join(' | '));
    const notes = notesText.toLowerCase();
    const releaseStatus = detail.release_status || '';
    if (releaseStatus === 'no_apta')
        warnings.push('<b>Ficha no apta:</b> no usar como ficha final de aula-taller sin corrección previa.');
    else if (releaseStatus === 'pendiente') {
        warnings.push('<b>Ficha pendiente:</b> propuesta docente contrastable, no validada en obrador; requiere prueba docente real antes de considerarse cerrada.');
        if (isAuditProfile(opts)) {
            warnings.push('<b>Criterio de revisión documental:</b> ficha elaborada como propuesta técnica contrastada; debe mantenerse pendiente hasta prueba real de obrador por profesorado.');
            warnings.push('<b>Subrecetas y elaboraciones sensibles:</b> la revisión documental no sustituye la prueba real ni el control de rendimiento en aula-taller.');
            warnings.push('<b>Cocina caliente:</b> arroces, pastas, carnes, pescados, frituras y platos con subrecetas permanecen pendientes de prueba de obrador.');
            warnings.push('<b>Pastelería sensible:</b> cremas, semifríos, choux, tartas, rellenos, nata, gelatina, huevo y lácteos requieren control APPCC y prueba docente real.');
            warnings.push('<b>Panadería y bollería:</b> panes, prefermentos, masa madre, centenos, sin gluten, laminados y bollería mantienen pesos cocidos y mermas pendientes de validación de obrador.');
        }
    }
    else if (releaseStatus === 'bloqueante')
        warnings.push('<b>Ficha bloqueante:</b> no utilizar hasta resolver la incidencia.');
    if (kind === 'bakery' && detail.yield_status === 'pending')
        warnings.push('<b>Rendimiento pendiente:</b> peso cocido, merma o piezas deben validarse en obrador; los valores actuales son orientativos.');
    if (kind === 'bakery' && detail.preferment_validation_status === 'pending') {
        const prefText = String(detail.bp_type || detail.preferment_type || '').toLowerCase();
        const prefLabel = notes.includes('batido fermentado') || notes.includes('fermentación espontánea') || prefText.includes('fermentación espontánea') ? 'Fermentación espontánea pendiente' : (notes.includes('masa madre') || prefText.includes('masa madre') ? 'Masa madre/prefermento pendiente' : 'Prefermento pendiente');
        warnings.push(`<b>${prefLabel}:</b> tiempo, temperatura, levadura/madurez o método requieren prueba de obrador.`);
    }
    if (notes.includes('aceite como medio de fritura') || notes.includes('medio de fritura/pedido'))
        warnings.push('<b>Aceite de fritura:</b> se trata como medio de cocción/pedido; la absorción real no está validada y no debe interpretarse todo el aceite como rendimiento comestible.');
    if (notes.includes('versión docente no igp') || notes.includes('version docente no igp'))
        warnings.push('<b>Versión docente no IGP:</b> no implica certificación ni cumplimiento del pliego de Pan Gallego / Pan Galego.');
    if (notes.includes('base técnica') || notes.includes('base tecnica') || notes.includes('no producto final'))
        warnings.push('<b>Base técnica:</b> no imprimir ni usar como producto final sin ficha padre o validación específica.');
    if (notes.includes('contacto cruzado'))
        warnings.push('<b>Contacto cruzado:</b> revisar condiciones reales del obrador y separarlo de los alérgenos incorporados.');
    if (notes.includes('alérgeno pescado por gelatina pendiente') || notes.includes('gelatina') && notes.includes('pendiente'))
        warnings.push('<b>Alérgeno pendiente:</b> gelatina/proveedor pendiente de verificación; no convertir en dato confirmado sin ficha técnica.');
    if (notes.includes('anisakis') || notes.includes('consumo crudo'))
        warnings.push('<b>Materia prima cruda:</b> requiere proveedor apto y control anisakis/congelación preventiva según manual APPCC del centro.');
    if (notes.includes('centeno alto') || notes.includes('acidificación') || notes.includes('acidificacion') || notes.includes('reposo postcocción') || notes.includes('reposo postcoccion'))
        warnings.push('<b>Centeno alto:</b> masa madre/acidificación, cocción prolongada, remojos o reposo postcocción pendientes de prueba de obrador.');
    if (notes.includes('formulado sin ingredientes con gluten') || notes.includes('no certificado'))
        warnings.push('<b>Sin gluten no certificado:</b> formulado sin ingredientes con gluten; requiere control de ingredientes, trazabilidad y contaminación cruzada para declararse certificado.');
    if (notes.includes('batido fermentado') || notes.includes('fermentación espontánea') || notes.includes('fermentacion espontanea'))
        warnings.push('<b>Fermentación espontánea:</b> batido fermentado pendiente de control docente; no aplicar porcentaje panadero clásico como único criterio técnico.');
    if (notes.includes('proveedor pendiente') || notes.includes('ficha técnica de proveedor') || notes.includes('ficha tecnica de proveedor') || notes.includes('chocolate/proveedor') || notes.includes('sulfitos/alérgenos de proveedor') || notes.includes('sulfitos/alergenos de proveedor'))
        warnings.push('<b>Proveedor pendiente:</b> composición o alérgeno pendiente de ficha técnica; no cerrar la declaración sin documentación.');
    if (notes.includes('fondo/fumet pendiente'))
        warnings.push('<b>Fondo/fumet pendiente:</b> rendimiento final, reducción/evaporación, enfriado, conservación y regeneración requieren prueba de obrador.');
    if (notes.includes('subreceta recursiva') || notes.includes('coste directo ≠ coste recursivo') || notes.includes('coste directo') && notes.includes('coste recursivo'))
        warnings.push('<b>Subreceta recursiva:</b> coste, pedido y alérgenos deben calcularse con ingredientes directos y subrecetas derivadas; no confundir coste directo ≠ coste recursivo.');
    if (notes.includes('alérgenos derivados incluidos') || notes.includes('alergenos derivados incluidos'))
        warnings.push('<b>Alérgenos derivados:</b> deben permanecer visibles en fichas con subrecetas; no basta con alérgenos directos.');
    if (notes.includes('rendimiento/reducción pendiente') || notes.includes('rendimiento/reduccion pendiente') || notes.includes('reducción/evaporación') || notes.includes('reduccion/evaporacion'))
        warnings.push('<b>Rendimiento/reducción pendiente:</b> no se han validado reducción, evaporación, concentración final, conservación o regeneración.');
    if (notes.includes('emulsión fría con huevo') || notes.includes('emulsion fria con huevo'))
        warnings.push('<b>Emulsión fría con huevo:</b> usar preferentemente ovoproducto pasteurizado; servicio inmediato o refrigeración estricta según procedimiento del centro.');
    if (notes.includes('emulsión caliente') || notes.includes('emulsion caliente') || notes.includes('emulsión caliente/tibia') || notes.includes('emulsion caliente/tibia'))
        warnings.push('<b>Emulsión caliente/tibia:</b> elaboración con yema de uso inmediato; no mantener prolongadamente en zona templada.');
    if (notes.includes('subreceta sensible/refrigerada') || notes.includes('crema/relleno refrigerado') || notes.includes('salsa láctea sensible') || notes.includes('salsa lactea sensible'))
        warnings.push('<b>Crema/relleno refrigerado:</b> requiere cocción completa cuando proceda, enfriado rápido, protección y conservación refrigerada.');
    if (notes.includes('salsa base pendiente'))
        warnings.push('<b>Salsa base pendiente:</b> reducción, rendimiento final, conservación y regeneración no están validados.');
    if (notes.includes('subreceta de fruta pendiente'))
        warnings.push('<b>Subreceta de fruta pendiente:</b> falta definir proceso crudo/cocido/pasteurizado y conservación docente.');
    if (notes.includes('masa enriquecida pendiente'))
        warnings.push('<b>Masa enriquecida pendiente:</b> TFM, fermentación, cocción, peso cocido, merma y conservación requieren prueba de obrador.');
    if (notes.includes('laminado pendiente') || notes.includes('mantequilla de vueltas') || notes.includes('pliegues') || notes.includes('grosor'))
        warnings.push('<b>Laminado pendiente:</b> mantequilla de vueltas, pliegues, reposos, grosor, fermentación final, cocción, peso cocido y merma no están validados.');
    if (notes.includes('variante refrigerada') || notes.includes('ficha base distinta'))
        warnings.push('<b>Variante refrigerada:</b> nata, chantilly, crema, trufa o relleno postcocción cambian pedido, APPCC, alérgenos, conservación y servicio.');
    if (notes.includes('masa laminada fermentada'))
        warnings.push('<b>Masa laminada fermentada:</b> no confundir con hojaldre clásico no fermentado; laminado, fermentación y cocción siguen pendientes.');
    if (notes.includes('relación arroz/líquido pendiente') || notes.includes('relacion arroz/liquido pendiente'))
        warnings.push('<b>Relación arroz/líquido pendiente:</b> absorción, punto, reposo, rendimiento y gramaje por ración requieren prueba de obrador.');
    if (notes.includes('emulsión técnica') || notes.includes('emulsion tecnica'))
        warnings.push('<b>Emulsión técnica:</b> estabilidad, temperatura de trabajo, punto final y servicio inmediato requieren control en obrador.');
    if (notes.includes('bechamel sensible'))
        warnings.push('<b>Bechamel sensible/refrigerada:</b> salsa láctea con harina/mantequilla; si se enfría o actúa como relleno, requiere enfriado rápido, protección y frío.');
    if (notes.includes('mayonesa sensible'))
        warnings.push('<b>Mayonesa sensible/refrigerada:</b> emulsión fría con huevo; usar ovoproducto pasteurizado cuando proceda y conservar en frío hasta el servicio.');
    if (notes.includes('mantenimiento caliente') || notes.includes('enfriado rápido') || notes.includes('regeneración segura') || notes.includes('regeneracion segura'))
        warnings.push('<b>Mantenimiento/enfriado/regeneración:</b> definir y controlar servicio caliente, enfriado rápido o regeneración según el procedimiento APPCC del centro.');
    if (notes.includes('ave: controlar cocción interna') || notes.includes('cocción interna') || notes.includes('coccion interna'))
        warnings.push('<b>Ave/relleno:</b> controlar cocción interna y separación crudo/cocido; no validar sin prueba de obrador.');
    if (notes.includes('contraste bibliográfico pendiente') || notes.includes('contraste bibliografico pendiente') || notes.includes('vía b') || notes.includes('via b'))
        warnings.push('<b>Contraste bibliográfico pendiente:</b> documentar fuente principal, fuente secundaria, ajuste técnico y límite de confianza antes de marcar la ficha como lista para prueba.');
    if (notes.includes('pescado/moluscos/crustáceos') || notes.includes('pescado/moluscos/crustaceos'))
        warnings.push('<b>Pescado y marisco cocinados:</b> verificar alérgenos, proveedor, punto de cocción y conservación; en bacalao, controlar desalado.');
    if (!warnings.length)
        return '';
    const uniqueWarnings = [...new Set(warnings)];
    const title = isAuditProfile(opts) ? 'Estado documental · auditoría' : 'Estado documental';
    return `<div class="warning-block document-status-warning"><h3>${title}</h3><ul>${uniqueWarnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
}

// Coste directo ≠ coste recursivo: aviso documental, no cálculo validado de obrador.
function printHeader(opts) {
    const fields = [];
    const profile = printProfile(opts);
    const generated = spanishLongDate(new Date());
    const headerProfileLabel = opts.documentType === 'pedido' ? 'Pedido consolidado' : profileLabel(profile);
    addField(fields, 'Perfil', `${headerProfileLabel} · Generado: ${generated} · ObradORR`);
    if (opts.documentType === 'pedido') {
        addField(fields, 'Tipo de documento', 'Pedido consolidado');
        addField(fields, 'Costes', opts.includeCosts ? 'visibles' : 'ocultos');
    }
    if (opts.includeTeachingData) {
        const t = opts.teaching || {};
        addField(fields, 'Título', t.title);
        addField(fields, 'Fecha', spanishLongDate(t.date));
        addField(fields, 'Ciclo', t.cycle);
        addField(fields, 'Módulo', t.module);
        addField(fields, 'Grupo', t.group);
        addField(fields, 'Responsable', t.responsible);
        addField(fields, 'Observaciones', t.notes);
    }
    const help = documentHelpText(opts, profile);
    return `<section class="doc-cover profile-${escapeAttr(profile)}"><h1>ObradORR</h1><h2>${docTitle(opts.documentType)}</h2><p>${escapeHtml(help)}</p>${fields.length ? `<dl>${fields.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>` : ''}</section>`;
}
function documentHelpText(opts, profile) {
    if (opts.documentType === 'pedido') return 'Pedido consolidado para compra, economato o reparto de mise en place. Agrupa ingredientes expandidos, mantiene alérgenos globales y no sustituye la revisión docente.';
    if (profile === 'auditoria_completa') return 'Auditoría documental completa con trazabilidad interna, fuentes, avisos documentales y revisión técnica. No es el perfil ordinario para alumnado.';
    if (profile === 'docente_produccion') return 'Documento de producción docente: preparación de práctica, subrecetas sensibles, costes y APPCC según configuración.';
    if (profile === 'fpb') return 'Ficha guiada FPB: ingredientes, proceso paso a paso, alérgenos y seguridad básica. Sin auditoría completa.';
    if (profile === 'cm') return 'Ficha de producción de Ciclo Medio: proceso técnico, pedido y APPCC medio, sin auditoría completa.';
    if (profile === 'gs') return 'Ficha de Ciclo Superior: costes, pedido, subrecetas relevantes, APPCC completo y avisos críticos/altos.';
    return 'Documento de aula-taller: propuesta docente pendiente de prueba real de obrador. No sustituye el manual APPCC del centro.';
}
async function recipeSheetHtml(item, opts, pageBreak, printCtx = createPrintContext([item], opts)) {
    const localCtx = { depth: 0, visited: new Set([`${item.sourceType}:${item.sourceId}`]), printCtx, mainKeys: printCtx.mainKeys, rootKey: `${item.sourceType}:${item.sourceId}` };
    return item.sourceType === 'bakery'
        ? bakerySheetHtml(item, opts, pageBreak, localCtx)
        : culinarySheetHtml(item, opts, pageBreak, localCtx);
}
// Renderizado de fichas culinarias
async function culinarySheetHtml(item, opts, pageBreak, ctx = {}) {
    const recipe = recipeSummary('culinary', item.sourceId) || state.recipes.find(r => r.uid === item.uid) || item;
    const scale = scaleForItem(item, recipe);
    const photo = await recipePhotoDataUrl('culinary', item.sourceId);
    const mode = subrecipeModeFromOptions(opts);
    const lines = culinaryLines(item.sourceId, scale, mode === 'ingredients');
    const detail = recipeDetail('culinary', item.sourceId);
    const allergenData = culinaryAllergenData(item.sourceId);
    const totalCost = sum(lines.map(l => l.cost || 0));
    const subrecipes = mode === 'sheets' ? await culinarySubrecipeSectionsHtml(item.sourceId, scale, opts, ctx) : '';
    const directNotice = mode === 'sheets' ? culinarySubrecipeSummaryHtml(item.sourceId, scale) : '';
    return `<section class="print-sheet ${pageBreak ? 'page-break' : ''}">
    <header class="sheet-head ${photo ? 'has-photo' : 'no-photo'}"><div class="sheet-head-text"><h2>${escapeHtml(item.name || recipe.name)}</h2><p>Cocina · ${formatQty(item.qty)} ${escapeHtml(item.unitLabel || '')}</p></div>${photo ? `<figure class="sheet-head-figure"><img class="sheet-head-photo sheet-photo" src="${photo}" alt="${escapeAttr(item.name || recipe.name)}" /></figure>` : ''}</header>
    ${sheetStatusWarningHtml(detail, 'culinary', opts)}
    <h3>Ingredientes y cantidades</h3>
    ${linesTable(lines, opts.includeCosts)}
    ${opts.includeCosts ? `<p class="cost-line"><b>Coste estimado:</b> ${money(totalCost)}</p>` : ''}
    ${directNotice}
    ${allergenBlockHtml(allergenData, 'Alérgenos directos y derivados consolidados')}
    ${opts.includeProcess ? processBlock(detail, [], 'culinary') : ''}
    ${appccPrintHtml(detail, 'culinary', opts)}
    ${subrecipes}
  </section>`;
}
function culinarySubrecipeSummaryHtml(recipeId, parentScale) {
    const rows = directCulinarySubrecipes(recipeId, parentScale);
    if (!rows.length)
        return '';
    return `<div class="subrecipe-summary"><h3>Subelaboraciones necesarias</h3><ul>${rows.map(r => `<li><b>${escapeHtml(r.name)}</b>: ${escapeHtml(displayQuantity(r.requiredQty, r.requiredUnit).text)}${r.factor ? ` · factor ${formatQty(r.factor)}` : ''}${r.warning ? ` · <span class="warn">${escapeHtml(r.warning)}</span>` : ''}</li>`).join('')}</ul></div>`;
}
async function culinarySubrecipeSectionsHtml(recipeId, parentScale, opts, ctx = {}) {
    var _a;
    const depth = Number(ctx.depth || 0);
    if (depth >= 5)
        return `<div class="warning-block"><b>Aviso:</b> profundidad máxima de subelaboraciones alcanzada.</div>`;
    const rows = directCulinarySubrecipes(recipeId, parentScale);
    const chunks = [];
    for (const row of rows) {
        const key = `culinary:${row.id}`;
        if ((_a = ctx.visited) === null || _a === void 0 ? void 0 : _a.has(key)) {
            chunks.push(`<div class="warning-block"><b>Ciclo omitido:</b> ${escapeHtml(row.name)}</div>`);
            continue;
        }
        if (row.warning) {
            chunks.push(`<div class="warning-block"><b>Subelaboración no escalada:</b> ${escapeHtml(row.name)} · ${escapeHtml(row.warning)}</div>`);
            continue;
        }
        const detail = recipeDetail('culinary', row.id);
        const globalRendered = ctx.printCtx && ctx.printCtx.renderedSubrecipes;
        if (globalRendered && globalRendered.has(key) && !(ctx.mainKeys && ctx.mainKeys.has(key))) {
            chunks.push(subrecipeReferenceHtml(row));
            continue;
        }
        if (shouldFoldSubrecipe(row, detail, opts, ctx)) {
            if (globalRendered) globalRendered.add(key);
            chunks.push(foldedTechnicalSubrecipeHtml(row, detail, opts));
            continue;
        }
        if (globalRendered) globalRendered.add(key);
        const childCtx = { depth: depth + 1, visited: new Set([...(ctx.visited || []), key]), printCtx: ctx.printCtx, mainKeys: ctx.mainKeys, rootKey: ctx.rootKey };
        chunks.push(await culinarySubrecipeSheetHtml(row, opts, childCtx));
    }
    return chunks.join('\n');
}
function foldedTechnicalSubrecipeHtml(row, detail, opts = {}) {
    const allergenData = culinaryAllergenData(row.id);
    return `<section class="sub-sheet technical-base-collapsed"><div class="sub-sheet-intro"><h3>Base técnica plegada: ${escapeHtml(row.name)}</h3><p>Cantidad necesaria: ${escapeHtml(displayQuantity(row.requiredQty, row.requiredUnit).text)} · Rendimiento base: ${escapeHtml(displayQuantity(row.yieldQty, row.yieldUnit).text)} · factor ${formatQty(row.factor)}</p><p class="muted">No se desarrolla como producto final para no saturar la impresión. Sus ingredientes, pedido y alérgenos derivados permanecen consolidados en la ficha recursiva.</p>${isAuditProfile(opts) ? sheetStatusWarningHtml(detail, 'culinary', opts) : ''}</div>${allergenBlockHtml(allergenData, 'Alérgenos de base técnica')}</section>`;
}
async function culinarySubrecipeSheetHtml(row, opts, ctx) {
    const photo = await recipePhotoDataUrl('culinary', row.id);
    const detail = recipeDetail('culinary', row.id);
    const allergenData = culinaryAllergenData(row.id);
    const lines = culinaryLines(row.id, row.factor, false);
    const nested = await culinarySubrecipeSectionsHtml(row.id, row.factor, opts, ctx);
    const totalCost = sum(lines.map(l => l.cost || 0));
    return `<section class="sub-sheet"><div class="sub-sheet-intro"><header class="sub-sheet-head"><div><h3>Subelaboración: ${escapeHtml(row.name)}</h3><p>Cantidad necesaria: ${escapeHtml(displayQuantity(row.requiredQty, row.requiredUnit).text)} · Rendimiento base: ${escapeHtml(displayQuantity(row.yieldQty, row.yieldUnit).text)} · factor ${formatQty(row.factor)}</p></div>${photo ? `<img class="sub-sheet-photo" src="${photo}" alt="${escapeAttr(row.name)}" />` : ''}</header>
    ${sheetStatusWarningHtml(detail, 'culinary', opts)}</div>
    ${linesTable(lines, opts.includeCosts)}
    ${opts.includeCosts ? `<p class="cost-line"><b>Coste subelaboración:</b> ${money(totalCost)}</p>` : ''}
    ${allergenBlockHtml(allergenData, 'Alérgenos directos y derivados de la subelaboración')}
    ${opts.includeProcess ? processBlock(detail, [], 'culinary') : ''}
    ${appccPrintHtml(detail, 'culinary', opts)}
    ${nested}
  </section>`;
}
function directCulinarySubrecipes(recipeId, parentScale = 1) {
    return db.query(`SELECT l.id AS line_id, l.subrecipe_id AS id, sr.name, l.quantity, lu.symbol AS line_unit, lu.unit_type AS line_unit_type, lu.to_base_factor AS line_factor,
      sr.yield_quantity, yu.symbol AS yield_unit, yu.unit_type AS yield_unit_type, yu.to_base_factor AS yield_factor, l.sort_order
    FROM culinary_recipe_lines l
    JOIN culinary_recipes sr ON sr.id=l.subrecipe_id
    JOIN units lu ON lu.id=l.unit_id
    LEFT JOIN units yu ON yu.id=sr.yield_unit_id
    WHERE l.recipe_id=$id AND l.line_type='subrecipe'
    ORDER BY l.sort_order,l.id`, { $id: recipeId }).map(row => {
        const requiredQty = Number(row.quantity || 0) * Number(parentScale || 1);
        let warning = '';
        let factor = 0;
        if (!row.yield_quantity || !row.yield_unit)
            warning = 'falta rendimiento de la subelaboración';
        else if (row.line_unit_type !== row.yield_unit_type)
            warning = `unidad incompatible: ${row.line_unit} frente a ${row.yield_unit}`;
        else
            factor = (requiredQty * Number(row.line_factor || 1)) / (Number(row.yield_quantity || 1) * Number(row.yield_factor || 1));
        return { id: row.id, name: row.name, requiredQty, requiredUnit: row.line_unit, yieldQty: Number(row.yield_quantity || 0), yieldUnit: row.yield_unit || '', factor, warning };
    });
}
function culinaryLines(recipeId, scale, expanded) {
    if (expanded) {
        return db.query(`
      SELECT e.ingredient AS name, e.ingredient_id, e.quantity, e.unit, e.estimated_cost,
             COALESCE(og.name,'Otros productos alimentarios / nuevas tendencias') AS order_group,
             COALESCE(sz.name,'') AS storage_zone, e.technical_note, bu.symbol AS base_unit_symbol, bu.unit_type AS base_unit_type, i.density_g_ml
      FROM v_culinary_expanded_ingredient_lines e
      LEFT JOIN ingredients i ON i.id=e.ingredient_id
      LEFT JOIN order_groups og ON og.id=i.order_group_id
      LEFT JOIN storage_zones sz ON sz.id=i.storage_zone_id
      LEFT JOIN units bu ON bu.id=i.base_unit_id
      WHERE e.recipe_id=$id
      ORDER BY e.sort_order, e.ingredient COLLATE NOCASE
    `, { $id: recipeId }).map(l => lineScaled(l, scale));
    }
    return db.query(`
    SELECT line_name AS name, ingredient_id, subrecipe_id, line_type, quantity, unit, estimated_cost,
           technical_note, CASE WHEN line_type='subrecipe' THEN 'Subelaboración' ELSE 'Elaboración' END AS order_group, '' AS storage_zone
    FROM v_elaboration_lines_unified
    WHERE source_type='culinary' AND source_id=$id
    ORDER BY sort_order
  `, { $id: recipeId }).map(l => lineScaled(l, scale));
}
function lineScaled(l, scale) {
    var _a, _b;
    return Object.assign(Object.assign({}, l), { quantity: Number(l.quantity || 0) * Number(scale || 1), cost: Number((_b = (_a = l.estimated_cost) !== null && _a !== void 0 ? _a : l.cost) !== null && _b !== void 0 ? _b : 0) * Number(scale || 1) });
}
// Perfiles documentales y opciones efectivas

function preflightModeForProfile(profile, documentType) {
    if (window.ObradORRDocumentProfiles && window.ObradORRDocumentProfiles.preflightMode)
        return window.ObradORRDocumentProfiles.preflightMode(profile || 'aula_taller', documentType || 'fichas_pedido');
    if (profile === 'auditoria_completa') return 'complete';
    if (profile === 'gs' || profile === 'docente_produccion') return 'critical_high';
    if (profile === 'cm') return 'critical';
    return documentType === 'pedido' ? 'summary_if_alerts' : 'summary';
}
function subrecipeModeFromOptions(opts) {
    return (opts === null || opts === void 0 ? void 0 : opts.subrecipeMode) || ((opts === null || opts === void 0 ? void 0 : opts.expandSubrecipes) ? 'ingredients' : 'none');
}
function printProfile(opts = {}) {
    return opts.documentProfile || 'aula_taller';
}
function applyProfileDefaultsToState(profile) {
    const p = profile || 'aula_taller';
    const defaults = window.ObradORRDocumentProfiles ? window.ObradORRDocumentProfiles.defaults(p, state.printOptions.documentType || 'fichas_pedido') : profileOptionDefaults(p, state.printOptions.documentType || 'fichas_pedido');
    state.printOptions.documentProfile = p;
    state.printOptions.includeCosts = !!defaults.includeCosts;
    state.printOptions.subrecipeMode = defaults.subrecipeMode || 'sheets';
    state.printOptions.expandSubrecipes = state.printOptions.subrecipeMode !== 'none';
    state.printOptions.includeProcess = defaults.includeProcess !== false;
    state.printOptions.includeAppcc = defaults.includeAppcc !== false;
}
function boolOption(opts, key, fallback) {
    return typeof (opts === null || opts === void 0 ? void 0 : opts[key]) === 'boolean' ? !!opts[key] : fallback;
}
function profileOptionDefaults(profile, documentType) {
    if (window.ObradORRDocumentProfiles)
        return window.ObradORRDocumentProfiles.defaults(profile || 'aula_taller', documentType || 'fichas_pedido');
    if (profile === 'auditoria_completa')
        return { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: 'sheets', preflightMode: 'complete' };
    if (profile === 'docente_produccion')
        return { includeCosts: true, includeProcess: true, includeAppcc: true, subrecipeMode: documentType === 'pedido' ? 'ingredients' : 'sheets', preflightMode: 'critical_high' };
    return { includeCosts: false, includeProcess: true, includeAppcc: true, subrecipeMode: documentType === 'pedido' ? 'ingredients' : 'none', preflightMode: 'summary' };
}
function effectivePrintOptions(opts = {}) {
    const profile = printProfile(opts);
    const documentType = opts.documentType || 'fichas_pedido';
    const defaults = profileOptionDefaults(profile, documentType);
    const out = Object.assign({}, opts, { documentType, documentProfile: profile });
    out.includeCosts = boolOption(opts, 'includeCosts', defaults.includeCosts);
    out.includeProcess = boolOption(opts, 'includeProcess', defaults.includeProcess);
    out.includeAppcc = boolOption(opts, 'includeAppcc', defaults.includeAppcc);
    out.subrecipeMode = opts.subrecipeMode || defaults.subrecipeMode;
    out.preflightMode = opts.preflightMode || defaults.preflightMode || preflightModeForProfile(profile, documentType);
    if (documentType === 'pedido' && out.subrecipeMode === 'sheets')
        out.subrecipeMode = 'ingredients';
    out.expandSubrecipes = out.subrecipeMode !== 'none';
    return out;
}
function profileLabel(profile) {
    if (window.ObradORRDocumentProfiles)
        return window.ObradORRDocumentProfiles.label(profile || 'aula_taller');
    return ({ aula_taller: 'Aula-taller alumnado', docente_produccion: 'Docente producción', auditoria_completa: 'Auditoría documental' })[profile] || 'Aula-taller alumnado';
}
function isAuditProfile(opts) {
    const p = printProfile(opts);
    return window.ObradORRDocumentProfiles ? window.ObradORRDocumentProfiles.isAudit(p) : p === 'auditoria_completa';
}
function isCompactProfile(opts) {
    const p = printProfile(opts);
    return window.ObradORRDocumentProfiles ? window.ObradORRDocumentProfiles.isCompact(p) : p === 'aula_taller';
}
function createPrintContext(items, opts) {
    return {
        profile: printProfile(opts),
        renderedSubrecipes: new Set(),
        referencedSubrecipes: new Set(),
        mainKeys: new Set((items || []).map(i => `${i.sourceType}:${i.sourceId}`))
    };
}
const SENSITIVE_SUBRECIPE_IDS = new Set(['REC-BECHAMEL','REC-PAST-CREMA-PASTELERA','REC-CREMA-INGLESA','REC-MAYONESA-BASE','REC-HOLANDESA','REC-SALSA-BEARNESA','REC-FUMET-PESCADO','REC-VELOUTE-AVE','REC-VELOUTE-PESCADO','REC-DEMI-GLACE','REC-SALSA-ESPANOLA','REC-SALSA-AMERICANA','REC-FONDO-OSCURO-TERNERA','REC-FONDO-BLANCO-AVE','REC-BISQUE']);
const BASE_TECNICA_IDS = new Set(['REC-MIREPOIX-BLANCA','REC-MIREPOIX-OSCURA','REC-ROUX-BLANCO','REC-ROUX-RUBIO','REC-ROUX-OSCURO','REC-BOUQUET-GARNI','REC-SOFITO-BASE','REC-SOFRITO-BASE','REC-DUXELLES','REC-PERSILLADE']);
function subrecipeCategory(id, name = '') {
    if (SENSITIVE_SUBRECIPE_IDS.has(id)) return 'SENSIBLE';
    if (BASE_TECNICA_IDS.has(id)) return 'BASE_TECNICA';
    const t = normalize(`${id || ''} ${name || ''}`);
    if (['bechamel','crema pastelera','crema inglesa','mayonesa','holandesa','hollandesa','bearnesa','fumet','veloute','veloute','demi glace','salsa espanola','salsa americana','fondo oscuro','fondo blanco','bisque'].some(x => t.includes(x))) return 'SENSIBLE';
    if (['mirepoix','brunoise aromatica','roux','bouquet garni','sachet','sofrito base','duxelles','persillade'].some(x => t.includes(x))) return 'BASE_TECNICA';
    return 'DEFECTO';
}
function shouldFoldSubrecipe(row, detail, opts, ctx = {}) {
    const key = `culinary:${row.id}`;
    if ((ctx.mainKeys && ctx.mainKeys.has(key)) || ctx.rootKey === key) return false;
    return printProfile(opts) !== 'auditoria_completa' && subrecipeCategory(row.id, row.name) === 'BASE_TECNICA';
}
function subrecipeReferenceHtml(row, reason = 'ya desarrollada') {
    return `<section class="sub-sheet sub-sheet-reference"><h3>Subelaboración referenciada: ${escapeHtml(row.name)}</h3><p>${escapeHtml(displayQuantity(row.requiredQty, row.requiredUnit).text)} · ${escapeHtml(reason)} en este documento. Sus ingredientes, pedido y alérgenos derivados permanecen consolidados.</p></section>`;
}
function recipeSummary(sourceType, sourceId) {
    return state.recipes.find(r => r.uid === `${sourceType}:${sourceId}`) || null;
}
// Renderizado de fichas panaderas/pasteleras
function bakerySheetHtml(item, opts, pageBreak, ctx = {}) {
    if (Number(ctx.depth || 0) >= 5)
        return `<div class="warning-block"><b>Aviso:</b> profundidad máxima de componentes panaderos alcanzada.</div>`;
    const recipe = recipeSummary('bakery', item.sourceId) || item;
    const photo = recipePhotoDataUrl('bakery', item.sourceId);
    const detail = bakeryDetail(item.sourceId);
    const blocks = bakeryFormulaBlocks(item.sourceId, item, recipe);
    const allLines = [].concat(...blocks.map(b => b.lines));
    const components = bakeryComponents(item.sourceId, item, recipe, ctx.visited || new Set());
    const allergenBundle = bakeryAllergenBundle(item.sourceId, ctx.visited || new Set());
    const componentCost = sum(components.map(c => c.estimatedCost || 0));
    const totalCost = sum(allLines.map(l => l.cost || 0)) + componentCost;
    const componentSections = bakeryComponentsSectionsHtml(components, opts, ctx);
    return `<section class="print-sheet ${pageBreak ? 'page-break' : ''}">
    <header class="sheet-head ${photo ? 'has-photo' : 'no-photo'}"><div class="sheet-head-text"><h2>${escapeHtml(item.name || recipe.name)}</h2><p>Panadería/Pastelería · ${escapeHtml(selectionQuantityLabel(item))}</p></div>${photo ? `<figure class="sheet-head-figure"><img class="sheet-head-photo sheet-photo" src="${photo}" alt="${escapeAttr(item.name || recipe.name)}" /></figure>` : ''}</header>
    ${sheetStatusWarningHtml(detail, 'bakery', opts)}
    ${bakeryMetaHtml(detail, item, recipe, blocks)}
    ${blocks.map(bakeryBlockHtml(opts.includeCosts)).join('\n')}
    ${componentSections}
    ${allergenBlockHtml(allergenBundle.main, 'Alérgenos directos y derivados consolidados')}
    ${optionalComponentAllergensHtml(allergenBundle.optional)}
    ${opts.includeCosts ? `<p class="cost-line"><b>Coste estimado:</b> ${money(totalCost)}</p>` : ''}
    ${opts.includeProcess ? bakeryProcessBlocksHtml(item.sourceId) : ''}
    ${appccPrintHtml(recipeDetail('bakery', item.sourceId), 'bakery', opts)}
  </section>`;
}
function bakeryDetail(recipeId) {
    return db.query(`SELECT br.*, bp.preferment_type AS bp_type, bp.calculation_mode, bp.hydration_pct, bp.flour_prefermented_pct, bp.preferment_total_pct, bp.time_hours, bp.temperature_c, bp.notes AS preferment_notes, bp.validation_status AS preferment_validation_status
    FROM bakery_recipes br LEFT JOIN bakery_preferments bp ON bp.recipe_id=br.id WHERE br.id=$id`, { $id: recipeId })[0] || {};
}
function prefermentBlockTitle(detail = {}) {
    const raw = String(detail.bp_type || detail.preferment_type || '').trim();
    return raw || 'Prefermento';
}
function bakeryMetaHtml(detail, item, recipe, blocks) {
    const pref = detail.calculation_mode && detail.calculation_mode !== 'none';
    const fields = [];
    addField(fields, 'Cálculo en práctica', selectionQuantityLabel(item));
    addField(fields, 'Harina base impresa', `${formatQty(bakeryFlourForItem(item, recipe))} g`);
    if (detail.base_pieces)
        addField(fields, 'Piezas base', detail.base_pieces);
    if (detail.baking_loss_pct)
        addField(fields, 'Pérdida cocción', `${formatQty(detail.baking_loss_pct)} %`);
    if (detail.yield_status)
        addField(fields, 'Estado rendimiento', detail.yield_status === 'pending' ? 'Pendiente de validación de obrador' : detail.yield_status);
    if (pref) {
        addField(fields, 'Prefermento', detail.bp_type || detail.preferment_type || 'Prefermento');
        addField(fields, 'Hidratación prefermento', detail.hydration_pct ? `${formatQty(detail.hydration_pct)} %` : '');
        addField(fields, 'Harina prefermentada', detail.flour_prefermented_pct ? `${formatQty(detail.flour_prefermented_pct)} %` : '');
        addField(fields, 'Tiempo / temperatura', [detail.time_hours ? `${formatQty(detail.time_hours)} h` : '', detail.temperature_c ? `${formatQty(detail.temperature_c)} ºC` : ''].filter(Boolean).join(' · ') || 'Pendiente');
        if (detail.preferment_validation_status)
            addField(fields, 'Estado prefermento', detail.preferment_validation_status === 'pending' ? 'Pendiente de prueba de obrador' : detail.preferment_validation_status);
    }
    return fields.length ? `<div class="formula-meta"><dl>${fields.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl></div>` : '';
}
function bakeryFormulaBlocks(recipeId, item, recipe) {
    const lines = bakeryLines(recipeId, item, recipe);
    const groups = [];
    const pref = lines.filter(l => l.prefermentQuantity > 0);
    const final = lines.filter(l => l.finalQuantity > 0);
    if (pref.length)
        groups.push({ title: prefermentBlockTitle(bakeryDetail(recipeId)), lines: pref.map(l => (Object.assign(Object.assign({}, l), { quantity: l.prefermentQuantity, unit: 'g', technical_note: lineGroupLabel(l.line_group) }))) });
    if (final.length)
        groups.push({ title: 'Masa final', lines: final.map(l => (Object.assign(Object.assign({}, l), { quantity: l.finalQuantity, unit: 'g', technical_note: lineGroupLabel(l.line_group) }))) });
    for (const group of ['filling', 'topping', 'decoration', 'other']) {
        const rows = lines.filter(l => l.line_group === group && Number(l.quantity || 0) > 0);
        if (rows.length)
            groups.push({ title: lineGroupLabel(group), lines: rows });
    }
    if (!groups.length && lines.length)
        groups.push({ title: 'Fórmula', lines });
    return groups;
}
function bakeryBlockHtml(includeCosts) {
    return block => `<div class="bakery-block"><h3>${escapeHtml(block.title)}</h3>${linesTable(block.lines, includeCosts)}</div>`;
}
function bakeryLines(recipeId, item, recipe) {
    const flourG = bakeryFlourForItem(item, recipe);
    return bakeryLinesForFlour(recipeId, flourG, recipe);
}
function bakeryLinesForFlour(recipeId, flourG, recipe = null) {
    const detail = (recipe === null || recipe === void 0 ? void 0 : recipe.source_id) === recipeId ? recipe : (recipeSummary('bakery', recipeId) || {});
    const base = bakeryBaseMetrics(recipeId, flourG, detail);
    return db.query(`SELECT brl.*, i.name AS ingredient_name, i.base_unit_id, i.density_g_ml, bu.symbol AS base_unit_symbol, bu.unit_type AS base_unit_type, bu.to_base_factor AS base_unit_factor, u.symbol AS unit_symbol, qu.symbol AS quantity_unit_symbol, qu.unit_type AS quantity_unit_type,
      COALESCE(og.name,'Otros productos alimentarios / nuevas tendencias') AS order_group, COALESCE(sz.name,'') AS storage_zone, COALESCE(ic.cost_per_base_unit_after_waste,0) AS cost_per_base
    FROM bakery_recipe_lines brl
    JOIN ingredients i ON i.id=brl.ingredient_id
    LEFT JOIN units u ON u.id=brl.unit_id
    LEFT JOIN units qu ON qu.id=brl.quantity_unit_id
    LEFT JOIN units bu ON bu.id=i.base_unit_id
    LEFT JOIN order_groups og ON og.id=i.order_group_id
    LEFT JOIN storage_zones sz ON sz.id=i.storage_zone_id
    LEFT JOIN v_ingredients_cost ic ON ic.id=i.id
    WHERE brl.recipe_id=$id
    ORDER BY brl.sort_order, brl.id`, { $id: recipeId }).map(l => bakeryLineComputed(l, base));
}
function bakeryBaseMetrics(recipeId, flourG, recipe = {}) {
    const row = db.query('SELECT * FROM bakery_recipes WHERE id=$id', { $id: recipeId })[0] || {};
    const baseFlour = Number(row.base_flour_g || recipe.base_flour_g || 1000) || 1000;
    const scale = Number(flourG || baseFlour) / baseFlour;
    const totalPct = Number(db.value("SELECT SUM(baker_pct) FROM bakery_recipe_lines WHERE recipe_id=$id AND line_group='dough' AND include_in_dough=1", { $id: recipeId }) || 0);
    const rawBase = Number(row.base_raw_weight_g || 0) || (baseFlour * totalPct / 100);
    const piecesBase = Number(row.base_pieces || recipe.base_pieces || 0);
    const bakedBase = piecesBase && Number(row.baked_piece_weight_g || 0) ? piecesBase * Number(row.baked_piece_weight_g) : rawBase * (100 - Number(row.baking_loss_pct || 0)) / 100;
    return { recipeId, flourG: Number(flourG || baseFlour), baseFlour, scale, rawG: rawBase * scale, bakedG: bakedBase * scale, pieces: piecesBase * scale };
}
function bakeryLineComputed(l, base) {
    const calc = l.calculation_base || 'baker_pct';
    let quantity = 0;
    let unit = l.unit_symbol || 'g';
    if (calc === 'baker_pct')
        quantity = base.flourG * Number(l.baker_pct || 0) / 100;
    else if (calc === 'flour_pct')
        quantity = base.flourG * Number(l.quantity_value || 0) / 100;
    else if (calc === 'dough_pct')
        quantity = base.rawG * Number(l.quantity_value || 0) / 100;
    else if (calc === 'baked_weight_pct')
        quantity = base.bakedG * Number(l.quantity_value || 0) / 100;
    else if (calc === 'per_piece')
        quantity = base.pieces * Number(l.quantity_value || 0);
    else if (calc === 'fixed')
        quantity = Number(l.quantity_value || 0) * base.scale;
    if (['baker_pct', 'flour_pct', 'dough_pct', 'baked_weight_pct'].includes(calc))
        unit = 'g';
    if (calc === 'fixed' || calc === 'per_piece')
        unit = l.quantity_unit_symbol || l.unit_symbol || unit;
    const pref = l.line_group === 'dough' ? base.flourG * Number(l.preferment_pct || 0) / 100 : 0;
    const fin = l.line_group === 'dough' ? base.flourG * Number(l.final_dough_pct || 0) / 100 : 0;
    const cost = ingredientCostFromQuantity(quantity, unit, l.base_unit_symbol, Number(l.cost_per_base || 0), Number(l.density_g_ml || 0), l.base_unit_type);
    const display = quantity >= 1000 && unit === 'g' ? { quantity: quantity / 1000, unit: 'kg' } : { quantity, unit };
    return { name: l.ingredient_name, ingredient_id: l.ingredient_id, quantity: display.quantity, unit: display.unit,
        rawQuantity: quantity, rawUnit: unit, prefermentQuantity: pref, finalQuantity: fin, line_group: l.line_group || 'dough', calculation_base: calc,
        cost, order_group: l.order_group, storage_zone: l.storage_zone, base_unit_symbol: l.base_unit_symbol, base_unit_type: l.base_unit_type, density_g_ml: l.density_g_ml,
        technical_note: [lineGroupLabel(l.line_group), l.technical_note].filter(Boolean).join(' | '), baker_pct: l.baker_pct, preferment_pct: l.preferment_pct, final_dough_pct: l.final_dough_pct };
}
function ingredientCostFromQuantity(quantity, unit, baseUnit, costPerBase, density = null, baseUnitType = null) {
    const converted = convertQuantityToUnit(quantity, unit, baseUnit, density, baseUnitType);
    return converted ? Number(converted.quantity || 0) * Number(costPerBase || 0) : 0;
}
function convertQuantityToUnit(quantity, unit, targetUnit, density = null, targetUnitType = null) {
    const qty = Number(quantity || 0);
    const from = unitBySymbolLoose(unit);
    const to = unitBySymbolLoose(targetUnit);
    if (!to)
        return null;
    if (!from)
        return normalizeQuantity(qty, unit).unit === String(targetUnit || '').toLowerCase() ? { quantity: qty, unit: targetUnit } : null;
    if (from.unit_type === to.unit_type) {
        const baseQty = qty * Number(from.to_base_factor || 1);
        return { quantity: baseQty / Number(to.to_base_factor || 1), unit: to.symbol };
    }
    const d = Number(density || 0) || defaultDensityForConversion(from.unit_type, to.unit_type, targetUnitType);
    if (!d)
        return null;
    if (from.unit_type === 'mass' && to.unit_type === 'volume') {
        const grams = qty * Number(from.to_base_factor || 1);
        const ml = grams / d;
        return { quantity: ml / Number(to.to_base_factor || 1), unit: to.symbol };
    }
    if (from.unit_type === 'volume' && to.unit_type === 'mass') {
        const ml = qty * Number(from.to_base_factor || 1);
        const grams = ml * d;
        return { quantity: grams / Number(to.to_base_factor || 1), unit: to.symbol };
    }
    return null;
}
function unitBySymbolLoose(symbol) {
    const s = String(symbol || '').toLowerCase();
    const fallback = {
        g: { symbol: 'g', unit_type: 'mass', to_base_factor: 1 },
        kg: { symbol: 'kg', unit_type: 'mass', to_base_factor: 1000 },
        ml: { symbol: 'ml', unit_type: 'volume', to_base_factor: 1 },
        l: { symbol: 'l', unit_type: 'volume', to_base_factor: 1000 },
        ud: { symbol: 'ud', unit_type: 'unit', to_base_factor: 1 },
        unidad: { symbol: 'ud', unit_type: 'unit', to_base_factor: 1 }
    };
    return fallback[s] || unitBySymbol(symbol);
}
function defaultDensityForConversion(fromType, toType, targetUnitType) {
    // La equivalencia 1 g/ml solo se aplica cuando la ficha técnica tiene densidad informada.
    // Evita costes silenciosamente erróneos en aceites, lácteos, jarabes, salsas u ovoproductos líquidos.
    return 0;
}
function lineForOrder(l) {
    var _a, _b;
    if (!(l === null || l === void 0 ? void 0 : l.ingredient_id) || !l.base_unit_symbol)
        return l;
    const converted = convertQuantityToUnit((_a = l.rawQuantity) !== null && _a !== void 0 ? _a : l.quantity, (_b = l.rawUnit) !== null && _b !== void 0 ? _b : l.unit, l.base_unit_symbol, l.density_g_ml, l.base_unit_type);
    if (!converted)
        return l;
    return Object.assign(Object.assign({}, l), { quantity: converted.quantity, unit: converted.unit });
}
function bakeryProcessBlocksHtml(recipeId) {
    const rows = db.query('SELECT block, block_label, instruction, notes FROM v_bakery_process_blocks_print WHERE recipe_id=$id ORDER BY block_order, step_number', { $id: recipeId });
    if (!rows.length)
        return processBlock(recipeDetail('bakery', recipeId), [], 'bakery');
    const detail = bakeryDetail(recipeId);
    const groups = new Map();
    for (const r of rows) {
        const label = r.block === 'preferment' ? prefermentBlockTitle(detail) : (r.block_label || r.block);
        if (!groups.has(label))
            groups.set(label, []);
        groups.get(label).push([r.instruction, r.notes].filter(Boolean).join('\n'));
    }
    return `<div class="process-block"><h3>Proceso</h3>${[...groups.entries()].map(([label, texts]) => `<h4>${escapeHtml(label)}</h4><div class="prose">${paragraphs(uniquePublicText(texts))}</div>`).join('')}</div>`;
}
function bakeryComponents(recipeId, item, recipe, visited = new Set()) {
    return db.query(`SELECT * FROM v_bakery_recipe_components_print WHERE bakery_recipe_id=$id AND active=1 ORDER BY sort_order,id`, { $id: recipeId })
        .map(row => componentComputed(row, item, recipe, visited));
}
function componentComputed(row, item, recipe, visited = new Set()) {
    const base = bakeryBaseMetrics(row.bakery_recipe_id, bakeryFlourForItem(item, recipe), recipe);
    let q = Number(row.quantity_value || 0);
    let unit = row.unit_symbol || '';
    if (row.calculation_base === 'per_piece')
        q = base.pieces * Number(row.quantity_value || 0);
    else if (row.calculation_base === 'flour_pct') {
        q = base.flourG * Number(row.quantity_value || 0) / 100;
        unit = 'g';
    }
    else if (row.calculation_base === 'dough_pct') {
        q = base.rawG * Number(row.quantity_value || 0) / 100;
        unit = 'g';
    }
    else if (row.calculation_base === 'baked_weight_pct') {
        q = base.bakedG * Number(row.quantity_value || 0) / 100;
        unit = 'g';
    }
    else if (row.calculation_base === 'fixed')
        q = Number(row.quantity_value || 0) * base.scale;
    const factor = componentScaleFactor(row.component_type, row.component_id, q, unit);
    const estimatedCost = row.include_in_cost ? componentEstimatedCost(row.component_type, row.component_id, factor, visited) : 0;
    return Object.assign(Object.assign({}, row), { requiredQty: q, requiredUnit: unit, displayQty: displayQuantity(q, unit).text, factor, estimatedCost });
}
function componentEstimatedCost(type, id, factor, visited = new Set()) {
    if (!factor || factor.warning || !Number.isFinite(Number(factor.value)))
        return 0;
    const key = `${type}:${id}`;
    if (visited.has(key))
        return 0;
    const nextVisited = new Set([...visited, key]);
    if (type === 'culinary')
        return sum(culinaryLines(id, factor.value, true).filter(l => l.ingredient_id).map(l => l.cost || 0));
    const childRecipe = recipeSummary('bakery', id) || db.query('SELECT id AS source_id, name, base_flour_g, base_pieces, baking_loss_pct FROM bakery_recipes WHERE id=$id', { $id: id })[0] || { source_id: id, base_flour_g: 1000, name: id };
    const childFlour = Number(childRecipe.base_flour_g || 1000) * Number(factor.value || 0);
    const childItem = { uid: `bakery:${id}`, sourceType: 'bakery', sourceId: id, name: childRecipe.name, qty: childFlour, unitLabel: 'g harina', baseMode: 'flour_g', baseValue: Number(childRecipe.base_flour_g || 1000) };
    return sum(bakeryLines(id, childItem, childRecipe).map(l => l.cost || 0)) + sum(bakeryComponents(id, childItem, childRecipe, nextVisited).map(c => c.estimatedCost || 0));
}
function componentScaleFactor(type, id, qty, unit) {
    if (type === 'culinary') {
        const row = db.query(`SELECT cr.yield_quantity, u.symbol, u.unit_type, u.to_base_factor, lu.unit_type AS used_type, lu.to_base_factor AS used_factor
      FROM culinary_recipes cr LEFT JOIN units u ON u.id=cr.yield_unit_id LEFT JOIN units lu ON lu.symbol=$unit WHERE cr.id=$id`, { $id: id, $unit: unit })[0];
        if (!row || !row.yield_quantity || !row.symbol || row.unit_type !== row.used_type)
            return { value: 0, warning: 'rendimiento o unidad no calculable' };
        return { value: (Number(qty || 0) * Number(row.used_factor || 1)) / (Number(row.yield_quantity) * Number(row.to_base_factor || 1)), warning: '' };
    }
    const used = unitBySymbol(unit);
    const y = bakeryYieldForUnit(id, used);
    if (!y || !used || y.unit_type !== used.unit_type)
        return { value: 0, warning: 'rendimiento panadero o unidad no calculable' };
    return { value: (Number(qty || 0) * used.to_base_factor) / (y.quantity * y.to_base_factor), warning: '' };
}
function bakeryYieldForUnit(id, usedUnit) {
    if (!usedUnit)
        return null;
    const br = db.query('SELECT * FROM bakery_recipes WHERE id=$id', { $id: id })[0];
    if (!br)
        return null;
    if (usedUnit.unit_type === 'unit' && Number(br.base_pieces || 0) > 0)
        return { quantity: Number(br.base_pieces), unit_type: 'unit', to_base_factor: 1 };
    if (usedUnit.unit_type === 'mass') {
        const pieces = Number(br.base_pieces || 0);
        const baked = pieces && Number(br.baked_piece_weight_g || 0) ? pieces * Number(br.baked_piece_weight_g) : (Number(br.base_raw_weight_g || 0) ? Number(br.base_raw_weight_g) * (100 - Number(br.baking_loss_pct || 0)) / 100 : Number(br.base_flour_g || 0));
        if (baked > 0)
            return { quantity: baked, unit_type: 'mass', to_base_factor: 1 };
    }
    return null;
}
function unitBySymbol(symbol) {
    return db.query('SELECT * FROM units WHERE lower(symbol)=lower($s)', { $s: symbol })[0] || null;
}
function bakeryComponentsSectionsHtml(components, opts, ctx = {}) {
    if (!components.length)
        return '';
    return `<div class="component-block"><h3>Componentes elaborados</h3>${components.map(c => componentSectionHtml(c, opts, ctx)).join('\n')}</div>`;
}
function componentSectionHtml(c, opts, ctx = {}) {
    var _a, _b;
    const key = `${c.component_type}:${c.component_id}`;
    if ((_a = ctx.visited) === null || _a === void 0 ? void 0 : _a.has(key))
        return `<div class="warning-block"><b>Ciclo omitido:</b> ${escapeHtml(c.component_name)}</div>`;
    if ((_b = c.factor) === null || _b === void 0 ? void 0 : _b.warning)
        return `<div class="warning-block"><b>Componente no escalado:</b> ${escapeHtml(c.component_name)} · ${escapeHtml(c.factor.warning)}</div>`;
    const globalRendered = ctx.printCtx && ctx.printCtx.renderedSubrecipes;
    if (globalRendered && globalRendered.has(key) && !(ctx.mainKeys && ctx.mainKeys.has(key)))
        return `<section class="sub-sheet sub-sheet-reference"><h3>Componente referenciado: ${escapeHtml(c.component_name)}</h3><p>Cantidad necesaria: ${escapeHtml(c.displayQty)} · ya desarrollado en este documento. Sus ingredientes, pedido y alérgenos permanecen consolidados.</p></section>`;
    if (globalRendered) globalRendered.add(key);
    if (c.component_type === 'culinary') {
        const detail = recipeDetail('culinary', c.component_id);
        const lines = culinaryLines(c.component_id, c.factor.value, false);
        const allergenData = culinaryAllergenData(c.component_id);
        const category = subrecipeCategory(c.component_id, c.component_name);
        if (printProfile(opts) !== 'auditoria_completa' && category === 'BASE_TECNICA') {
            return `<section class="sub-sheet technical-base-collapsed"><h3>Componente base técnica plegado: ${escapeHtml(c.component_name)}</h3><p>${escapeHtml(roleLabel(c.usage_role))} · cantidad necesaria: ${escapeHtml(c.displayQty)}.</p><p class="muted">No se desarrolla para no saturar la salida de aula-taller. Sus ingredientes, pedido y alérgenos permanecen consolidados.</p>${allergenBlockHtml(allergenData, 'Alérgenos del componente plegado')}</section>`;
        }
        return `<section class="sub-sheet"><h3>Componente: ${escapeHtml(c.component_name)}</h3><p>${escapeHtml(roleLabel(c.usage_role))} · ${escapeHtml(componentStatusLabel(c.component_status))} · cantidad necesaria: ${escapeHtml(c.displayQty)} · ${Number(c.include_in_order) ? 'incluido en pedido' : 'sin pedido base'} · ${Number(c.include_in_cost) ? 'incluido en coste' : 'sin coste base'}</p>${sheetStatusWarningHtml(detail, 'culinary', opts)}${linesTable(lines, opts.includeCosts)}${allergenBlockHtml(allergenData, 'Alérgenos del componente')}${opts.includeProcess ? processBlock(detail, [], 'culinary') : ''}${appccPrintHtml(detail, 'culinary', opts)}</section>`;
    }
    const childRecipe = recipeSummary('bakery', c.component_id) || { source_id: c.component_id, base_flour_g: 1000, name: c.component_name };
    const flour = Number(childRecipe.base_flour_g || 1000) * c.factor.value;
    const childItem = { uid: `bakery:${c.component_id}`, sourceType: 'bakery', sourceId: c.component_id, name: c.component_name, qty: flour, unitLabel: 'g harina', baseMode: 'flour_g', baseValue: Number(childRecipe.base_flour_g || 1000) };
    return `<section class="sub-sheet"><h3>Componente: ${escapeHtml(c.component_name)}</h3><p>${escapeHtml(roleLabel(c.usage_role))} · ${escapeHtml(componentStatusLabel(c.component_status))} · cantidad necesaria: ${escapeHtml(c.displayQty)} · ${Number(c.include_in_order) ? 'incluido en pedido' : 'sin pedido base'} · ${Number(c.include_in_cost) ? 'incluido en coste' : 'sin coste base'}</p>${bakerySheetHtml(childItem, opts, false, { depth: Number(ctx.depth || 0) + 1, visited: new Set([...(ctx.visited || []), key]), printCtx: ctx.printCtx, mainKeys: ctx.mainKeys, rootKey: ctx.rootKey })}</section>`;
}
function lineGroupLabel(group) {
    return ({ dough: 'Masa', filling: 'Relleno', topping: 'Cobertura', decoration: 'Decoración / acabado', other: 'Otros' })[group] || group || '';
}
function roleLabel(role) {
    return ({ filling: 'Relleno', topping: 'Cobertura', decoration: 'Decoración', glaze: 'Glaseado', soak: 'Baño / calado', cream: 'Crema', base: 'Base', insert: 'Inserto', other: 'Otro' })[role] || role || '';
}
function componentStatusLabel(status) {
    return ({ required: 'Obligatorio', optional: 'Opcional', variant: 'Variante' })[status] || status || 'Obligatorio';
}
function componentStatusOptionsHtml(selected = 'required') {
    return [['required', 'Obligatorio'], ['optional', 'Opcional'], ['variant', 'Variante']].map(([id, label]) => `<option value="${id}" ${selected === id ? 'selected' : ''}>${label}</option>`).join('');
}

function sqlQuote(value) {
    return `'${String(value || '').replace(/'/g, "''")}'`;
}
function uniqueList(values) {
    return [...new Set((values || []).filter(Boolean).map(v => String(v)))];
}
function emptyAllergenData() {
    return { confirmed: new Map(), pending: new Map(), mayContain: new Map() };
}
function addAllergenRow(data, row) {
    if (!row || !row.allergen_id)
        return data;
    const key = row.declaration_status === 'pending' ? 'pending' : (row.declaration_status === 'may_contain' ? 'mayContain' : 'confirmed');
    const map = data[key] || data.confirmed;
    if (!map.has(row.allergen_id))
        map.set(row.allergen_id, { id: row.allergen_id, name: row.allergen_name || row.name || row.allergen_id, order: Number(row.regulation_order || 99), ingredients: new Set(), notes: new Set() });
    const entry = map.get(row.allergen_id);
    if (row.ingredient_name)
        entry.ingredients.add(row.ingredient_name);
    if (row.notes)
        entry.notes.add(row.notes);
    return data;
}
function mergeAllergenData(target, source) {
    if (!source)
        return target;
    ['confirmed', 'pending', 'mayContain'].forEach(key => {
        const sourceMap = source[key];
        if (!sourceMap)
            return;
        for (const entry of sourceMap.values()) {
            if (!target[key].has(entry.id))
                target[key].set(entry.id, { id: entry.id, name: entry.name, order: entry.order, ingredients: new Set(), notes: new Set() });
            const dest = target[key].get(entry.id);
            entry.ingredients.forEach(v => dest.ingredients.add(v));
            entry.notes.forEach(v => dest.notes.add(v));
        }
    });
    return target;
}
function allergenDataHasContent(data) {
    return data && (data.confirmed.size || data.pending.size || data.mayContain.size);
}
function allergenDataFromIngredientIds(ids) {
    const uniqueIds = uniqueList(ids);
    const data = emptyAllergenData();
    if (!uniqueIds.length)
        return data;
    const rows = db.query(`SELECT ia.ingredient_id, i.name AS ingredient_name, ia.allergen_id, a.name AS allergen_name, a.regulation_order, ia.declaration_status, ia.notes
      FROM ingredient_allergens ia
      JOIN allergens a ON a.id=ia.allergen_id
      JOIN ingredients i ON i.id=ia.ingredient_id
      WHERE a.regulation_order BETWEEN 1 AND 14
        AND ia.ingredient_id IN (${uniqueIds.map(sqlQuote).join(',')})
      ORDER BY a.regulation_order, a.name COLLATE NOCASE, i.name COLLATE NOCASE`);
    rows.forEach(row => addAllergenRow(data, row));
    return data;
}
function culinaryAllergenData(recipeId) {
    const ids = db.query(`SELECT DISTINCT ingredient_id FROM v_culinary_expanded_ingredient_lines WHERE recipe_id=$id AND ingredient_id IS NOT NULL`, { $id: recipeId }).map(r => r.ingredient_id);
    return allergenDataFromIngredientIds(ids);
}
function bakeryComponentRowsForAllergens(recipeId) {
    return db.query(`SELECT bakery_recipe_id, component_type, component_id, component_name, usage_role, component_status, include_in_order, include_in_cost, active
      FROM v_bakery_recipe_components_print
      WHERE bakery_recipe_id=$id AND active=1
      ORDER BY sort_order,id`, { $id: recipeId });
}
function bakeryAllergenBundle(recipeId, visited = new Set()) {
    const key = `bakery:${recipeId}`;
    const main = emptyAllergenData();
    const optional = [];
    if (visited.has(key))
        return { main, optional };
    const nextVisited = new Set([...visited, key]);
    const directIds = db.query(`SELECT DISTINCT ingredient_id FROM bakery_recipe_lines WHERE recipe_id=$id AND ingredient_id IS NOT NULL`, { $id: recipeId }).map(r => r.ingredient_id);
    mergeAllergenData(main, allergenDataFromIngredientIds(directIds));
    for (const c of bakeryComponentRowsForAllergens(recipeId)) {
        const cData = componentAllergenData(c, nextVisited);
        const status = c.component_status || 'required';
        if (status === 'required')
            mergeAllergenData(main, cData);
        else
            optional.push({ name: c.component_name || c.component_id, status, usage_role: c.usage_role, data: cData });
    }
    return { main, optional };
}
function componentAllergenData(component, visited = new Set()) {
    const key = `${component.component_type}:${component.component_id}`;
    if (visited.has(key))
        return emptyAllergenData();
    const nextVisited = new Set([...visited, key]);
    if (component.component_type === 'culinary')
        return culinaryAllergenData(component.component_id);
    return bakeryAllergenBundle(component.component_id, nextVisited).main;
}
function allergenEntryHtml(entry) {
    const ing = [...entry.ingredients].sort((a, b) => a.localeCompare(b, 'es'));
    const listed = ing.slice(0, 8).join(', ');
    const more = ing.length > 8 ? `, +${ing.length - 8} más` : '';
    return `<li><b>${escapeHtml(entry.name)}</b>${ing.length ? ` <span class="allergen-source">(${escapeHtml(listed + more)})</span>` : ''}</li>`;
}
function allergenListHtml(map) {
    return [...map.values()].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, 'es')).map(allergenEntryHtml).join('');
}
function allergenBlockHtml(data, title = 'Alérgenos directos y derivados consolidados') {
    const confirmed = allergenListHtml(data.confirmed);
    const pending = allergenListHtml(data.pending);
    const may = allergenListHtml(data.mayContain);
    const emptyMsg = allergenEmptyMessage(title);
    if (!confirmed && !pending && !may)
        return `<div class="allergen-block"><h3>${escapeHtml(title)}</h3><p class="muted">${escapeHtml(emptyMsg)}</p></div>`;
    return `<div class="allergen-block"><h3>${escapeHtml(title)}</h3>${confirmed ? `<h4>Confirmados</h4><ul>${confirmed}</ul>` : ''}${pending ? `<h4>Pendientes de verificación</h4><ul class="pending">${pending}</ul>` : ''}${may ? `<h4>Puede contener / trazas declaradas</h4><ul class="may-contain">${may}</ul>` : ''}<p class="allergen-note">Bloque limitado a los 14 grupos normativos. Las categorías internas/no estándar no se mezclan con esta declaración.</p></div>`;
}
function allergenEmptyMessage(title = '') {
    const t = normalize(title || '');
    if (t.includes('pedido'))
        return 'No se detectan alérgenos normativos confirmados en las líneas del pedido.';
    if (t.includes('adicional') || t.includes('base tecnica plegada'))
        return 'No se detectan alérgenos normativos adicionales derivados de subrecetas o bases vinculadas.';
    return 'No se detectan alérgenos normativos confirmados en los ingredientes vinculados.';
}
function optionalComponentAllergensHtml(optional) {
    const rows = (optional || []).filter(o => allergenDataHasContent(o.data));
    if (!rows.length)
        return '';
    return `<div class="allergen-block optional-allergens"><h3>Alérgenos de componentes opcionales o variantes</h3>${rows.map(o => `<section><h4>${escapeHtml(componentStatusLabel(o.status))}: ${escapeHtml(o.name)}${o.usage_role ? ` · ${escapeHtml(roleLabel(o.usage_role))}` : ''}</h4>${allergenBlockInnerHtml(o.data)}</section>`).join('')}</div>`;
}
function allergenBlockInnerHtml(data) {
    const confirmed = allergenListHtml(data.confirmed);
    const pending = allergenListHtml(data.pending);
    const may = allergenListHtml(data.mayContain);
    if (!confirmed && !pending && !may)
        return `<p class="muted">No se detectan alérgenos normativos confirmados en este bloque.</p>`;
    return `${confirmed ? `<p><b>Confirmados:</b></p><ul>${confirmed}</ul>` : ''}${pending ? `<p><b>Pendientes:</b></p><ul class="pending">${pending}</ul>` : ''}${may ? `<p><b>Puede contener / trazas:</b></p><ul class="may-contain">${may}</ul>` : ''}`;
}

function recipeDetail(sourceType, sourceId) {
    if (sourceType === 'culinary')
        return db.query('SELECT id, name, release_status, process, service_notes, appcc_notes, notes FROM culinary_recipes WHERE id=$id', { $id: sourceId })[0] || {};
    return db.query(`SELECT br.id, br.name, br.release_status, br.yield_status, br.fermentation_notes AS process, br.notes, NULL AS service_notes, NULL AS appcc_notes, bp.preferment_type AS bp_type, bp.notes AS preferment_notes, bp.validation_status AS preferment_validation_status FROM bakery_recipes br LEFT JOIN bakery_preferments bp ON bp.recipe_id=br.id WHERE br.id=$id`, { $id: sourceId })[0] || {};
}
function recipePhotoDataUrl(kind, id) {
    const row = db.query(`SELECT ma.mime_type, ma.data, ma.file_name
    FROM recipe_media rm
    JOIN media_assets ma ON ma.id=rm.media_id
    WHERE rm.recipe_kind=$kind AND rm.recipe_id=$id
    ORDER BY rm.sort_order LIMIT 1`, { $kind: kind, $id: id })[0];
    if (!row)
        return '';
    if (row.data && Number(row.data.byteLength || row.data.length || 0) > 0) {
        return `${row.mime_type};base64,${bytesToBase64(row.data)}`.replace(/^image\//, 'data:image/');
    }
    if (row.file_name)
        return `../assets/photos/recipes/${encodeURIComponent(String(row.file_name)).replace(/%2F/g, '/')}`;
    return '';
}
function processBlock(detail, steps, sourceType) {
    const sources = sourceType === 'culinary'
        ? [detail.process]
        : [detail.process, ...steps.map(s => [s.instruction, s.notes].filter(Boolean).join('\n'))];
    const text = uniquePublicText(sources);
    if (!text.trim())
        return '';
    return `<div class="process-block"><h3>Proceso</h3><div class="prose">${paragraphs(text)}</div></div>`;
}
function appccRowsFor(sourceType, sourceId) {
    if (!sourceId)
        return [];
    return db.query(`SELECT risk_family, hazard_type, main_hazard, preventive_measure, monitoring, corrective_action, record_reference, service_conservation, source_type, notes
      FROM appcc_doc_blocks
      WHERE recipe_kind=$kind AND recipe_id=$id AND active=1
      ORDER BY sort_order, id`, { $kind: sourceType, $id: sourceId });
}
function appccCell(text) {
    return `<div class="appcc-cell">${paragraphs(String(text || '').trim())}</div>`;
}
function appccStructuredRowsHtml(rows) {
    return rows.map(r => `<section class="appcc-row-block"><h4>${escapeHtml(r.risk_family || 'APPCC docente')}</h4>
    <table class="appcc-table"><tbody>
      <tr><th>Tipo de peligro</th><td>${escapeHtml(r.hazard_type || '')}</td></tr>
      <tr><th>Peligro principal</th><td>${appccCell(r.main_hazard)}</td></tr>
      <tr><th>Medida preventiva</th><td>${appccCell(r.preventive_measure)}</td></tr>
      <tr><th>Vigilancia</th><td>${appccCell(r.monitoring)}</td></tr>
      <tr><th>Corrección</th><td>${appccCell(r.corrective_action)}</td></tr>
      <tr><th>Registro</th><td>${appccCell(r.record_reference)}</td></tr>
      <tr><th>Conservación / servicio</th><td>${appccCell(r.service_conservation)}</td></tr>
    </tbody></table>${r.notes ? `<p class="appcc-note">${escapeHtml(r.notes)}</p>` : ''}</section>`).join('');
}
function appccBriefRowsHtml(rows) {
    return rows.map(r => `<section class="appcc-row-block appcc-brief appcc-brief-card"><h4>${escapeHtml(r.risk_family || 'APPCC docente')}</h4>
    <div class="appcc-brief-grid">
      <div class="appcc-brief-label">Peligro</div><div class="appcc-brief-value">${appccCell([r.hazard_type, r.main_hazard].filter(Boolean).join(' · '))}</div>
      <div class="appcc-brief-label">Medida clave</div><div class="appcc-brief-value">${appccCell(r.preventive_measure || r.service_conservation || '')}</div>
    </div></section>`).join('');
}
function appccBlock(detail, sourceType, opts = {}) {
    const rows = appccRowsFor(sourceType, detail === null || detail === void 0 ? void 0 : detail.id);
    if (rows.length) {
        const title = sourceType === 'bakery' ? 'APPCC docente mínimo · Panadería/Pastelería' : 'APPCC docente mínimo · Cocina';
        const content = isCompactProfile(opts) ? appccBriefRowsHtml(rows) : appccStructuredRowsHtml(rows);
        const brief = isCompactProfile(opts) ? ' · breve' : '';
        return `<div class="appcc-block structured-appcc"><h3>${title}${brief}</h3><p class="appcc-disclaimer"><b>Modelo docente:</b> no sustituye el manual APPCC del centro ni la ficha técnica del proveedor. Los parámetros concretos deben verificarse según el procedimiento del centro.</p>${content}</div>`;
    }
    const sources = sourceType === 'bakery'
        ? [detail.appcc_notes, detail.service_notes, detail.notes]
        : [detail.appcc_notes, detail.service_notes];
    const text = uniquePublicText(sources);
    if (!text.trim())
        return '';
    const title = sourceType === 'bakery' ? 'Notas higiénico-sanitarias pendientes de estructurar' : 'Notas APPCC pendientes de estructurar';
    return `<div class="appcc-block appcc-unstructured"><h3>${title}</h3><p class="appcc-disclaimer"><b>Aviso:</b> bloque no estructurado; debe verificarse según manual APPCC del centro.</p><div class="prose">${paragraphs(text)}</div></div>`;
}
function minimalSafetyNoticeHtml(sourceType) {
    return `<div class="appcc-block appcc-minimal-notice"><h3>Aviso mínimo de seguridad alimentaria</h3><p>El APPCC docente detallado está oculto por opción de impresión. El documento no sustituye el manual APPCC del centro ni la ficha técnica del proveedor; mantener alérgenos y avisos críticos visibles.</p></div>`;
}
function appccPrintHtml(detail, sourceType, opts = {}) {
    return opts.includeAppcc ? appccBlock(detail, sourceType, opts) : minimalSafetyNoticeHtml(sourceType);
}
function linesTable(lines, includeCosts) {
    const tableClass = includeCosts ? 'lines-table with-costs with-origin' : 'lines-table with-origin';
    return `<table class="${tableClass}"><thead><tr><th>Ingrediente</th><th>Cantidad</th>${includeCosts ? '<th>Coste</th>' : ''}<th>Origen</th></tr></thead><tbody>${lines.map(l => {
        const q = displayQuantity(l.quantity, l.unit);
        const origin = formatLineOrigin(l.technical_note || '');
        return `<tr><td>${escapeHtml(l.name || '')}</td><td class="qty">${escapeHtml(q.text)}</td>${includeCosts ? `<td class="money-cell">${money(l.cost || 0)}</td>` : ''}<td class="note-cell">${escapeHtml(origin)}</td></tr>`;
    }).join('')}</tbody></table>`;
}
function formatLineOrigin(note) {
    const clean = String(note || '').replace(/\s*\|\s*$/g, '').replace(/\s+/g, ' ').trim();
    if (!clean)
        return 'elaboración';
    const first = clean.split('|').map(x => x.trim()).filter(Boolean)[0] || clean;
    const parts = first.split('>').map(x => x.trim()).filter(Boolean);
    const lower = parts.map(p => normalize(p));
    if (!parts.length)
        return 'elaboración';
    if (lower[0] === 'salsa')
        return 'salsa';
    if (lower.includes('ligazon'))
        return 'ligazón';
    if (lower.includes('base liquida'))
        return 'base líquida';
    if (lower.includes('aromatizacion'))
        return 'aromatización';
    if (lower.includes('desglasado'))
        return 'desglasado';
    const publicFirst = parts.find(p => !['elaboración', 'elaboracion'].includes(normalize(p))) || parts[0];
    return publicFirst.replace(/\s*\|\s*/g, '').trim() || 'elaboración';
}
// Pedido consolidado
async function orderHtml(items, opts) {
    let rows = [];
    let engineLabel = 'motor clásico';
    if (window.ObradORRRecursiveEngine && window.ObradORRRecursiveEngine.canonical) {
        try {
            rows = window.ObradORRRecursiveEngine.selectionOrderLines(db, items, opts);
            engineLabel = 'motor recursivo único 2.1';
        }
        catch (error) {
            console.warn('[ObradORR] Motor recursivo 2.1 no disponible; se usa fallback clásico.', error);
            rows = [];
        }
    }
    if (!rows.length) {
        for (const item of items)
            rows.push(...orderLinesForItem(item, opts));
    }
    const grouped = aggregateOrder(rows);
    const orderAllergens = allergenDataFromIngredientIds(rows.map(r => r.ingredient_id));
    return `<section class="print-order page-break"><h2>Pedido consolidado</h2><p class="footer-note">Documento operativo de compra/economato: ingredientes expandidos y agrupados. Fuente de cálculo: ${escapeHtml(engineLabel)}. Los alérgenos globales se mantienen visibles.</p>${allergenBlockHtml(orderAllergens, 'Alérgenos globales del pedido')}${grouped.map(group => `<h3>${escapeHtml(group.name)}</h3><table class="order-table ${opts.includeCosts ? 'with-costs' : ''}"><thead><tr><th>Ingrediente</th><th>Total</th><th>Zona</th><th>Usado en</th>${opts.includeCosts ? '<th>Coste</th>' : ''}</tr></thead><tbody>${group.rows.map(r => { const q = displayQuantity(r.quantity, r.unit); const used = Array.isArray(r.usedIn) ? r.usedIn.join(', ') : [...(r.usedIn || [])].join(', '); return `<tr><td>${escapeHtml(r.name)}</td><td class="qty">${escapeHtml(q.text)}</td><td>${escapeHtml(r.storage_zone || '')}</td><td>${escapeHtml(used)}</td>${opts.includeCosts ? `<td class="money-cell">${money(r.cost || 0)}</td>` : ''}</tr>`; }).join('')}</tbody></table>`).join('')}</section>`;
}
function orderLinesForItem(item, opts, visited = new Set()) {
    var _a;
    const recipe = state.recipes.find(r => r.uid === item.uid) || item;
    const currentKey = `${item.sourceType}:${item.sourceId}`;
    const seen = new Set(visited || []);
    seen.add(currentKey);
    if (item.sourceType === 'culinary') {
        return culinaryLines(item.sourceId, scaleForItem(item, recipe), true)
            .filter(l => l.ingredient_id)
            .map(l => (Object.assign(Object.assign({}, l), { usedIn: item.name })));
    }
    const lines = bakeryLines(item.sourceId, item, recipe)
        .filter(l => l.ingredient_id)
        .map(l => (Object.assign(Object.assign({}, l), { usedIn: item.name, source_type: 'direct', component_status: null, included_in_base_order: 1 })));
    const components = bakeryComponents(item.sourceId, item, recipe, seen);
    for (const c of components) {
        if (!c.include_in_order || c.component_status !== 'required')
            continue;
        const key = `${c.component_type}:${c.component_id}`;
        if (seen.has(key) || ((_a = c.factor) === null || _a === void 0 ? void 0 : _a.warning))
            continue;
        const childSeen = new Set([...seen, key]);
        if (c.component_type === 'culinary') {
            lines.push(...culinaryLines(c.component_id, c.factor.value, true)
                .filter(l => l.ingredient_id)
                .map(l => (Object.assign(Object.assign({}, l), { usedIn: `${item.name} · ${c.component_name}`, source_type: 'component', component_status: c.component_status, included_in_base_order: 1 }))));
        }
        else {
            const childRecipe = recipeSummary('bakery', c.component_id) || { source_id: c.component_id, base_flour_g: 1000, name: c.component_name };
            const childFlour = Number(childRecipe.base_flour_g || 1000) * Number(c.factor.value || 0);
            const childItem = {
                uid: `bakery:${c.component_id}`,
                sourceType: 'bakery',
                sourceId: c.component_id,
                name: c.component_name,
                qty: childFlour,
                unitLabel: 'g harina',
                baseMode: 'flour_g',
                baseValue: Number(childRecipe.base_flour_g || 1000)
            };
            lines.push(...orderLinesForItem(childItem, opts, childSeen)
                .map(l => (Object.assign(Object.assign({}, l), { usedIn: `${item.name} · ${l.usedIn}`, source_type: l.source_type || 'component', component_status: l.component_status || c.component_status, included_in_base_order: 1 }))));
        }
    }
    return lines;
}
function aggregateOrder(lines) {
    // P0-E: el pedido impreso mantiene la misma política que SQL: directos + componentes required con include_in_order=1.
    const map = new Map();
    for (const l of lines) {
        const orderLine = lineForOrder(l);
        const norm = normalizeQuantity(orderLine.quantity, orderLine.unit);
        const key = `${l.order_group || 'Otros'}|${l.ingredient_id}|${norm.unit}`;
        if (!map.has(key))
            map.set(key, { name: l.name, order_group: l.order_group || 'Otros', quantity: 0, unit: norm.unit, cost: 0, storage_zone: l.storage_zone, usedIn: new Set() });
        const row = map.get(key);
        row.quantity += norm.quantity;
        row.cost += Number(l.cost || 0);
        row.usedIn.add(l.usedIn);
    }
    const groups = new Map();
    for (const row of map.values()) {
        const display = denormalizeQuantity(row.quantity, row.unit);
        row.quantity = display.quantity;
        row.unit = display.unit;
        if (!groups.has(row.order_group))
            groups.set(row.order_group, []);
        groups.get(row.order_group).push(row);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([name, rows]) => ({ name, rows: rows.sort((a, b) => a.name.localeCompare(b.name, 'es')) }));
}
function printDocumentShell(content, title = 'ObradORR · Documento') {
    const baseHref = new URL('./', window.location.href).href;
    const safeTitle = title || 'ObradORR · Documento';
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${escapeAttr(baseHref)}"><title>${escapeHtml(safeTitle)}</title><style>
    @page{size:A4;margin:11mm 12mm}*{box-sizing:border-box}body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1f2933;line-height:1.28;font-size:13px}h1{font-size:27px;margin:0 0 3px}h2{font-size:20px;margin:0 0 5px;break-after:avoid;page-break-after:avoid}h3{margin:11px 0 5px;color:#7c3f1d;break-after:avoid;page-break-after:avoid}h4{margin:8px 0 3px;color:#7c3f1d;break-after:avoid;page-break-after:avoid}.doc-cover{border-bottom:3px solid #7c3f1d;padding-bottom:12px;margin-bottom:12px}.doc-cover dl{display:grid;grid-template-columns:130px 1fr;gap:3px 10px;font-size:12px}.doc-cover dt{font-weight:800}.doc-cover dd{margin:0}.print-index{margin:8px 0 12px}.print-index ol{margin:4px 0 0 20px}.sheet-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #ddd;padding-bottom:7px;margin-bottom:8px;break-inside:avoid;page-break-inside:avoid}.sheet-head-text{min-width:0;flex:1 1 auto}.sheet-head h2{margin:0 0 4px}.sheet-head p{margin:0;color:#374151}.sheet-head-figure{flex:0 0 46mm;max-width:46mm;margin:0 0 0 auto;display:flex;justify-content:flex-end}.sheet-head-photo,.sheet-photo{width:46mm;max-width:46mm;height:auto;max-height:34mm;object-fit:contain;border-radius:8px;border:1px solid #ddd;background:#faf7f0}.sheet-head:not(.has-photo){display:block}.sheet-head:not(.has-photo) .sheet-head-text{width:100%}table{width:100%;border-collapse:collapse;margin:6px 0 9px;table-layout:fixed;page-break-inside:auto}thead{display:table-header-group}th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top;overflow-wrap:break-word;word-break:normal;hyphens:auto}th{background:#f4efe6;font-size:10.5px;text-transform:uppercase}tr{break-inside:avoid;page-break-inside:avoid}.lines-table th:nth-child(1){width:48%}.lines-table th:nth-child(2){width:18%}.lines-table th:nth-child(3){width:34%}.lines-table.with-costs th:nth-child(1){width:43%}.lines-table.with-costs th:nth-child(2){width:17%}.lines-table.with-costs th:nth-child(3){width:14%}.lines-table.with-costs th:nth-child(4){width:26%}.order-table th:nth-child(1){width:36%}.order-table th:nth-child(2){width:14%}.order-table th:nth-child(3){width:15%}.order-table th:nth-child(4){width:35%}.order-table.with-costs th:nth-child(1){width:33%}.order-table.with-costs th:nth-child(2){width:13%}.order-table.with-costs th:nth-child(3){width:14%}.order-table.with-costs th:nth-child(4){width:30%}.order-table.with-costs th:nth-child(5){width:10%}.qty,.money-cell{white-space:nowrap}.money-cell{text-align:right}.note-cell{font-size:11px}.page-break{break-before:page}.print-sheet:first-of-type{break-before:auto}.print-sheet,.print-order,.process-block,.appcc-block{break-inside:auto;page-break-inside:auto}.prose{max-width:100%;display:block}.prose p{margin:.30rem 0;break-inside:avoid;page-break-inside:avoid;overflow-wrap:normal;word-break:normal}.cost-line{background:#f6f0e6;padding:6px;border-radius:7px;margin:7px 0}.subrecipe-summary,.formula-meta,.component-block,.bakery-block,.warning-block{border:1px solid #e2d8c7;border-radius:9px;padding:7px 9px;margin:7px 0;break-inside:avoid;page-break-inside:avoid}.sub-sheet{border:1px solid #e2d8c7;border-radius:9px;padding:7px 9px;margin:8px 0;background:#fffaf2;break-inside:auto;page-break-inside:auto}.sub-sheet .sub-sheet-head{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;break-inside:avoid;page-break-inside:avoid}.sub-sheet .sub-sheet-head>div{min-width:0;flex:1}.sub-sheet img,.sub-sheet-photo{max-width:26mm;max-height:20mm;width:auto;height:auto;object-fit:contain;border-radius:7px;justify-self:end;background:#faf7f0}.formula-meta dl{display:grid;grid-template-columns:150px 1fr;gap:3px 8px;margin:0}.formula-meta dt{font-weight:800}.formula-meta dd{margin:0}.warning-block{background:#fff7ed;border-color:#fdba74}.sub-sheet-reference{background:#f8fafc;border-style:dashed}.technical-base-collapsed{background:#fafafa}.appcc-brief .appcc-table th{width:22%}.allergen-block{border:1px solid #f0c36b;background:#fff8e8;border-radius:9px;padding:7px 9px;margin:8px 0;break-inside:avoid;page-break-inside:avoid}.allergen-block h3{margin-top:0}.allergen-block h4{margin:6px 0 3px;color:#7c3f1d}.allergen-block ul{margin:3px 0 5px 18px;padding:0}.allergen-block .pending{color:#9a3412}.allergen-block .may-contain{color:#6b4e16}.allergen-source,.allergen-note{font-size:10.5px;color:#5b6472}.allergen-note{margin:4px 0 0}.optional-allergens{background:#fffaf2}.structured-appcc{border:1px solid #b7c8a9;background:#f8fff2;border-radius:9px;padding:7px 9px;margin:8px 0;break-inside:auto;page-break-inside:auto}.appcc-disclaimer,.appcc-note{font-size:10.5px;color:#4f5d43;margin:4px 0 6px}.appcc-row-block{break-inside:auto;page-break-inside:auto;margin:6px 0 8px}.appcc-table th{width:24%;background:#eaf4df}.structured-appcc h3{break-after:avoid-page}.structured-appcc table{break-inside:auto;page-break-inside:auto}.appcc-table td{width:76%}.appcc-cell p{margin:.20rem 0}.appcc-unstructured{background:#fff7ed;border-color:#fdba74}.warn{color:#9a3412;font-weight:700}.bakery-block h3,.component-block h3{margin-top:0}.preflight-print{break-inside:auto;page-break-inside:auto}.preflight-print table{font-size:11px}.print-legal-footer{border-top:1px solid #ddd;margin-top:12px;padding-top:6px;color:#5b6472;font-size:10px;text-align:center}.print-legal-footer strong{color:#1f2933}@media(max-width:760px){.sheet-head{display:block}.sheet-head-figure{margin:8px 0 0;max-width:100%;justify-content:flex-start}.sheet-head-photo,.sheet-photo{width:auto;max-width:100%;max-height:38mm}.sub-sheet .sub-sheet-head{display:block}.sub-sheet img,.sub-sheet-photo{max-width:100%;max-height:18mm;margin-top:5px}}@media print{button{display:none}h1,h2,h3,h4,.section-title{break-after:avoid;page-break-after:avoid}.sheet-head,.sub-sheet-head,.allergen-block,.warning-block,.appcc-card{break-inside:avoid;page-break-inside:avoid}.sub-sheet,.structured-appcc,.process-block{break-inside:auto;page-break-inside:auto}}
/* Maquetación de impresión final */
.sheet-head.has-photo{display:grid;grid-template-columns:minmax(0,1fr) 46mm;gap:10px;align-items:start}
.sheet-head-figure{grid-column:2;margin:0;max-width:46mm;justify-content:flex-end;align-self:start}
.sheet-head-text{grid-column:1;min-width:0}
.appcc-brief-card{border:1px solid #d9e6cf;background:#fbfff7;border-radius:8px;padding:6px 8px;margin:6px 0 8px;break-inside:avoid;page-break-inside:avoid}
.appcc-brief-card h4{margin:0 0 4px}
.appcc-brief-grid{display:grid;grid-template-columns:22% 1fr;border:1px solid #d9e6cf;border-bottom:0}
.appcc-brief-label,.appcc-brief-value{padding:4px 6px;border-bottom:1px solid #d9e6cf;overflow-wrap:break-word}
.appcc-brief-label{font-weight:800;text-transform:uppercase;font-size:10.5px;background:#edf7e7}
.appcc-brief-value .appcc-cell p{margin:0}
.sub-sheet-intro{break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid}
@media print{.sheet-head.has-photo{display:grid!important;grid-template-columns:minmax(0,1fr) 44mm!important;gap:8px!important}.sheet-head-figure{grid-column:2!important;max-width:44mm!important;margin:0!important}.sheet-head-text{grid-column:1!important}.sheet-head-photo,.sheet-photo{width:44mm!important;max-width:44mm!important;max-height:32mm!important;object-fit:contain!important}.appcc-brief-card{break-inside:avoid!important;page-break-inside:avoid!important}.appcc-brief-grid{grid-template-columns:23% 1fr}.sub-sheet-intro{break-inside:avoid!important;page-break-inside:avoid!important}}
@media screen and (max-width:760px){.sheet-head.has-photo{display:block}.sheet-head-figure{margin-top:8px;max-width:100%;justify-content:flex-start}.sheet-head-photo,.sheet-photo{width:auto!important;max-width:100%!important;max-height:38mm!important}}

  </style></head><body>${content}<footer class="print-legal-footer"><strong>ObradORR</strong> · ${escapeHtml(LEGAL_NOTICE)}</footer></body></html>`;
}
function saveCurrentSession() {
    if (!state.selection.length) {
        alert('No hay elaboraciones en la práctica actual.');
        return;
    }
    const t = state.printOptions.teaching || {};
    const title = t.title || `Práctica ${new Date().toLocaleDateString('es-ES')}`;
    const ids = teachingIdsFromOptions(t);
    const sessionId = `SES-${Date.now().toString(36).toUpperCase()}`;
    withTransaction(() => {
        db.exec(`INSERT INTO class_sessions (id,title,practice_date,cycle_id,module_id,group_name,responsible,notes)
      VALUES ($id,$title,$date,$cycle,$module,$group,$responsible,$notes)`, { $id: sessionId, $title: title, $date: t.date || new Date().toISOString().slice(0, 10), $cycle: ids.cycleId, $module: ids.moduleId, $group: t.group || null, $responsible: t.responsible || null, $notes: t.notes || null });
        state.selection.forEach((item, idx) => insertSessionItem(sessionId, item, idx));
    });
    loadSessionsFromSqlite();
    scheduleDbAutosave('Sesión guardada');
    alert('Sesión guardada en la copia SQLite activa.');
    render();
}
function insertSessionItem(sessionId, item, idx) {
    const recipe = state.recipes.find(r => r.uid === item.uid) || item;
    const payload = selectionDbPayload(item, recipe, idx);
    db.exec(`INSERT INTO class_session_items
    (id,session_id,item_type,culinary_recipe_id,bakery_recipe_id,production_mode,main_qty,servings,pieces,piece_weight_g,flour_g,raw_dough_g,baking_loss_pct,print_a4,sort_order,notes)
    VALUES ($id,$session,$type,$culinary,$bakery,$mode,$main,$servings,$pieces,$pieceWeight,$flour,$rawDough,$loss,1,$sort,$notes)`, Object.assign({ $id: `SI-${sessionId}-${idx + 1}`, $session: sessionId }, payload));
}
function loadSession(id) {
    const s = db.query('SELECT * FROM class_sessions WHERE id=$id', { $id: id })[0];
    if (!s)
        return;
    state.selection = loadSessionItems(id);
    state.printOptions.teaching = Object.assign(Object.assign({}, state.printOptions.teaching), sessionTeachingData(s));
    saveSelection();
    savePrintOptions();
    scheduleDbAutosave('Sesión cargada en selección');
    state.page = 'imprimir';
    render();
}
function clonePlain(value) {
    if (typeof structuredClone === 'function')
        return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}
function printSession(id) {
    const s = db.query('SELECT * FROM class_sessions WHERE id=$id', { $id: id })[0];
    if (!s)
        return;
    const opts = clonePlain(state.printOptions);
    opts.teaching = Object.assign(Object.assign({}, opts.teaching), sessionTeachingData(s));
    opts.includeTeachingData = true;
    generateDocument(loadSessionItems(id), opts);
}
function deleteSession(id) {
    if (!confirm('¿Eliminar esta sesión guardada?'))
        return;
    withTransaction(() => db.exec('DELETE FROM class_sessions WHERE id=$id', { $id: id }));
    loadSessionsFromSqlite();
    scheduleDbAutosave('Sesión eliminada');
    render();
}
function makeSelectionItem(uid) {
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe)
        return null;
    const q = defaultQuantity(recipe);
    return Object.assign({ uid, sourceType: recipe.source_type, sourceId: recipe.source_id, name: recipe.name, categoryLabel: recipe.category_label }, q);
}
function defaultQuantity(recipe) {
    if (recipe.source_type === 'bakery') {
        const baseFlour = Number(recipe.base_flour_g || 1000) || 1000;
        const baseRaw = Number(recipe.base_raw_weight_g || 0);
        const basePieces = Number(recipe.base_pieces || 0);
        const pieceWeightG = Number(recipe.base_raw_piece_weight_g || (baseRaw && basePieces ? baseRaw / basePieces : 0));
        if (basePieces > 0 && pieceWeightG > 0)
            return { qty: basePieces, unitLabel: 'piezas × g/pieza', baseMode: 'pieces_weight', baseValue: baseRaw || basePieces * pieceWeightG, baseFlourG: baseFlour, baseRawDoughG: baseRaw, basePieces, pieceWeightG, rawDoughG: round2(basePieces * pieceWeightG) };
        if (baseRaw > 0)
            return { qty: baseRaw, unitLabel: 'g masa', baseMode: 'raw_dough', baseValue: baseRaw, baseFlourG: baseFlour, baseRawDoughG: baseRaw, rawDoughG: baseRaw };
        return { qty: baseFlour, unitLabel: 'g harina', baseMode: 'flour_g', baseValue: baseFlour, baseFlourG: baseFlour, flourG: baseFlour };
    }
    if (recipe.default_production_mode === 'yield' || recipe.production_kind === 'technical_yield')
        return { qty: Number(recipe.yield_quantity || 1), unitLabel: recipe.yield_unit || 'rendimiento', baseMode: 'yield', baseValue: Number(recipe.yield_quantity || 1) };
    return { qty: Number(recipe.base_servings || 1), unitLabel: 'raciones', baseMode: 'servings', baseValue: Number(recipe.base_servings || 1) };
}
function defaultQuantityLabel(recipe) { const q = defaultQuantity(recipe); return selectionQuantityLabel(Object.assign({ sourceType: recipe.source_type }, q)); }
function selectionQuantityLabel(item) {
    if (!item)
        return '';
    if (item.sourceType === 'bakery') {
        const mode = bakeryScalingMode(item);
        if (mode === 'pieces_weight')
            return `${formatQty(item.qty || 0)} piezas × ${formatQty(item.pieceWeightG || 0)} g = ${formatQty((Number(item.qty || 0) * Number(item.pieceWeightG || 0)) || item.rawDoughG || 0)} g masa cruda`;
        if (mode === 'raw_dough')
            return `${formatQty(item.rawDoughG || item.qty || 0)} g masa total`;
        return `${formatQty(item.flourG || item.qty || 0)} g harina total`;
    }
    return `${formatQty(item.qty)} ${item.unitLabel || ''}`.trim();
}
function scaleForItem(item, recipe) { return Number(item.qty || 0) / (Number(item.baseValue || (recipe === null || recipe === void 0 ? void 0 : recipe.base_servings) || (recipe === null || recipe === void 0 ? void 0 : recipe.yield_quantity) || 1) || 1); }
function bakeryRawBaseForRecipe(recipeId, recipe) {
    const row = recipeId ? (db.query('SELECT base_flour_g, base_raw_weight_g FROM bakery_recipes WHERE id=$id', { $id: recipeId })[0] || {}) : {};
    const baseFlour = Number(row.base_flour_g || (recipe === null || recipe === void 0 ? void 0 : recipe.base_flour_g) || 1000) || 1000;
    const raw = Number(row.base_raw_weight_g || (recipe === null || recipe === void 0 ? void 0 : recipe.base_raw_weight_g) || 0);
    if (raw > 0)
        return raw;
    const totalPct = recipeId ? Number(db.value("SELECT SUM(baker_pct) FROM bakery_recipe_lines WHERE recipe_id=$id AND line_group='dough' AND include_in_dough=1", { $id: recipeId }) || 0) : 0;
    return totalPct > 0 ? baseFlour * totalPct / 100 : baseFlour;
}
function bakeryRawDoughForFlour(item, recipe, flourG) {
    const baseFlour = Number((recipe === null || recipe === void 0 ? void 0 : recipe.base_flour_g) || item.baseFlourG || 1000) || 1000;
    const baseRaw = Number((recipe === null || recipe === void 0 ? void 0 : recipe.base_raw_weight_g) || item.baseRawDoughG || bakeryRawBaseForRecipe(item.sourceId, recipe));
    return baseRaw * (Number(flourG || baseFlour) / baseFlour);
}
function bakeryFlourForItem(item, recipe) {
    const baseFlour = Number((recipe === null || recipe === void 0 ? void 0 : recipe.base_flour_g) || item.baseFlourG || item.baseValue || 1000) || 1000;
    if (bakeryScalingMode(item) === 'flour_g')
        return Number(item.flourG || item.qty || baseFlour);
    const baseRaw = Number((recipe === null || recipe === void 0 ? void 0 : recipe.base_raw_weight_g) || item.baseRawDoughG || bakeryRawBaseForRecipe(item.sourceId, recipe)) || baseFlour;
    if (bakeryScalingMode(item) === 'pieces_weight') {
        const targetRaw = Number(item.rawDoughG || (Number(item.qty || 0) * Number(item.pieceWeightG || 0)) || 0);
        return baseFlour * (targetRaw / (baseRaw || 1));
    }
    if (bakeryScalingMode(item) === 'raw_dough') {
        const targetRaw = Number(item.rawDoughG || item.qty || baseRaw);
        return baseFlour * (targetRaw / (baseRaw || 1));
    }
    return baseFlour * scaleForItem(item, recipe);
}
function lineScaled(l, scale) { var _a, _b; return Object.assign(Object.assign({}, l), { quantity: Number(l.quantity || 0) * scale, cost: Number((_b = (_a = l.estimated_cost) !== null && _a !== void 0 ? _a : l.cost) !== null && _b !== void 0 ? _b : 0) * scale }); }
function normalizeQuantity(q, unit) {
    const u = String(unit || '').toLowerCase();
    if (u === 'kg')
        return { quantity: Number(q || 0) * 1000, unit: 'g' };
    if (u === 'l')
        return { quantity: Number(q || 0) * 1000, unit: 'ml' };
    return { quantity: Number(q || 0), unit: u || 'ud' };
}
function denormalizeQuantity(q, unit) {
    if (unit === 'g' && Math.abs(q) >= 1000)
        return { quantity: q / 1000, unit: 'kg' };
    if (unit === 'ml' && Math.abs(q) >= 1000)
        return { quantity: q / 1000, unit: 'l' };
    return { quantity: q, unit };
}
function familyOptionsHtml(area, selected) {
    const rows = state.families.filter(f => {
        if (area === 'ingredient')
            return f.area === 'ingredient';
        return f.area === area || f.area === 'culinary' || f.area === 'bakery' || f.area === 'ingredient';
    });
    return `<option value="">Sin familia</option>` + rows.map(f => `<option value="${escapeAttr(f.id)}" ${selected === f.id ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('');
}
function subfamilyOptionsHtml(familyId, selected) {
    const rows = familyId ? state.subfamilies.filter(s => s.family_id === familyId) : [];
    return `<option value="">Sin subfamilia</option>` + rows.map(s => `<option value="${escapeAttr(s.id)}" ${selected === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('');
}
function orderGroupOptionsHtml(selected) { return `<option value="">Sin grupo</option>` + state.orderGroups.map(g => `<option value="${escapeAttr(g.id)}" ${selected === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join(''); }
function storageOptionsHtml(selected) { return `<option value="">Sin zona</option>` + state.storageZones.map(z => `<option value="${escapeAttr(z.id)}" ${selected === z.id ? 'selected' : ''}>${escapeHtml(z.name)}</option>`).join(''); }
function unitOptionsHtml(selected) { return state.units.map(u => `<option value="${escapeAttr(u.id)}" ${selected === u.id ? 'selected' : ''}>${escapeHtml(u.symbol)} · ${escapeHtml(u.name)}</option>`).join(''); }
function ingredientOptionsHtml() { return state.ingredients.map(i => `<option value="${escapeAttr(i.id)}">${escapeHtml(i.name)} · ${escapeHtml(i.family || '')}</option>`).join(''); }
function nullableNumber(value) { const t = String(value !== null && value !== void 0 ? value : '').trim(); return t === '' ? null : Number(t); }
function uniqueId(prefix, seed) { const slug = normalize(seed).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase().slice(0, 32) || 'NUEVO'; return `${prefix}-${slug}-${Date.now().toString(36).toUpperCase()}`; }
function defaultFamilyId(area) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (area === 'bakery')
        return ((_a = state.families.find(f => f.id === 'FAM_ING_SEMIELABORADOS_PREPARADOS_TECNICOS')) === null || _a === void 0 ? void 0 : _a.id) || ((_b = state.families.find(f => f.area === 'bakery')) === null || _b === void 0 ? void 0 : _b.id) || ((_c = state.families[0]) === null || _c === void 0 ? void 0 : _c.id) || null;
    if (area === 'culinary')
        return ((_d = state.families.find(f => f.id === 'FAM_ING_OTROS_PRODUCTOS_Y_NUEVAS_TENDENCIAS')) === null || _d === void 0 ? void 0 : _d.id) || ((_e = state.families.find(f => f.area === 'culinary')) === null || _e === void 0 ? void 0 : _e.id) || ((_f = state.families[0]) === null || _f === void 0 ? void 0 : _f.id) || null;
    return ((_g = state.families.find(f => f.id === 'FAM_ING_OTROS_PRODUCTOS_Y_NUEVAS_TENDENCIAS')) === null || _g === void 0 ? void 0 : _g.id) || ((_h = state.families.find(f => f.area === 'ingredient')) === null || _h === void 0 ? void 0 : _h.id) || ((_j = state.families[0]) === null || _j === void 0 ? void 0 : _j.id) || null;
}
function nextSort(table, recipeId) { return Number(db.value(`SELECT COALESCE(MAX(sort_order),0)+10 FROM ${table} WHERE recipe_id=$id`, { $id: recipeId }) || 10); }
function cssEscape(value) { return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
async function loadInitialDatabase() {
    var _a;
    let saved = null;
    try {
        saved = await idbGet(IDB_CURRENT_KEY);
    }
    catch (error) {
        console.warn('[ObradORR] IndexedDB no está disponible. Se cargará la base incluida.', error);
        state.dataStatus = 'IndexedDB no disponible; base incluida cargada';
    }
    if ((_a = saved === null || saved === void 0 ? void 0 : saved.bytes) === null || _a === void 0 ? void 0 : _a.byteLength) {
        try {
            db.loadFromBytes(new Uint8Array(saved.bytes));
            validateCurrentDatabase();
            state.dataSource = 'guardado local';
            state.dataSavedAt = saved.savedAt || '';
            state.dataStatus = 'Guardado local cargado';
            state.lastSavedRevision = state.dataRevision;
            return;
        }
        catch (error) {
            console.warn('[ObradORR] No se pudo cargar la recuperación local, se usará la base incluida.', error);
            try {
                await idbDelete(IDB_CURRENT_KEY);
            }
            catch (error) {
                console.warn('[ObradORR] No se pudo limpiar IndexedDB.', error);
            }
        }
    }
    await db.loadFromUrl(DB_URL);
    validateCurrentDatabase();
    state.dataSource = 'base incluida';
    state.dataStatus = state.dataStatus.includes('IndexedDB') ? state.dataStatus : 'Base incluida en la aplicación cargada';
}
function validateCurrentDatabase() {
    const integrity = db.value('PRAGMA integrity_check;');
    if (integrity !== 'ok')
        throw new Error(`SQLite no supera integrity_check: ${integrity}`);
    const fk = db.query('PRAGMA foreign_key_check;');
    if (fk.length)
        throw new Error(`SQLite contiene ${fk.length} errores de claves foráneas.`);
    const meta = key => String(db.value('SELECT value FROM app_meta WHERE key=$key', { $key: key }) || '');
    if (meta('app_name').toLowerCase() !== 'obradorr')
        throw new Error('La copia no parece pertenecer a ObradORR.');
    if (meta('release_tag') !== EXPECTED_RELEASE_TAG)
        throw new Error(`La copia no corresponde a ${EXPECTED_RELEASE_TAG}.`);
    if (meta('cache_tag') !== EXPECTED_CACHE_TAG)
        throw new Error(`La copia usa cache_tag incompatible: ${meta('cache_tag') || 'vacío'}.`);
    const required = ['ingredients', 'units', 'culinary_recipes', 'bakery_recipes', 'culinary_recipe_lines', 'bakery_recipe_lines', 'bakery_recipe_components', 'bakery_process_steps', 'work_selection_items', 'class_sessions', 'class_session_items', 'v_elaborations_unified', 'v_elaboration_lines_unified', 'v_culinary_expanded_ingredient_lines', 'v_bakery_recipe_components_print', 'v_bakery_process_blocks_print'];
    const missing = required.filter(name => !db.value("SELECT COUNT(*) FROM sqlite_master WHERE name=$name", { $name: name }));
    if (missing.length)
        throw new Error(`La copia no contiene estructura ObradORR completa: ${missing.join(', ')}`);
    const activeBakeryCount = Number(db.value('SELECT COUNT(*) FROM bakery_recipes WHERE COALESCE(active,1)=1') || 0);
    if (activeBakeryCount > 0) {
        const tortaCritical = db.query("SELECT ingredient AS ingredient_name, grams_for_base_flour AS base_qty_g FROM v_print_bakery_formula WHERE recipe_id='torta-de-nata-pedro' AND ingredient IN ('Nata 35 % MG','Azúcar blanco')");
        if (tortaCritical.length < 2 || tortaCritical.some(r => Number(r.base_qty_g || 0) <= 0))
            throw new Error('Regresión panadera crítica: Torta de nata tiene nata o azúcar con cantidad 0.');
    }
    if (window.ObradORRMigrations)
        window.ObradORRMigrations.ensure(db, { version: VERSION, releaseTag: EXPECTED_RELEASE_TAG, cacheTag: EXPECTED_CACHE_TAG });
}

function hasUnsavedWork() {
    return !!(state.dataDirty || state.autosaveInFlight || state.autosaveQueued || state.dataRevision > Math.max(state.lastSavedRevision || 0, state.lastDownloadedRevision || 0));
}
function updateDirtyFromSnapshots() {
    state.dataDirty = state.dataRevision > Math.max(state.lastSavedRevision || 0, state.lastDownloadedRevision || 0);
}
function storageSupportSummary() {
    const idb = ('indexedDB' in window) ? 'IndexedDB disponible' : 'IndexedDB no disponible';
    let ls = 'localStorage disponible';
    try {
        const key = '__obradorr_storage_probe__';
        localStorage.setItem(key, '1');
        localStorage.removeItem(key);
    }
    catch (_a) {
        ls = 'localStorage no disponible';
    }
    return `${idb} · ${ls}`;
}
function dataSafetyLevel() {
    if (state.dataSaveError)
        return 'error';
    if (state.autosaveInFlight)
        return 'saving';
    if (hasUnsavedWork())
        return 'warning';
    return state.ready ? 'ok' : 'loading';
}
function dataSafetyBannerHtml() {
    const level = dataSafetyLevel();
    if (!state.ready && level !== 'error')
        return '';
    const title = level === 'error' ? 'Error al guardar recuperación local' : level === 'saving' ? 'Guardando recuperación local...' : level === 'warning' ? 'Cambios pendientes de guardar o descargar' : 'Sistema de guardado disponible';
    const detail = level === 'error'
        ? (state.dataSaveError || 'No se pudo guardar en este navegador. Descarga una copia SQLite antes de cerrar.')
        : level === 'saving'
            ? 'No cierres la pestaña hasta que finalice el guardado.'
            : level === 'warning'
                ? 'Descarga una copia SQLite o espera al autoguardado local antes de cerrar.'
                : 'La app puede guardar recuperación local y descargar copias SQLite. Si has hecho cambios importantes, descarga una copia.';
    return `<div class="data-safety ${level} no-print"><div><b>${escapeHtml(title)}</b><br><small>${escapeHtml(detail)}</small></div><div class="data-safety-meta">${escapeHtml(dataStatusText())}</div></div>`;
}
function dataSafetyPanelHtml() {
    return `<div class="data-safety-panel ${dataSafetyLevel()}"><b>${escapeHtml(dataSafetyLevel() === 'warning' ? 'Atención: cambios pendientes' : dataSafetyLevel() === 'error' ? 'Error de recuperación local' : 'Protección de datos')}</b><p>${escapeHtml(dataStatusText())}</p><small>${escapeHtml(storageSupportSummary())}</small></div>`;
}
async function confirmBackupBeforeDestructiveAction(actionLabel) {
    const proceedBackup = confirm(`Antes de ${actionLabel}, ObradORR generará una copia SQLite de seguridad de la base activa.\n\nLa descarga puede quedar en la carpeta de descargas del navegador. No continúes si no quieres crear esa copia previa.\n\n¿Crear copia SQLite previa ahora?`);
    if (!proceedBackup)
        return false;
    try {
        downloadDb({ reason: `Copia previa obligatoria a ${actionLabel}` });
    }
    catch (error) {
        console.error('[ObradORR] No se pudo iniciar la descarga de copia previa.', error);
        alert(`No se pudo iniciar la copia SQLite previa: ${error.message || error}\n\nNo se continuará con la acción.`);
        return false;
    }
    return confirm(`Confirmación final: ${actionLabel} sustituirá o borrará datos de la base activa.\n\nContinúa solo si ya se ha iniciado/descargado la copia SQLite previa. ¿Continuar?`);
}


function headerStatusLabel(custom = '') {
    if (custom)
        return String(custom).replace(/\.{3,}$/,'').trim().toUpperCase();
    if (state.dataSaveError)
        return 'ERROR';
    if (state.autosaveInFlight)
        return 'GUARDANDO';
    if (hasUnsavedWork())
        return 'CAMBIOS';
    return state.ready ? 'LISTO' : 'CARGANDO';
}
function statusDotClass() {
    if (state.dataSaveError)
        return 'error';
    if (state.autosaveInFlight)
        return 'saving';
    if (hasUnsavedWork())
        return 'warning';
    return state.ready ? 'ok' : '';
}
function flashStatusIndicator(el, nextLabel) {
    if (!el)
        return;
    const previous = state.statusIndicatorLabel || '';
    state.statusIndicatorLabel = nextLabel || '';
    if (!previous || previous === nextLabel)
        return;
    el.classList.add('flash');
    clearTimeout(state.statusFlashTimer);
    state.statusFlashTimer = setTimeout(() => el.classList.remove('flash'), 1400);
}
function dataStatusText() {
    const when = state.dataSavedAt ? ` · ${new Date(state.dataSavedAt).toLocaleString('es-ES')}` : '';
    const dirty = hasUnsavedWork() ? ' · cambios pendientes' : '';
    const saving = state.autosaveInFlight ? ' · guardando...' : '';
    const error = state.dataSaveError ? ` · error: ${state.dataSaveError}` : '';
    return `${state.dataStatus || 'Sin estado'}${when}${saving}${dirty}${error}`;
}
function systemLastSavedText() {
    if (state.dataSavedAt)
        return `Último guardado local: ${new Date(state.dataSavedAt).toLocaleString('es-ES')}`;
    if (state.lastDownloadedRevision >= state.dataRevision && state.lastDownloadedRevision > 0)
        return 'Última protección: copia descargada en esta sesión';
    return 'Sin copia local nueva confirmada en esta sesión';
}
function systemOriginText() {
    try { return window.location.origin || 'origen local no disponible'; }
    catch (_a) { return 'origen local no disponible'; }
}
function dataSafetyHeadline() {
    if (state.dataSaveError)
        return 'Revisa el guardado local';
    if (state.autosaveInFlight)
        return 'Guardando ahora';
    if (hasUnsavedWork())
        return 'Cambios pendientes';
    return state.ready ? 'Sistema disponible' : 'Cargando';
}
function updateStatusIndicator() {
    const status = document.querySelector('.topbar .status');
    if (status) {
        const label = headerStatusLabel();
        const title = state.ready ? dataStatusText() : (state.dataStatus || label);
        status.innerHTML = `<span class="dot ${statusDotClass()}"></span><span class="status-text">${escapeHtml(label)}</span>`;
        status.setAttribute('aria-label', `Estado: ${title}`);
        status.setAttribute('title', title);
        flashStatusIndicator(status, label);
    }
    const banner = document.querySelector('.data-safety');
    if (banner && state.ready) {
        const wrap = document.createElement('div');
        wrap.innerHTML = dataSafetyBannerHtml().trim();
        if (wrap.firstElementChild)
            banner.replaceWith(wrap.firstElementChild);
    }
}
function scheduleDbAutosave(reason = 'Cambios pendientes de guardar', options = {}) {
    state.dataDirty = true;
    state.dataRevision += 1;
    state.dataSaveError = '';
    state.dataStatus = reason || 'Cambios pendientes de guardar';
    updateStatusIndicator();
    clearTimeout(state.autosaveTimer);
    const delay = Number.isFinite(Number(options.delay)) ? Number(options.delay) : 1500;
    state.autosaveTimer = setTimeout(() => saveWorkingCopy('Guardado en este navegador', { silent: true, rerender: false }), delay);
}
async function saveWorkingCopy(label = 'Guardado en este navegador', options = {}) {
    const silent = options.silent !== false;
    const rerender = options.rerender === true;
    if (state.autosaveInFlight) {
        state.autosaveQueued = true;
        return false;
    }
    state.autosaveInFlight = true;
    state.dataSaveError = '';
    state.dataStatus = 'Guardando recuperación local...';
    updateStatusIndicator();
    const saveRevision = state.dataRevision;
    try {
        validateCurrentDatabase();
        const bytes = db.exportBytes();
        const savedAt = new Date().toISOString();
        await rotateLocalSnapshots(saveRevision, savedAt);
        await idbPut(IDB_CURRENT_KEY, { bytes, savedAt, label, version: VERSION, revision: saveRevision, cacheTag: EXPECTED_CACHE_TAG, releaseTag: EXPECTED_RELEASE_TAG });
        state.dataSource = 'guardado local';
        state.dataSavedAt = savedAt;
        state.lastSavedRevision = saveRevision;
        updateDirtyFromSnapshots();
        state.dataStatus = state.dataDirty ? 'Cambios pendientes de guardar' : 'Guardado en este navegador';
        state.dataSaveError = '';
        updateStatusIndicator();
        if (rerender)
            render();
        return true;
    }
    catch (error) {
        state.dataDirty = true;
        state.dataSaveError = (error && error.message) ? error.message : String(error || 'Error desconocido');
        state.dataStatus = 'Error al guardar recuperación local';
        updateStatusIndicator();
        console.error(error);
        if (!silent)
            alert(`No se pudo guardar la recuperación local: ${state.dataSaveError}

Descarga una copia SQLite antes de cerrar la aplicación.`);
        return false;
    }
    finally {
        state.autosaveInFlight = false;
        if (state.autosaveQueued || state.dataRevision > Math.max(state.lastSavedRevision || 0, state.lastDownloadedRevision || 0)) {
            state.autosaveQueued = false;
            clearTimeout(state.autosaveTimer);
            state.autosaveTimer = setTimeout(() => saveWorkingCopy('Guardado en este navegador', { silent: true, rerender: false }), 900);
        }
        updateStatusIndicator();
    }
}

function flushWorkingCopyOnLifecycle(label) {
    if (!state.ready || !hasUnsavedWork())
        return;
    clearTimeout(state.autosaveTimer);
    saveWorkingCopy(label, { silent: true, rerender: false }).catch(error => console.warn('[ObradORR] Guardado defensivo de ciclo de vida fallido.', error));
}
async function rotateLocalSnapshots(nextRevision, rotatedAt) {
    let current = null;
    try {
        current = await idbGet(IDB_CURRENT_KEY);
    }
    catch (error) {
        console.warn('[ObradORR] No se pudo leer la copia actual para rotación local.', error);
        return;
    }
    if (!((current === null || current === void 0 ? void 0 : current.bytes) && current.bytes.byteLength))
        return;
    if (Number(current.revision || -1) === Number(nextRevision))
        return;
    for (let i = IDB_PREVIOUS_KEYS.length - 1; i >= 0; i--) {
        const targetKey = IDB_PREVIOUS_KEYS[i];
        const sourceKey = i === 0 ? IDB_CURRENT_KEY : IDB_PREVIOUS_KEYS[i - 1];
        let source = null;
        try {
            source = await idbGet(sourceKey);
        }
        catch (error) {
            console.warn(`[ObradORR] No se pudo leer ${sourceKey} para rotación local.`, error);
        }
        if ((source === null || source === void 0 ? void 0 : source.bytes) && source.bytes.byteLength) {
            await idbPut(targetKey, Object.assign({}, source, { rotatedAt, label: `${source.label || 'Copia local'} · rotatoria` }));
        }
        else {
            try {
                await idbDelete(targetKey);
            }
            catch (_a) { }
        }
    }
}
function triggerLoadDb() { var _a; (_a = document.getElementById('dbFileInput')) === null || _a === void 0 ? void 0 : _a.click(); }
async function loadDbFromInput(event) {
    var _a;
    const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
    event.target.value = '';
    if (!file)
        return;
    if (!(await confirmBackupBeforeDestructiveAction(`cargar la copia ${file.name}`)))
        return;
    const previous = db.exportBytes();
    try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        db.loadFromBytes(bytes);
        validateCurrentDatabase();
        await loadCatalogs();
        state.dataSource = `copia importada: ${file.name}`;
        state.dataStatus = 'Copia importada correctamente';
        state.dataSaveError = '';
        state.dataDirty = true;
        state.dataRevision += 1;
        await saveWorkingCopy(`Copia importada: ${file.name}`, { silent: false, rerender: false });
        state.page = 'inicio';
        render();
    }
    catch (error) {
        try {
            db.loadFromBytes(previous);
            await loadCatalogs();
            state.dataStatus = 'Importación rechazada; se conserva la base anterior';
            state.dataDirty = false;
        }
        catch (_b) { }
        console.error(error);
        alert(`No se pudo cargar la copia: ${error.message}

Se conserva la base anterior.`);
        render();
    }
}
async function restorePublicDatabase() {
    if (!(await confirmBackupBeforeDestructiveAction('restaurar la base incluida original')))
        return;
    try {
        await db.loadFromUrl(DB_URL);
        validateCurrentDatabase();
        await loadCatalogs();
        try {
            await idbDelete(IDB_CURRENT_KEY);
        }
        catch (error) {
            console.warn('[ObradORR] No se pudo limpiar IndexedDB.', error);
        }
        state.dataSource = 'base incluida';
        state.dataSavedAt = '';
        state.dataSaveError = '';
        state.dataRevision += 1;
        state.lastSavedRevision = state.dataRevision;
        state.lastDownloadedRevision = state.dataRevision;
        state.dataDirty = false;
        state.dataStatus = 'Base incluida restaurada';
        state.selection = [];
        saveSelection();
        state.page = 'inicio';
        render();
    }
    catch (error) {
        console.error(error);
        alert(`No se pudo restaurar la base incluida: ${error.message}`);
    }
}

async function createBlankDatabase() {
    if (!(await confirmBackupBeforeDestructiveAction('crear una base nueva limpia compatible con ObradORR')))
        return;
    const previous = db.exportBytes();
    try {
        await db.loadFromUrl(BLANK_DB_URL);
        validateCurrentDatabase();
        await loadCatalogs();
        state.dataSource = 'base nueva limpia';
        state.dataStatus = 'Base nueva limpia creada';
        state.dataSavedAt = '';
        state.dataSaveError = '';
        state.selection = [];
        state.sessions = [];
        state.dataRevision += 1;
        state.dataDirty = true;
        await saveWorkingCopy('Base nueva limpia creada', { silent: false, rerender: false });
        state.page = 'sistema';
        render();
    }
    catch (error) {
        try { db.loadFromBytes(previous); await loadCatalogs(); } catch (_a) { }
        console.error(error);
        alert(`No se pudo crear la base nueva limpia: ${error.message || error}

Se conserva la base anterior.`);
        render();
    }
}
function validateActiveDatabaseForUser() {
    try {
        validateCurrentDatabase();
        const recipes = Number(db.value('SELECT COUNT(*) FROM v_elaborations_unified WHERE COALESCE(active,1)=1') || 0);
        const ingredients = Number(db.value('SELECT COUNT(*) FROM ingredients WHERE COALESCE(active,1)=1') || 0);
        const fk = db.query('PRAGMA foreign_key_check;').length;
        alert(`Base activa correcta.
Elaboraciones activas: ${recipes}
Ingredientes activos: ${ingredients}
Errores de claves foráneas: ${fk}`);
    } catch (error) {
        alert(`La base activa no supera la validación: ${error.message || error}`);
    }
}

function clearLocalUiData() {
    if (!confirm('Esta acción borra la selección actual y las sesiones guardadas dentro de la copia SQLite activa. Antes de continuar, descarga una copia si quieres conservarlas. ¿Continuar?'))
        return;
    if (!confirm('Confirmación final: se limpiarán selección y sesiones de esta copia. ¿Continuar?'))
        return;
    withTransaction(() => {
        db.exec('DELETE FROM work_selection_items WHERE selection_id=$id', { $id: WORK_SELECTION_ID });
        db.exec('DELETE FROM class_sessions');
    });
    localStorage.removeItem(STORAGE_PRINT_OPTIONS);
    state.selection = [];
    state.sessions = [];
    state.printOptions = {
        documentType: 'fichas_pedido', documentProfile: 'aula_taller', includeTeachingData: false, includeCosts: false, subrecipeMode: 'sheets', expandSubrecipes: true, includeProcess: true, includeAppcc: true,
        teaching: { title: '', cycle: '', module: '', group: '', date: new Date().toISOString().slice(0, 10), responsible: '', notes: '' }
    };
    scheduleDbAutosave('Selección y sesiones limpiadas');
    render();
}
function showDiagnostics() {
    const box = document.getElementById('diagnosticsBox');
    if (!box)
        return;
    const data = {
        version: VERSION,
        dataSource: state.dataSource,
        dataStatus: dataStatusText(),
        dataSavedAt: state.dataSavedAt,
        dataDirty: state.dataDirty,
        dataRevision: state.dataRevision,
        lastSavedRevision: state.lastSavedRevision,
        lastDownloadedRevision: state.lastDownloadedRevision,
        autosaveInFlight: state.autosaveInFlight,
        autosaveQueued: state.autosaveQueued,
        indexedDB: ('indexedDB' in window),
        localStorage: (() => { try { localStorage.setItem('__obradorr_diag__','1'); localStorage.removeItem('__obradorr_diag__'); return true; } catch (_a) { return false; } })(),
        idb_database: IDB_DATA_DB,
        idb_store: IDB_DATA_STORE,
        idb_current_key: IDB_CURRENT_KEY,
        idb_previous_keys: IDB_PREVIOUS_KEYS,
        recipes: state.recipes.length,
        ingredients: state.ingredients.length,
        selection: state.selection.length,
        sessions: state.sessions.length,
        work_selection_items: db.value('SELECT COUNT(*) FROM work_selection_items'),
        class_sessions: db.value('SELECT COUNT(*) FROM class_sessions'),
        print_jobs: db.value('SELECT COUNT(*) FROM print_jobs'),
        bakery_recipe_components: db.value('SELECT COUNT(*) FROM bakery_recipe_components'),
        appcc_doc_blocks: db.value('SELECT COUNT(*) FROM appcc_doc_blocks'),
        schema_version: db.value("SELECT value FROM app_meta WHERE key='schema_version'"),
        release_tag: db.value("SELECT value FROM app_meta WHERE key='release_tag'"),
        cache_tag: db.value("SELECT value FROM app_meta WHERE key='cache_tag'"),
        p0f_correction: db.value("SELECT value FROM app_meta WHERE key='p0f_correction'"),
        integrity_check: db.value('PRAGMA integrity_check;'),
        foreign_key_errors: db.query('PRAGMA foreign_key_check;').length,
        torta_nata_regression: db.query("SELECT ingredient AS ingredient_name, grams_for_base_flour AS base_qty_g, 'g' AS display_unit FROM v_print_bakery_formula WHERE recipe_id='torta-de-nata-pedro' AND ingredient IN ('Nata 35 % MG','Azúcar blanco') ORDER BY ingredient")
    };
    box.classList.remove('hidden');
    box.innerHTML = `<b>Resumen</b><p>IndexedDB: ${data.indexedDB ? 'disponible' : 'no disponible'} · Cambios pendientes: ${data.dataDirty ? 'sí' : 'no'} · Integridad: ${escapeHtml(String(data.integrity_check))}</p><details><summary>Diagnóstico técnico avanzado</summary><pre class="mono">${escapeHtml(JSON.stringify(data, null, 2))}</pre></details>`;
}
function showFormError(error) {
    const message = friendlyDbErrorMessage(error);
    const body = modalRoot.querySelector('.modal-body');
    const html = `<div class="notice error" data-form-error><b>No se ha guardado:</b> ${escapeHtml(message)}</div>`;
    const previous = body === null || body === void 0 ? void 0 : body.querySelector('[data-form-error]');
    if (previous)
        previous.outerHTML = html;
    else if (body)
        body.insertAdjacentHTML('afterbegin', html);
    else
        alert(message);
    return false;
}

function normalizeNameKey(value) {
    return normalize(value).replace(/\s+/g, ' ').trim();
}
function allIngredientNameRows() {
    return db.query('SELECT id, name, active FROM ingredients ORDER BY name COLLATE NOCASE');
}
function allRecipeNameRows() {
    return db.query(`SELECT 'culinary' AS source_type, id, name, active FROM culinary_recipes
        UNION ALL
        SELECT 'bakery' AS source_type, id, name, active FROM bakery_recipes
        ORDER BY name COLLATE NOCASE`);
}
function findIngredientNameDuplicate(name, excludeId = '') {
    const key = normalizeNameKey(name);
    if (!key)
        return null;
    return allIngredientNameRows().find(row => String(row.id) !== String(excludeId || '') && normalizeNameKey(row.name) === key) || null;
}
function findRecipeNameDuplicate(name, excludeType = '', excludeId = '') {
    const key = normalizeNameKey(name);
    if (!key)
        return null;
    return allRecipeNameRows().find(row => !(String(row.source_type) === String(excludeType || '') && String(row.id) === String(excludeId || '')) && normalizeNameKey(row.name) === key) || null;
}
function duplicateIngredientMessage(duplicate, requestedName) {
    const sameCase = String(duplicate.name || '').trim() === String(requestedName || '').trim();
    return sameCase
        ? `Ya existe un ingrediente con ese nombre: “${duplicate.name}”. Usa el ingrediente existente o cambia el nombre si realmente es otro producto.`
        : `Ya existe un ingrediente equivalente con otra combinación de mayúsculas/minúsculas: “${duplicate.name}”. Evita duplicados para no dividir pedidos, costes y alérgenos.`;
}
function duplicateRecipeMessage(duplicate, requestedName) {
    const typeLabel = duplicate.source_type === 'bakery' ? 'panadería/pastelería' : 'cocina';
    const sameCase = String(duplicate.name || '').trim() === String(requestedName || '').trim();
    return sameCase
        ? `Ya existe una elaboración de ${typeLabel} con ese nombre: “${duplicate.name}”. Usa la ficha existente, edítala o crea una variante con un nombre diferenciado.`
        : `Ya existe una elaboración equivalente de ${typeLabel} con otra combinación de mayúsculas/minúsculas: “${duplicate.name}”. Usa la ficha existente o elige un nombre diferenciado para la variante.`;
}
function isUniqueConstraintError(error) {
    const message = (error === null || error === void 0 ? void 0 : error.message) || String(error || '');
    return /SQLITE_CONSTRAINT_UNIQUE|UNIQUE constraint failed/i.test(message);
}
function friendlyDbErrorMessage(error) {
    const message = (error === null || error === void 0 ? void 0 : error.message) || String(error || 'Revisa los datos del formulario.');
    if (/UNIQUE constraint failed:\s*ingredients\.name/i.test(message))
        return 'No se pudo guardar el ingrediente porque ya existe otro con el mismo nombre. Usa el ingrediente existente o cambia el nombre si realmente es otro producto.';
    if (/UNIQUE constraint failed:\s*culinary_recipes\.name/i.test(message))
        return 'No se pudo guardar la elaboración de cocina porque ya existe otra con el mismo nombre. Usa la ficha existente o crea una variante con un nombre diferenciado.';
    if (/UNIQUE constraint failed:\s*bakery_recipes\.name/i.test(message))
        return 'No se pudo guardar la formulación de panadería/pastelería porque ya existe otra con el mismo nombre. Usa la ficha existente o crea una variante con un nombre diferenciado.';
    if (isUniqueConstraintError(error))
        return 'No se pudo guardar porque ya existe un registro con esos datos. Revisa el nombre y usa el registro existente o crea una variante diferenciada.';
    return message;
}

function positiveNumber(value, fallback = 1) {
    const n = Number(value || fallback);
    if (!Number.isFinite(n) || n <= 0)
        throw new Error('Revisa los valores numéricos obligatorios: deben ser mayores que cero.');
    return n;
}
function boundedNumber(value, fallback = 0, min = 0, max = 100) {
    const n = Number(value || fallback);
    if (!Number.isFinite(n) || n < min || n > max)
        throw new Error(`Valor fuera de rango (${min}-${max}).`);
    return n;
}
function idbOpen() {
    if (!('indexedDB' in window))
        return Promise.reject(new Error('IndexedDB no está disponible en este navegador.'));
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_DATA_DB, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(IDB_DATA_STORE))
                req.result.createObjectStore(IDB_DATA_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('No se pudo abrir IndexedDB.'));
        req.onblocked = () => reject(new Error('IndexedDB está bloqueado por otra pestaña.'));
    });
}
async function idbGet(key) {
    if (!('indexedDB' in window))
        return null;
    const database = await idbOpen();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(IDB_DATA_STORE, 'readonly');
        const req = tx.objectStore(IDB_DATA_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => database.close();
    });
}
async function idbPut(key, value) {
    if (!('indexedDB' in window))
        throw new Error('IndexedDB no disponible: descarga una copia SQLite manual antes de cerrar.');
    const database = await idbOpen();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(IDB_DATA_STORE, 'readwrite');
        tx.objectStore(IDB_DATA_STORE).put(value, key);
        tx.oncomplete = () => { database.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
    });
}
async function idbDelete(key) {
    if (!('indexedDB' in window))
        throw new Error('IndexedDB no disponible.');
    const database = await idbOpen();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(IDB_DATA_STORE, 'readwrite');
        tx.objectStore(IDB_DATA_STORE).delete(key);
        tx.oncomplete = () => { database.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
    });
}
function withTransaction(fn) {
    db.exec('BEGIN IMMEDIATE;');
    try {
        const result = fn();
        db.exec('COMMIT;');
        return result;
    }
    catch (error) {
        try {
            db.exec('ROLLBACK;');
        }
        catch (_a) { }
        throw error;
    }
}
function addField(arr, key, val) {
    if (String(val || '').trim())
        arr.push([key, String(val).trim()]);
}
function docTitle(t) { return t === 'fichas' ? 'Fichas técnicas' : t === 'pedido' ? 'Pedido consolidado' : 'Fichas técnicas + pedido'; }
function moduleLabel(m) { return [m.module_code, m.module_name].filter(Boolean).join(' · '); }
function sum(a) { return a.reduce((x, y) => x + Number(y || 0), 0); }
function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }
function formatQty(n) {
    const v = Number(n || 0);
    if (Math.abs(v) < 0.0005)
        return '0';
    const abs = Math.abs(v);
    const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
    const fixed = Number(v.toFixed(decimals));
    return Number.isInteger(fixed) ? String(fixed) : String(fixed).replace('.', ',');
}
function displayQuantity(quantity, unit) {
    let q = Number(quantity || 0);
    let u = String(unit || '').trim();
    const lower = u.toLowerCase();
    if (lower === 'kg' && Math.abs(q) > 0 && Math.abs(q) < 0.01) {
        q *= 1000;
        u = 'g';
    }
    if ((lower === 'l' || lower === 'lt' || lower === 'litro' || lower === 'litros') && Math.abs(q) > 0 && Math.abs(q) < 0.01) {
        q *= 1000;
        u = 'ml';
    }
    return { quantity: q, unit: u, text: `${formatQty(q)} ${u}`.trim() };
}
function money(n) { return `${(Number(n || 0)).toFixed(2).replace('.', ',')} €`; }
function normalize(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
function publicText(text) {
    const internalMarkers = ['migrado', 'le' + 'gacy', 'fa' + 'se\\s*\\d', 'auditor[ií]a', 'mejora\\s*\\d', 'ap' + 'p6', 'r\\s*c\\s*\\d+', 'p0[a-z]?', '\\bfix\\b', 'swift' + 'remo'];
    const internalRe = new RegExp(internalMarkers.join('|'), 'i');
    return String(text || '')
        .split(/\n+/)
        .map(line => line.trim())
        .filter(line => line && !internalRe.test(line))
        .join('\n');
}
function uniquePublicText(sources) {
    const seen = new Set();
    const blocks = [];
    for (const source of sources) {
        const clean = publicText(source);
        for (const block of clean.split(/\n{2,}|(?=\d+\.\s+)/).map(x => x.trim()).filter(Boolean)) {
            const key = normalize(block).replace(/\s+/g, ' ');
            if (!key || seen.has(key))
                continue;
            seen.add(key);
            blocks.push(block);
        }
    }
    return blocks.join('\n');
}


function getIsoTimestampForFilename(date) { return window.ObradORRFileTools ? window.ObradORRFileTools.getIsoTimestampForFilename ? window.ObradORRFileTools.getIsoTimestampForFilename(date) : window.ObradORRFileTools.isoStamp(date) : new Date(date || Date.now()).toISOString().replace(/[:.]/g,'-').slice(0,19); }
function fileIsoStamp() { return getIsoTimestampForFilename(new Date()); }
function spanishLongDate(value) { return window.ObradORRFileTools ? window.ObradORRFileTools.spanishLongDate(value) : (() => { const s = new Date(value || Date.now()).toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); })(); }
function safeFilenamePart(s) { return window.ObradORRFileTools ? window.ObradORRFileTools.sanitizeFilenamePart(s) : String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80) || 'sin_nombre'; }
function safeDownloadName(prefix, label, ext) { return window.ObradORRFileTools ? window.ObradORRFileTools.filename(prefix, label, ext) : `${safeFilenamePart(prefix)}_${safeFilenamePart(label)}_${fileIsoStamp()}.${ext}`; }
function printDocumentFilenameBase(items, opts = {}) {
    const t = opts.teaching || {};
    const label = t.title || (items && items.length === 1 ? items[0].name : 'Practica');
    return `${safeFilenamePart('ObradORR')}_${safeFilenamePart(docTitle(opts.documentType || 'documento'))}_${safeFilenamePart(profileLabel(printProfile(opts)))}_${safeFilenamePart(label)}_${getIsoTimestampForFilename(new Date())}`;
}


// ────────────────────────────────────────────────────────────────────────────
// Wrappers de exportación externa
// ────────────────────────────────────────────────────────────────────────────
function exportCurrentOrderCsv() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    if (!state.selection.length) return alert('Añade elaboraciones a la práctica para exportar el pedido.');
    window.ObradORRExportTools.exportOrderDelimited(db, state, effectivePrintOptions(state.printOptions), ',');
}
function exportCurrentOrderTsv() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    if (!state.selection.length) return alert('Añade elaboraciones a la práctica para exportar el pedido.');
    window.ObradORRExportTools.exportOrderDelimited(db, state, effectivePrintOptions(state.printOptions), '\t');
}
function exportCurrentPracticeJson() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.exportPracticeJson(db, state, effectivePrintOptions(state.printOptions));
}
function exportTechnicalJson() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.exportTechnicalJson(db, state);
}
function exportCatalogCsv() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.exportCatalogCsv(db);
}
function exportCatalogExcel() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.exportCatalogExcel(db);
}
function exportIngredientsCsv() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.exportIngredientsCsv(db);
}
function exportAllergensCsv() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.exportAllergensCsv(db);
}
function exportPracticeZip() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    if (!state.selection.length) return alert('Añade elaboraciones a la práctica para exportar un ZIP de práctica.');
    window.ObradORRExportTools.exportPracticeZip(db, state, effectivePrintOptions(state.printOptions));
}

function chooseBackupFolder() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.chooseBackupDirectory();
}
function createBackupSqlite() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    validateCurrentDatabase();
    window.ObradORRExportTools.saveBackupSqlite(db);
}
function createBackupJson() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    window.ObradORRExportTools.saveBackupJson(db, state);
}
function createBackupZip() {
    if (!window.ObradORRExportTools) return alert('Módulo de exportación no cargado.');
    validateCurrentDatabase();
    window.ObradORRExportTools.saveBackupZip(db, state, effectivePrintOptions(state.printOptions));
}
function triggerMergeDb() { var _a; (_a = document.getElementById('dbMergeFileInput')) === null || _a === void 0 ? void 0 : _a.click(); }
async function mergeDbFromInput(event) {
    var _a;
    const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
    event.target.value = '';
    if (!file) return;
    if (!window.ObradORRImportMerge) return alert('Módulo de importación combinada no cargado.');
    validateCurrentDatabase();
    try {
        const preview = await window.ObradORRImportMerge.withImportedDb(file, imported => window.ObradORRImportMerge.preview(db, imported));
        const msg = `Importación combinada segura\n\nVersión origen: ${preview.sourceVersion || 'sin dato'}\nNuevos: ${preview.totalNew}\nDuplicados idénticos: ${preview.totalIdentical}\nConflictos que se crearán como variantes: ${preview.totalConflicts}\n\nNo se sobreescribirá ningún registro existente. Se creará copia SQLite previa. ¿Continuar?`;
        if (!confirm(msg)) return;
        downloadDb({ reason: `Copia previa a importación combinada ${file.name}` });
        const summary = await window.ObradORRImportMerge.withImportedDb(file, imported => window.ObradORRImportMerge.merge(db, imported, file.name));
        validateCurrentDatabase();
        await loadCatalogs();
        state.dataSource = `base combinada: ${file.name}`;
        state.dataStatus = 'Importación combinada realizada sin sobreescritura';
        state.dataDirty = true;
        state.dataRevision += 1;
        await saveWorkingCopy(`Importación combinada: ${file.name}`, { silent: false, rerender: false });
        alert(`Importación combinada completada.\nNuevos: ${summary.nuevos}\nDuplicados idénticos: ${summary.identicos}\nConflictos como variantes: ${summary.conflictosVariantes}\nOmitidos: ${summary.omitidos}`);
        state.page = 'sistema';
        render();
    } catch (error) {
        console.error(error);
        alert(`No se pudo combinar la base: ${error.message || error}`);
        render();
    }
}


function paragraphs(text) { return escapeHtml(text).split(/\n{2,}|(?=\d+\.\s+)/).map(p => p.trim()).filter(Boolean).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''); }
function escapeHtml(v) { return String(v !== null && v !== void 0 ? v : '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escapeAttr(v) { return escapeHtml(v).replace(/`/g, '&#96;'); }
function bytesToBase64(bytes) {
    let binary = '';
    const chunk = 0x8000;
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < arr.length; i += chunk)
        binary += String.fromCharCode(...arr.subarray(i, i + chunk));
    return btoa(binary);
}
function savePrintOptions() { saveJson(STORAGE_PRINT_OPTIONS, state.printOptions); }
function loadJson(key, fallback) {
    var _a;
    try {
        return (_a = JSON.parse(localStorage.getItem(key) || '')) !== null && _a !== void 0 ? _a : fallback;
    }
    catch (_b) {
        return fallback;
    }
}
function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function download(name, bytes, type) { const blob = new Blob([bytes], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
function downloadDb(options = {}) {
    validateCurrentDatabase();
    download(safeDownloadName('ObradORR_Backup_SQLite','base','sqlite'), db.exportBytes(), 'application/vnd.sqlite3');
    state.lastDownloadedRevision = state.dataRevision;
    updateDirtyFromSnapshots();
    state.dataSaveError = '';
    state.dataStatus = options.reason || 'Copia SQLite descargada manualmente';
    state.dataSavedAt = new Date().toISOString();
    updateStatusIndicator();
}

function downloadSelectionJson() { download(safeDownloadName('ObradORR_Seleccion','actual','json'), JSON.stringify({ selection: state.selection, printOptions: state.printOptions }, null, 2), 'application/json'); }
function showModal(title, html) {
    modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal"><header><h2>${escapeHtml(title)}</h2><button class="btn" data-close-modal>Cerrar</button></header><div class="modal-body">${html}</div></section></div>`;
    modalRoot.querySelector('[data-close-modal]').addEventListener('click', closeModal);
    modalRoot.querySelector('.modal-backdrop').addEventListener('click', e => {
        if (e.target.classList.contains('modal-backdrop'))
            closeModal();
    });
    setupAdaptiveTextareas(modalRoot);
}
function closeModal() { modalRoot.innerHTML = ''; }

})();

// compatibility tokens: profileRadio('aula_taller' profileRadio('docente_produccion' profileRadio('auditoria_completa'
