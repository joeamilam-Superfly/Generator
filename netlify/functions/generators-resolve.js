const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

// Handles both paths for a flagged (needs_serial / serial_conflict) generator:
//   1. Edit its fields directly (e.g. fill in the correct serial number) and
//      mark it clean.
//   2. Leave the fields as-is but record a review_note explaining the
//      conflict, without clearing the flag, if it's a real situation
//      (e.g. two units legitimately share a label) rather than a data error.
exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;
  if (event.httpMethod !== 'PATCH') return jsonResponse(405, { error: 'PATCH only' });

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { generator_id, updates, review_notes, mark_resolved } = body;
  if (!generator_id) return jsonResponse(400, { error: 'generator_id is required.' });

  const allowedFields = ['serial_number', 'ats_serial_number', 'model', 'install_date',
                          'oil_filter_part', 'oil_capacity', 'run_hours', 'customer_id', 'job_location_id'];
  const payload = {};
  if (updates) {
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) payload[key] = updates[key];
    }
  }
  if (review_notes !== undefined) payload.review_notes = review_notes;
  if (mark_resolved) {
    payload.review_status = 'clean';
    payload.review_priority = null;
  }
  payload.updated_at = new Date().toISOString();

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('generators')
      .update(payload)
      .eq('id', generator_id)
      .select()
      .single();
    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { generator: data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
