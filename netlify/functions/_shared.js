const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_KEY is not set in this site\'s environment variables.');
  }
  return createClient(url, key);
}

// Every function calls this first. Checks the shared app access token sent
// as an "x-app-token" header against APP_ACCESS_TOKEN. Returns null if ok,
// or a Netlify Functions response object to return immediately if not.
function checkAccess(event) {
  const expected = process.env.APP_ACCESS_TOKEN;
  if (!expected) {
    return { statusCode: 500, body: JSON.stringify({ error: 'APP_ACCESS_TOKEN is not set in this site\'s environment variables.' }) };
  }
  const provided = event.headers['x-app-token'] || event.headers['X-App-Token'];
  if (provided !== expected) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or missing access token.' }) };
  }
  return null;
}

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

module.exports = { getSupabaseClient, checkAccess, jsonResponse };
