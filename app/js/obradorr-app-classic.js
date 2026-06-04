(function () {
"use strict";
const ObradORRDatabase = window.ObradORRDatabase;
if (!ObradORRDatabase)
    throw new Error("No se cargó la capa SQLite de ObradORR.");
window.__OBRADORR_MODULE_STARTED = true;
window.__OBRADORR_MODULE_VERSION = 'obradorr-100-rc7';
const DB_URL = '../db/obradorr.sqlite';
const WORK_SELECTION_ID = 'WORK_CURRENT';
const STORAGE_PRINT_OPTIONS = 'obradorr_ui_print_options_v1';
const IDB_DATA_DB = 'obradorr-data-100-rc7';
const IDB_DATA_STORE = 'snapshots';
const IDB_CURRENT_KEY = 'current-db';
const VERSION = '1.0.0-rc.7';
const INGREDIENT_SEARCH_LIMIT = 220;
const PRINT_SEARCH_LIMIT = 60;
const LEGAL_NOTICE = '© 2026 Remo José Pereira González · Uso docente personal autorizado · Sin licencia abierta de redistribución o explotación comercial.';
const EXPECTED_RELEASE_TAG = 'rc7';
const EXPECTED_CACHE_TAG = 'obradorr-100-rc7';
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
    dataStatus: 'Cargando base pública...',
    dataSource: 'base pública',
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
    selection: [],
    sessions: [],
    recipeSearch: '',
    ingredientSearch: '',
    printSearch: '',
    printOptions: loadJson(STORAGE_PRINT_OPTIONS, {
        documentType: 'fichas_pedido',
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
boot().catch(showFatalError);
function showFatalError(error) {
    console.error(error);
    const message = (error === null || error === void 0 ? void 0 : error.message) || String(error || 'Error desconocido');
    if (!app)
        return;
    app.innerHTML = `<main class="main"><section class="card"><h2>No se pudo arrancar ObradORR</h2><p>${escapeHtml(message)}</p><div class="notice"><b>Comprobaciones:</b> abre la app con servidor local, no con file://; arranca desde la raíz del proyecto; si venías de una versión anterior, usa <code>app/reset_local_data.html</code> y vuelve a cargar la base pública.</div></section></main>`;
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
           production_label, family, subfamily, status, release_status, active, base_servings, yield_quantity, yield_unit,
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
    app.innerHTML = `
    <header class="topbar no-print">
      <div class="topbar-inner">
        <div class="brand">
          <div class="brand-mark">🍽️</div>
          <div><h1>ObradORR</h1><small>Aula taller digital de cocina, pastelería y panadería</small></div>
        </div>
        <nav class="nav" aria-label="Navegación principal">
          ${navButton('inicio', 'Inicio')}
          ${navButton('elaboraciones', 'Elaboraciones')}
          ${navButton('ingredientes', 'Ingredientes')}
          ${navButton('imprimir', 'Imprimir / exportar')}
          ${navButton('sesiones', 'Sesiones')}
          ${navButton('sistema', 'Sistema')}
        </nav>
        <span class="status"><span class="dot ${state.ready ? 'ok' : ''}"></span>${status || (state.ready ? 'LISTO' : 'Cargando')}</span>
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
    if (state.page === 'sistema')
        main.innerHTML = systemView();
    bindCurrentView();
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
          ${quickCard('imprimir', '🖨️', 'Imprimir / exportar', 'Seleccionar elaboraciones, cantidades y documento.')}
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
  `;
}
function quickCard(page, icon, title, text) {
    return `<button class="quick-card" data-nav="${page}"><span>${icon}</span><b>${title}</b><small class="muted">${text}</small></button>`;
}
function selectionSummaryHtml() {
    if (!state.selection.length)
        return `<div class="empty">Todavía no hay elaboraciones. Entra en <b>Imprimir / exportar</b> y añádelas de forma rápida.</div>`;
    return `<div class="summary-list">${state.selection.slice(0, 6).map(item => `
    <div class="summary-row"><div><b>${escapeHtml(item.name)}</b><br><small>${formatQty(item.qty)} ${escapeHtml(item.unitLabel)}</small></div><button class="btn ghost" data-remove-selection="${item.uid}">Quitar</button></div>
  `).join('')}${state.selection.length > 6 ? `<small class="muted">...y ${state.selection.length - 6} más.</small>` : ''}</div>`;
}
function recipesView() {
    const rows = filterRecipes(state.recipeSearch);
    return `
    <section class="card">
      <div class="panel-title"><div><h2>Elaboraciones</h2><p>Catálogo técnico. Puedes ver, crear, editar o añadir a la práctica actual.</p></div><div class="actions"><button class="btn primary" data-new-recipe>Nueva elaboración</button><button class="btn accent" data-nav="imprimir">Ir a imprimir / exportar</button></div></div>
      <div class="toolbar"><div class="search"><input class="input" id="recipeSearch" value="${escapeAttr(state.recipeSearch)}" placeholder="Buscar elaboración..." /></div><span class="pill" id="recipeSearchCount">${resultCountText(rows.length, rows.length, 'resultados')}</span></div>
      <div class="catalog-grid" id="recipeResults">${rows.map(recipeCard).join('')}</div>
    </section>
  `;
}
function releaseStatusLabel(status) {
    const map = { validada: 'Validada', pendiente: 'Pendiente', no_apta: 'No apta', borrador: 'Borrador', bloqueante: 'Bloqueante' };
    return map[status] || status || 'Sin estado';
}
function recipeCard(recipe) {
    const releaseStatus = recipe.release_status || (recipe.status === 'validated' ? 'validada' : recipe.status || 'borrador');
    const blocked = releaseStatus === 'no_apta' || releaseStatus === 'bloqueante';
    return `<article class="recipe-card ${blocked ? 'recipe-card-blocked' : ''}">
    <header><div><b>${escapeHtml(recipe.name)}</b><br><small class="muted">${escapeHtml(recipe.category_label || recipe.source_type)} · ${escapeHtml(recipe.family || 'Sin familia')}</small></div><div class="pill-stack"><span class="pill">${recipe.source_type === 'bakery' ? 'Panadería' : 'Cocina'}</span><span class="pill ${blocked ? 'danger-pill' : ''}">${escapeHtml(releaseStatusLabel(releaseStatus))}</span></div></header>
    <small class="muted">${escapeHtml(recipe.base_label || defaultQuantityLabel(recipe))}</small>
    ${blocked ? '<small class="warn">Ficha no apta para uso docente final. Puede revisarse, pero no se añade a práctica como ficha normal.</small>' : ''}
    <div class="actions">
      <button class="btn" data-preview-recipe="${recipe.uid}">Vista previa</button>
      <button class="btn" data-edit-recipe="${recipe.uid}">Editar</button>
      ${blocked ? '<button class="btn" disabled>No apta</button>' : `<button class="btn primary" data-add-recipe="${recipe.uid}">Añadir</button>`}
    </div>
  </article>`;
}
function ingredientsView() {
    const rows = filterIngredients(state.ingredientSearch);
    return `
    <section class="card">
      <div class="panel-title"><div><h2>Ingredientes</h2><p>Consulta, creación y edición básica. Los cambios en ingredientes afectan a las elaboraciones que los utilizan.</p></div><div class="actions"><button class="btn primary" data-new-ingredient>Nuevo ingrediente</button><span class="pill" id="ingredientSearchCount">${resultCountText(rows.length, Math.min(rows.length, INGREDIENT_SEARCH_LIMIT), 'activos')}</span></div></div>
      <div class="toolbar"><input class="input" id="ingredientSearch" value="${escapeAttr(state.ingredientSearch)}" placeholder="Buscar ingrediente..." /></div>
      <div id="ingredientResults">${ingredientResultsHtml(rows)}</div>
    </section>
  `;
}
function ingredientResultsHtml(rows) {
    return `<div class="table-wrap"><table><thead><tr><th>Ingrediente</th><th>Familia</th><th>Grupo pedido</th><th>Zona</th><th>Coste</th><th></th></tr></thead><tbody>
    ${rows.slice(0, INGREDIENT_SEARCH_LIMIT).map(ingredientRowHtml).join('')}
  </tbody></table></div>
  ${rows.length > INGREDIENT_SEARCH_LIMIT ? `<p class="footer-note">Se muestran los primeros ${INGREDIENT_SEARCH_LIMIT} de ${rows.length} resultados. Refina la búsqueda para ver menos resultados.</p>` : ''}`;
}
function resultCountText(total, shown, label) {
    const t = Number(total || 0);
    const s = Math.min(Number(shown || 0), t);
    return `Mostrando ${s} de ${t} ${label}`;
}
function ingredientRowHtml(i) {
    return `<tr><td><b>${escapeHtml(i.name)}</b><br><small class="muted">${escapeHtml(i.id)}</small></td><td>${escapeHtml(i.family || '')}</td><td>${escapeHtml(i.order_group || '')}</td><td>${escapeHtml(i.storage_zone || '')}</td><td>${money(i.cost_per_base_unit_after_waste)} / ${escapeHtml(i.base_unit || '')}</td><td><button class="btn" data-edit-ingredient="${i.id}">Editar</button></td></tr>`;
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
        b.addEventListener('click', () => addRecipeToSelection(b.dataset.addRecipe));
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
}
function updateRecipeSearchResults() {
    const rows = filterRecipes(state.recipeSearch);
    const results = document.getElementById('recipeResults');
    const count = document.getElementById('recipeSearchCount');
    if (count)
        count.textContent = resultCountText(rows.length, rows.length, 'resultados');
    if (results) {
        results.innerHTML = rows.map(recipeCard).join('');
        bindDynamicActionButtons(results);
    }
}
function updateIngredientSearchResults() {
    const rows = filterIngredients(state.ingredientSearch);
    const results = document.getElementById('ingredientResults');
    const count = document.getElementById('ingredientSearchCount');
    if (count)
        count.textContent = resultCountText(rows.length, Math.min(rows.length, INGREDIENT_SEARCH_LIMIT), 'activos');
    if (results) {
        results.innerHTML = ingredientResultsHtml(rows);
        bindDynamicActionButtons(results);
    }
}
function updatePrintSearchResults() {
    const allRows = filterRecipes(state.printSearch);
    const rows = allRows.slice(0, PRINT_SEARCH_LIMIT);
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
        note.textContent = allRows.length > PRINT_SEARCH_LIMIT ? `Se muestran los primeros ${PRINT_SEARCH_LIMIT} resultados. Refina la búsqueda para ver menos resultados.` : '';
}
function printWorkspaceView() {
    const allResults = filterRecipes(state.printSearch);
    const results = allResults.slice(0, PRINT_SEARCH_LIMIT);
    const opts = state.printOptions;
    return `
    <section class="workspace">
      <div class="card">
        <div class="panel-title"><div><h2>Imprimir / exportar</h2><p>Busca elaboraciones, añade cantidades y genera el documento desde esta pantalla.</p></div></div>
        <div class="toolbar"><input class="input" id="printSearch" value="${escapeAttr(state.printSearch)}" placeholder="Buscar elaboración para añadir..." /><span class="pill" id="printSearchCount">${resultCountText(allResults.length, results.length, 'resultados')}</span></div>
        <div class="results" id="printResults" style="margin-top:12px">${printSearchResultsHtml(results)}</div>
        <p class="footer-note" id="printSearchLimitNote">${allResults.length > PRINT_SEARCH_LIMIT ? `Se muestran los primeros ${PRINT_SEARCH_LIMIT} resultados. Refina la búsqueda para ver menos resultados.` : ''}</p>
      </div>
      <div class="card">
        <div class="panel-title"><div><h2>Selección actual</h2><p>${state.selection.length} elaboraciones para el documento.</p></div><button class="btn danger" data-clear-selection>Vaciar</button></div>
        ${selectionEditorHtml()}
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0" />
        <h3>Documento</h3>
        <div class="radio-row">
          ${docRadio('fichas_pedido', 'Fichas + pedido', 'Documento completo de aula.')}
          ${docRadio('fichas', 'Fichas', 'Solo fichas técnicas.')}
          ${docRadio('pedido', 'Pedido', 'Solo ingredientes consolidados.')}
        </div>
        <div class="options" style="margin-top:14px">
          <div class="option-row"><label><input type="checkbox" id="includeTeachingData" ${opts.includeTeachingData ? 'checked' : ''}/> Incluir datos docentes</label>${opts.includeTeachingData ? teachingFieldsHtml() : ''}</div>
          ${opts.documentType !== 'pedido' ? sheetOptionsHtml() : ''}
        </div>
        <div class="actions" style="margin-top:18px">
          <button class="btn primary" data-generate-document>Generar documento</button>
          <button class="btn" data-save-session>Guardar sesión</button>
        </div>
        <p class="footer-note">Ingredientes y cantidades siempre se incluyen. Los campos docentes vacíos no se imprimen.</p>
      </div>
    </section>
  `;
}
function selectionEditorHtml() {
    if (!state.selection.length)
        return `<div class="empty">Añade elaboraciones desde el buscador de la izquierda. Puedes seguir añadiendo y ajustando cantidades antes de imprimir.</div>`;
    return state.selection.map(item => `<div class="selection-item">
    <div><b>${escapeHtml(item.name)}</b><br><small class="muted">${escapeHtml(item.categoryLabel || '')}</small></div>
    <label><input class="input" type="number" min="0" step="0.01" value="${escapeAttr(item.qty)}" data-update-qty="${item.uid}" /> <small>${escapeHtml(item.unitLabel)}</small></label>
    <button class="btn danger" data-remove-selection="${item.uid}">Quitar</button>
  </div>`).join('');
}
function docRadio(value, title, help) {
    return `<label class="radio-card"><input type="radio" name="documentType" value="${value}" ${state.printOptions.documentType === value ? 'checked' : ''}/><b>${title}</b><br><small class="muted">${help}</small></label>`;
}
function teachingFieldsHtml() {
    const t = state.printOptions.teaching || {};
    const cycle = teachingCycle();
    const modules = teachingModulesForCycle(cycle);
    const moduleInCycle = !t.module || modules.some(m => moduleLabel(m) === t.module);
    const moduleHelp = cycle ? `Módulos filtrados por ${escapeHtml(cycle.name)}.` : 'Selecciona un ciclo para filtrar módulos; mientras tanto se muestran todos.';
    const moduleWarning = t.module && !moduleInCycle ? `<p class="footer-note teaching-warning">El módulo seleccionado no corresponde al ciclo actual. Selecciona otro módulo.</p>` : '';
    return `<div class="teaching-fields">
    <input class="input" data-teaching="title" value="${escapeAttr(t.title || '')}" placeholder="Título de la práctica" />
    <input class="input" data-teaching="date" type="date" value="${escapeAttr(t.date || '')}" />
    <select data-teaching="cycle"><option value="">Ciclo</option>${state.cycles.map(c => `<option value="${escapeAttr(c.name)}" ${t.cycle === c.name ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
    <div class="field-with-note"><select data-teaching="module"><option value="">Módulo</option>${modules.map(m => `<option value="${escapeAttr(moduleLabel(m))}" ${t.module === moduleLabel(m) ? 'selected' : ''}>${escapeHtml(moduleLabel(m))}</option>`).join('')}</select><small class="muted">${moduleHelp}</small>${moduleWarning}</div>
    <input class="input" data-teaching="group" value="${escapeAttr(t.group || '')}" placeholder="Grupo" />
    <input class="input" data-teaching="responsible" value="${escapeAttr(t.responsible || '')}" placeholder="Responsable" />
    <textarea data-teaching="notes" placeholder="Observaciones" style="grid-column:1/-1">${escapeHtml(t.notes || '')}</textarea>
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
function sheetOptionsHtml() {
    const o = state.printOptions;
    const mode = subrecipeMode();
    return `<div class="option-row"><label><input type="checkbox" id="includeCosts" ${o.includeCosts ? 'checked' : ''}/> Incluir costes</label></div>
    <div class="option-row"><b>Subelaboraciones culinarias</b><div class="radio-row" style="margin-top:10px">
      ${subrecipeRadio('none', 'No desarrollar', 'Muestra solo las líneas directas de la ficha.')}
      ${subrecipeRadio('ingredients', 'Desglosar ingredientes', 'Expande ingredientes recursivos para ficha, coste y pedido.')}
      ${subrecipeRadio('sheets', 'Incluir subfichas', 'Imprime fichas hijas con rendimiento, proceso y APPCC.')}
    </div></div>
    <div class="option-row"><label><input type="checkbox" id="includeProcess" ${o.includeProcess ? 'checked' : ''}/> Incluir proceso</label></div>
    <div class="option-row"><label><input type="checkbox" id="includeAppcc" ${o.includeAppcc ? 'checked' : ''}/> Incluir APPCC</label></div>`;
}
function subrecipeMode() {
    return state.printOptions.subrecipeMode || (state.printOptions.expandSubrecipes ? 'ingredients' : 'none');
}
function subrecipeRadio(value, title, help) {
    return `<label class="radio-card"><input type="radio" name="subrecipeMode" value="${value}" ${subrecipeMode() === value ? 'checked' : ''}/><b>${title}</b><br><small class="muted">${help}</small></label>`;
}
function sessionsView() {
    return `<section class="card"><div class="panel-title"><div><h2>Sesiones</h2><p>Sesiones guardadas en la copia SQLite activa.</p></div><button class="btn accent" data-save-session>Guardar práctica actual</button></div>
    ${state.sessions.length ? `<div class="summary-list">${state.sessions.map(s => `<div class="summary-row"><div><b>${escapeHtml(s.title || 'Sesión sin título')}</b><br><small>${escapeHtml(s.practice_date || '')} · ${Number(s.item_count || 0)} elaboraciones</small></div><div class="actions"><button class="btn" data-load-session="${s.id}">Usar de nuevo</button><button class="btn" data-print-session="${s.id}">Imprimir</button><button class="btn danger" data-delete-session="${s.id}">Eliminar</button></div></div>`).join('')}</div>` : `<div class="empty">No hay sesiones guardadas. Prepara una selección y pulsa <b>Guardar sesión</b>.</div>`}
  </section>`;
}
function systemView() {
    const storage = storageSupportSummary();
    return `<section class="grid two">
    <div class="card"><h2>Datos y seguridad</h2><p>ObradORR trabaja en local. Protege tu trabajo con recuperación en este navegador y copia SQLite descargada.</p>
      ${dataSafetyPanelHtml()}
      <div class="summary-list">
        <div class="summary-row"><div><b>Estado de datos</b><br><small>${escapeHtml(dataStatusText())}</small></div><span class="pill green">${escapeHtml(state.dataSource)}</span></div>
        <div class="summary-row"><div><b>Recuperación local</b><br><small>${escapeHtml(storage)}</small></div></div>
        <div class="summary-row"><div><b>Elaboraciones</b><br><small>${state.recipes.length} activas</small></div></div>
        <div class="summary-row"><div><b>Ingredientes</b><br><small>${state.ingredients.length} activos</small></div></div>
        <div class="summary-row"><div><b>Selección actual</b><br><small>${state.selection.length} elaboraciones</small></div></div>
      </div>
      <div class="data-actions-safe" style="margin-top:16px">
        <div class="safe-action"><b>1 · Descargar copia SQLite</b><small>Archivo portable para guardar fuera del navegador.</small><button class="btn primary" data-download-db>Descargar copia de trabajo</button></div>
        <div class="safe-action"><b>2 · Guardar recuperación local</b><small>Actualiza la copia en IndexedDB de este navegador.</small><button class="btn accent" data-save-local-db>Guardar en este dispositivo</button></div>
        <div class="safe-action danger-zone"><b>Importar / restaurar</b><small>Estas acciones sustituyen la base activa. Descarga copia antes.</small><div class="actions"><button class="btn" data-load-db>Cargar copia SQLite</button><button class="btn danger" data-restore-public-db>Volver a base pública</button></div></div>
      </div>
      <p class="footer-note">Guardar sesión conserva la práctica dentro de la SQLite activa. Descargar copia guarda un archivo. Guardar en este dispositivo crea recuperación local en el navegador.</p>
    </div>
    <div class="card"><h2>Sesiones y diagnóstico</h2><p>Las sesiones y la selección rápida se guardan dentro de la copia SQLite activa. El diagnóstico ayuda a comprobar almacenamiento, versión e integridad.</p>
      <div class="actions"><button class="btn" data-download-selection>Exportar selección JSON</button><button class="btn" data-clear-local-ui>Limpiar selección y sesiones locales</button><button class="btn" data-diagnostics>Ver diagnóstico</button></div>
      <div id="diagnosticsBox" class="notice hidden" style="margin-top:14px"></div>
    </div>
  </section>`;
}
function bindCurrentView() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => { state.page = b.dataset.nav; render(); }));
    const recipeSearch = document.getElementById('recipeSearch');
    if (recipeSearch)
        recipeSearch.addEventListener('input', e => { state.recipeSearch = e.target.value; updateRecipeSearchResults(); });
    const ingredientSearch = document.getElementById('ingredientSearch');
    if (ingredientSearch)
        ingredientSearch.addEventListener('input', e => { state.ingredientSearch = e.target.value; updateIngredientSearchResults(); });
    const printSearch = document.getElementById('printSearch');
    if (printSearch)
        printSearch.addEventListener('input', e => { state.printSearch = e.target.value; updatePrintSearchResults(); });
    bindDynamicActionButtons(document);
    (_a = document.querySelector('[data-new-recipe]')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => showRecipeCreator());
    (_b = document.querySelector('[data-new-ingredient]')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => showIngredientCreator());
    document.querySelectorAll('[data-remove-selection]').forEach(b => b.addEventListener('click', () => removeSelection(b.dataset.removeSelection)));
    document.querySelectorAll('[data-update-qty]').forEach(input => input.addEventListener('input', () => updateQty(input.dataset.updateQty, input.value)));
    document.querySelectorAll('input[name="documentType"]').forEach(r => r.addEventListener('change', () => { state.printOptions.documentType = r.value; savePrintOptions(); render(); }));
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
    (_f = document.querySelector('[data-clear-local-ui]')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', clearLocalUiData);
    (_g = document.querySelector('[data-diagnostics]')) === null || _g === void 0 ? void 0 : _g.addEventListener('click', showDiagnostics);
    const dbInput = document.getElementById('dbFileInput');
    if (dbInput && dbInput.dataset.bound !== '1') {
        dbInput.addEventListener('change', loadDbFromInput);
        dbInput.dataset.bound = '1';
    }
    (_h = document.querySelector('[data-download-selection]')) === null || _h === void 0 ? void 0 : _h.addEventListener('click', downloadSelectionJson);
}
function bindCheck(id) {
    const el = document.getElementById(id);
    if (!el)
        return;
    el.addEventListener('change', () => { state.printOptions[id] = el.checked; savePrintOptions(); render(); });
}
function addRecipeToSelection(uid) {
    const recipe = state.recipes.find(r => r.uid === uid);
    if (!recipe)
        return;
    const releaseStatus = recipe.release_status || '';
    if (releaseStatus === 'no_apta' || releaseStatus === 'bloqueante') {
        alert('Ficha no apta para uso docente final. No se añade a la práctica como ficha normal.');
        return;
    }
    const existing = state.selection.find(i => i.uid === uid);
    if (existing) {
        existing.qty = round2(Number(existing.qty || 0) + Number(defaultQuantity(recipe).qty || 1));
    }
    else {
        state.selection.push(makeSelectionItem(uid));
    }
    saveSelection();
    scheduleDbAutosave('Selección actualizada');
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
        VALUES ($id,$selection,$type,$culinary,$bakery,$mode,$main,$servings,$pieces,NULL,$flour,NULL,$loss,1,$sort,$notes)`, Object.assign({ $id: id, $selection: WORK_SELECTION_ID }, payload));
        });
        db.exec('UPDATE work_selections SET updated_at=CURRENT_TIMESTAMP, context_json=$ctx WHERE id=$id', { $id: WORK_SELECTION_ID, $ctx: JSON.stringify({ printOptions: state.printOptions }) });
    });
}
function selectionDbPayload(item, recipe, idx) {
    const type = item.sourceType;
    const mode = type === 'bakery'
        ? (item.baseMode === 'pieces' ? 'pieces' : item.baseMode === 'raw_dough' ? 'raw_dough' : 'flour')
        : (item.baseMode === 'yield' ? 'yield' : 'servings');
    return {
        $type: type,
        $culinary: type === 'culinary' ? item.sourceId : null,
        $bakery: type === 'bakery' ? item.sourceId : null,
        $mode: mode,
        $main: Number(item.qty || 0),
        $servings: mode === 'servings' ? Number(item.qty || 0) : null,
        $pieces: mode === 'pieces' ? Number(item.qty || 0) : null,
        $flour: mode === 'flour' ? Number(item.qty || 0) : null,
        $loss: type === 'bakery' ? Number((recipe === null || recipe === void 0 ? void 0 : recipe.baking_loss_pct) || 0) : null,
        $sort: (idx + 1) * 10,
        $notes: item.notes || null
    };
}
function loadSelectionFromSqlite() {
    ensureWorkSelection();
    const rows = db.query(`SELECT w.*, cr.name AS culinary_name, cr.base_servings, cr.yield_quantity, COALESCE(yu.symbol, yu.name, cr.yield_unit_id) AS yield_unit, cr.default_production_mode,
      br.name AS bakery_name, br.base_flour_g, br.base_pieces, br.baking_loss_pct
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
        const mode = row.production_mode === 'pieces' ? 'pieces' : row.production_mode === 'raw_dough' ? 'raw_dough' : 'flour_g';
        const qty = mode === 'pieces' ? Number((_c = (_b = (_a = row.pieces) !== null && _a !== void 0 ? _a : row.main_qty) !== null && _b !== void 0 ? _b : row.base_pieces) !== null && _c !== void 0 ? _c : 1) : Number((_f = (_e = (_d = row.flour_g) !== null && _d !== void 0 ? _d : row.main_qty) !== null && _e !== void 0 ? _e : row.base_flour_g) !== null && _f !== void 0 ? _f : 1000);
        return { uid, sourceType: type, sourceId, name: (recipe === null || recipe === void 0 ? void 0 : recipe.name) || row.bakery_name || sourceId, categoryLabel: (recipe === null || recipe === void 0 ? void 0 : recipe.category_label) || 'Panadería/Pastelería', qty, unitLabel: mode === 'pieces' ? 'piezas' : 'g harina', baseMode: mode, baseValue: mode === 'pieces' ? Number(row.base_pieces || qty || 1) : Number(row.base_flour_g || qty || 1000), notes: row.notes || '' };
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
      br.name AS bakery_name, br.base_flour_g, br.base_pieces, br.baking_loss_pct
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
    var _a, _b;
    showModal('Nueva elaboración', `<div class="grid two">
    <button class="quick-card" id="newCulinaryRecipe"><span>🍲</span><b>Ficha de cocina</b><small class="muted">Elaboración culinaria con raciones, proceso y APPCC.</small></button>
    <button class="quick-card" id="newBakeryRecipe"><span>🥐</span><b>Formulación de panadería/pastelería</b><small class="muted">Fórmula panadera por porcentaje de harina.</small></button>
  </div>`);
    (_a = document.getElementById('newCulinaryRecipe')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => createEmptyRecipe('culinary'));
    (_b = document.getElementById('newBakeryRecipe')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => createEmptyRecipe('bakery'));
}
async function createEmptyRecipe(kind) {
    const name = prompt(kind === 'bakery' ? 'Nombre de la nueva formulación' : 'Nombre de la nueva elaboración');
    if (!String(name || '').trim())
        return;
    const id = uniqueId(kind === 'bakery' ? 'BAK' : 'REC', name);
    withTransaction(() => {
        if (kind === 'bakery') {
            db.exec(`INSERT INTO bakery_recipes (id,name,family_id,base_flour_g,base_pieces,baking_loss_pct,status,fermentation_notes,notes,active)
        VALUES ($id,$name,$family,1000,10,0,'draft','','',1)`, { $id: id, $name: name.trim(), $family: defaultFamilyId('bakery') });
            db.exec(`INSERT OR IGNORE INTO bakery_preferments (recipe_id,preferment_type,calculation_mode,hydration_pct,yeast_pct,notes,active)
        VALUES ($id,'Ninguno','none',100,0,'',0)`, { $id: id });
        }
        else {
            db.exec(`INSERT INTO culinary_recipes (id,name,family_id,base_servings,production_kind,default_production_mode,status,process,service_notes,appcc_notes,notes,active)
        VALUES ($id,$name,$family,10,'final_servings','servings','draft','','','','',1)`, { $id: id, $name: name.trim(), $family: defaultFamilyId('culinary') });
        }
    });
    await loadCatalogs();
    scheduleDbAutosave('Nueva elaboración');
    closeModal();
    showRecipeEditor(`${kind}:${id}`);
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
    showModal('Editar elaboración', `<div class="editor-layout">
    <section class="card-flat"><h3>Datos de ficha</h3>${form}<div class="actions"><button class="btn primary" id="saveRecipeEdit">Guardar ficha</button><button class="btn" id="previewRecipeEdit">Vista previa</button></div><p class="footer-note">Edición local-first: los cambios se validan y se guardan en la SQLite activa. Descarga una copia desde Sistema para conservar o trasladar el trabajo.</p></section>
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
}
function culinaryRecipeForm(detail, familyOptions, subfamilyOptions) {
    return `<div class="grid two">
    <label>Nombre<input class="input" id="recipeName" value="${escapeAttr(detail.name || '')}" /></label>
    <label>Estado<select id="recipeStatus"><option value="draft" ${detail.status === 'draft' ? 'selected' : ''}>Borrador</option><option value="validated" ${detail.status === 'validated' ? 'selected' : ''}>Validada</option></select></label>
    <label>Familia<select id="recipeFamily">${familyOptions}</select></label>
    <label>Subfamilia<select id="recipeSubfamily">${subfamilyOptions}</select></label>
    <label>Raciones base<input class="input" id="recipeServings" type="number" step="0.01" value="${escapeAttr(detail.base_servings || 10)}" /></label>
    <label>Peso ración g<input class="input" id="recipeServingWeight" type="number" step="0.01" value="${escapeAttr(detail.serving_weight_g || '')}" /></label>
    <label>Rendimiento<input class="input" id="recipeYieldQty" type="number" step="0.01" value="${escapeAttr(detail.yield_quantity || '')}" /></label>
    <label>Modo producción<select id="recipeProdMode"><option value="servings" ${detail.default_production_mode === 'servings' ? 'selected' : ''}>Raciones</option><option value="yield" ${detail.default_production_mode === 'yield' ? 'selected' : ''}>Rendimiento</option></select></label>
    <label style="grid-column:1/-1">Proceso<textarea id="recipeProcess">${escapeHtml(detail.process || '')}</textarea></label>
    <label>APPCC<textarea id="recipeAppcc">${escapeHtml(detail.appcc_notes || '')}</textarea></label>
    <label>Servicio<textarea id="recipeService">${escapeHtml(detail.service_notes || '')}</textarea></label>
    <label style="grid-column:1/-1">Notas<textarea id="recipeNotes">${escapeHtml(detail.notes || '')}</textarea></label>
  </div>`;
}
function bakeryRecipeForm(detail, familyOptions, subfamilyOptions) {
    return `<div class="grid two">
    <label>Nombre<input class="input" id="recipeName" value="${escapeAttr(detail.name || '')}" /></label>
    <label>Estado<select id="recipeStatus"><option value="draft" ${detail.status === 'draft' ? 'selected' : ''}>Borrador</option><option value="validated" ${detail.status === 'validated' ? 'selected' : ''}>Validada</option></select></label>
    <label>Familia<select id="recipeFamily">${familyOptions}</select></label>
    <label>Subfamilia<select id="recipeSubfamily">${subfamilyOptions}</select></label>
    <label>Harina base g<input class="input" id="recipeBaseFlour" type="number" step="0.01" value="${escapeAttr(detail.base_flour_g || 1000)}" /></label>
    <label>Piezas base<input class="input" id="recipeBasePieces" type="number" step="0.01" value="${escapeAttr(detail.base_pieces || '')}" /></label>
    <label>Pérdida cocción %<input class="input" id="recipeBakingLoss" type="number" step="0.01" value="${escapeAttr(detail.baking_loss_pct || 0)}" /></label>
    <label>Temperatura masa ºC<input class="input" id="recipeDoughTemp" type="number" step="0.1" value="${escapeAttr(detail.target_dough_temp_c || '')}" /></label>
    <label style="grid-column:1/-1">Proceso / fermentación<textarea id="recipeProcess">${escapeHtml(detail.fermentation_notes || '')}</textarea></label>
    <label style="grid-column:1/-1">Notas<textarea id="recipeNotes">${escapeHtml(detail.notes || '')}</textarea></label>
  </div>`;
}
function saveRecipeMain(recipe) {
    var _a;
    const recipeName = document.getElementById('recipeName').value.trim();
    if (!recipeName)
        return showFormError('La elaboración necesita nombre.');
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
    return `<div class="table-wrap"><table><thead><tr><th>Ingrediente/subelaboración</th><th>Cantidad</th><th>Unidad</th><th>Nota</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${escapeHtml(r.label || '')}</b><br><small>${escapeHtml(r.line_type || '')}</small></td><td><input class="input compact" data-line-qty="${escapeAttr(r.id)}" value="${escapeAttr(r.quantity || 0)}" type="number" step="0.0001" /></td><td><select data-line-unit="${escapeAttr(r.id)}">${unitOptionsHtml(r.unit_id)}</select></td><td><input class="input" data-line-note="${escapeAttr(r.id)}" value="${escapeAttr(r.technical_note || '')}" /></td><td><button class="btn danger" data-delete-line="${escapeAttr(r.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
}
function bakeryLinesEditor(recipe) {
    const rows = db.query(`SELECT l.id,l.ingredient_id,l.bakery_role,l.baker_pct,l.preferment_pct,l.final_dough_pct,l.unit_id,l.technical_note,l.sort_order,l.line_group,l.calculation_base,l.quantity_value,l.quantity_unit_id,l.include_in_dough,i.name AS ingredient_name,u.symbol AS unit_symbol
    FROM bakery_recipe_lines l JOIN ingredients i ON i.id=l.ingredient_id LEFT JOIN units u ON u.id=l.unit_id WHERE l.recipe_id=$id ORDER BY l.sort_order,l.id`, { $id: recipe.source_id });
    if (!rows.length)
        return '<div class="empty">Todavía no hay fórmula. Añade ingredientes con porcentaje panadero o acabados directos.</div>';
    return `<div class="notice" style="margin-bottom:10px">Las fórmulas separan masa/prefermento de acabados directos. Los componentes elaborados van en una sección independiente.</div><div class="table-wrap"><table><thead><tr><th>Ingrediente</th><th>Grupo</th><th>Cálculo</th><th>% total</th><th>% pref.</th><th>% final</th><th>Valor</th><th>Unidad</th><th>Rol</th><th>Nota</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${escapeHtml(r.ingredient_name || '')}</b></td><td><select data-line-group="${escapeAttr(r.id)}">${lineGroupOptionsHtml(r.line_group)}</select></td><td><select data-line-calc="${escapeAttr(r.id)}">${calcBaseOptionsHtml(r.calculation_base)}</select></td><td><input class="input compact" data-line-pct="${escapeAttr(r.id)}" value="${escapeAttr(r.baker_pct || 0)}" type="number" step="0.01" /></td><td><input class="input compact" data-line-pref="${escapeAttr(r.id)}" value="${escapeAttr(r.preferment_pct || 0)}" type="number" step="0.01" /></td><td><input class="input compact" data-line-final="${escapeAttr(r.id)}" value="${escapeAttr(r.final_dough_pct || 0)}" type="number" step="0.01" /></td><td><input class="input compact" data-line-qvalue="${escapeAttr(r.id)}" value="${escapeAttr(r.quantity_value || 0)}" type="number" step="0.01" /></td><td><select data-line-qunit="${escapeAttr(r.id)}">${unitOptionsHtml(r.quantity_unit_id || r.unit_id || 'UNIT_G')}</select></td><td><input class="input compact" data-line-role="${escapeAttr(r.id)}" value="${escapeAttr(r.bakery_role || 'other')}" /></td><td><input class="input" data-line-note="${escapeAttr(r.id)}" value="${escapeAttr(r.technical_note || '')}" /></td><td><button class="btn danger" data-delete-line="${escapeAttr(r.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
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
    withTransaction(() => db.exec(`INSERT INTO bakery_preferments (recipe_id,preferment_type,calculation_mode,hydration_pct,flour_prefermented_pct,preferment_total_pct,yeast_pct,yeast_pct_base,time_hours,temperature_c,notes,active,updated_at)
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
    }));
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
        withTransaction(() => db.exec(`INSERT INTO bakery_process_steps (id,recipe_id,block,step_number,instruction,duration_min,temperature_c,notes)
        VALUES ($id,$recipe,$block,$step,$instruction,$duration,$temp,$notes)`, {
            $id: uniqueId('BST', recipe.source_id),
            $recipe: recipe.source_id,
            $block: document.getElementById('newStepBlock').value || 'other',
            $step: Math.max(1, Math.round(Number(document.getElementById('newStepNumber').value || 1))),
            $instruction: instruction,
            $duration: nullableNumber(document.getElementById('newStepDuration').value),
            $temp: nullableNumber(document.getElementById('newStepTemp').value),
            $notes: document.getElementById('newStepNotes').value.trim()
        }));
        await loadCatalogs();
        scheduleDbAutosave('Paso técnico añadido');
        closeModal();
        showRecipeEditor(recipe.uid);
    });
}
function deleteBakeryStep(id) {
    if (!confirm('¿Eliminar este paso técnico?'))
        return false;
    withTransaction(() => db.exec('DELETE FROM bakery_process_steps WHERE id=$id', { $id: id }));
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
        withTransaction(() => db.exec(`INSERT INTO bakery_recipe_components (id,bakery_recipe_id,component_culinary_recipe_id,component_bakery_recipe_id,usage_role,component_status,calculation_base,quantity_value,unit_id,technical_note,sort_order,include_in_order,include_in_cost)
      VALUES ($id,$recipe,$culinary,$bakery,$role,$status,$calc,$qty,$unit,$note,$sort,$order,$cost)`, { $id: id, $recipe: recipe.source_id, $culinary: type === 'culinary' ? compId : null, $bakery: type === 'bakery' ? compId : null, $role: document.getElementById('componentRole').value || 'other', $status: document.getElementById('componentStatus').value || 'required', $calc: document.getElementById('componentCalc').value || 'fixed', $qty: qty, $unit: document.getElementById('componentUnit').value || 'UNIT_KG', $note: document.getElementById('componentNote').value || '', $sort: sort, $order: (document.getElementById('componentStatus').value || 'required') === 'required' ? 1 : 0, $cost: (document.getElementById('componentStatus').value || 'required') === 'required' ? 1 : 0 }));
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
    if (!confirm('¿Eliminar este componente elaborado?'))
        return false;
    withTransaction(() => db.exec('DELETE FROM bakery_recipe_components WHERE id=$id', { $id: id }));
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
        withTransaction(() => db.exec(`UPDATE bakery_recipe_components SET component_culinary_recipe_id=$culinary,component_bakery_recipe_id=$bakery,usage_role=$role,component_status=$status,calculation_base=$calc,quantity_value=$qty,unit_id=$unit,technical_note=$note,include_in_order=$order,include_in_cost=$cost,updated_at=CURRENT_TIMESTAMP WHERE id=$id`, {
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
        }));
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
function deleteRecipeLine(recipe, lineId) {
    if (!confirm('¿Eliminar esta línea?'))
        return false;
    withTransaction(() => db.exec(recipe.source_type === 'bakery' ? 'DELETE FROM bakery_recipe_lines WHERE id=$id' : 'DELETE FROM culinary_recipe_lines WHERE id=$id', { $id: lineId }));
    return true;
}
function showIngredientCreator() {
    var _a, _b, _c;
    const name = prompt('Nombre del nuevo ingrediente');
    if (!String(name || '').trim())
        return;
    const id = uniqueId('ING', name);
    const family = defaultFamilyId('ingredient');
    const orderGroup = ((_a = state.orderGroups[0]) === null || _a === void 0 ? void 0 : _a.id) || null;
    const storage = ((_b = state.storageZones.find(z => z.name === 'Seco')) === null || _b === void 0 ? void 0 : _b.id) || ((_c = state.storageZones[0]) === null || _c === void 0 ? void 0 : _c.id) || null;
    withTransaction(() => db.exec(`INSERT INTO ingredients (id,name,family_id,subfamily_id,order_group_id,storage_zone_id,base_unit_id,purchase_unit_id,purchase_price,purchase_net_quantity,waste_pct,use_culinary,use_bakery,notes,active)
    VALUES ($id,$name,$family,NULL,$order,$storage,'UNIT_KG','UNIT_KG',0,1,0,1,0,'',1)`, { $id: id, $name: name.trim(), $family: family, $order: orderGroup, $storage: storage }));
    loadCatalogs().then(() => { scheduleDbAutosave('Ingrediente creado'); showIngredientEditor(id); });
}
function showIngredientEditor(id) {
    var _a, _b;
    const row = db.query('SELECT * FROM ingredients WHERE id=$id', { $id: id })[0];
    if (!row)
        return;
    const selectedAllergens = new Set(db.query('SELECT allergen_id FROM ingredient_allergens WHERE ingredient_id=$id', { $id: id }).map(a => a.allergen_id));
    showModal('Editar ingrediente', `<div class="editor-layout"><section class="card-flat"><h3>Datos técnicos</h3><div class="grid two">
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
    <label><input type="checkbox" id="ingUseCulinary" ${row.use_culinary ? 'checked' : ''}/> Uso cocina</label>
    <label><input type="checkbox" id="ingUseBakery" ${row.use_bakery ? 'checked' : ''}/> Uso panadería/pastelería</label>
    <label style="grid-column:1/-1">Notas<textarea id="ingNotes">${escapeHtml(row.notes || '')}</textarea></label>
  </div><div class="actions"><button class="btn primary" id="saveIngEdit">Guardar ingrediente</button></div></section>
  <section class="card-flat"><h3>Alérgenos</h3><div class="check-grid">${state.allergens.map(a => `<label><input type="checkbox" data-allergen="${escapeAttr(a.id)}" ${selectedAllergens.has(a.id) ? 'checked' : ''}/> ${escapeHtml(a.name)}</label>`).join('')}</div></section></div>`);
    (_a = document.getElementById('ingFamily')) === null || _a === void 0 ? void 0 : _a.addEventListener('change', e => {
        const target = document.getElementById('ingSubfamily');
        if (target)
            target.innerHTML = subfamilyOptionsHtml(e.target.value, '');
    });
    (_b = document.getElementById('saveIngEdit')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', async () => {
        const price = Number(document.getElementById('ingPrice').value || 0);
        const net = Number(document.getElementById('ingNet').value || 1);
        const waste = Number(document.getElementById('ingWaste').value || 0);
        if (!document.getElementById('ingName').value.trim())
            return showFormError('El ingrediente necesita nombre.');
        if (price < 0 || net <= 0 || waste < 0 || waste >= 100)
            return showFormError('Revisa precio, cantidad neta y merma.');
        withTransaction(() => {
            db.exec(`UPDATE ingredients SET name=$name,family_id=$family,subfamily_id=$subfamily,order_group_id=$order,storage_zone_id=$storage,base_unit_id=$base,purchase_unit_id=$purchase,purchase_price=$price,purchase_net_quantity=$net,waste_pct=$waste,density_g_ml=$density,use_culinary=$culinary,use_bakery=$bakery,notes=$notes,active=$active,updated_at=CURRENT_TIMESTAMP WHERE id=$id`, {
                $name: document.getElementById('ingName').value.trim(), $family: document.getElementById('ingFamily').value || null, $subfamily: document.getElementById('ingSubfamily').value || null,
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
    });
}
async function generateDocument(items, opts) {
    if (!items.length) {
        alert('Añade al menos una elaboración.');
        return;
    }
    const body = [];
    body.push(printHeader(opts));
    if (opts.documentType !== 'pedido') {
        for (const item of items)
            body.push(await recipeSheetHtml(item, opts, true));
    }
    if (opts.documentType !== 'fichas')
        body.push(await orderHtml(items, opts));
    const html = printDocumentShell(body.join('\n'));
    recordPrintJob(items, opts, html);
    presentPrintDocument(html, docTitle(opts.documentType));
}
function recordPrintJob(items, opts, html) {
    try {
        const id = uniqueId('PJ', opts.documentType || 'documento');
        const title = docTitle(opts.documentType);
        const payload = JSON.stringify({ documentType: opts.documentType, subrecipeMode: subrecipeModeFromOptions(opts), includeCosts: !!opts.includeCosts, includeProcess: !!opts.includeProcess, includeAppcc: !!opts.includeAppcc, generatedAt: new Date().toISOString(), htmlBytes: html.length });
        withTransaction(() => {
            db.exec(`INSERT INTO print_jobs (id,source_type,source_id,profile,title,payload_json,total_cost,item_count,notes)
        VALUES ($id,$sourceType,$sourceId,$profile,$title,$payload,$totalCost,$itemCount,$notes)`, {
                $id: id,
                $sourceType: opts.documentType === 'pedido' ? 'order' : 'selection',
                $sourceId: WORK_SELECTION_ID,
                $profile: opts.includeTeachingData ? 'docente' : 'aula',
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
                $qty: `${formatQty(item.qty)} ${item.unitLabel || ''}`.trim(),
                $sort: (index + 1) * 10
            }));
        });
    }
    catch (error) {
        console.warn('[ObradORR] No se pudo registrar print_job.', error);
    }
}
function presentPrintDocument(html, title = 'Documento') {
    var _a, _b;
    modalRoot.innerHTML = `<div class="modal-backdrop print-backdrop"><section class="modal print-modal"><header><h2>${escapeHtml(title)}</h2><div class="actions"><button class="btn primary" id="printIframeButton">Imprimir / guardar PDF</button><button class="btn" id="closePrintViewer">Cerrar</button></div></header><iframe id="printFrame" class="print-frame" title="Vista previa de impresión"></iframe></section></div>`;
    const frame = document.getElementById('printFrame');
    frame.srcdoc = html;
    (_a = document.getElementById('closePrintViewer')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', closeModal);
    (_b = document.getElementById('printIframeButton')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        const w = frame.contentWindow;
        if (!w)
            return alert('El visor de impresión todavía no está listo.');
        w.focus();
        w.print();
    });
}
function sheetStatusWarningHtml(detail, kind) {
    if (!detail)
        return '';
    const warnings = [];
    const notesText = String([detail.notes, detail.service_notes, detail.appcc_notes, detail.preferment_notes, detail.fermentation_notes].filter(Boolean).join(' | '));
    const notes = notesText.toLowerCase();
    const releaseStatus = detail.release_status || '';
    if (releaseStatus === 'no_apta')
        warnings.push('<b>Ficha no apta:</b> no usar como ficha final de aula-taller sin corrección previa.');
    else if (releaseStatus === 'pendiente')
        warnings.push('<b>Ficha pendiente:</b> requiere validación técnica, documental o de obrador antes de considerarse cerrada.');
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
    if (notes.includes('proveedor pendiente') || notes.includes('ficha técnica de proveedor') || notes.includes('ficha tecnica de proveedor'))
        warnings.push('<b>Proveedor pendiente:</b> composición o alérgeno pendiente de ficha técnica; no cerrar la declaración sin documentación.');
    if (!warnings.length)
        return '';
    const uniqueWarnings = [...new Set(warnings)];
    return `<div class="warning-block rc7-status-warning"><h3>Estado documental RC7</h3><ul>${uniqueWarnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
}

function printHeader(opts) {
    const fields = [];
    if (opts.includeTeachingData) {
        const t = opts.teaching || {};
        addField(fields, 'Título', t.title);
        addField(fields, 'Fecha', t.date);
        addField(fields, 'Ciclo', t.cycle);
        addField(fields, 'Módulo', t.module);
        addField(fields, 'Grupo', t.group);
        addField(fields, 'Responsable', t.responsible);
        addField(fields, 'Observaciones', t.notes);
    }
    return `<section class="doc-cover"><h1>ObradORR</h1><h2>${docTitle(opts.documentType)}</h2>${fields.length ? `<dl>${fields.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join('')}</dl>` : `<p>Documento generado desde la selección actual.</p>`}</section>`;
}
async function recipeSheetHtml(item, opts, pageBreak) {
    return item.sourceType === 'bakery'
        ? bakerySheetHtml(item, opts, pageBreak, { depth: 0, visited: new Set([`bakery:${item.sourceId}`]) })
        : culinarySheetHtml(item, opts, pageBreak, { depth: 0, visited: new Set([`culinary:${item.sourceId}`]) });
}
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
    <header class="sheet-head"><div><h2>${escapeHtml(item.name || recipe.name)}</h2><p>Cocina · ${formatQty(item.qty)} ${escapeHtml(item.unitLabel || '')}</p></div>${photo ? `<img class="sheet-photo" src="${photo}" alt="${escapeAttr(item.name || recipe.name)}" />` : ''}</header>
    ${sheetStatusWarningHtml(detail, 'culinary')}
    <h3>Ingredientes y cantidades</h3>
    ${linesTable(lines, opts.includeCosts)}
    ${opts.includeCosts ? `<p class="cost-line"><b>Coste estimado:</b> ${money(totalCost)}</p>` : ''}
    ${directNotice}
    ${allergenBlockHtml(allergenData, 'Alérgenos derivados')}
    ${opts.includeProcess ? processBlock(detail, [], 'culinary') : ''}
    ${opts.includeAppcc ? appccBlock(detail, 'culinary') : ''}
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
        const childCtx = { depth: depth + 1, visited: new Set([...(ctx.visited || []), key]) };
        chunks.push(await culinarySubrecipeSheetHtml(row, opts, childCtx));
    }
    return chunks.join('\n');
}
async function culinarySubrecipeSheetHtml(row, opts, ctx) {
    const photo = await recipePhotoDataUrl('culinary', row.id);
    const detail = recipeDetail('culinary', row.id);
    const allergenData = culinaryAllergenData(row.id);
    const lines = culinaryLines(row.id, row.factor, false);
    const nested = await culinarySubrecipeSectionsHtml(row.id, row.factor, opts, ctx);
    const totalCost = sum(lines.map(l => l.cost || 0));
    return `<section class="sub-sheet"><header class="sub-sheet-head"><div><h3>Subelaboración: ${escapeHtml(row.name)}</h3><p>Cantidad necesaria: ${escapeHtml(displayQuantity(row.requiredQty, row.requiredUnit).text)} · Rendimiento base: ${escapeHtml(displayQuantity(row.yieldQty, row.yieldUnit).text)} · factor ${formatQty(row.factor)}</p></div>${photo ? `<img class="sub-sheet-photo" src="${photo}" alt="${escapeAttr(row.name)}" />` : ''}</header>
    ${sheetStatusWarningHtml(detail, 'culinary')}
    ${linesTable(lines, opts.includeCosts)}
    ${opts.includeCosts ? `<p class="cost-line"><b>Coste subelaboración:</b> ${money(totalCost)}</p>` : ''}
    ${allergenBlockHtml(allergenData, 'Alérgenos de la subelaboración')}
    ${opts.includeProcess ? processBlock(detail, [], 'culinary') : ''}
    ${opts.includeAppcc ? appccBlock(detail, 'culinary') : ''}
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
function subrecipeModeFromOptions(opts) {
    return (opts === null || opts === void 0 ? void 0 : opts.subrecipeMode) || ((opts === null || opts === void 0 ? void 0 : opts.expandSubrecipes) ? 'ingredients' : 'none');
}
function recipeSummary(sourceType, sourceId) {
    return state.recipes.find(r => r.uid === `${sourceType}:${sourceId}`) || null;
}
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
    <header class="sheet-head"><div><h2>${escapeHtml(item.name || recipe.name)}</h2><p>Panadería/Pastelería · ${formatQty(item.qty)} ${escapeHtml(item.unitLabel || '')}</p></div>${photo ? `<img class="sheet-photo" src="${photo}" alt="${escapeAttr(item.name || recipe.name)}" />` : ''}</header>
    ${sheetStatusWarningHtml(detail, 'bakery')}
    ${bakeryMetaHtml(detail, item, recipe, blocks)}
    ${blocks.map(bakeryBlockHtml(opts.includeCosts)).join('\n')}
    ${componentSections}
    ${allergenBlockHtml(allergenBundle.main, 'Alérgenos derivados')}
    ${optionalComponentAllergensHtml(allergenBundle.optional)}
    ${opts.includeCosts ? `<p class="cost-line"><b>Coste estimado:</b> ${money(totalCost)}</p>` : ''}
    ${opts.includeProcess ? bakeryProcessBlocksHtml(item.sourceId) : ''}
    ${opts.includeAppcc ? appccBlock(recipeDetail('bakery', item.sourceId), 'bakery') : ''}
  </section>`;
}
function bakeryDetail(recipeId) {
    return db.query(`SELECT br.*, bp.preferment_type AS bp_type, bp.calculation_mode, bp.hydration_pct, bp.flour_prefermented_pct, bp.preferment_total_pct, bp.time_hours, bp.temperature_c, bp.notes AS preferment_notes, bp.validation_status AS preferment_validation_status
    FROM bakery_recipes br LEFT JOIN bakery_preferments bp ON bp.recipe_id=br.id WHERE br.id=$id`, { $id: recipeId })[0] || {};
}
function bakeryMetaHtml(detail, item, recipe, blocks) {
    const pref = detail.calculation_mode && detail.calculation_mode !== 'none';
    const fields = [];
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
        groups.push({ title: 'Prefermento / Biga / Poolish / Masa madre', lines: pref.map(l => (Object.assign(Object.assign({}, l), { quantity: l.prefermentQuantity, unit: 'g', technical_note: lineGroupLabel(l.line_group) }))) });
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
    const groups = new Map();
    for (const r of rows) {
        const label = r.block_label || r.block;
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
    if (c.component_type === 'culinary') {
        const detail = recipeDetail('culinary', c.component_id);
        const lines = culinaryLines(c.component_id, c.factor.value, false);
        const allergenData = culinaryAllergenData(c.component_id);
        return `<section class="sub-sheet"><h3>Componente: ${escapeHtml(c.component_name)}</h3><p>${escapeHtml(roleLabel(c.usage_role))} · ${escapeHtml(componentStatusLabel(c.component_status))} · cantidad necesaria: ${escapeHtml(c.displayQty)} · ${Number(c.include_in_order) ? 'incluido en pedido' : 'sin pedido base'} · ${Number(c.include_in_cost) ? 'incluido en coste' : 'sin coste base'}</p>${linesTable(lines, opts.includeCosts)}${allergenBlockHtml(allergenData, 'Alérgenos del componente')}${opts.includeProcess ? processBlock(detail, [], 'culinary') : ''}${opts.includeAppcc ? appccBlock(detail, 'culinary') : ''}</section>`;
    }
    const childRecipe = recipeSummary('bakery', c.component_id) || { source_id: c.component_id, base_flour_g: 1000, name: c.component_name };
    const flour = Number(childRecipe.base_flour_g || 1000) * c.factor.value;
    const childItem = { uid: `bakery:${c.component_id}`, sourceType: 'bakery', sourceId: c.component_id, name: c.component_name, qty: flour, unitLabel: 'g harina', baseMode: 'flour_g', baseValue: Number(childRecipe.base_flour_g || 1000) };
    return `<section class="sub-sheet"><h3>Componente: ${escapeHtml(c.component_name)}</h3><p>${escapeHtml(roleLabel(c.usage_role))} · ${escapeHtml(componentStatusLabel(c.component_status))} · cantidad necesaria: ${escapeHtml(c.displayQty)} · ${Number(c.include_in_order) ? 'incluido en pedido' : 'sin pedido base'} · ${Number(c.include_in_cost) ? 'incluido en coste' : 'sin coste base'}</p>${bakerySheetHtml(childItem, opts, false, { depth: Number(ctx.depth || 0) + 1, visited: new Set([...(ctx.visited || []), key]) })}</section>`;
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
function allergenBlockHtml(data, title = 'Alérgenos derivados') {
    const confirmed = allergenListHtml(data.confirmed);
    const pending = allergenListHtml(data.pending);
    const may = allergenListHtml(data.mayContain);
    if (!confirmed && !pending && !may)
        return `<div class="allergen-block"><h3>${escapeHtml(title)}</h3><p class="muted">No se detectan alérgenos normativos confirmados en los ingredientes vinculados.</p></div>`;
    return `<div class="allergen-block"><h3>${escapeHtml(title)}</h3>${confirmed ? `<h4>Confirmados</h4><ul>${confirmed}</ul>` : ''}${pending ? `<h4>Pendientes de verificación</h4><ul class="pending">${pending}</ul>` : ''}${may ? `<h4>Puede contener / trazas declaradas</h4><ul class="may-contain">${may}</ul>` : ''}<p class="allergen-note">Bloque limitado a los 14 grupos normativos. Las categorías internas/no estándar no se mezclan con esta declaración.</p></div>`;
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
        return `<p class="muted">No se detectan alérgenos normativos confirmados.</p>`;
    return `${confirmed ? `<p><b>Confirmados:</b></p><ul>${confirmed}</ul>` : ''}${pending ? `<p><b>Pendientes:</b></p><ul class="pending">${pending}</ul>` : ''}${may ? `<p><b>Puede contener / trazas:</b></p><ul class="may-contain">${may}</ul>` : ''}`;
}

function recipeSteps(sourceType, sourceId) {
    if (sourceType === 'culinary')
        return db.query('SELECT instruction, notes FROM v_elaboration_steps_unified WHERE source_type=$type AND source_id=$id ORDER BY step_order', { $type: sourceType, $id: sourceId });
    return db.query('SELECT instruction, notes FROM bakery_process_steps WHERE recipe_id=$id ORDER BY CASE block WHEN \'preferment\' THEN 10 WHEN \'final_dough\' THEN 20 WHEN \'other\' THEN 60 WHEN \'baking\' THEN 80 WHEN \'cooling\' THEN 90 ELSE 99 END, step_number', { $id: sourceId });
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
function appccBlock(detail, sourceType) {
    const rows = appccRowsFor(sourceType, detail === null || detail === void 0 ? void 0 : detail.id);
    if (rows.length) {
        const title = sourceType === 'bakery' ? 'APPCC docente mínimo · Panadería/Pastelería' : 'APPCC docente mínimo · Cocina';
        return `<div class="appcc-block structured-appcc"><h3>${title}</h3><p class="appcc-disclaimer"><b>Modelo docente:</b> no sustituye el manual APPCC del centro ni la ficha técnica del proveedor. Los parámetros concretos deben verificarse según el procedimiento del centro.</p>${appccStructuredRowsHtml(rows)}</div>`;
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
async function orderHtml(items, opts) {
    const rows = [];
    for (const item of items)
        rows.push(...orderLinesForItem(item, opts));
    const grouped = aggregateOrder(rows);
    const orderAllergens = allergenDataFromIngredientIds(rows.map(r => r.ingredient_id));
    return `<section class="print-order page-break"><h2>Pedido</h2>${allergenBlockHtml(orderAllergens, 'Alérgenos derivados del pedido')}${grouped.map(group => `<h3>${escapeHtml(group.name)}</h3><table class="order-table ${opts.includeCosts ? 'with-costs' : ''}"><thead><tr><th>Ingrediente</th><th>Total</th><th>Zona</th><th>Usado en</th>${opts.includeCosts ? '<th>Coste</th>' : ''}</tr></thead><tbody>${group.rows.map(r => { const q = displayQuantity(r.quantity, r.unit); return `<tr><td>${escapeHtml(r.name)}</td><td class="qty">${escapeHtml(q.text)}</td><td>${escapeHtml(r.storage_zone || '')}</td><td>${escapeHtml([...r.usedIn].join(', '))}</td>${opts.includeCosts ? `<td class="money-cell">${money(r.cost || 0)}</td>` : ''}</tr>`; }).join('')}</tbody></table>`).join('')}</section>`;
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
function printDocumentShell(content) {
    const baseHref = new URL('./', window.location.href).href;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><base href="${escapeAttr(baseHref)}"><title>ObradORR · Documento</title><style>
    @page{size:A4;margin:14mm}body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1f2933;line-height:1.35}h1{font-size:30px;margin:0 0 4px}h2{font-size:22px;margin:0 0 8px}h3{margin:18px 0 8px;color:#7c3f1d}.doc-cover{border-bottom:3px solid #7c3f1d;padding-bottom:18px;margin-bottom:18px}.doc-cover dl{display:grid;grid-template-columns:140px 1fr;gap:5px 12px}.doc-cover dt{font-weight:800}.doc-cover dd{margin:0}.sheet-head{display:grid;grid-template-columns:1fr minmax(110px,150px);gap:14px;align-items:start;border-bottom:1px solid #ddd;padding-bottom:10px}.sheet-head img,.sheet-photo{max-width:150px;max-height:105px;width:auto;height:auto;object-fit:contain;border-radius:12px;justify-self:end;background:#faf7f0}.sheet-head:not(:has(img)){grid-template-columns:1fr}table{width:100%;border-collapse:collapse;margin:8px 0 14px;table-layout:fixed}th,td{border:1px solid #ddd;padding:6px 7px;text-align:left;vertical-align:top;overflow-wrap:break-word;word-break:normal;hyphens:auto}th{background:#f4efe6;font-size:11px;text-transform:uppercase}.lines-table th:nth-child(1){width:48%}.lines-table th:nth-child(2){width:18%}.lines-table th:nth-child(3){width:34%}.lines-table.with-costs th:nth-child(1){width:43%}.lines-table.with-costs th:nth-child(2){width:17%}.lines-table.with-costs th:nth-child(3){width:14%}.lines-table.with-costs th:nth-child(4){width:26%}.order-table th:nth-child(1){width:36%}.order-table th:nth-child(2){width:14%}.order-table th:nth-child(3){width:15%}.order-table th:nth-child(4){width:35%}.order-table.with-costs th:nth-child(1){width:33%}.order-table.with-costs th:nth-child(2){width:13%}.order-table.with-costs th:nth-child(3){width:14%}.order-table.with-costs th:nth-child(4){width:30%}.order-table.with-costs th:nth-child(5){width:10%}.qty,.money-cell{white-space:nowrap}.money-cell{text-align:right}.note-cell{font-size:12px}.page-break{break-before:page}.print-sheet:first-of-type{break-before:auto}.print-sheet,.print-order,.process-block,.appcc-block{break-inside:avoid-page;page-break-inside:avoid}.prose{max-width:100%;display:block}.prose p{margin:.45rem 0;break-inside:avoid;page-break-inside:avoid;overflow-wrap:normal;word-break:normal}.cost-line{background:#f6f0e6;padding:8px;border-radius:8px}.subrecipe-summary,.formula-meta,.component-block,.bakery-block,.sub-sheet,.warning-block{border:1px solid #e2d8c7;border-radius:10px;padding:9px 11px;margin:10px 0;break-inside:avoid-page;page-break-inside:avoid}.sub-sheet{background:#fffaf2}.sub-sheet .sub-sheet-head{display:grid;grid-template-columns:1fr minmax(90px,115px);gap:10px;align-items:start}.sub-sheet img,.sub-sheet-photo{max-width:115px;max-height:80px;width:auto;height:auto;object-fit:contain;border-radius:10px;justify-self:end;background:#faf7f0}.sub-sheet .sub-sheet-head:not(:has(img)){grid-template-columns:1fr}.formula-meta dl{display:grid;grid-template-columns:160px 1fr;gap:4px 10px;margin:0}.formula-meta dt{font-weight:800}.formula-meta dd{margin:0}.warning-block{background:#fff7ed;border-color:#fdba74}.allergen-block{border:1px solid #f0c36b;background:#fff8e8;border-radius:10px;padding:9px 11px;margin:10px 0;break-inside:avoid-page;page-break-inside:avoid}.allergen-block h3{margin-top:0}.allergen-block h4{margin:8px 0 4px;color:#7c3f1d}.allergen-block ul{margin:4px 0 8px 18px;padding:0}.allergen-block .pending{color:#9a3412}.allergen-block .may-contain{color:#6b4e16}.allergen-source{font-size:11px;color:#5b6472}.allergen-note{font-size:11px;color:#5b6472;margin:6px 0 0}.optional-allergens{background:#fffaf2}.structured-appcc{border:1px solid #b7c8a9;background:#f8fff2;border-radius:10px;padding:10px 12px;margin:10px 0}.appcc-disclaimer,.appcc-note{font-size:11px;color:#4f5d43;margin:6px 0 8px}.appcc-row-block{break-inside:avoid-page;page-break-inside:avoid;margin:8px 0 12px}.appcc-table th{width:24%;background:#eaf4df}.appcc-table td{width:76%}.appcc-cell p{margin:.25rem 0}.appcc-unstructured{background:#fff7ed;border-color:#fdba74}.warn{color:#9a3412;font-weight:700}h4{margin:10px 0 4px;color:#7c3f1d}.bakery-block h3,.component-block h3{margin-top:0}.print-legal-footer{border-top:1px solid #ddd;margin-top:18px;padding-top:8px;color:#5b6472;font-size:10.5px;text-align:center}.print-legal-footer strong{color:#1f2933}@media(max-width:760px){.sheet-head{grid-template-columns:1fr}.sheet-head img,.sheet-photo{justify-self:start;max-width:100%;max-height:90px}.sub-sheet .sub-sheet-head{grid-template-columns:1fr}.sub-sheet img,.sub-sheet-photo{justify-self:start;max-width:100%;max-height:70px}}@media print{button{display:none}}
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
    VALUES ($id,$session,$type,$culinary,$bakery,$mode,$main,$servings,$pieces,NULL,$flour,NULL,$loss,1,$sort,$notes)`, Object.assign({ $id: `SI-${sessionId}-${idx + 1}`, $session: sessionId }, payload));
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
    return { uid, sourceType: recipe.source_type, sourceId: recipe.source_id, name: recipe.name, categoryLabel: recipe.category_label, qty: q.qty, unitLabel: q.unitLabel, baseMode: q.baseMode, baseValue: q.baseValue };
}
function defaultQuantity(recipe) {
    if (recipe.source_type === 'bakery') {
        if (Number(recipe.base_pieces) > 0)
            return { qty: Number(recipe.base_pieces), unitLabel: 'piezas', baseMode: 'pieces', baseValue: Number(recipe.base_pieces) };
        return { qty: Number(recipe.base_flour_g || 1000), unitLabel: 'g harina', baseMode: 'flour_g', baseValue: Number(recipe.base_flour_g || 1000) };
    }
    if (recipe.default_production_mode === 'yield' || recipe.production_kind === 'technical_yield')
        return { qty: Number(recipe.yield_quantity || 1), unitLabel: recipe.yield_unit || 'rendimiento', baseMode: 'yield', baseValue: Number(recipe.yield_quantity || 1) };
    return { qty: Number(recipe.base_servings || 1), unitLabel: 'raciones', baseMode: 'servings', baseValue: Number(recipe.base_servings || 1) };
}
function defaultQuantityLabel(recipe) { const q = defaultQuantity(recipe); return `${formatQty(q.qty)} ${q.unitLabel}`; }
function scaleForItem(item, recipe) { return Number(item.qty || 0) / (Number(item.baseValue || (recipe === null || recipe === void 0 ? void 0 : recipe.base_servings) || (recipe === null || recipe === void 0 ? void 0 : recipe.yield_quantity) || 1) || 1); }
function bakeryFlourForItem(item, recipe) {
    const baseFlour = Number((recipe === null || recipe === void 0 ? void 0 : recipe.base_flour_g) || item.baseValue || 1000) || 1000;
    if (item.baseMode === 'flour_g')
        return Number(item.qty || 0);
    if (item.baseMode === 'pieces')
        return baseFlour * (Number(item.qty || 0) / (Number((recipe === null || recipe === void 0 ? void 0 : recipe.base_pieces) || item.baseValue || 1) || 1));
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
        console.warn('[ObradORR] IndexedDB no está disponible. Se cargará la base pública.', error);
        state.dataStatus = 'IndexedDB no disponible; base pública cargada';
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
            console.warn('[ObradORR] No se pudo cargar la recuperación local, se usará la base pública.', error);
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
    state.dataSource = 'base pública';
    state.dataStatus = state.dataStatus.includes('IndexedDB') ? state.dataStatus : 'Base pública cargada';
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
    const tortaCritical = db.query("SELECT ingredient AS ingredient_name, grams_for_base_flour AS base_qty_g FROM v_print_bakery_formula WHERE recipe_id='torta-de-nata-pedro' AND ingredient IN ('Nata 35 % MG','Azúcar blanco')");
    if (tortaCritical.length < 2 || tortaCritical.some(r => Number(r.base_qty_g || 0) <= 0))
        throw new Error('Regresión panadera crítica: Torta de nata tiene nata o azúcar con cantidad 0.');
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
    const title = level === 'error' ? 'Error al guardar recuperación local' : level === 'saving' ? 'Guardando recuperación local...' : level === 'warning' ? 'Cambios pendientes de guardar o descargar' : 'Guardado protegido';
    const detail = level === 'error'
        ? (state.dataSaveError || 'No se pudo guardar en este navegador. Descarga una copia SQLite antes de cerrar.')
        : level === 'saving'
            ? 'No cierres la pestaña hasta que finalice el guardado.'
            : level === 'warning'
                ? 'Descarga una copia SQLite o espera al autoguardado local antes de cerrar.'
                : 'La recuperación local o la copia descargada cubre la revisión actual.';
    return `<div class="data-safety ${level} no-print"><div><b>${escapeHtml(title)}</b><br><small>${escapeHtml(detail)}</small></div><div class="data-safety-meta">${escapeHtml(dataStatusText())}</div></div>`;
}
function dataSafetyPanelHtml() {
    return `<div class="data-safety-panel ${dataSafetyLevel()}"><b>${escapeHtml(dataSafetyLevel() === 'warning' ? 'Atención: cambios pendientes' : dataSafetyLevel() === 'error' ? 'Error de recuperación local' : 'Protección de datos')}</b><p>${escapeHtml(dataStatusText())}</p><small>${escapeHtml(storageSupportSummary())}</small></div>`;
}
async function confirmBackupBeforeDestructiveAction(actionLabel) {
    if (hasUnsavedWork()) {
        const wantDownload = confirm(`Hay cambios pendientes antes de ${actionLabel}. ¿Quieres descargar ahora una copia SQLite de seguridad?`);
        if (wantDownload)
            downloadDb({ reason: `Copia previa a ${actionLabel}` });
    }
    return confirm(`Confirmación final: ${actionLabel} sustituirá o borrará datos locales de trabajo. ¿Continuar?`);
}

function dataStatusText() {
    const when = state.dataSavedAt ? ` · ${new Date(state.dataSavedAt).toLocaleString('es-ES')}` : '';
    const dirty = hasUnsavedWork() ? ' · cambios pendientes' : '';
    const saving = state.autosaveInFlight ? ' · guardando...' : '';
    const error = state.dataSaveError ? ` · error: ${state.dataSaveError}` : '';
    return `${state.dataStatus || 'Sin estado'}${when}${saving}${dirty}${error}`;
}
function updateStatusIndicator() {
    const status = document.querySelector('.topbar .status');
    if (status)
        status.innerHTML = `<span class="dot ${state.ready ? 'ok' : ''}"></span>${escapeHtml(state.ready ? dataStatusText() : (state.dataStatus || 'Cargando'))}`;
    const banner = document.querySelector('.data-safety');
    if (banner && state.ready) {
        const wrap = document.createElement('div');
        wrap.innerHTML = dataSafetyBannerHtml().trim();
        if (wrap.firstElementChild)
            banner.replaceWith(wrap.firstElementChild);
    }
}
function markDataChanged(reason = 'Cambios sin guardar') {
    state.dataDirty = true;
    state.dataRevision += 1;
    state.dataStatus = reason;
    updateStatusIndicator();
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
    if (!(await confirmBackupBeforeDestructiveAction('restaurar la base pública original')))
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
        state.dataSource = 'base pública';
        state.dataSavedAt = '';
        state.dataSaveError = '';
        state.lastSavedRevision = state.dataRevision;
        state.lastDownloadedRevision = state.dataRevision;
        state.dataDirty = false;
        state.dataStatus = 'Base pública restaurada';
        state.selection = [];
        saveSelection();
        state.page = 'inicio';
        render();
    }
    catch (error) {
        console.error(error);
        alert(`No se pudo restaurar la base pública: ${error.message}`);
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
        documentType: 'fichas_pedido', includeTeachingData: false, includeCosts: false, subrecipeMode: 'sheets', expandSubrecipes: true, includeProcess: true, includeAppcc: true,
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
    const message = (error === null || error === void 0 ? void 0 : error.message) || String(error || 'Revisa los datos del formulario.');
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
function docTitle(t) { return t === 'fichas' ? 'Fichas técnicas' : t === 'pedido' ? 'Pedido' : 'Fichas técnicas + pedido'; }
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
function displayRecipeCategory(item, recipe) {
    if (((item === null || item === void 0 ? void 0 : item.sourceType) || (recipe === null || recipe === void 0 ? void 0 : recipe.source_type)) === 'bakery')
        return 'Panadería/Pastelería';
    return 'Cocina';
}
function publicText(text) {
    const internalMarkers = ['migrado', 'le' + 'gacy', 'fa' + 'se\\s*\\d', 'auditor[ií]a', 'mejora\\s*\\d', 'ap' + 'p6', 'r' + 'c2', 'swift' + 'remo'];
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
    const date = new Date().toISOString().slice(0, 10);
    download(`ObradORR_copia_${date}.sqlite`, db.exportBytes(), 'application/vnd.sqlite3');
    state.lastDownloadedRevision = state.dataRevision;
    updateDirtyFromSnapshots();
    state.dataSaveError = '';
    state.dataStatus = options.reason || 'Copia SQLite descargada manualmente';
    state.dataSavedAt = new Date().toISOString();
    updateStatusIndicator();
}

function downloadSelectionJson() { download('obradorr_seleccion_actual.json', JSON.stringify({ selection: state.selection, printOptions: state.printOptions }, null, 2), 'application/json'); }
function showModal(title, html) {
    modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal"><header><h2>${escapeHtml(title)}</h2><button class="btn" data-close-modal>Cerrar</button></header><div class="modal-body">${html}</div></section></div>`;
    modalRoot.querySelector('[data-close-modal]').addEventListener('click', closeModal);
    modalRoot.querySelector('.modal-backdrop').addEventListener('click', e => {
        if (e.target.classList.contains('modal-backdrop'))
            closeModal();
    });
}
function closeModal() { modalRoot.innerHTML = ''; }

})();
