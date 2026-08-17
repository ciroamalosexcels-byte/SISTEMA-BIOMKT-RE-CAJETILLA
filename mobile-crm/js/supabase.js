(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('[BIOMKT] Falta config.js con SUPABASE_URL y SUPABASE_ANON_KEY');
    return;
  }

  var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.db = client;

  var stageCache = null;

  function mapLeadRow(row, tab) {
    return {
      id: row.id,
      nombre: row.nombre,
      empresa: row.empresa,
      telefono: row.telefono || '',
      telefono2: row.telefono2 || '',
      fechaContacto: row.fecha_contacto,
      proximoSeguimientoFecha: row.proximo_seguimiento_fecha || '',
      meetingDatetime: row.meeting_datetime || '',
      medio: row.medio || '',
      observaciones: row.observaciones || '',
      direccion: row.direccion || '',
      responsable1: row.responsable1 || '',
      responsable2: row.responsable2 || '',
      email: row.email || '',
      instagram: row.instagram || '',
      rubro: row.rubro || '',
      servicio: row.servicio || '',
      planAudiovisual: row.plan_audiovisual || '',
      mesEntrada: row.mes_entrada || '',
      objetivos: row.objetivos || '',
      seguimiento: row.seguimiento || '',
      clientOrder: row.client_order ?? null,
      activo: row.activo !== false,
      tab: tab
    };
  }

  function mapContentEventRow(row) {
    return {
      id: row.id,
      clientId: row.client_id,
      title: row.title,
      type: row.type || '',
      status: row.status || '',
      scheduledDate: row.scheduled_date || '',
      done: !!row.done,
      order: row.event_order ?? 0,
      assignee: row.assignee || '',
      notes: row.notes || '',
      objetivo: row.objetivo || '',
      frase: row.frase || '',
      copy: row.copy || '',
      archivo: row.archivo || '',
    };
  }

  function mapManagementEventRow(row) {
    return {
      id: row.id,
      clientId: row.client_id,
      title: row.title,
      type: row.type || '',
      datetime: row.datetime || '',
      done: !!row.done,
      notes: row.notes || '',
    };
  }

  async function getStages() {
    if (stageCache) return stageCache;
    var r = await client.from('pipeline_stages').select('id, stage_key');
    if (r.error) throw r.error;
    stageCache = r.data || [];
    return stageCache;
  }

  window.fetchLeads = async function (tab) {
    var stages = await getStages();
    var stage = stages.find(function (s) { return s.stage_key === tab; });
    if (!stage) return [];

    var result = await client
      .from('leads')
      .select('id, nombre, empresa, telefono, telefono2, fecha_contacto, proximo_seguimiento_fecha, meeting_datetime, medio, observaciones, direccion, responsable1, responsable2, email, instagram, rubro, servicio, plan_audiovisual, mes_entrada, objetivos, seguimiento, client_order, activo, stage_id')
      .eq('stage_id', stage.id)
      .is('deleted_at', null)
      .order('fecha_contacto', { ascending: false });

    if (result.error) throw result.error;

    return (result.data || []).map(function (row) { return mapLeadRow(row, tab); });
  };

  window.fetchContentEvents = async function () {
    var result = await client
      .from('content_events')
      .select('id, client_id, title, type, status, scheduled_date, done, event_order, assignee, notes, objetivo, frase, copy, archivo')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
      .order('event_order', { ascending: true });
    if (result.error) throw result.error;
    return (result.data || []).map(mapContentEventRow);
  };

  window.fetchManagementEvents = async function () {
    var result = await client
      .from('management_events')
      .select('id, client_id, title, type, datetime, done, notes')
      .order('datetime', { ascending: true, nullsFirst: false });
    if (result.error) throw result.error;
    return (result.data || []).map(mapManagementEventRow);
  };

  window.fetchTeam = async function () {
    var result = await client
      .from('team_members')
      .select('id, nombre, color')
      .order('nombre');
    if (result.error) throw result.error;
    return result.data || [];
  };

  window.updateLead = async function (id, updates) {
    if (updates.tab) {
      var stages = await getStages();
      var stage = stages.find(function (s) { return s.stage_key === updates.tab; });
      if (!stage) throw new Error('Stage no encontrado: ' + updates.tab);
      updates.stage_id = stage.id;
      delete updates.tab;
    }
    var result = await client.from('leads').update(updates).eq('id', id);
    if (result.error) throw result.error;
    return result.data;
  };

  window.insertLead = async function (lead) {
    var stages = await getStages();
    var stage = stages.find(function (s) { return s.stage_key === lead.tab; });
    if (!stage) throw new Error('Stage no encontrado: ' + lead.tab);

    var result = await client
      .from('leads')
      .insert([{
        id: lead.id,
        nombre: lead.nombre,
        empresa: lead.empresa,
        telefono: lead.telefono || null,
        fecha_contacto: lead.fechaContacto,
        medio: lead.medio || null,
        observaciones: lead.observaciones || null,
        direccion: lead.direccion || null,
        responsable1: lead.responsable1 || null,
        responsable2: lead.responsable2 || null,
        email: lead.email || null,
        instagram: lead.instagram || null,
        rubro: lead.rubro || null,
        servicio: lead.servicio || null,
        empresa_bio: 'BIOMARKETING',
        stage_id: stage.id,
        activo: true
      }])
      .select()
      .single();

    if (result.error) throw result.error;
    return result.data;
  };

  window.insertContentEvent = async function (event) {
    var result = await client
      .from('content_events')
      .insert([{
        id: event.id,
        client_id: event.clientId,
        title: event.title,
        type: event.type || null,
        status: event.status || null,
        scheduled_date: event.scheduledDate || null,
        done: !!event.done,
        event_order: event.order ?? 0,
        assignee: event.assignee || null,
        notes: event.notes || null,
        objetivo: event.objetivo || null,
        frase: event.frase || null,
        copy: event.copy || null,
        archivo: event.archivo || null,
      }])
      .select()
      .single();
    if (result.error) throw result.error;
    return result.data;
  };

  window.insertManagementEvent = async function (event) {
    var result = await client
      .from('management_events')
      .insert([{
        id: event.id,
        client_id: event.clientId,
        title: event.title,
        type: event.type || null,
        datetime: event.datetime || null,
        done: !!event.done,
        notes: event.notes || null,
      }])
      .select()
      .single();
    if (result.error) throw result.error;
    return result.data;
  };

  window.updateContentEvent = async function (id, updates) {
    var result = await client.from('content_events').update(updates).eq('id', id);
    if (result.error) throw result.error;
    return result.data;
  };

  window.updateManagementEvent = async function (id, updates) {
    var result = await client.from('management_events').update(updates).eq('id', id);
    if (result.error) throw result.error;
    return result.data;
  };

  window.deleteContentEvent = async function (id) {
    var result = await client.from('content_events').delete().eq('id', id);
    if (result.error) throw result.error;
    return true;
  };

  window.deleteManagementEvent = async function (id) {
    var result = await client.from('management_events').delete().eq('id', id);
    if (result.error) throw result.error;
    return true;
  };
})();
