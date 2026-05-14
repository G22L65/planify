/* ─── Google Calendar Sync ─── */
const GCalSync = (() => {
  const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  let tokenClient = null;
  let gapiInited = false;
  let gisInited = false;

  function initGapi() {
    return new Promise((resolve) => {
      if (typeof gapi === 'undefined') { resolve(false); return; }
      gapi.load('client', async () => {
        try {
          await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
          gapiInited = true;
          resolve(true);
        } catch (e) {
          console.warn('GAPI init failed:', e);
          resolve(false);
        }
      });
    });
  }

  function initGis(clientId) {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !google.accounts) { resolve(false); return; }
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: () => {} // set dynamically
        });
        gisInited = true;
        resolve(true);
      } catch (e) {
        console.warn('GIS init failed:', e);
        resolve(false);
      }
    });
  }

  async function init(clientId) {
    if (!clientId) return false;
    const g1 = await initGapi();
    const g2 = await initGis(clientId);
    return g1 && g2;
  }

  function requestAuth() {
    return new Promise((resolve, reject) => {
      if (!tokenClient) { reject(new Error('Google Calendar not configured.')); return; }
      tokenClient.callback = (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp);
      };
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  async function syncEvents(plannerData, calendarData, onProgress) {
    const clientId = App.getSetting('gcalClientId');
    if (!clientId) throw new Error('Set your Google Calendar Client ID in Settings.');

    if (!gisInited || !gapiInited) {
      const ok = await init(clientId);
      if (!ok) throw new Error('Failed to initialize Google Calendar API.');
    }

    await requestAuth();

    const days = plannerData.days || {};
    const year = calendarData.year;
    const month = calendarData.month;

    const allTasks = [];
    Object.keys(days).forEach(dateKey => {
      const date = parseInt(dateKey);
      const tasks = days[dateKey] || [];
      tasks.forEach(task => {
        allTasks.push({ date, ...task });
      });
    });

    if (!allTasks.length) throw new Error('No tasks to sync.');

    let synced = 0;
    const total = allTasks.length;

    for (const task of allTasks) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(task.date).padStart(2, '0')}`;

      const event = {
        summary: task.title,
        description: task.category ? `Category: ${task.category}` : '',
      };

      if (task.time) {
        const startDT = `${dateStr}T${task.time}:00`;
        const endH = parseInt(task.time.split(':')[0]) + 1;
        const endDT = `${dateStr}T${String(endH).padStart(2, '0')}:${task.time.split(':')[1]}:00`;
        event.start = { dateTime: startDT, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        event.end = { dateTime: endDT, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      } else {
        event.start = { date: dateStr };
        event.end = { date: dateStr };
      }

      try {
        await gapi.client.calendar.events.insert({ calendarId: 'primary', resource: event });
      } catch (e) {
        console.warn('Failed to insert event:', task.title, e);
      }

      synced++;
      if (onProgress) onProgress(synced, total);
    }

    return synced;
  }

  function isConfigured() {
    return !!App.getSetting('gcalClientId');
  }

  return { init, syncEvents, isConfigured };
})();
