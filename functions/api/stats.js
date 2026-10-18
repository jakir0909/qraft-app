// functions/api/stats.js
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      `SELECT code, target_url, scan_count, created_at FROM qr_links ORDER BY scan_count DESC LIMIT 50`
    ).all();
    return new Response(JSON.stringify({ links: results || [] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
