(function () {
  var MEDIO_COLORS = {
    WHATSAPP:   '#22c55e',
    LLAMADA:    '#f97316',
    PRESENCIAL: '#eab308',
    INSTAGRAM:  '#ef4444',
    MAIL:       '#3b82f6'
  };

  var state = {
    section: 'prospecting',
    currentTab: 'CRM',
    leads: [],
    team: [],
    memberMap: {},
    loading: false,
    recognition: null,
    query: '',
    weekOnly: true,
    selectedClientId: null,
    clientMonthKey: '',
    clientDayModal: null,
    clientDataModalId: null,
    contentEvents: [],
    managementEvents: []
  };

  function todayISO() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  }

  function generateId() {
    return (crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    var dt = iso.split('T');
    var p = dt[0].split('-');
    if (p.length < 3) return iso;
    var date = p[2] + '/' + p[1] + '/' + p[0];
    var time = dt[1] ? ' ' + dt[1].slice(0, 5) : '';
    return date + time;
  }

  function dateForSearch(value) {
    if (!value) return '';
    var datePart = String(value).split('T')[0];
    var parts = datePart.slice(0, 10).split('-');
    if (parts.length !== 3) return String(value);
    return String(Number(parts[2])) + '/' + String(Number(parts[1])) + '/' + parts[0];
  }

  function daysFromToday(isoDate) {
    if (!isoDate) return NaN;
    var today = todayISO();
    var a = new Date(today + 'T00:00:00');
    var b = new Date(isoDate + 'T00:00:00');
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  }

  function currentMonthKey() {
    return todayISO().slice(0, 7);
  }

  function clientCardTitle(lead) {
    return lead.empresa || lead.nombre || 'Sin nombre';
  }

  function clientTaskScore(event) {
    if (event && Object.prototype.hasOwnProperty.call(event, 'scheduledDate')) {
      var status = String((event && event.status) || '').toUpperCase();
      if (status === 'CALENDARIZADO') return 1;
      if (status === 'COMPLETO') return 0.7;
      if (status === 'EDITANDO') return 0.5;
      return 0;
    }
    if (event && Object.prototype.hasOwnProperty.call(event, 'datetime')) {
      return event.done ? 1 : 0;
    }
    return 0;
  }

  function clientProgress(clientId) {
    var content = state.contentEvents.filter(function (ev) { return ev.clientId === clientId; });
    var mgmt = state.managementEvents.filter(function (ev) { return ev.clientId === clientId; });
    var all = content.concat(mgmt);
    if (!all.length) return null;
    var score = all.reduce(function (sum, ev) { return sum + clientTaskScore(ev); }, 0);
    return score / all.length;
  }

  function clientTasksCount(clientId) {
    return state.contentEvents.filter(function (ev) { return ev.clientId === clientId; }).length +
      state.managementEvents.filter(function (ev) { return ev.clientId === clientId; }).length;
  }

  function clientEventsForDay(clientId, date) {
    var content = state.contentEvents.filter(function (ev) {
      return ev.clientId === clientId && String(ev.scheduledDate || '').slice(0, 10) === date;
    }).map(function (ev) {
      return { id: ev.id, kind: 'content', title: ev.title, type: ev.type || '', status: ev.status || '' };
    });
    var management = state.managementEvents.filter(function (ev) {
      return ev.clientId === clientId && String(ev.datetime || '').slice(0, 10) === date;
    }).map(function (ev) {
      return { id: ev.id, kind: 'management', title: ev.title, type: ev.type || '', done: !!ev.done };
    });
    return content.concat(management);
  }

  function calendarGrid(monthKey) {
    var parts = monthKey.split('-').map(Number);
    var year = parts[0];
    var month = parts[1];
    var firstDay = new Date(year, month - 1, 1).getDay();
    var startOffset = firstDay === 0 ? 6 : firstDay - 1;
    var daysInMonth = new Date(year, month, 0).getDate();
    var prevDate = new Date(year, month - 2, 1);
    var prevYear = prevDate.getFullYear();
    var prevMonth = prevDate.getMonth() + 1;
    var daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
    var cells = [];

    for (var i = startOffset - 1; i >= 0; i--) {
      cells.push({ date: prevYear + '-' + String(prevMonth).padStart(2, '0') + '-' + String(daysInPrev - i).padStart(2, '0'), inMonth: false });
    }
    for (var d = 1; d <= daysInMonth; d++) {
      cells.push({ date: year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0'), inMonth: true });
    }
    var nextDate = new Date(year, month, 1);
    var nextYear = nextDate.getFullYear();
    var nextMonth = nextDate.getMonth() + 1;
    var nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ date: nextYear + '-' + String(nextMonth).padStart(2, '0') + '-' + String(nextDay++).padStart(2, '0'), inMonth: false });
    }
    return cells;
  }

  function monthLabel(monthKey) {
    var names = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    var parts = monthKey.split('-').map(Number);
    return names[(parts[1] || 1) - 1] + ' ' + parts[0];
  }

  function shiftMonth(monthKey, delta) {
    var parts = monthKey.split('-').map(Number);
    var d = new Date(parts[0], (parts[1] || 1) - 1 + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function updateShellState() {
    var bottomNav = document.querySelector('.bottom-nav');
    var fabs = document.querySelector('.fabs');
    var headerTitle = document.getElementById('headerTitle');
    var clientMode = state.section === 'clients';

    if (bottomNav) bottomNav.classList.toggle('hidden', clientMode);
    if (fabs) fabs.classList.toggle('hidden', clientMode);
    if (headerTitle) headerTitle.textContent = clientMode ? 'Clientes' : 'Prospección de Biomarketing';
  }

  function closeSectionMenu() {
    var menu = document.getElementById('sectionMenu');
    if (menu) menu.classList.add('hidden');
    var toggle = document.getElementById('sectionToggle');
    if (toggle) toggle.classList.remove('open');
  }

  function openSectionMenu() {
    var menu = document.getElementById('sectionMenu');
    if (menu) menu.classList.remove('hidden');
    var toggle = document.getElementById('sectionToggle');
    if (toggle) toggle.classList.add('open');
  }

  function setSection(section) {
    if (state.section === section) {
      closeSectionMenu();
      renderMain();
      return;
    }
    state.section = section;
    state.selectedClientId = null;
    state.clientDayModal = null;
    state.clientDataModalId = null;
    state.clientMonthKey = currentMonthKey();
    state.query = '';
    closeSectionMenu();
    loadSectionData();
  }

  function memberColor(nombre) {
    if (!nombre) return '#64748b';
    var m = state.memberMap[nombre.trim().toLowerCase()];
    return m ? m.color || '#64748b' : '#64748b';
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase();
  }

  function matchLeadQuery(lead, query) {
    if (!query) return true;
    var haystack = [
      lead.nombre,
      lead.empresa,
      lead.telefono,
      lead.observaciones,
      lead.direccion,
      lead.responsable1,
      lead.responsable2,
      lead.medio,
      lead.rubro,
      lead.servicio,
      dateForSearch(lead.proximoSeguimientoFecha),
      dateForSearch(lead.fechaContacto),
      dateForSearch(lead.meetingDatetime)
    ].map(normalizeText).join(' ');
    return haystack.indexOf(query) !== -1;
  }

  function followUpRank(date) {
    if (!date) return 3;
    var today = todayISO();
    if (date === today) return 0;
    if (date < today) return 1;
    return 2;
  }

  function sortByFollowUpPriority(a, b) {
    var aDate = (a.proximoSeguimientoFecha || '').slice(0, 10);
    var bDate = (b.proximoSeguimientoFecha || '').slice(0, 10);
    var diff = followUpRank(aDate) - followUpRank(bDate);
    if (diff !== 0) return diff;
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  }

  function formatDateLabel(iso) {
    if (!iso) return '—';
    var parts = String(iso).slice(0, 10).split('-');
    if (parts.length !== 3) return iso;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  // ── Dark mode ───────────────────────────────────────────
  var btnDark = document.getElementById('btnDarkMode');
  if (localStorage.getItem('biomkt_crm_dark') === 'true') {
    document.body.classList.add('dark-mode');
  }
  btnDark.addEventListener('click', function () {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('biomkt_crm_dark', document.body.classList.contains('dark-mode') ? 'true' : 'false');
  });

  var sectionToggle = document.getElementById('sectionToggle');
  var sectionMenu = document.getElementById('sectionMenu');
  if (sectionToggle) {
    sectionToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (sectionMenu && sectionMenu.classList.contains('hidden')) openSectionMenu();
      else closeSectionMenu();
    });
  }
  if (sectionMenu) {
    sectionMenu.querySelectorAll('[data-section]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSection(btn.dataset.section === 'clients' ? 'clients' : 'prospecting');
      });
    });
  }
  document.addEventListener('click', function (e) {
    if (!sectionMenu || sectionMenu.classList.contains('hidden')) return;
    if (e.target === sectionToggle || (sectionToggle && sectionToggle.contains(e.target))) return;
    if (sectionMenu.contains(e.target)) return;
    closeSectionMenu();
  });

  // ── Tab navigation ──────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.currentTab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      loadSectionData();
    });
  });

  // ── Load team ───────────────────────────────────────────
  function loadTeam() {
    return window.fetchTeam().then(function (members) {
      state.team = members;
      state.memberMap = {};
      members.forEach(function (m) {
        state.memberMap[m.nombre.trim().toLowerCase()] = m;
      });
      populateResponsableSelects();
    }).catch(function (err) {
      console.error('[BIOMKT team]', err);
    });
  }

  function populateResponsableSelects() {
    var blank = '<option value="">—</option>';
    var opts = state.team.map(function (m) {
      return '<option value="' + escHtml(m.nombre) + '">' + escHtml(m.nombre) + '</option>';
    }).join('');
    document.getElementById('fResponsable1').innerHTML = blank + opts;
    document.getElementById('fResponsable2').innerHTML = blank + opts;
  }

  // ── Load data ───────────────────────────────────────────
  function loadSectionData() {
    state.loading = true;
    renderMain();

    if (state.section === 'clients') {
      Promise.all([
        window.fetchLeads('CLIENTES'),
        window.fetchContentEvents(),
        window.fetchManagementEvents(),
      ]).then(function (results) {
        state.leads = results[0] || [];
        state.contentEvents = results[1] || [];
        state.managementEvents = results[2] || [];
        if (!state.clientMonthKey) state.clientMonthKey = currentMonthKey();
        state.loading = false;
        renderMain();
      }).catch(function (err) {
        state.leads = [];
        state.contentEvents = [];
        state.managementEvents = [];
        state.loading = false;
        renderMain();
        console.error('[BIOMKT clients]', err);
      });
      return;
    }

    window.fetchLeads(state.currentTab).then(function (data) {
      state.leads = data;
      state.loading = false;
      renderMain();
    }).catch(function (err) {
      state.leads = [];
      state.loading = false;
      renderMain();
      console.error('[BIOMKT]', err);
    });
  }

  function getFilteredClientRows() {
    var query = normalizeText(state.query.trim());
    var rows = state.leads.filter(function (lead) {
      return lead.activo !== false;
    }).sort(function (a, b) {
      var ao = a.clientOrder == null ? 999999 : a.clientOrder;
      var bo = b.clientOrder == null ? 999999 : b.clientOrder;
      if (ao !== bo) return ao - bo;
      return clientCardTitle(a).localeCompare(clientCardTitle(b));
    });

    if (!query) return rows;
    return rows.filter(function (lead) {
      var haystack = [
        lead.nombre,
        lead.empresa,
        lead.telefono,
        lead.observaciones,
        lead.direccion,
        lead.responsable1,
        lead.responsable2,
        lead.medio,
        lead.rubro,
        lead.servicio,
      ].map(normalizeText).join(' ');
      return haystack.indexOf(query) !== -1;
    });
  }

  function openClientDetail(clientId) {
    state.selectedClientId = clientId;
    state.clientDayModal = null;
    state.clientDataModalId = null;
    state.clientMonthKey = state.clientMonthKey || currentMonthKey();
    renderMain();
  }

  function closeClientDetail() {
    state.selectedClientId = null;
    state.clientDayModal = null;
    state.clientDataModalId = null;
    renderMain();
  }

  function openClientDayModal(mode, date) {
    state.clientDayModal = { mode: mode, date: date || todayISO() };
    state.clientDataModalId = null;
    renderMain();
  }

  function closeClientDayModal() {
    state.clientDayModal = null;
    renderMain();
  }

  function openClientDataModal(clientId) {
    state.clientDataModalId = clientId;
    state.clientDayModal = null;
    renderMain();
  }

  function closeClientDataModal() {
    state.clientDataModalId = null;
    renderMain();
  }

  function renderClientsList(main) {
    var rows = getFilteredClientRows();
    var toolbar = '<div class="toolbar"><div class="search-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input class="search-input" id="searchInput" type="search" placeholder="Buscar clientes por nombre, empresa, teléfono, responsable, medio, rubro o servicio" value="' + escHtml(state.query) + '" autocomplete="off"></div></div>';

    if (!rows.length) {
      main.innerHTML = toolbar + '<div class="empty">' + (state.leads.length ? 'Sin coincidencias' : 'Sin clientes cargados') + '</div>';
      bindSearchInput();
      return;
    }

    main.innerHTML = toolbar + '<div class="clients-grid">' + rows.map(function (lead) {
      var progress = clientProgress(lead.id);
      var pct = progress === null ? 0 : Math.round(progress * 100);
      var tasks = clientTasksCount(lead.id);
      var title = clientCardTitle(lead);
      var service = lead.servicio || '—';
      var responsables = [lead.responsable1, lead.responsable2].filter(Boolean);
      return '<div class="client-card" data-client-id="' + escHtml(lead.id) + '">' +
        '<div class="client-card-main">' +
          '<div class="client-card-text">' +
            '<h3>' + escHtml(title) + '</h3>' +
            '<div class="client-card-service">' + escHtml(service) + '</div>' +
            '<div class="client-card-meta">' + escHtml(tasks + ' tareas') + '</div>' +
            (responsables.length ? '<div class="client-pill-row">' + responsables.map(function (resp) { return '<span class="client-pill">' + escHtml(resp) + '</span>'; }).join('') + '</div>' : '') +
          '</div>' +
          '<div class="client-progress-circle" style="--pct:' + pct + '"><span>' + (progress === null ? '—' : pct + '%') + '</span></div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    main.querySelectorAll('.client-card').forEach(function (card) {
      card.addEventListener('click', function () {
        openClientDetail(card.dataset.clientId);
      });
    });
    bindSearchInput();
  }

  function renderClientDayLabel(date, today) {
    if (date === today) return 'Hoy';
    return formatDateLabel(date);
  }

  function getClientEventsForMode(clientId, date, mode) {
    if (mode === 'management') {
      return state.managementEvents.filter(function (ev) {
        return ev.clientId === clientId && String(ev.datetime || '').slice(0, 10) === date;
      });
    }
    return state.contentEvents.filter(function (ev) {
      return ev.clientId === clientId && String(ev.scheduledDate || '').slice(0, 10) === date;
    });
  }

  function renderClientDayModal(client) {
    var modal = state.clientDayModal;
    if (!modal) return '';
    var mode = modal.mode === 'management' ? 'management' : 'content';
    var isContent = mode === 'content';
    var date = modal.date;
    var events = getClientEventsForMode(client.id, date, mode);
    var title = isContent ? 'Calendario de contenido' : 'Calendario de gestión';
    var subtitle = formatDateLabel(date) + ' · ' + clientCardTitle(client);
    var existing = events.map(function (ev) {
      var time = String(ev.scheduledDate || ev.datetime || '').slice(11, 16);
      var label = isContent ? (ev.type || ev.title || 'Contenido') : (ev.type || ev.title || 'Gestión');
      var meta = isContent ? [time, ev.status || 'SIN EDITAR'].filter(Boolean).join(' · ') : [time, ev.done ? 'Completado' : 'Pendiente'].filter(Boolean).join(' · ');
      var details = isContent ? [ev.objective, ev.phrase, ev.copy, ev.notes].filter(Boolean).join(' · ') : [ev.notes].filter(Boolean).join(' · ');
      return '<div class="event-row' + (ev.done ? ' event-done-row' : '') + '">' +
        '<div class="event-row-dot"></div>' +
        '<div class="event-row-main"><div class="event-row-title"><span class="event-row-type">' + escHtml(label) + '</span><span class="event-row-meta-inline">' + escHtml(meta || '—') + '</span></div><div class="event-row-meta">' + escHtml(details || '—') + '</div></div>' +
        '<div class="event-row-actions"><button class="event-check-v11' + (ev.done ? ' checked' : '') + '" type="button" data-toggle-event="' + escHtml(ev.id) + '">' + (ev.done ? '✓' : '') + '</button><button class="event-delete-v11" type="button" data-delete-event="' + escHtml(ev.id) + '">×</button></div>' +
      '</div>';
    }).join('');

    var body = isContent
      ? '<div class="content-form-grid"><label class="full"><span class="filter-label">Hora</span><input id="ce_time" class="field" type="time"></label><label class="full"><span class="filter-label">Tipo</span><select id="ce_type" class="field"><option>HISTORIA</option><option>CARRUSEL</option><option>REEL</option><option>PLACA</option></select></label><label class="full"><span class="filter-label">Título</span><input id="ce_title" class="field" placeholder="Título del contenido"></label><label><span class="filter-label">Encargado</span><select id="ce_assignee" class="field"><option value=""></option>' + state.team.map(function (m) { return '<option value="' + escHtml(m.nombre) + '">' + escHtml(m.nombre) + '</option>'; }).join('') + '</select></label><label><span class="filter-label">Estado</span><select id="ce_status" class="field"><option>SIN EDITAR</option><option>EDITANDO</option><option>COMPLETO</option><option>CALENDARIZADO</option></select></label><label class="full"><span class="filter-label">Objetivo</span><input id="ce_objective" class="field"></label><label class="full"><span class="filter-label">Frase y/o idea</span><textarea id="ce_phrase" class="textarea"></textarea></label><label class="full"><span class="filter-label">Copy</span><textarea id="ce_copy" class="textarea"></textarea></label><label class="full"><span class="filter-label">Archivo</span><input id="ce_file" class="field"></label><label class="full"><span class="filter-label">Comentarios</span><textarea id="ce_comments" class="textarea"></textarea></label></div>'
      : '<div class="content-form-grid"><label class="full"><span class="filter-label">Hora</span><input id="ge_time" class="field" type="time"></label><label class="full"><span class="filter-label">Tipo</span><select id="ge_type" class="field"><option>Acompañamiento</option><option>Llamada</option><option>Visita</option><option>Cobro</option><option>Reunión</option><option>Producción</option><option>Pago</option></select></label><label class="full"><span class="filter-label">Motivo / detalle</span><textarea id="ge_reason" class="textarea"></textarea></label></div>';

    return '<div class="modal-backdrop open client-day-modal" id="clientDayModalTemp"><div class="modal modal-client-day"><div class="modal-header"><div><h2 class="modal-title">' + title + '</h2><div class="modal-subtitle">' + escHtml(subtitle) + '</div></div><button class="icon-btn" type="button" id="clientDayClose">✕</button></div><div class="modal-body modal-day-body"><div><h3 class="day-section-title">Cargado previamente</h3><div class="event-list">' + (existing || '<div class="fake-field">No hay eventos cargados para este día.</div>') + '</div></div><div><h3 class="day-section-title">Agregar al día</h3>' + body + '</div></div><div class="modal-footer"><button class="btn btn-outline" type="button" id="clientDayCancel">Cancelar</button><button class="btn btn-amber" type="button" id="clientDayAdd">Agregar</button></div></div></div>';
  }

  function renderClientDataModal(client) {
    if (!client) return '';
    return '<div class="modal-backdrop open client-data-modal" id="clientDataModalTemp"><div class="modal modal-client-data"><div class="modal-header"><div><h2 class="modal-title">Datos del cliente</h2><div class="modal-subtitle">' + escHtml(clientCardTitle(client)) + '</div></div><button class="icon-btn" type="button" id="clientDataClose">✕</button></div><div class="modal-body"><div class="client-data-grid"><label><span class="filter-label">Nombre</span><input id="cd_nombre" class="field" value="' + escHtml(client.nombre || '') + '"></label><label><span class="filter-label">Empresa</span><input id="cd_empresa" class="field" value="' + escHtml(client.empresa || '') + '"></label><label><span class="filter-label">Teléfono</span><input id="cd_telefono" class="field" value="' + escHtml(client.telefono || '') + '"></label><label><span class="filter-label">Dirección</span><input id="cd_direccion" class="field" value="' + escHtml(client.direccion || '') + '"></label><label><span class="filter-label">Servicio</span><input id="cd_servicio" class="field" value="' + escHtml(client.servicio || '') + '"></label><label><span class="filter-label">Responsable 1</span><select id="cd_responsable1" class="field"><option value=""></option>' + state.team.map(function (m) { return '<option value="' + escHtml(m.nombre) + '"' + (client.responsable1 === m.nombre ? ' selected' : '') + '>' + escHtml(m.nombre) + '</option>'; }).join('') + '</select></label><label><span class="filter-label">Responsable 2</span><select id="cd_responsable2" class="field"><option value=""></option>' + state.team.map(function (m) { return '<option value="' + escHtml(m.nombre) + '"' + (client.responsable2 === m.nombre ? ' selected' : '') + '>' + escHtml(m.nombre) + '</option>'; }).join('') + '</select></label><label class="full"><span class="filter-label">Observaciones</span><textarea id="cd_observaciones" class="textarea">' + escHtml(client.observaciones || '') + '</textarea></label></div></div><div class="modal-footer"><button class="btn btn-outline" type="button" id="clientDataCancel">Cancelar</button><button class="btn btn-amber" type="button" id="clientDataSave">Guardar</button></div></div></div>';
  }

  function renderClientDetail(main) {
    var client = state.leads.find(function (lead) { return lead.id === state.selectedClientId; });
    if (!client) {
      closeClientDetail();
      return;
    }

    var clientRows = getFilteredClientRows();
    var currentIndex = clientRows.findIndex(function (row) { return row.id === client.id; });

    var monthKey = state.clientMonthKey || currentMonthKey();
    var today = todayISO();
    var grid = calendarGrid(monthKey);
    var dayMap = {};
    state.contentEvents.concat(state.managementEvents).forEach(function (ev) {
      var date = String(ev.scheduledDate || ev.datetime || '').slice(0, 10);
      if (!date) return;
      if (!dayMap[date]) dayMap[date] = [];
      dayMap[date].push(ev);
    });

    var header = '<div class="client-detail-head"><div class="client-head-left"><button class="client-nav-btn" type="button" id="clientPrevBtn">‹</button><button class="client-nav-btn" type="button" id="clientNextBtn">›</button><div class="client-head-emoji">😊</div><div class="client-head-copy"><h2 class="client-detail-title">' + escHtml(clientCardTitle(client)) + '</h2><div class="client-detail-sub">' + escHtml(client.servicio || 'CONTENIDO AUDIOVISUAL') + '</div></div><span class="client-status-pill">Activo</span></div><div class="client-head-right"><button class="client-nav-btn" type="button" id="clientMonthPrev">‹</button><div class="client-month-pill">' + escHtml(monthLabel(monthKey)) + '</div><button class="client-nav-btn" type="button" id="clientMonthNext">›</button><button class="btn btn-amber btn-sm" type="button" id="clientDataBtn">Datos del cliente</button><button class="btn btn-outline btn-sm" type="button" id="clientBackBtn">Volver</button></div></div>';

    var calendar = '<div class="calendar-card-v11"><div class="calendar-card-header-v11"><h3>CALENDARIO DE CONTENIDO</h3><div class="calendar-month-controls-v11"><button class="calendar-mini-btn" type="button" id="monthBack">‹</button><div class="calendar-month-label-v11">' + escHtml(monthLabel(monthKey)) + '</div><button class="calendar-mini-btn" type="button" id="monthNext">›</button><button class="month-current-btn" type="button" id="monthCurrent">MES ACTUAL</button></div></div><div class="day-name-row-v11">' + ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map(function (d) { return '<div class="day-name-v11">' + d + '</div>'; }).join('') + '</div><div class="client-calendar-grid">' + grid.map(function (cell) {
      var chips = cell.inMonth ? (dayMap[cell.date] || []).slice(0, 6).map(function (ev) {
        var label = ev.type || ev.title || 'Evento';
        var time = String(ev.scheduledDate || ev.datetime || '').slice(11, 16);
        var cls = String(ev.done ? ' done' : '') + (Object.prototype.hasOwnProperty.call(ev, 'scheduledDate') ? ' content' : ' management');
        return '<div class="event-chip-v11' + cls + '"><span class="event-chip-dot"></span><span>' + escHtml((time ? time + ' · ' : '') + label) + '</span></div>';
      }).join('') : '';
      return '<button type="button" class="day-v11' + (cell.date === today ? ' today' : '') + (cell.inMonth ? ' clickable' : ' empty') + '" data-date="' + escHtml(cell.date) + '"' + (cell.inMonth ? '' : ' disabled') + '><div class="day-number-v11">' + Number(cell.date.slice(8)) + '</div><div class="day-events-v11">' + chips + '</div></button>';
    }).join('') + '</div></div>';

    var actions = '<div class="client-action-row"><button class="btn btn-amber" type="button" data-open-day="content">Agregar contenido</button><button class="btn btn-outline" type="button" data-open-day="management">Agregar gestión</button></div>';

    var clientContentRows = state.contentEvents
      .filter(function (ev) { return ev.clientId === client.id; })
      .sort(function (a, b) {
        var ad = String(a.scheduledDate || '');
        var bd = String(b.scheduledDate || '');
        return bd.localeCompare(ad);
      });

    var contentPanel = '<div class="content-planning-panel mobile-client-panel"><div class="table-top"><div class="panel-title-row"><h2 class="panel-title">Planificación de contenidos</h2><div class="panel-subtitle">Lista de contenidos del cliente</div></div></div><div class="table-wrap"><table class="client-content-table"><thead><tr><th>Fecha</th><th>Hora</th><th>Encargado</th><th>Tipo</th><th>Estado</th><th>Objetivo</th><th>Copy</th></tr></thead><tbody>' + (clientContentRows.length ? clientContentRows.map(function (ev) {
      var date = String(ev.scheduledDate || '').slice(0, 10);
      var time = String(ev.scheduledDate || '').slice(11, 16);
      return '<tr><td>' + escHtml(formatDateLabel(date)) + '</td><td>' + escHtml(time || '—') + '</td><td>' + escHtml(ev.assignee || '—') + '</td><td>' + escHtml(ev.type || '—') + '</td><td>' + escHtml(ev.status || 'SIN EDITAR') + '</td><td>' + escHtml(ev.objective || ev.objetivo || '—') + '</td><td>' + escHtml(ev.copy || '—') + '</td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="empty">Todavía no hay contenidos cargados.</div></td></tr>') + '</tbody></table></div></div>';

    var modals = '';
    if (state.clientDayModal && state.clientDataModalId !== client.id) modals += renderClientDayModal(client);
    if (state.clientDataModalId === client.id) modals += renderClientDataModal(client);

    main.innerHTML = '<div class="client-detail-page">' + header + '<div class="client-detail-body">' + calendar + actions + contentPanel + '</div></div>' + modals;

    var prevBtn = document.getElementById('clientPrevBtn');
    var nextBtn = document.getElementById('clientNextBtn');
    var monthBack = document.getElementById('monthBack');
    var monthNext = document.getElementById('monthNext');
    var monthCurrent = document.getElementById('monthCurrent');
    var backBtn = document.getElementById('clientBackBtn');
    var dataBtn = document.getElementById('clientDataBtn');

    if (backBtn) backBtn.addEventListener('click', closeClientDetail);
    if (dataBtn) dataBtn.addEventListener('click', function () { openClientDataModal(client.id); });
    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (currentIndex > 0) state.selectedClientId = clientRows[currentIndex - 1].id;
      renderMain();
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (currentIndex >= 0 && currentIndex < clientRows.length - 1) state.selectedClientId = clientRows[currentIndex + 1].id;
      renderMain();
    });
    if (monthBack) monthBack.addEventListener('click', function () { state.clientMonthKey = shiftMonth(monthKey, -1); renderMain(); });
    if (monthNext) monthNext.addEventListener('click', function () { state.clientMonthKey = shiftMonth(monthKey, 1); renderMain(); });
    if (monthCurrent) monthCurrent.addEventListener('click', function () { state.clientMonthKey = currentMonthKey(); renderMain(); });

    main.querySelectorAll('.day-v11.clickable').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openClientDayModal('content', btn.dataset.date);
      });
    });

    main.querySelectorAll('[data-open-day]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openClientDayModal(btn.dataset.openDay, today);
      });
    });

    if (state.clientDayModal) {
      var dayClose = document.getElementById('clientDayClose');
      var dayCancel = document.getElementById('clientDayCancel');
      var dayAdd = document.getElementById('clientDayAdd');
      if (dayClose) dayClose.addEventListener('click', closeClientDayModal);
      if (dayCancel) dayCancel.addEventListener('click', closeClientDayModal);
      if (dayAdd) {
        dayAdd.addEventListener('click', function () {
          var modal = state.clientDayModal;
          if (!modal) return;
          var clientId = client.id;
          var date = modal.date;
          if (modal.mode === 'management') {
            window.insertManagementEvent({
              id: generateId(),
              clientId: clientId,
              title: document.getElementById('ge_type').value || 'Gestión',
              type: document.getElementById('ge_type').value,
              datetime: date + 'T' + (document.getElementById('ge_time').value || '12:00'),
              done: false,
              notes: document.getElementById('ge_reason').value || ''
            }).then(function () { closeClientDayModal(); loadSectionData(); }).catch(function (err) { alert('Error al guardar gestión: ' + (err.message || JSON.stringify(err))); });
          } else {
            window.insertContentEvent({
              id: generateId(),
              clientId: clientId,
              title: document.getElementById('ce_title').value || 'Sin título',
              type: document.getElementById('ce_type').value,
              status: document.getElementById('ce_status').value,
              scheduledDate: date + 'T' + (document.getElementById('ce_time').value || '12:00'),
              done: document.getElementById('ce_status').value === 'COMPLETO',
              order: state.contentEvents.filter(function (ev) { return ev.clientId === clientId; }).length,
              assignee: document.getElementById('ce_assignee').value || '',
              objetivo: document.getElementById('ce_objective').value || '',
              frase: document.getElementById('ce_phrase').value || '',
              copy: document.getElementById('ce_copy').value || '',
              archivo: document.getElementById('ce_file').value || '',
              notes: document.getElementById('ce_comments').value || ''
            }).then(function () { closeClientDayModal(); loadSectionData(); }).catch(function (err) { alert('Error al guardar contenido: ' + (err.message || JSON.stringify(err))); });
          }
        });
      }

      main.querySelectorAll('[data-toggle-event]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = btn.dataset.toggleEvent;
        var modal = state.clientDayModal;
        if (!modal) return;
        var list = modal.mode === 'management' ? state.managementEvents : state.contentEvents;
        var ev = list.find(function (x) { return String(x.id) === String(id); });
        if (!ev) return;
        var next = !ev.done;
        ev.done = next;
        if (modal.mode === 'content') {
          ev.status = next ? 'COMPLETO' : 'SIN EDITAR';
          window.updateContentEvent(ev.id, { done: next, status: ev.status }).then(function () { loadSectionData(); });
        } else {
          window.updateManagementEvent(ev.id, { done: next }).then(function () { loadSectionData(); });
        }
        });
      });

      main.querySelectorAll('[data-delete-event]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var id = btn.dataset.deleteEvent;
          var modal = state.clientDayModal;
          if (!modal) return;
          var promise = modal.mode === 'management' ? window.deleteManagementEvent(id) : window.deleteContentEvent(id);
          promise.then(function () { closeClientDayModal(); loadSectionData(); }).catch(function (err) { alert('Error al borrar: ' + (err.message || JSON.stringify(err))); });
        });
      });
    }

    if (state.clientDataModalId === client.id) {
      var dataClose = document.getElementById('clientDataClose');
      var dataCancel = document.getElementById('clientDataCancel');
      var dataSave = document.getElementById('clientDataSave');
      if (dataClose) dataClose.addEventListener('click', closeClientDataModal);
      if (dataCancel) dataCancel.addEventListener('click', closeClientDataModal);
      if (dataSave) {
        dataSave.addEventListener('click', function () {
          var patch = {
            nombre: document.getElementById('cd_nombre').value || '',
            empresa: document.getElementById('cd_empresa').value || '',
            telefono: document.getElementById('cd_telefono').value || '',
            direccion: document.getElementById('cd_direccion').value || '',
            servicio: document.getElementById('cd_servicio').value || '',
            responsable1: document.getElementById('cd_responsable1').value || '',
            responsable2: document.getElementById('cd_responsable2').value || '',
            observaciones: document.getElementById('cd_observaciones').value || ''
          };
          window.updateLead(client.id, patch).then(function () { closeClientDataModal(); loadSectionData(); }).catch(function (err) { alert('Error al guardar datos: ' + (err.message || JSON.stringify(err))); });
        });
      }
    }
  }

  // ── Render ──────────────────────────────────────────────
  function renderMain() {
    var main = document.getElementById('main');
    updateShellState();

    if (state.section === 'clients') {
      if (state.loading) {
        main.innerHTML = '<div class="loading">Cargando...</div>';
        return;
      }
      if (state.selectedClientId) renderClientDetail(main);
      else renderClientsList(main);
      return;
    }

    var query = normalizeText(state.query.trim());
    var leads = state.leads.filter(function (lead) {
      return matchLeadQuery(lead, query);
    });

    if (state.currentTab === 'SEGUIMIENTO') {
      if (state.weekOnly !== false) {
        leads = leads.filter(function (lead) {
          var days = daysFromToday((lead.proximoSeguimientoFecha || '').slice(0, 10));
          return !isNaN(days) && days >= -3 && days <= 3;
        });
      }
      leads = leads.slice().sort(sortByFollowUpPriority);
    }

    if (state.loading) {
      main.innerHTML = '<div class="loading">Cargando...</div>';
      return;
    }
    var toolbar = '<div class="toolbar"><div class="toolbar-actions"><div class="search-wrap"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input class="search-input" id="searchInput" type="search" placeholder="Buscar por nombre, empresa, teléfono, observaciones, dirección, responsable, medio, rubro, servicio o fecha" value="' + escHtml(state.query) + '" autocomplete="off"></div>' + (state.currentTab === 'SEGUIMIENTO' ? '<button class="week-toggle' + (state.weekOnly !== false ? ' active' : '') + '" id="weekToggleBtn" type="button" aria-pressed="' + (state.weekOnly !== false ? 'true' : 'false') + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path></svg><span>Esta semana</span></button>' : '') + '</div></div>';
    if (!leads.length) {
      main.innerHTML = toolbar + '<div class="empty">' + (state.leads.length ? 'Sin coincidencias' : 'Sin registros en esta sección') + '</div>';
      bindSearchInput();
      bindWeekToggle();
      return;
    }
    main.innerHTML = toolbar + leads.map(function (lead) {
      var medioColor = MEDIO_COLORS[lead.medio] || '#94a3b8';
      var medioBadge = lead.medio
        ? '<span class="badge-medio" style="background:' + medioColor + '22;color:' + medioColor + '">' + escHtml(lead.medio) + '</span>'
        : '';

      var badges = medioBadge;
      if (lead.responsable1) {
        var c1 = memberColor(lead.responsable1);
        badges += '<span class="badge-resp" style="background:' + c1 + '22;color:' + c1 + ';border-color:' + c1 + '44">' + escHtml(lead.responsable1) + '</span>';
      }
      if (lead.responsable2) {
        var c2 = memberColor(lead.responsable2);
        badges += '<span class="badge-resp" style="background:' + c2 + '22;color:' + c2 + ';border-color:' + c2 + '44">' + escHtml(lead.responsable2) + '</span>';
      }

      var phoneIcon = lead.telefono
        ? '<a href="tel:' + escHtml(lead.telefono) + '" class="lead-phone-btn" onclick="event.stopPropagation()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9A16 16 0 0 0 15.1 16.1l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.04z"/></svg>' +
          '</a>'
        : '';

      return '<div class="lead-card" data-id="' + escHtml(lead.id) + '">' +
        '<div class="lead-top">' +
          '<span class="lead-empresa">' + escHtml(lead.empresa || '—') + '</span>' +
          phoneIcon +
        '</div>' +
        '<div class="lead-nombre">' + escHtml(lead.nombre || '') + '</div>' +
        (lead.observaciones ? '<div class="lead-obs">' + escHtml(lead.observaciones.slice(0, 80)) + (lead.observaciones.length > 80 ? '…' : '') + '</div>' : '') +
        '<div class="lead-badges-row">' + badges + '</div>' +
        '<div class="lead-separator"></div>' +
        '<div class="lead-date">' + escHtml(state.currentTab === 'SEGUIMIENTO' ? formatDateLabel(lead.proximoSeguimientoFecha) : formatDate(lead.fechaContacto)) + '</div>' +
        '</div>';
    }).join('');

    bindSearchInput();
    bindWeekToggle();

    main.querySelectorAll('.lead-card').forEach(function (card) {
      var longPressTimer = null;
      var longPressed = false;

      card.addEventListener('touchstart', function () {
        longPressed = false;
        longPressTimer = setTimeout(function () {
          longPressed = true;
          var id = card.dataset.id;
          var lead = state.leads.find(function (l) { return l.id === id; });
          if (lead) showMoveMenu(lead);
        }, 600);
      }, { passive: true });

      card.addEventListener('touchend', function () { clearTimeout(longPressTimer); });
      card.addEventListener('touchmove', function () { clearTimeout(longPressTimer); });

      card.addEventListener('click', function () {
        if (longPressed) { longPressed = false; return; }
        var id = card.dataset.id;
        var lead = state.leads.find(function (l) { return l.id === id; });
        if (lead) openModal(lead);
      });
    });
  }

  function bindSearchInput() {
    var searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    searchInput.addEventListener('input', function (e) {
      state.query = e.target.value || '';
      renderMain();
    });
  }

  function bindWeekToggle() {
    var btn = document.getElementById('weekToggleBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      state.weekOnly = !state.weekOnly;
      renderMain();
    });
  }

  // ── Mover stage ─────────────────────────────────────────
  var STAGE_LABELS = {
    CRM:         'Prospecto',
    REUNION_1:   'Reunión 1',
    REUNION_2:   'Reunión 2',
    SEGUIMIENTO: 'Seguimiento'
  };
  var NEEDS_DATETIME = ['REUNION_1', 'REUNION_2', 'SEGUIMIENTO'];

  var moveMenuOverlay = document.getElementById('moveMenuOverlay');
  var moveMenuOptions = document.getElementById('moveMenuOptions');
  document.getElementById('moveMenuClose').addEventListener('click', function () {
    moveMenuOverlay.classList.add('hidden');
  });
  moveMenuOverlay.addEventListener('click', function (e) {
    if (e.target === moveMenuOverlay) moveMenuOverlay.classList.add('hidden');
  });

  var pendingMove = null;
  var datetimeOverlay = document.getElementById('datetimeOverlay');
  var datetimeTitle   = document.getElementById('datetimeTitle');
  document.getElementById('datetimeClose').addEventListener('click', function () {
    datetimeOverlay.classList.add('hidden');
    pendingMove = null;
  });
  datetimeOverlay.addEventListener('click', function (e) {
    if (e.target === datetimeOverlay) { datetimeOverlay.classList.add('hidden'); pendingMove = null; }
  });

  document.getElementById('dtConfirm').addEventListener('click', function () {
    if (!pendingMove) return;
    var date = document.getElementById('dtDate').value;
    var time = document.getElementById('dtTime').value;
    var datetime = date + (time ? 'T' + time : 'T12:00');
    var updates = { tab: pendingMove.targetTab };
    if (pendingMove.targetTab === 'SEGUIMIENTO') {
      updates.proximo_seguimiento_fecha = date;
    } else {
      updates.meeting_datetime = datetime;
    }
    executeMoveWithUpdates(pendingMove.lead, updates);
    datetimeOverlay.classList.add('hidden');
    pendingMove = null;
  });

  function showMoveMenu(lead) {
    moveMenuOptions.innerHTML = Object.keys(STAGE_LABELS).map(function (tab) {
      var isCurrent = tab === lead.tab;
      return '<button class="move-option' + (isCurrent ? ' move-option-current' : '') + '" data-tab="' + tab + '">' +
        STAGE_LABELS[tab] +
        (isCurrent ? ' <span class="move-current-label">actual</span>' : '') +
        '</button>';
    }).join('');

    moveMenuOptions.querySelectorAll('.move-option:not(.move-option-current)').forEach(function (btn) {
      btn.addEventListener('click', function () {
        moveMenuOverlay.classList.add('hidden');
        var targetTab = btn.dataset.tab;
        if (NEEDS_DATETIME.indexOf(targetTab) !== -1) {
          pendingMove = { lead: lead, targetTab: targetTab };
          datetimeTitle.textContent = STAGE_LABELS[targetTab] + ' — fecha y hora';
          document.getElementById('dtDate').value = todayISO();
          document.getElementById('dtTime').value = '';
          document.getElementById('dtTimeGroup').style.display = targetTab === 'SEGUIMIENTO' ? 'none' : '';
          datetimeOverlay.classList.remove('hidden');
        } else {
          executeMoveWithUpdates(lead, { tab: targetTab });
        }
      });
    });

    moveMenuOverlay.classList.remove('hidden');
  }

  function executeMoveWithUpdates(lead, updates) {
    var btn = document.getElementById('dtConfirm');
    if (btn) { btn.disabled = true; btn.textContent = 'Moviendo...'; }
    window.updateLead(lead.id, updates).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar y mover'; }
      loadSectionData();
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar y mover'; }
      alert('Error al mover: ' + (err.message || JSON.stringify(err)));
    });
  }

  // ── Modal ───────────────────────────────────────────────
  var overlay   = document.getElementById('modalOverlay');
  var form      = document.getElementById('leadForm');
  var submitBtn = form.querySelector('.btn-submit');

  document.getElementById('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

  function openModal(prefill) {
    prefill = prefill || {};
    document.getElementById('fNombre').value        = prefill.nombre        || '';
    document.getElementById('fEmpresa').value       = prefill.empresa       || '';
    document.getElementById('fTelefono').value      = prefill.telefono      || '';
    document.getElementById('fMedio').value         = prefill.medio         || '';
    document.getElementById('fResponsable1').value  = prefill.responsable1  || '';
    document.getElementById('fResponsable2').value  = prefill.responsable2  || '';
    document.getElementById('fEmail').value         = prefill.email         || '';
    document.getElementById('fInstagram').value     = prefill.instagram     || '';
    document.getElementById('fRubro').value         = prefill.rubro         || '';
    document.getElementById('fServicio').value      = prefill.servicio      || '';
    document.getElementById('fDireccion').value     = prefill.direccion     || '';
    document.getElementById('fObservaciones').value = prefill.observaciones || '';
    document.getElementById('fTab').value           = prefill.tab || state.currentTab;
    overlay.classList.remove('hidden');
    document.getElementById('fNombre').focus();
  }

  function closeModal() {
    overlay.classList.add('hidden');
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    var lead = {
      id:            generateId(),
      nombre:        document.getElementById('fNombre').value.trim(),
      empresa:       document.getElementById('fEmpresa').value.trim(),
      telefono:      document.getElementById('fTelefono').value.trim(),
      medio:         document.getElementById('fMedio').value,
      responsable1:  document.getElementById('fResponsable1').value,
      responsable2:  document.getElementById('fResponsable2').value,
      email:         document.getElementById('fEmail').value.trim(),
      instagram:     document.getElementById('fInstagram').value.trim(),
      rubro:         document.getElementById('fRubro').value.trim(),
      servicio:      document.getElementById('fServicio').value.trim(),
      direccion:     document.getElementById('fDireccion').value.trim(),
      observaciones: document.getElementById('fObservaciones').value.trim(),
      tab:           document.getElementById('fTab').value,
      fechaContacto: todayISO(),
      empresaBio:    'BIOMARKETING'
    };

    window.insertLead(lead).then(function () {
      closeModal();
      if (lead.tab === state.currentTab) loadSectionData();
    }).catch(function (err) {
      alert('Error al guardar: ' + (err.message || JSON.stringify(err)));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar';
    });
  });

  // ── FABs ────────────────────────────────────────────────
  document.getElementById('fabManual').addEventListener('click', function () {
    openModal();
  });

  var voiceOverlay    = document.getElementById('voiceOverlay');
  var voiceTranscript = document.getElementById('voiceTranscript');
  var fabVoice        = document.getElementById('fabVoice');

  document.getElementById('btnStopVoice').addEventListener('click', stopVoice);

  function stopVoice() {
    if (state.recognition) {
      if (state.recognition._cancel) state.recognition._cancel();
      state.recognition.stop();
      state.recognition = null;
    }
    fabVoice.classList.remove('recording');
    voiceOverlay.classList.add('hidden');
    voiceTranscript.textContent = '';
  }

  fabVoice.addEventListener('click', function () {
    if (state.recognition) return;
    voiceOverlay.classList.remove('hidden');
    voiceTranscript.textContent = '';
    fabVoice.classList.add('recording');

    state.recognition = window.startVoice(
      function onResult(parsed) {
        stopVoice();
        openModal(parsed);
      },
      function onTranscript(text) {
        voiceTranscript.textContent = text;
      },
      function onError(errType) {
        stopVoice();
        var msg = errType === 'not-allowed'
          ? 'Permiso de micrófono denegado'
          : 'Error de reconocimiento. Intentá de nuevo.';
        alert(msg);
      }
    );
  });

  // ── Init ────────────────────────────────────────────────
  if (!document.querySelector('.nav-item.active')) {
    var first = document.querySelector('.nav-item[data-tab="CRM"]');
    if (first) first.classList.add('active');
  }

  loadTeam().then(function () { loadSectionData(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
      console.warn('[BIOMKT sw]', err);
    });
  }
})();
