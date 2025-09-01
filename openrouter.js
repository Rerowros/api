export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = process.env.PROXY_TOKEN;
  // Простая защита по токену (совпадает с X-Proxy-Token из WP настроек)
  if (token && req.headers['x-proxy-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });
  const data = await upstream.json();
  res.status(upstream.status).json(data);
}