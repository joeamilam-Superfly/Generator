const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

const ISOM_ELECTRIC_COMPANY_ID = 'cd4f9915-3d8c-4f43-98bb-267dc68c5528';

exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;

  const q = (event.queryStringParameters || {}).q || '';
  if (q.trim().length < 2) return jsonResponse(200, { locations: [] });

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('job_locations')
      .select('id, name, address')
      .eq('company_id', ISOM_ELECTRIC_COMPANY_ID)
      .ilike('address', `%${q}%`)
      .limit(10);

    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { locations: data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
