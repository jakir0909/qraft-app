// functions/api/create.js
const RESERVED = [
  'api', 'r', 'admin', 'dashboard', 'login', 'signup', 'logout',
  'index', 'manifest', 'sw', 'icons', 'functions', 'static',
  'assets', 'public', 'docs', 'help', 'about', 'privacy', 'terms'
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function validateSlug(raw) {
  if (!raw) return { valid: true, slug: null };
  const s = String(raw).toLowerCase().trim();
  if (s.length < 3 || s.length > 30) return { valid: false, error: 'Slug must be 3–30 characters' };
  if (!/^[a-z0-9][a-z0-9-_]*[a-z0-9]$/.test(s) && !/^[a-z0-9]{3,30}$/.test(s)) return { valid: false, error: 'Slug may only contain lowercase letters, numbers, - and _' };
  if (RESERVED.includes(s)) return { valid: false, error: `"${s}" is a reserved word` };
  return { valid: true, slug: s };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { targetUrl, customSlug } = body || {};
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) return json({ error: 'Invalid targetUrl' }, 400);

  const v = validateSlug(customSlug);
  if (!v.valid) return json({ error: v.error }, 400);

  let code;
  const isCustom = !!v.slug;
  if (isCustom) { code = v.slug; } 
  else {
    do { code = Math.random().toString(36).substring(2, 8); } 
    while (await env.DB.prepare('SELECT 1 FROM qr_links WHERE code = ?').bind(code).first());
  }

  const origin = new URL(request.url).origin;

  try {
    if (isCustom && env.QR_KV) {
      const existing = await env.QR_KV.get(code);
      if (existing) return json({ error: `"${code}" is already taken.` }, 409);
    }

    await env.DB.prepare('INSERT INTO qr_links (code, target_url) VALUES (?, ?)').bind(code, targetUrl).run();
    if (env.QR_KV) await env.QR_KV.put(code, targetUrl);

    return json({ shortUrl: `${origin}/r/${code}`, code, custom: isCustom });
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('UNIQUE') || msg.includes('constraint') || msg.includes('PRIMARY')) return json({ error: `"${code}" is already taken.` }, 409);
    return json({ error: msg || 'Database error' }, 500);
  }
}
