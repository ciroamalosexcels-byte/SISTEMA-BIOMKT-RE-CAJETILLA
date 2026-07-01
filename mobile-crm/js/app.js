(function () {
  var MEDIO_COLORS = {
    WHATSAPP:   '#22c55e',
    LLAMADA:    '#3b82f6',
    PRESENCIAL: '#a855f7',
    INSTAGRAM:  '#ec4899',
    MAIL:       '#f6bf26'
  };

  var state = {
    currentTab: 'CRM',
    leads: [],
    team: [],
    memberMap: {},
    loading: false,
    recognition: null
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
    var p = iso.split('-');
    return p.length < 3 ? iso : p[2] + '/' + p[1] + '/' + p[0];
  }

  function memberColor(nombre) {
    if (!nombre) return '#64748b';
    var m = state.memberMap[nombre.trim().toLowerCase()];
    return m ? m.color || '#64748b' : '#64748b';
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
    if (state.loading) {
      main.innerHTML = '<div class="loading">Cargando...</div>';
      return;
    }
    if (!state.leads.length) {
      main.innerHTML = '<div class="empty">Sin registros en esta sección</div>';
      return;
    }
    main.innerHTML = state.leads.map(function (lead) {
      var medioColor = MEDIO_COLORS[lead.medio] || '#94a3b8';
      var medioBadge = lead.medio
        ? '<span class="badge-medio" style="background:' + medioColor + '22;color:' + medioColor + '">' + escHtml(lead.medio) + '</span>'
        : '';

      var badges = '';
      if (lead.responsable1) {
        var c1 = memberColor(lead.responsable1);
        badges += '<span class="badge-resp" style="background:' + c1 + '22;color:' + c1 + ';border-color:' + c1 + '44">' + escHtml(lead.responsable1) + '</span>';
      }
      if (lead.responsable2) {
        var c2 = memberColor(lead.responsable2);
        badges += '<span class="badge-resp" style="background:' + c2 + '22;color:' + c2 + ';border-color:' + c2 + '44">' + escHtml(lead.responsable2) + '</span>';
      }

      return '<div class="lead-card" data-id="' + escHtml(lead.id) + '">' +
        '<div class="lead-top">' +
          '<span class="lead-name">' + escHtml(lead.nombre || '') + '</span>' +
          medioBadge +
        '</div>' +
        '<div class="lead-meta">' + escHtml(lead.empresa || '—') + '</div>' +
        (lead.telefono ? '<div class="lead-meta lead-tel">' + escHtml(lead.telefono) + '</div>' : '') +
        (lead.observaciones ? '<div class="lead-obs">' + escHtml(lead.observaciones.slice(0, 80)) + (lead.observaciones.length > 80 ? '…' : '') + '</div>' : '') +
        '<div class="lead-footer">' +
          '<div class="lead-badges">' + badges + '</div>' +
          '<span class="lead-date">' + formatDate(lead.fechaContacto) + '</span>' +
        '</div>' +
        '</div>';
    }).join('');

    main.querySelectorAll('.lead-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.dataset.id;
        var lead = state.leads.find(function (l) { return l.id === id; });
        if (lead) openModal(lead);
      });
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
