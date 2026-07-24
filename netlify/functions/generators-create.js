const { getSupabaseClient, checkAccess, jsonResponse } = require('./_shared');

const ISOM_ELECTRIC_COMPANY_ID = 'cd4f9915-3d8c-4f43-98bb-267dc68c5528';

exports.handler = async (event) => {
  const denied = checkAccess(event);
  if (denied) return denied;
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'POST only' });

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const {
    first_name, last_name, business_name, phone,
    location_address, install_date, serial_number, ats_serial_number,
    model, oil_filter_part, oil_capacity, run_hours,
  } = body;

  if (!last_name && !business_name) {
    return jsonResponse(400, { error: 'Either last_name or business_name is required to identify the customer.' });
  }

  try {
    const supabase = getSupabaseClient();

    // find-or-create customer. Built conditionally rather than using
    // .eq(column, null), whose behavior for null values varies by
    // supabase-js version and isn't safe to rely on.
    let customerId;
    let custQuery = supabase.from('customers').select('id');
    custQuery = first_name ? custQuery.eq('first_name', first_name) : custQuery.is('first_name', null);
    custQuery = last_name ? custQuery.eq('last_name', last_name) : custQuery.is('last_name', null);
    custQuery = business_name ? custQuery.eq('business_name', business_name) : custQuery.is('business_name', null);
    const { data: existingCustomers, error: custFindErr } = await custQuery.limit(1);
    if (custFindErr) return jsonResponse(500, { error: custFindErr.message });

    if (existingCustomers && existingCustomers.length > 0) {
      customerId = existingCustomers[0].id;
    } else {
      const { data: newCustomer, error: custCreateErr } = await supabase
        .from('customers')
        .insert({
          first_name: first_name || null,
          last_name: last_name || null,
          business_name: business_name || null,
          phone: phone || null,
        })
        .select('id')
        .single();
      if (custCreateErr) return jsonResponse(500, { error: custCreateErr.message });
      customerId = newCustomer.id;
    }

    // find-or-create job_location, scoped to Isom Electric
    let jobLocationId = null;
    if (location_address) {
      const { data: existingLocations, error: locFindErr } = await supabase
        .from('job_locations')
        .select('id')
        .eq('company_id', ISOM_ELECTRIC_COMPANY_ID)
        .ilike('address', location_address.trim())
        .limit(1);
      if (locFindErr) return jsonResponse(500, { error: locFindErr.message });

      if (existingLocations && existingLocations.length > 0) {
        jobLocationId = existingLocations[0].id;
      } else {
        const name = business_name || `${first_name || ''} ${last_name || ''}`.trim() || 'Unnamed generator site';
        const { data: newLocation, error: locCreateErr } = await supabase
          .from('job_locations')
          .insert({
            company_id: ISOM_ELECTRIC_COMPANY_ID,
            name,
            normalized_name: name.toLowerCase(),
            address: location_address.trim(),
            active: true,
            is_generator_site: true,
          })
          .select('id')
          .single();
        if (locCreateErr) return jsonResponse(500, { error: locCreateErr.message });
        jobLocationId = newLocation.id;
      }
    }

    // insert the generator itself
    const { data: newGenerator, error: genErr } = await supabase
      .from('generators')
      .insert({
        customer_id: customerId,
        job_location_id: jobLocationId,
        serial_number: serial_number || null,
        ats_serial_number: ats_serial_number || null,
        model: model || null,
        install_date: install_date || null,
        oil_filter_part: oil_filter_part || null,
        oil_capacity: oil_capacity || null,
        run_hours: run_hours || null,
        status: 'active',
        review_status: serial_number ? 'clean' : 'needs_serial',
        review_priority: serial_number ? null : 'high',
      })
      .select()
      .single();
    if (genErr) return jsonResponse(500, { error: genErr.message });

    return jsonResponse(201, { generator: newGenerator });
  } catch (err) {
    return jsonResponse(500, { error: err.message });
  }
};
