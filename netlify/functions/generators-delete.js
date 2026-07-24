const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

// Permanent delete. Cascades to generator_work_orders automatically (the
// foreign key is ON DELETE CASCADE), so a generator's service history goes
// with it. Does NOT delete the linked customer or job_location, since
// those may still be referenced by other generators.
// Requires confirm: true in the body as a deliberate speed bump against
// accidental permanent deletes, archiving should be the default action.
exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'POST only (uses POST rather than DELETE to carry a JSON body with the confirmation flag)' });

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { generator_id, confirm } = body;
  if (!generator_id) return jsonResponse(400, { error: 'generator_id is required.' });
  if (confirm !== true) return jsonResponse(400, { error: 'This is a permanent delete. Resend with confirm: true to proceed.' });

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('generators')
      .delete()
      .eq('id', generator_id)
      .select()
      .single();
    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { deleted: data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
