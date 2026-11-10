const crypto = require('node:crypto');

const READERS = new Set(['mohammad', 'zahra']);
const PAGE_LIMIT = 538;

function authorized(req) {
  const configured = process.env.TRACKER_ACCESS_CODE;
  const header = req.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!configured || !supplied) return false;
  const expectedHash = crypto.createHash('sha256').update(configured).digest();
  const suppliedHash = crypto.createHash('sha256').update(supplied).digest();
  return crypto.timingSafeEqual(expectedHash, suppliedHash);
}

function validDays(days) {
  return Array.isArray(days) && days.length === 12 &&
    days.every(n => Number.isInteger(n) && n >= 0 && n <= PAGE_LIMIT) &&
    days.reduce((sum, n) => sum + n, 0) <= PAGE_LIMIT;
}

module.exports = async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(503).json({ error: 'Database is not configured' });
  }

  const base = supabaseUrl.replace(/\/$/, '') + '/rest/v1/reading_progress';
  const headers = {
    apikey: serviceKey,
    Authorization: 'Bearer ' + serviceKey,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const response = await fetch(base + '?select=reader,days', { headers });
      if (!response.ok) throw new Error('Supabase returned ' + response.status);
      const rows = await response.json();
      const result = {};
      for (const row of rows) {
        if (READERS.has(row.reader) && validDays(row.days)) result[row.reader] = { days: row.days };
      }
      return res.status(200).json(result);
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !READERS.has(body.id) || !validDays(body.days)) {
      return res.status(400).json({ error: 'Invalid reader or page counts' });
    }
    const response = await fetch(base, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ reader: body.id, days: body.days, updated_at: new Date().toISOString() })
    });
    if (!response.ok) throw new Error('Supabase returned ' + response.status);
    return res.status(204).end();
  } catch (error) {
    console.error('Tracker database request failed:', error.message);
    return res.status(502).json({ error: 'Database request failed' });
  }
};
