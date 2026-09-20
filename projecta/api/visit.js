const crypto = require('crypto');
const redis = require('./_lib/redis');

const TOTAL_KEY = 'projecta:visits:total';
const WINDOW_SECONDS = 30 * 60; // same visitor refresh = no double count for 30 min
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor/i;

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim().split('='))
      .filter((p) => p[0])
      .map(([k, ...v]) => [k, v.join('=')])
  );
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (BOT_RE.test(req.headers['user-agent'] || '')) {
    return res.status(200).json({ counted: false });
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const vid = /^[a-f0-9-]{36}$/.test(cookies.pa_vid || '') ? cookies.pa_vid : crypto.randomUUID();

    res.setHeader(
      'Set-Cookie',
      `pa_vid=${vid}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
    );

    const first = await redis.set(`projecta:seen:${vid}`, 1, { nx: true, ex: WINDOW_SECONDS });
    if (first) await redis.incr(TOTAL_KEY);

    return res.status(200).json({ counted: Boolean(first) });
  } catch (e) {
    return res.status(200).json({ counted: false }); // never break the public site
  }
};
