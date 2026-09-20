const redis = require('./_lib/redis');
const { verifyToken, getBearer } = require('./_lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!verifyToken(getBearer(req))) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const count = Number(await redis.get('projecta:visits:total')) || 0;
    return res.status(200).json({ count });
  } catch (e) {
    return res.status(500).json({ error: 'Counter unavailable' });
  }
};
