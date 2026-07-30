const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

// Query params (all optional, combine with AND):
//   service_date_from, service_date_to   (YYYY-MM-DD)
//   technician                            (partial match)
//   customer_search                       (partial match on first/last/business name)
//   serial_search                         (partial match on serial number)
//   notes_search                          (partial match on notes or parts_used)
exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;

  const p = event.queryStringParameters || {};

  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('work_order_search_view').select('*');

    if (p.service_date_from) query = query.gte('service_date', p.service_date_from);
    if (p.service_date_to) query = query.lte('service_date', p.service_date_to);
    if (p.technician) query = query.ilike('technician', `%${p.technician}%`);
    if (p.serial_search) query = query.ilike('serial_number', `%${p.serial_search}%`);
    if (p.wo_number_search) query = query.ilike('work_order_number', `%${p.wo_number_search}%`);

    if (p.customer_search) {
      const term = p.customer_search.replace(/[%_]/g, '');
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,business_name.ilike.%${term}%`);
    }
    if (p.notes_search) {
      const term = p.notes_search.replace(/[%_]/g, '');
      query = query.or(`notes.ilike.%${term}%,parts_used.ilike.%${term}%`);
    }

    query = query.order('service_date', { ascending: false });

    const { data, error } = await query;
    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { results: data, count: data.length });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
