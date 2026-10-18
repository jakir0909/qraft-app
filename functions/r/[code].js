// functions/r/[code].js
export async function onRequestGet(context) {
  const { params, env, waitUntil } = context;
  const code = params.code;

  try {
    let target = null;
    if (env.QR_KV) { target = await env.QR_KV.get(code); }

    if (!target) {
      const row = await env.DB.prepare('SELECT target_url FROM qr_links WHERE code = ?').bind(code).first();
      if (!row) return new Response('QR code not found', { status: 404 });
      target = row.target_url;
      if (env.QR_KV) await env.QR_KV.put(code, target);
    }

    waitUntil(env.DB.prepare('UPDATE qr_links SET scan_count = scan_count + 1 WHERE code = ?').bind(code).run().catch(() => {}));
    return Response.redirect(target, 302);
  } catch (e) { return new Response('Server error', { status: 500 }); }
}
