const https = require('https');
const fs = require('fs');

const queries = [
  // Main news
  { q: 'NYC tenant rights housing 2025', cat: 'Rights' },
  { q: 'NYC Rent Guidelines Board 2025', cat: 'RGB' },
  { q: 'New York rent stabilization', cat: 'RGB' },
  { q: 'NYC bad landlord housing violations', cat: 'Bad Landlord' },
  { q: 'NYC affordable housing rent increase 2025', cat: 'Housing' },
  { q: 'New York Section 8 low income housing', cat: 'Housing' },
  { q: 'NYC elderly senior tenant rights', cat: 'Protected' },
  { q: 'New York LGBTQ tenant housing discrimination', cat: 'Protected' },
  { q: 'NYC disabled tenant ADA housing', cat: 'Protected' },
  { q: 'NYC housing court legal aid tenant', cat: 'Rights' },
  // Akelius
  { q: 'Akelius Real Estate', cat: 'Akelius' },
  { q: 'Akelius Residential tenant rent', cat: 'Akelius' },
  { q: 'Akelius apartments housing', cat: 'Akelius' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml, cat) {
  const items = [];
  const blocks = xml.split('<item>').slice(1);
  for (const b of blocks) {
    const get = tag => { const m = b.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)); return m ? (m[1]||m[2]||'').trim() : ''; };
    const title = get('title').replace(/ - [^-]+$/, '');
    const link = get('link') || b.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || '';
    const pubDate = get('pubDate');
    const source = b.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || b.match(/ - ([^-]+)$/)?.[1] || '';
    const desc = get('description').replace(/<[^>]+>/g,'').slice(0,200).trim();
    if (title && link) items.push({ title, link, pubDate, source, description: desc, category: cat, thumb: '' });
  }
  return items;
}

async function main() {
  const all = [];
  const seen = new Set();
  for (const { q, cat } of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      const xml = await fetch(url);
      const items = parseRSS(xml, cat);
      for (const item of items) {
        const key = item.title.toLowerCase().slice(0, 60);
        if (!seen.has(key)) { seen.add(key); all.push(item); }
      }
      await new Promise(r => setTimeout(r, 500));
    } catch(e) { console.error(`Failed: ${q}`, e.message); }
  }
  all.sort((a, b) => new Date(b.pubDate||0) - new Date(a.pubDate||0));
  const main = all.filter(i => i.category !== 'Akelius');
  const akelius = all.filter(i => i.category === 'Akelius');
  fs.writeFileSync('docs/feed.json', JSON.stringify({ updated: new Date().toISOString(), main: main.slice(0,200), akelius: akelius.slice(0,50) }, null, 2));
  console.log(`Saved ${main.length} main + ${akelius.length} Akelius articles`);
}

main();
