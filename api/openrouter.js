export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const proxyToken = process.env.PROXY_TOKEN;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (!openrouterKey) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured on proxy' });
    }

    // Проверка токена (match c заголовком X-Proxy-Token из WP)
    if (proxyToken && req.headers['x-proxy-token'] !== proxyToken) {
      return res.status(401).json({ error: 'Unauthorized (bad proxy token)' });
    }

    // Тело (Next.js / Vercel API route уже парсит JSON, но fallback на строку)
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (_) {}
    }
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // Проксируем
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        // Рекомендуемые заголовки OpenRouter (не обязательны, но полезны)
        'HTTP-Referer': req.headers['origin'] || '',
        'X-Title': 'WP AIPG Proxy'
      },
      body: JSON.stringify(payload)
    });

    const status = upstream.status;
    let text = await upstream.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

    if (!upstream.ok) {
      // Нормализуем сообщение ошибки для WP
      const message = json?.error?.message || json?.message || `Upstream error ${status}`;
      return res.status(status).json({ error: { message }, upstream: json });
    }

    return res.status(status).json(json);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy internal error', detail: e.message });
  }
}