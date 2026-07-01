(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('[BIOMKT] Falta config.js con SUPABASE_URL y SUPABASE_ANON_KEY');
    return;
  }

  var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.db = client;

  var stageCache = null;

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
      .select('id, nombre, empresa, telefono, fecha_contacto, medio, observaciones, direccion, responsable1, responsable2, email, instagram, rubro, servicio, stage_id')
      .eq('stage_id', stage.id)
      .is('deleted_at', null)
      .order('fecha_contacto', { ascending: false });

    if (result.error) throw result.error;

    return (result.data || []).map(function (row) {
      return {
        id: row.id,
        nombre: row.nombre,
        empresa: row.empresa,
        telefono: row.telefono || '',
        fechaContacto: row.fecha_contacto,
        medio: row.medio || '',
        observaciones: row.observaciones || '',
        direccion: row.direccion || '',
        responsable1: row.responsable1 || '',
        responsable2: row.responsable2 || '',
        email: row.email || '',
        instagram: row.instagram || '',
        rubro: row.rubro || '',
        servicio: row.servicio || '',
        tab: tab
      };
    });
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
})();
