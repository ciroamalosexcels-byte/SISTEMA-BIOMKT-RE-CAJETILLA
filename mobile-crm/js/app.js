(function () {
  var state = {
    currentTab: 'CRM',
    leads: [],
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

  function formatDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    if (parts.length < 3) return iso;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

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
      return '<div class="lead-card">' +
        '<div class="lead-name">' + escHtml(lead.nombre || '') + '</div>' +
        '<div class="lead-meta">' + escHtml(lead.empresa || '—') + '</div>' +
        (lead.telefono ? '<div class="lead-meta">' + escHtml(lead.telefono) + (lead.medio ? ' · ' + lead.medio : '') + '</div>' : '') +
        '<div class="lead-date">' + formatDate(lead.fechaContacto) + '</div>' +
        '</div>';
    }).join('');
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Modal ───────────────────────────────────────────────
  var overlay    = document.getElementById('modalOverlay');
  var form       = document.getElementById('leadForm');
  var submitBtn  = form.querySelector('.btn-submit');

  document.getElementById('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

  function openModal(prefill) {
    prefill = prefill || {};
    document.getElementById('fNombre').value       = prefill.nombre        || '';
    document.getElementById('fEmpresa').value      = prefill.empresa       || '';
    document.getElementById('fTelefono').value     = prefill.telefono      || '';
    document.getElementById('fMedio').value        = prefill.medio         || '';
    document.getElementById('fDireccion').value    = prefill.direccion     || '';
    document.getElementById('fObservaciones').value= prefill.observaciones || '';
    document.getElementById('fTab').value          = state.currentTab;
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
      id:           generateId(),
      nombre:       document.getElementById('fNombre').value.trim(),
      empresa:      document.getElementById('fEmpresa').value.trim(),
      telefono:     document.getElementById('fTelefono').value.trim(),
      medio:        document.getElementById('fMedio').value,
      direccion:    document.getElementById('fDireccion').value.trim(),
      observaciones:document.getElementById('fObservaciones').value.trim(),
      tab:          document.getElementById('fTab').value,
      fechaContacto:todayISO(),
      responsable1: '',
      responsable2: '',
      empresaBio:   'BIOMARKETING'
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

  // ── FAB manual ──────────────────────────────────────────
  document.getElementById('fabManual').addEventListener('click', function () {
    openModal();
  });

  // ── FAB voz ─────────────────────────────────────────────
  var voiceOverlay     = document.getElementById('voiceOverlay');
  var voiceTranscript  = document.getElementById('voiceTranscript');
  var fabVoice         = document.getElementById('fabVoice');

  document.getElementById('btnStopVoice').addEventListener('click', stopVoice);

  function stopVoice() {
    if (state.recognition) {
      state.recognition.stop();
      state.recognition = null;
    }
    fabVoice.classList.remove('recording');
    voiceOverlay.classList.add('hidden');
    voiceTranscript.textContent = '';
  }

  fabVoice.addEventListener('click', function () {
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
      }
    );
  });

  // ── Init ────────────────────────────────────────────────
  loadLeads();
})();
