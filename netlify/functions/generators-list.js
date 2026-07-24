const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;

  try {
    const supabase = getSupabaseClient();
    const showArchived = (event.queryStringParameters || {}).include_archived === 'yes';
    let query = supabase.from('generator_search_view').select('*');
    if (!showArchived) query = query.eq('archived', false);
    const { data, error } = await query
      .order('review_priority', { ascending: false, nullsFirst: false })
      .order('install_date', { ascending: false, nullsFirst: false });

    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { generators: data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
