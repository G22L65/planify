/* ─── App Controller ─── */
const App = (() => {
  const STORAGE_KEY = 'planify_data';
  const SETTINGS_KEY = 'planify_settings';
  const THEME_KEY = 'planify_theme';

  const THEME_NAMES = {
    classic: 'Classic',
    cherry:  'Cherry Blossom',
    pastel:  'Pastel Rainbow',
    cozy:    'Cozy Kraft',
    minimal: 'Minimal'
  };

  let state = {
    currentView: 'landing',
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    categories: [],
    days: {},
    calendarGrid: null
  };

  // ─── Default Config (public client-side keys) ───
  const DEFAULTS = {
    geminiKey: 'AIzaSyA5UpKQ633XfrUtUS9jviNFp-nJctZxyOQ',
    gcalClientId: '296940098399-hu7bvqlj3pgpb5snl06ua05o7sav37cf.apps.googleusercontent.com'
  };

  // ─── Settings ───
  function getSetting(key) {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return s[key] || DEFAULTS[key] || '';
  }
  function setSetting(key, val) {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    s[key] = val;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  // ─── State Persistence ───
  function saveState() {
    const toSave = { categories: state.categories, days: state.days,
      selectedMonth: state.selectedMonth, selectedYear: state.selectedYear };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        state.categories = saved.categories || [];
        state.days = saved.days || {};
        state.selectedMonth = saved.selectedMonth ?? state.selectedMonth;
        state.selectedYear = saved.selectedYear ?? state.selectedYear;
      }
    } catch(e) { /* ignore */ }
  }

  // ─── Toast ───
  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)';
      setTimeout(() => t.remove(), 300); }, 3000);
  }

  // ─── Views ───
  function showView(view) {
    state.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`${view}-view`)?.classList.remove('hidden');

    // Update navbar buttons visibility
    const backBtn = document.getElementById('nav-back-btn');
    const settingsBtn = document.getElementById('nav-settings-btn');
    if (backBtn) backBtn.classList.toggle('hidden', view === 'landing');

    if (view === 'builder') initBuilder();
    if (view === 'preview') initPreview();
  }

  // ─── Builder ───
  function initBuilder() {
    const monthSelect = document.getElementById('month-select');
    const yearInput = document.getElementById('year-input');
    monthSelect.value = state.selectedMonth;
    yearInput.value = state.selectedYear;
    rebuildCalendar();
  }

  function rebuildCalendar() {
    state.calendarGrid = Calendar.generateGrid(state.selectedYear, state.selectedMonth);
    const container = document.getElementById('calendar-container');
    Calendar.renderGrid(state.calendarGrid, container);
    Editor.renderTasks(state);
    renderCategoryPanel();
  }

  function renderCategoryPanel() {
    const panel = document.getElementById('category-list');
    if (panel) Editor.renderCategories(state.categories, panel);
  }

  // ─── Task CRUD ───
  function addTask(date, task) {
    if (!state.days[date]) state.days[date] = [];
    state.days[date].push(task);
    // Auto-add category if new
    if (task.category && !state.categories.find(c => c.name === task.category)) {
      state.categories.push({ name: task.category, color: task.color || '#7c3aed' });
    }
    saveState();
    Editor.renderTasks(state);
    renderCategoryPanel();
  }

  function updateTask(date, index, task) {
    if (state.days[date] && state.days[date][index]) {
      state.days[date][index] = task;
      saveState();
      Editor.renderTasks(state);
    }
  }

  function removeTask(date, index) {
    if (state.days[date]) {
      state.days[date].splice(index, 1);
      if (state.days[date].length === 0) delete state.days[date];
      saveState();
      Editor.renderTasks(state);
    }
  }

  function moveTask(fromDate, index, toDate) {
    if (!state.days[fromDate] || !state.days[fromDate][index]) return;
    const task = state.days[fromDate].splice(index, 1)[0];
    if (state.days[fromDate].length === 0) delete state.days[fromDate];
    if (!state.days[toDate]) state.days[toDate] = [];
    state.days[toDate].push(task);
    saveState();
    Editor.renderTasks(state);
  }

  // ─── Categories ───
  function removeCategory(name) {
    state.categories = state.categories.filter(c => c.name !== name);
    saveState();
    renderCategoryPanel();
  }

  function addCategory(name, color) {
    if (state.categories.find(c => c.name === name)) { toast('Category already exists.', 'warning'); return; }
    state.categories.push({ name, color });
    saveState();
    renderCategoryPanel();
    toast(`Category "${name}" added.`, 'success');
  }

  // ─── New Category Modal ───
  function showNewCategoryModal() {
    showModal('New Category', `
      <div class="modal-field">
        <label>Category Name</label>
        <input type="text" id="new-cat-name" placeholder="e.g. Exercise" />
      </div>
      <div class="modal-field">
        <label>Color</label>
        <div class="pop-colors" id="new-cat-colors">
          ${Editor.PRESET_COLORS.map((c,i) =>
            `<button class="pop-color-btn ${i===0?'active':''}" data-color="${c}" style="background:${c}"></button>`
          ).join('')}
        </div>
      </div>
    `, () => {
      const name = document.getElementById('new-cat-name').value.trim();
      const activeBtn = document.querySelector('#new-cat-colors .pop-color-btn.active');
      const color = activeBtn ? activeBtn.dataset.color : '#7c3aed';
      if (name) addCategory(name, color);
    });

    // Color selection
    setTimeout(() => {
      document.querySelectorAll('#new-cat-colors .pop-color-btn').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('#new-cat-colors .pop-color-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        };
      });
    }, 50);
  }

  // ─── Settings Modal ───
  function showSettingsModal() {
    showModal('Settings', `
      <div class="modal-field">
        <label>Gemini API Key</label>
        <input type="password" id="set-gemini-key" value="${getSetting('geminiKey')}" placeholder="AIza..." />
        <div class="hint">Used for AI-powered plan generation. Pre-configured by default.</div>
      </div>
      <div class="modal-field">
        <label>Google Calendar Client ID</label>
        <input type="text" id="set-gcal-id" value="${getSetting('gcalClientId')}" placeholder="xxxx.apps.googleusercontent.com" />
        <div class="hint">OAuth 2.0 Client ID. Pre-configured by default.</div>
      </div>
    `, () => {
      setSetting('geminiKey', document.getElementById('set-gemini-key').value.trim());
      setSetting('gcalClientId', document.getElementById('set-gcal-id').value.trim());
      toast('Settings saved!', 'success');
    });
  }

  // ─── Generic Modal ───
  function showModal(title, bodyHTML, onSave) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'active-modal';
    overlay.innerHTML = `
      <div class="modal">
        <h2>${title}</h2>
        ${bodyHTML}
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm modal-cancel">Cancel</button>
          <button class="btn btn-primary btn-sm modal-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-cancel').onclick = closeModal;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    overlay.querySelector('.modal-save').onclick = () => { if (onSave) onSave(); closeModal(); };

    // Focus first input
    const firstInput = overlay.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }

  function closeModal() {
    document.getElementById('active-modal')?.remove();
  }

  // ─── AI Generate ───
  async function generateWithAI() {
    const textarea = document.getElementById('ai-prompt');
    const prompt = textarea.value.trim();
    if (!prompt) { toast('Please enter a prompt.', 'warning'); return; }

    const apiKey = getSetting('geminiKey');
    if (!apiKey) { toast('Set your Gemini API key in Settings first.', 'warning'); showSettingsModal(); return; }

    const container = document.getElementById('calendar-container');
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = '<div class="spinner"></div><span>Generating your plan with AI...</span>';
    container.style.position = 'relative';
    container.appendChild(loadingEl);

    const genBtn = document.getElementById('ai-generate-btn');
    genBtn.disabled = true;

    try {
      const result = await AIGenerator.generate(prompt, state.selectedMonth, state.selectedYear, apiKey);
      // Apply result
      if (result.categories) state.categories = result.categories;
      if (result.days) {
        // Build a category→color lookup map
        const catColorMap = {};
        (result.categories || []).forEach(c => { catColorMap[c.name] = c.color; });
        // Assign color to every task from its category
        Object.keys(result.days).forEach(dateKey => {
          result.days[dateKey].forEach(task => {
            if (!task.color && task.category && catColorMap[task.category]) {
              task.color = catColorMap[task.category];
            }
          });
        });
        state.days = result.days;
      }
      saveState();
      rebuildCalendar();
      toast('Plan generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      toast(err.message, 'error');
    } finally {
      loadingEl.remove();
      genBtn.disabled = false;
    }
  }

  // ─── Theme ───
  function getActiveTheme() {
    return localStorage.getItem(THEME_KEY) || 'classic';
  }
  function applyTheme(themeName) {
    const printArea = document.getElementById('print-area');
    if (printArea) printArea.setAttribute('data-theme', themeName);
    localStorage.setItem(THEME_KEY, themeName);
    // Update swatch UI
    document.querySelectorAll('.theme-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
    const nameEl = document.getElementById('theme-picker-name');
    if (nameEl) nameEl.textContent = THEME_NAMES[themeName] || themeName;
  }

  // ─── Preview ───
  function initPreview() {
    const printArea = document.getElementById('print-area');
    const grid = Calendar.generateGrid(state.selectedYear, state.selectedMonth);
    Calendar.renderPrintGrid(grid, state, printArea);
    applyTheme(getActiveTheme());
    // Sync swatch name label on first load
    const nameEl = document.getElementById('theme-picker-name');
    if (nameEl) nameEl.textContent = THEME_NAMES[getActiveTheme()] || 'Classic';
  }

  // ─── Export PDF ───
  function exportPDF() {
    const el = document.getElementById('print-area');
    const monthName = Calendar.MONTH_NAMES[state.selectedMonth];
    PDFExport.exportPDF(el, monthName, state.selectedYear);
  }

  // ─── Google Calendar Sync ───
  async function syncToGCal() {
    if (!GCalSync.isConfigured()) {
      const clientId = getSetting('gcalClientId');
      if (!clientId) { toast('Set Google Calendar Client ID in Settings.', 'warning'); showSettingsModal(); return; }
    }

    const syncBtn = document.getElementById('gcal-sync-btn');
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Syncing...';

    try {
      const grid = Calendar.generateGrid(state.selectedYear, state.selectedMonth);
      const count = await GCalSync.syncEvents(state, grid, (done, total) => {
        syncBtn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> ${done}/${total}`;
      });
      toast(`${count} events synced to Google Calendar!`, 'success');
    } catch (err) {
      console.error(err);
      toast(err.message, 'error');
    } finally {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '📅 Sync to Google Calendar';
    }
  }

  // ─── Clear Planner ───
  function clearPlanner() {
    if (confirm('Clear all tasks for this month?')) {
      state.days = {};
      saveState();
      rebuildCalendar();
      toast('Planner cleared.', 'info');
    }
  }

  // ─── Bulk Apply ───
  function showBulkModal() {
    showModal('Bulk Add Tasks', `
      <div class="modal-field">
        <label>Task Title</label>
        <input type="text" id="bulk-title" placeholder="e.g. Morning Workout" />
      </div>
      <div class="modal-field">
        <label>Category</label>
        <select id="bulk-cat" style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;color:var(--text-primary);">
          <option value="">— Select —</option>
          ${state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="modal-field">
        <label>Color</label>
        <div class="pop-colors" id="bulk-colors">
          ${Editor.PRESET_COLORS.map((c, i) =>
            `<button class="pop-color-btn ${i === 0 ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`
          ).join('')}
        </div>
      </div>
      <div class="modal-field">
        <label>Apply To</label>
        <select id="bulk-target" style="width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;color:var(--text-primary);">
          <optgroup label="── Groups ──">
            <option value="all">Every Day</option>
            <option value="weekdays">Mon – Fri (Weekdays)</option>
            <option value="mon-sat">Mon – Sat</option>
            <option value="weekends">Sat – Sun (Weekends)</option>
          </optgroup>
          <optgroup label="── Individual Days ──">
            <option value="0">Mondays Only</option>
            <option value="1">Tuesdays Only</option>
            <option value="2">Wednesdays Only</option>
            <option value="3">Thursdays Only</option>
            <option value="4">Fridays Only</option>
            <option value="5">Saturdays Only</option>
            <option value="6">Sundays Only</option>
          </optgroup>
        </select>
      </div>
    `, () => {
      const title = document.getElementById('bulk-title').value.trim();
      if (!title) return;
      const catName = document.getElementById('bulk-cat').value;
      const target = document.getElementById('bulk-target').value;
      
      const activeBtn = document.querySelector('#bulk-colors .pop-color-btn.active');
      const cat = state.categories.find(c => c.name === catName);
      const color = activeBtn ? activeBtn.dataset.color : (cat ? cat.color : '#7c3aed');

      const grid = state.calendarGrid;
      let count = 0;
      grid.weeks.forEach(week => {
        week.forEach(day => {
          if (day.isEmpty) return;
          let shouldAdd = false;
          if (target === 'all') shouldAdd = true;
          else if (target === 'weekdays') shouldAdd = day.dayOfWeek < 5;
          else if (target === 'mon-sat') shouldAdd = day.dayOfWeek < 6;
          else if (target === 'weekends') shouldAdd = day.dayOfWeek >= 5;
          else shouldAdd = day.dayOfWeek === parseInt(target);

          if (shouldAdd) {
            if (!state.days[day.date]) state.days[day.date] = [];
            state.days[day.date].push({ title, category: catName, color, time: '' });
            count++;
          }
        });
      });
      saveState();
      Editor.renderTasks(state);
      const targetLabel = document.getElementById('bulk-target').options[document.getElementById('bulk-target').selectedIndex].text;
      toast(`"${title}" added to ${count} day${count !== 1 ? 's' : ''} (${targetLabel})!`, 'success');
    });

    setTimeout(() => {
      document.querySelectorAll('#bulk-colors .pop-color-btn').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('#bulk-colors .pop-color-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        };
      });
    }, 50);
  }

  // ─── Getters ───
  function getState() { return state; }

  // ─── Init ───
  function init() {
    loadState();
    Editor.init();

    // Event bindings
    document.getElementById('nav-settings-btn').onclick = showSettingsModal;
    document.getElementById('nav-back-btn').onclick = () => showView('builder');

    // Landing cards
    document.getElementById('card-ai').onclick = () => {
      showView('builder');
      setTimeout(() => document.getElementById('ai-prompt')?.focus(), 200);
    };
    document.getElementById('card-manual').onclick = () => showView('builder');
    document.getElementById('card-pdf').onclick = () => showView('builder');
    document.getElementById('card-sync').onclick = () => showView('builder');

    // Month/Year selectors
    document.getElementById('month-select').onchange = function() {
      state.selectedMonth = parseInt(this.value);
      state.days = {};
      saveState();
      rebuildCalendar();
    };
    document.getElementById('year-input').onchange = function() {
      state.selectedYear = parseInt(this.value);
      state.days = {};
      saveState();
      rebuildCalendar();
    };

    // AI generate
    document.getElementById('ai-generate-btn').onclick = generateWithAI;

    // Toolbar buttons
    document.getElementById('preview-btn').onclick = () => showView('preview');
    document.getElementById('bulk-btn').onclick = showBulkModal;
    document.getElementById('clear-btn').onclick = clearPlanner;

    // Preview toolbar
    document.getElementById('back-to-builder').onclick = () => showView('builder');
    document.getElementById('export-pdf-btn').onclick = exportPDF;
    document.getElementById('print-btn').onclick = () => PDFExport.printPage();
    document.getElementById('gcal-sync-btn').onclick = syncToGCal;

    // Theme swatches
    document.getElementById('theme-swatches')?.addEventListener('click', e => {
      const btn = e.target.closest('.theme-swatch');
      if (btn) applyTheme(btn.dataset.theme);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); PDFExport.printPage(); }
    });

    showView('landing');
  }

  return { init, getState, getSetting, setSetting, toast, showView,
    addTask, updateTask, removeTask, moveTask,
    removeCategory, addCategory, showNewCategoryModal, showSettingsModal
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
