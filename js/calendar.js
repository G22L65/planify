/* ─── Calendar Engine ─── */
const Calendar = (() => {
  const MONTH_NAMES = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const DAY_NAMES_MON = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOffset(year, month) {
    // Monday = 0 ... Sunday = 6
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
  }

  function generateGrid(year, month) {
    const totalDays = getDaysInMonth(year, month);
    const offset = getFirstDayOffset(year, month);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const weeks = [];
    let dayNum = 1;

    const totalSlots = Math.ceil((totalDays + offset) / 7) * 7;
    for (let i = 0; i < totalSlots; i += 7) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const slotIndex = i + d;
        if (slotIndex < offset || dayNum > totalDays) {
          week.push({ date: null, isEmpty: true });
        } else {
          const dayOfWeek = d; // 0=Mon ... 6=Sun
          week.push({
            date: dayNum,
            isEmpty: false,
            dayOfWeek,
            isWeekend: dayOfWeek >= 5,
            isSunday: dayOfWeek === 6,
            isToday: isCurrentMonth && dayNum === today.getDate(),
            tasks: []
          });
          dayNum++;
        }
      }
      weeks.push(week);
    }
    return { year, month, monthName: MONTH_NAMES[month], weeks };
  }

  function renderGrid(data, container) {
    let html = '<table class="calendar-grid"><thead><tr>';
    DAY_NAMES_MON.forEach(d => { html += `<th>${d.substring(0,3).toUpperCase()}</th>`; });
    html += '</tr></thead><tbody>';

    data.weeks.forEach(week => {
      html += '<tr>';
      week.forEach(day => {
        if (day.isEmpty) {
          html += '<td class="empty-cell"></td>';
        } else {
          const cls = [
            day.isToday ? 'today' : '',
            day.isWeekend ? 'weekend' : ''
          ].filter(Boolean).join(' ');
          html += `<td class="${cls}" data-date="${day.date}">`;
          html += `<span class="day-number">${day.date}</span>`;
          html += '<div class="day-tasks" data-date="' + day.date + '"></div>';
          html += '<button class="add-task-btn" data-date="' + day.date + '">+</button>';
          html += '</td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderPrintGrid(data, plannerData, container) {
    const categories = plannerData.categories || [];
    let html = '<div class="print-title">';
    html += `<h1>✦ Monthly Planner ✦</h1>`;
    html += `<p>${data.monthName} ${data.year}</p></div>`;
    html += '<table><thead><tr>';
    DAY_NAMES_MON.forEach(d => { html += `<th>${d.substring(0,3).toUpperCase()}</th>`; });
    html += '</tr></thead><tbody>';

    data.weeks.forEach(week => {
      html += '<tr>';
      week.forEach(day => {
        if (day.isEmpty) {
          html += '<td class="empty-print"></td>';
        } else {
          html += '<td>';
          const isSun = day.isSunday;
          html += `<span class="print-dn${isSun ? ' sun' : ''}">${day.date}</span>`;
          const tasks = (plannerData.days && plannerData.days[day.date]) || [];
          if (tasks.length) {
            html += '<ul class="print-tasks">';
            tasks.forEach((t, i) => {
              const color = t.color || '#888';
              html += `<li style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px;margin-bottom:2px;"><span style="color:${color};font-weight:700;flex:1;">${i+1}. ${t.title}</span><div class="print-task-checkbox" style="width:10px;height:10px;border:1.5px solid ${color};border-radius:2px;flex-shrink:0;margin-top:2px;"></div></li>`;
            });
            html += '</ul>';
          }
          html += '</td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    if (categories.length) {
      html += '<div class="print-legend">';
      categories.forEach(c => {
        html += `<div><span class="legend-dot" style="background:${c.color}"></span><b style="color:${c.color}">${c.name}</b></div>`;
      });
      html += '</div>';
    }
    container.innerHTML = html;
  }

  return { MONTH_NAMES, DAY_NAMES_MON, getDaysInMonth, getFirstDayOffset, generateGrid, renderGrid, renderPrintGrid };
})();
