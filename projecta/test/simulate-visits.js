// Live test against your deployed site.
// Usage: BASE_URL=https://your-site.vercel.app DEV_USER=xxx DEV_PASS=xxx N=105 node test/simulate-visits.js
const BASE = process.env.BASE_URL;
const N = Number(process.env.N || 105);

async function main() {
  if (!BASE) throw new Error('Set BASE_URL');
  const login = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: process.env.DEV_USER, pass: process.env.DEV_PASS })
  });
  if (!login.ok) throw new Error('Login failed: ' + login.status);
  const { token } = await login.json();
  const getCount = async () => {
    const r = await fetch(`${BASE}/api/visits`, { headers: { Authorization: `Bearer ${token}` } });
    return (await r.json()).count;
  };
  const before = await getCount();
  console.log('Count before:', before);
  const ids = Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < ids.length; i += 15) {
    await Promise.all(ids.slice(i, i + 15).map((d) =>
      fetch(`${BASE}/api/visit`, { method: 'POST', headers: { 'User-Agent': `TestDevice-${d}` } })
    ));
  }
  const afterDevices = await getCount();
  console.log(`New devices: expected +${N}, got +${afterDevices - before}`);
  const first = await fetch(`${BASE}/api/visit`, { method: 'POST', headers: { 'User-Agent': 'TestDevice-repeat' } });
  const cookie = (first.headers.get('set-cookie') || '').split(';')[0];
  for (let i = 0; i < 5; i++) {
    await fetch(`${BASE}/api/visit`, { method: 'POST', headers: { 'User-Agent': 'TestDevice-repeat', Cookie: cookie } });
  }
  const afterRepeat = await getCount();
  console.log(`Same device x6 visits: expected +1, got +${afterRepeat - afterDevices}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
