const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

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

  const { generator_id, archive, reason } = body;
  if (!generator_id) return jsonResponse(400, { error: 'generator_id is required.' });
  if (typeof archive !== 'boolean') return jsonResponse(400, { error: 'archive must be true (to archive) or false (to restore).' });

  const payload = archive
    ? { archived: true, archived_at: new Date().toISOString(), archived_reason: reason || null }
    : { archived: false, archived_at: null, archived_reason: null };
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
