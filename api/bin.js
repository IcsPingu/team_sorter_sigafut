// Vercel Serverless Function proxy for the shared player roster. Keeps the
// jsonbin Master Key server-side (JSONBIN_KEY) instead of in the browser bundle.
// Configure JSONBIN_KEY and JSONBIN_URL (full bin URL) in Vercel env vars.

export default async function handler(req, res) {
  const key = process.env.JSONBIN_KEY;
  const url = process.env.JSONBIN_URL;

  if (!key || !url) {
    return res.status(500).json({ error: 'Set JSONBIN_KEY and JSONBIN_URL env vars' });
  }

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${url}/latest`, {
        headers: { 'X-Master-Key': key },
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === 'PUT') {
      const r = await fetch(url, {
        method: 'PUT',
        headers: { 'X-Master-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
