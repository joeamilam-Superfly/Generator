const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'POST only' });

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { generator_id, service_date, technician, service_type, run_hours_at_service, parts_used, notes } = body;

  if (!generator_id || !service_date) {
    return jsonResponse(400, { error: 'generator_id and service_date are required.' });
  }

  try {
    const supabase = getSupabaseClient();

    const { data: workOrder, error: woErr } = await supabase
      .from('generator_work_orders')
      .insert({
        generator_id,
        service_date,
        technician: technician || null,
        service_type: service_type || null,
        run_hours_at_service: run_hours_at_service || null,
        parts_used: parts_used || null,
        notes: notes || null,
      })
      .select()
      .single();
    if (woErr) return jsonResponse(500, { error: woErr.message });

    // keep the generator's run_hours current if a fresher reading came in
    if (run_hours_at_service) {
      const { error: updateErr } = await supabase
        .from('generators')
        .update({ run_hours: run_hours_at_service, updated_at: new Date().toISOString() })
        .eq('id', generator_id);
      if (updateErr) return jsonResponse(500, { error: `Work order saved, but updating the generator's run hours failed: ${updateErr.message}` });
    }

    return jsonResponse(201, { work_order: workOrder });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
