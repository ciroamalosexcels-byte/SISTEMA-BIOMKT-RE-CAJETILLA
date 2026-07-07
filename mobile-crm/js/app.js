(function () {
  var MEDIO_COLORS = {
    WHATSAPP:   '#22c55e',
    LLAMADA:    '#f97316',
    PRESENCIAL: '#eab308',
    INSTAGRAM:  '#ef4444',
    MAIL:       '#3b82f6'
  };

  var state = {
    currentTab: 'CRM',
    leads: [],
    team: [],
    memberMap: {},
    loading: false,
    recognition: null,
    query: '',
    weekOnly: true
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

  // ── Tab navigation ──────────────────────────────────────
  document.querySelectorAll('.nav-item').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.currentTab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      loadLeads();
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

  // ── Load leads ──────────────────────────────────────────
  function loadLeads() {
    state.loading = true;
    renderMain();
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

  // ── Render ──────────────────────────────────────────────
  function renderMain() {
    var main = document.getElementById('main');
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
      loadLeads();
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
      if (lead.tab === state.currentTab) loadLeads();
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

  loadTeam().then(function () { loadLeads(); });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
      console.warn('[BIOMKT sw]', err);
    });
  }
})();
