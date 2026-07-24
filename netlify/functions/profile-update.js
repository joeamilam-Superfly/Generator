const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

const CUSTOMER_FIELDS = ['first_name', 'last_name', 'business_name', 'phone', 'city'];
const GENERATOR_FIELDS = ['serial_number', 'ats_serial_number', 'model', 'install_date',
                          'oil_filter_part', 'oil_capacity', 'run_hours'];
const LOCATION_FIELDS = ['address'];

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

  const { generator_id, customer_id, job_location_id, generator_updates, customer_updates, location_updates } = body;
  if (!generator_id) return jsonResponse(400, { error: 'generator_id is required.' });

  function pickAllowed(source, allowed) {
    const out = {};
    if (!source) return out;
    for (const key of Object.keys(source)) {
      if (allowed.includes(key)) out[key] = source[key] === '' ? null : source[key];
    }
    return out;
  }

  try {
    const supabase = getSupabaseClient();
    const results = {};

    const genPayload = pickAllowed(generator_updates, GENERATOR_FIELDS);
    if (Object.keys(genPayload).length > 0) {
      genPayload.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('generators').update(genPayload).eq('id', generator_id).select().single();
      if (error) return jsonResponse(500, { error: `Generator update failed: ${error.message}` });
      results.generator = data;
    }

    if (customer_id) {
      const custPayload = pickAllowed(customer_updates, CUSTOMER_FIELDS);
      if (Object.keys(custPayload).length > 0) {
        custPayload.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from('customers').update(custPayload).eq('id', customer_id).select().single();
        if (error) return jsonResponse(500, { error: `Customer update failed: ${error.message}` });
        results.customer = data;
      }
    }

    if (job_location_id) {
      const locPayload = pickAllowed(location_updates, LOCATION_FIELDS);
      if (Object.keys(locPayload).length > 0) {
        const { data, error } = await supabase.from('job_locations').update(locPayload).eq('id', job_location_id).select().single();
        if (error) return jsonResponse(500, { error: `Location update failed: ${error.message}` });
        results.location = data;
      }
    }

    return jsonResponse(200, results);
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
