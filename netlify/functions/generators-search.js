const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

// Query params supported (all optional, combine with AND):
//   install_date_from, install_date_to   (YYYY-MM-DD)
//   last_service_from, last_service_to   (YYYY-MM-DD)
//   model                                 (partial match)
//   city / location_search                (partial match on address)
//   customer_search                       (partial match on first/last/business name)
//   serial_search                         (partial match on serial number)
//   review_status                         (exact: clean / needs_serial / serial_conflict)
//   has_phone                             ('yes' or 'no')
//   never_serviced                        ('yes' = last_service_date is null)
exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;

  const p = event.queryStringParameters || {};

  try {
    const supabase = getSupabaseClient();
    let query = supabase.from('generator_search_view').select('*');

    if (p.install_date_from) query = query.gte('install_date', p.install_date_from);
    if (p.install_date_to) query = query.lte('install_date', p.install_date_to);
    if (p.last_service_from) query = query.gte('last_service_date', p.last_service_from);
    if (p.last_service_to) query = query.lte('last_service_date', p.last_service_to);
    if (p.model) query = query.ilike('model', `%${p.model}%`);
    if (p.location_search) query = query.ilike('location_address', `%${p.location_search}%`);
    if (p.serial_search) query = query.ilike('serial_number', `%${p.serial_search}%`);
    if (p.review_status) query = query.eq('review_status', p.review_status);
    if (p.has_phone === 'yes') query = query.not('phone', 'is', null);
    if (p.has_phone === 'no') query = query.is('phone', null);
    if (p.never_serviced === 'yes') query = query.is('last_service_date', null);

    // customer name search spans three columns, which needs an OR, built separately
    if (p.customer_search) {
      const term = p.customer_search.replace(/[%_]/g, '');
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,business_name.ilike.%${term}%`);
    }

    query = query.order('install_date', { ascending: false, nullsFirst: false });

    const { data, error } = await query;
    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { results: data, count: data.length });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
