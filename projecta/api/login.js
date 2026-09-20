const { signToken, safeEqual } = require('./_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { user, pass } = req.body || {};
  const okUser = safeEqual(user || '', process.env.DEV_USER || '');
  const okPass = safeEqual(pass || '', process.env.DEV_PASS || '');

  if (!process.env.DEV_USER || !process.env.DEV_PASS || !okUser || !okPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.status(200).json({ token: signToken(user) });
};
