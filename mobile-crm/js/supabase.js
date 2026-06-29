(function () {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('[BIOMKT] Falta config.js con SUPABASE_URL y SUPABASE_ANON_KEY');
    return;
  }

  var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.db = client;

  window.fetchLeads = async function (tab) {
    var result = await client
      .from('leads')
      .select('id, nombre, empresa, telefono, fechaContacto, medio, observaciones, direccion, responsable1, tab')
      .eq('tab', tab)
      .order('fechaContacto', { ascending: false });
    if (result.error) throw result.error;
    return result.data || [];
  };

  window.insertLead = async function (lead) {
    var result = await client
      .from('leads')
      .insert([lead])
      .select()
      .single();
    if (result.error) throw result.error;
    return result.data;
  };
})();
