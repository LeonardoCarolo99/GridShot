// Local admin server for editing events + uploading photos.
// Run: npm run admin   →   http://localhost:4000
// Reads/writes src/content/events/*.md and public/uploads/ directly.
import http from 'node:http';
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVENTS_DIR = path.join(ROOT, 'src', 'content', 'events');
const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');
const UI_DIR = path.join(__dirname, 'ui');
const PORT = Number(process.env.ADMIN_PORT || 4000);
const MAX_BODY = 80 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

const IMAGE_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};

// ---------- helpers ----------

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};
const json = (res, status, obj) => send(res, status, JSON.stringify(obj));

function slugify(s) {
  return (
    String(s)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'event'
  );
}

function parseScalar(v) {
  v = v.trim();
  if (v.startsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.replace(/^"|"$/g, '');
    }
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  return v;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(parseScalar(listMatch[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (kv) {
      key = kv[1];
      const value = kv[2];
      if (value === '') {
        data[key] = [];
      } else {
        data[key] = parseScalar(value);
        key = null;
      }
    }
  }
  return { data, body: m[2] ?? '' };
}

const yq = (s) => JSON.stringify(String(s ?? ''));

function stringifyFrontmatter(d) {
  const out = ['---'];
  out.push(`title: ${yq(d.title)}`);
  out.push(`date: ${d.date}`);
  out.push(`location: ${yq(d.location)}`);
  if (d.series) out.push(`series: ${yq(d.series)}`);
  out.push(`cover: ${yq(d.cover)}`);
  out.push(`description: ${yq(d.description)}`);
  if (Array.isArray(d.photos) && d.photos.length) {
    out.push('photos:');
    for (const p of d.photos) out.push(`  - ${yq(p)}`);
  } else {
    out.push('photos: []');
  }
  out.push('---', '');
  return out.join('\n');
}

function normalizeEvent(d) {
  return {
    title: d.title ?? '',
    date: d.date ?? '',
    location: d.location ?? '',
    series: d.series ?? '',
    cover: d.cover ?? '',
    description: d.description ?? '',
    photos: Array.isArray(d.photos) ? d.photos.filter(Boolean) : [],
  };
}

// ---------- data ----------

async function listEvents() {
  const files = (await fs.readdir(EVENTS_DIR)).filter((f) => f.endsWith('.md'));
  const out = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(EVENTS_DIR, f), 'utf8');
    const { data } = parseFrontmatter(raw);
    out.push({ slug: f.replace(/\.md$/, ''), ...normalizeEvent(data) });
  }
  out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return out;
}

async function writeEvent(slug, data) {
  await fs.writeFile(path.join(EVENTS_DIR, slug + '.md'), stringifyFrontmatter(normalizeEvent(data)), 'utf8');
}

async function listUploads() {
  const files = await fs.readdir(UPLOADS_DIR).catch(() => []);
  return files
    .filter((f) => /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(f))
    .map((f) => ({ name: f, path: '/uploads/' + f }));
}

async function saveUpload({ name = 'photo', dataUrl }) {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl || '');
  if (!m) throw new Error('Invalid image data');
  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  const ext = IMAGE_EXT_BY_MIME[mime] || path.extname(name).toLowerCase() || '.jpg';
  const base = slugify(name.replace(/\.[^.]+$/, ''));
  let file = base + ext;
  let i = 1;
  while (existsSync(path.join(UPLOADS_DIR, file))) file = `${base}-${i++}${ext}`;
  await fs.writeFile(path.join(UPLOADS_DIR, file), buf);
  return '/uploads/' + file;
}

async function readPortfolio() {
  try {
    const data = JSON.parse(await fs.readFile(PORTFOLIO_FILE, 'utf8'));
    return { photos: Array.isArray(data.photos) ? data.photos.filter(Boolean) : [] };
  } catch {
    return { photos: [] };
  }
}

async function writePortfolio(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const photos = Array.isArray(data.photos) ? data.photos.filter(Boolean) : [];
  await fs.writeFile(PORTFOLIO_FILE, JSON.stringify({ photos }, null, 2) + '\n', 'utf8');
}

// ---------- http ----------

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('File too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveFile(res, filePath) {
  const resolved = path.resolve(filePath);
  const allowed = resolved.startsWith(UI_DIR) || resolved.startsWith(UPLOADS_DIR);
  if (!allowed || !existsSync(resolved)) return send(res, 404, 'Not found', 'text/plain');
  const buf = await fs.readFile(resolved);
  send(res, 200, buf, MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream');
}

async function api(req, res, p) {
  if (p === '/api/events' && req.method === 'GET') return json(res, 200, await listEvents());

  if (p === '/api/events' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const data = normalizeEvent(body);
    if (!data.title.trim() || !data.date || !data.cover) {
      return json(res, 400, { error: 'Title, date and cover image are required.' });
    }
    let slug = slugify(data.title);
    let i = 1;
    while (existsSync(path.join(EVENTS_DIR, slug + '.md'))) slug = `${slugify(data.title)}-${i++}`;
    await writeEvent(slug, data);
    return json(res, 200, { slug, ...data });
  }

  const m = p.match(/^\/api\/events\/(.+)$/);
  if (m) {
    const slug = decodeURIComponent(m[1]);
    const file = path.join(EVENTS_DIR, slug + '.md');
    if (!existsSync(file)) return json(res, 404, { error: 'Event not found.' });

    if (req.method === 'GET') {
      const { data } = parseFrontmatter(await fs.readFile(file, 'utf8'));
      return json(res, 200, { slug, ...normalizeEvent(data) });
    }
    if (req.method === 'PUT') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const data = normalizeEvent(body);
      if (!data.title.trim() || !data.date || !data.cover) {
        return json(res, 400, { error: 'Title, date and cover image are required.' });
      }
      await writeEvent(slug, data);
      return json(res, 200, { slug, ...data });
    }
    if (req.method === 'DELETE') {
      await fs.unlink(file);
      return json(res, 200, { ok: true });
    }
  }

  if (p === '/api/uploads' && req.method === 'GET') return json(res, 200, await listUploads());
  if (p === '/api/uploads' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    try {
      const saved = await saveUpload(body);
      return json(res, 200, { path: saved });
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  if (p === '/api/portfolio' && req.method === 'GET') return json(res, 200, await readPortfolio());
  if (p === '/api/portfolio' && req.method === 'PUT') {
    const body = JSON.parse((await readBody(req)) || '{}');
    await writePortfolio(body);
    return json(res, 200, await readPortfolio());
  }

  json(res, 404, { error: 'Not found.' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = url.pathname;

    if (p.startsWith('/api/')) return await api(req, res, p);
    if (p.startsWith('/uploads/')) {
      return await serveFile(res, path.join(UPLOADS_DIR, decodeURIComponent(p.slice('/uploads/'.length))));
    }
    if (p === '/' || p === '/index.html') return await serveFile(res, path.join(UI_DIR, 'index.html'));
    if (p === '/app.js') return await serveFile(res, path.join(UI_DIR, 'app.js'));
    if (p === '/style.css') return await serveFile(res, path.join(UI_DIR, 'style.css'));
    send(res, 404, 'Not found', 'text/plain');
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Admin running → http://localhost:${PORT}`);
  console.log(`  Editing      → ${path.relative(ROOT, EVENTS_DIR)} and public/uploads\n`);
  console.log('  Run "npm run dev" in another terminal to preview the live site.\n');
});
