/* ─── Manual Task Editor ─── */
const Editor = (() => {
  let activePopover = null;
  const PRESET_COLORS = [
    '#7c3aed','#2563eb','#10b981','#ef4444','#f59e0b',
    '#ec4899','#06b6d4','#8b5cf6','#f97316','#14b8a6',
    '#6366f1','#84cc16'
  ];

  function init() {
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePopover();
    });
    initDragDrop();
  }

  function handleClick(e) {
    const addBtn = e.target.closest('.add-task-btn');
    const taskPill = e.target.closest('.task-pill');
    const removeCat = e.target.closest('.remove-cat');

    if (addBtn) {
      e.stopPropagation();
      openPopover(parseInt(addBtn.dataset.date), null, addBtn);
      return;
    }
    if (taskPill && !taskPill.classList.contains('dragging')) {
      e.stopPropagation();
      const date = parseInt(taskPill.closest('[data-date]').dataset.date);
      const idx = parseInt(taskPill.dataset.index);
      openPopover(date, idx, taskPill);
      return;
    }
    if (removeCat) {
      e.stopPropagation();
      const catName = removeCat.dataset.cat;
      App.removeCategory(catName);
      return;
    }
    if (activePopover && !e.target.closest('.task-popover')) {
      closePopover();
    }
  }

  function openPopover(date, taskIndex, anchor) {
    closePopover();
    const state = App.getState();
    const tasks = (state.days && state.days[date]) || [];
    const task = taskIndex !== null ? tasks[taskIndex] : null;
    const isEdit = task !== null;
    const cats = state.categories || [];

    const pop = document.createElement('div');
    pop.className = 'task-popover';

    pop.innerHTML = `
      <div class="pop-header">
        <h4>${isEdit ? 'Edit Task' : 'Add Task'} — Day ${date}</h4>
        <button class="btn-ghost pop-close" style="font-size:18px">✕</button>
      </div>
      <input type="text" id="pop-title" placeholder="Task title..." value="${isEdit ? task.title : ''}" />
      <select id="pop-category">
        <option value="">— Category —</option>
        ${cats.map(c => `<option value="${c.name}" ${isEdit && task.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
        <option value="__new__">+ New Category</option>
      </select>
      <input type="time" id="pop-time" value="${isEdit && task.time ? task.time : ''}" />
      <div class="pop-colors">
        ${PRESET_COLORS.map(c => `<button class="pop-color-btn ${isEdit && task.color === c ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
      </div>
      <div class="pop-actions">
        ${isEdit ? '<button class="btn btn-danger btn-sm pop-delete">Delete</button>' : ''}
        <button class="btn btn-secondary btn-sm pop-cancel">Cancel</button>
        <button class="btn btn-primary btn-sm pop-save">${isEdit ? 'Save' : 'Add'}</button>
      </div>
    `;

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    pop.style.top = Math.min(rect.bottom + 8, window.innerHeight - 340) + 'px';
    pop.style.left = Math.min(rect.left, window.innerWidth - 300) + 'px';

    document.body.appendChild(pop);
    activePopover = pop;

    // Focus title
    pop.querySelector('#pop-title').focus();

    // Selected color
    let selectedColor = isEdit ? (task.color || PRESET_COLORS[0]) : PRESET_COLORS[0];

    // Events
    pop.querySelector('.pop-close').onclick = closePopover;
    pop.querySelector('.pop-cancel').onclick = closePopover;

    pop.querySelectorAll('.pop-color-btn').forEach(btn => {
      btn.onclick = () => {
        pop.querySelectorAll('.pop-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.dataset.color;
      };
    });

    pop.querySelector('#pop-category').onchange = function() {
      if (this.value === '__new__') {
        this.value = '';
        App.showNewCategoryModal();
      }
    };

    pop.querySelector('.pop-save').onclick = () => {
      const title = pop.querySelector('#pop-title').value.trim();
      if (!title) return;
      const catSelect = pop.querySelector('#pop-category');
      const category = catSelect.value;
      const time = pop.querySelector('#pop-time').value;
      // Find color from category if selected
      const cat = cats.find(c => c.name === category);
      const color = cat ? cat.color : selectedColor;

      const taskData = { title, category, color, time };

      if (isEdit) {
        App.updateTask(date, taskIndex, taskData);
      } else {
        App.addTask(date, taskData);
      }
      closePopover();
    };

    if (isEdit) {
      pop.querySelector('.pop-delete').onclick = () => {
        App.removeTask(date, taskIndex);
        closePopover();
      };
    }

    // Enter to save
    pop.querySelector('#pop-title').addEventListener('keydown', e => {
      if (e.key === 'Enter') pop.querySelector('.pop-save').click();
    });
  }

  function closePopover() {
    if (activePopover) {
      activePopover.remove();
      activePopover = null;
    }
  }

  // Convert hex to rgba for vivid pill backgrounds
  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function renderTasks(plannerData) {
    const days = plannerData.days || {};
    document.querySelectorAll('.day-tasks').forEach(container => {
      const date = container.dataset.date;
      const tasks = days[date] || [];
      container.innerHTML = tasks.map((t, i) => {
        const color = t.color || '#7c3aed';
        const bg = hexToRgba(color, 0.22);
        return `<div class="task-pill" draggable="true" data-index="${i}"
          style="background:${bg};color:${color};border-left:3px solid ${color}">
          <span class="pill-dot" style="background:${color}"></span>
          ${t.title}
        </div>`;
      }).join('');
    });
  }

  function renderCategories(categories, container) {
    container.innerHTML = categories.map(c => `
      <span class="category-tag">
        <span class="cat-dot" style="background:${c.color}"></span>
        ${c.name}
        <span class="remove-cat" data-cat="${c.name}">×</span>
      </span>
    `).join('') + `<button class="btn btn-ghost btn-sm" id="add-cat-btn">+ Add Category</button>`;

    container.querySelector('#add-cat-btn').onclick = () => App.showNewCategoryModal();
  }

  // ─── Drag & Drop ───
  function initDragDrop() {
    document.addEventListener('dragstart', e => {
      const pill = e.target.closest('.task-pill');
      if (!pill) return;
      pill.classList.add('dragging');
      const date = pill.closest('[data-date]').dataset.date;
      const index = pill.dataset.index;
      e.dataTransfer.setData('text/plain', JSON.stringify({ date, index }));
      e.dataTransfer.effectAllowed = 'move';
    });

    document.addEventListener('dragend', e => {
      const pill = e.target.closest('.task-pill');
      if (pill) pill.classList.remove('dragging');
    });

    document.addEventListener('dragover', e => {
      const td = e.target.closest('td[data-date]');
      if (td) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });

    document.addEventListener('drop', e => {
      const td = e.target.closest('td[data-date]');
      if (!td) return;
      e.preventDefault();
      try {
        const { date: fromDate, index } = JSON.parse(e.dataTransfer.getData('text/plain'));
        const toDate = td.dataset.date;
        if (fromDate !== toDate) {
          App.moveTask(parseInt(fromDate), parseInt(index), parseInt(toDate));
        }
      } catch(err) { /* ignore */ }
    });
  }

  return { init, openPopover, closePopover, renderTasks, renderCategories, PRESET_COLORS };
})();
