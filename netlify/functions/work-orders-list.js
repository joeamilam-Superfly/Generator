const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;

  const generatorId = (event.queryStringParameters || {}).generator_id;
  if (!generatorId) return jsonResponse(400, { error: 'generator_id query param is required.' });

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('generator_work_orders')
      .select('*')
      .eq('generator_id', generatorId)
      .order('service_date', { ascending: false });

    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { work_orders: data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
