const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('generators')
      .select(`
        id, serial_number, ats_serial_number, model, install_date,
        oil_filter_part, oil_capacity, run_hours, status,
        review_status, review_priority, conflict_group_id, review_notes,
        created_at,
        customers ( id, first_name, last_name, business_name, phone, sms_consent ),
        job_locations ( id, name, address )
      `)
      .order('review_priority', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { generators: data });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
