// Quick local quote tester for dev server
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: f}) => f(...args)));

async function testQuote(courseId, date, time, players = 2, holes = 18, basePrice = 305) {
  const res = await fetch('http://localhost:3001/api/checkout/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId, date, time, players, holes, basePrice }),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return { time, totalUsd: json.total_cents / 100, subtotalUsd: json.subtotal_cents / 100 };
  } catch (e) {
    return { time, error: text };
  }
}

async function run() {
  const courseId = 'solmar-golf-links';
  const date = '2025-11-15';
  const cases = ['07:30', '11:15', '15:00', '16:30'];
  const results = await Promise.all(cases.map(t => testQuote(courseId, date, t, 2, 18, 305)));
  console.log('Local quote results:', results);
}

run().catch(err => {
  console.error('Quote test failed:', err);
  process.exit(1);
});