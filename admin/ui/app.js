const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const todayISO = () => new Date().toISOString().slice(0, 10);

let events = [];
let uploads = [];
let current = null;
let isNew = false;
let dirty = false;
let portfolio = { hero: '', photos: [] };
let portfolioDirty = false;
let view = 'events';

// ---------- api ----------

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ---------- views ----------

function setView(next) {
  if (next === view) return;
  if (view === 'events' && dirty && !confirmDiscard()) return;
  if (view === 'portfolio' && portfolioDirty && !confirm('Discard unsaved portfolio changes?')) return;
  view = next;
  updateTabs();
  renderMain();
}

function updateTabs() {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  $('#new-event').hidden = view !== 'events';
  $('#event-list').hidden = view !== 'events';
}

function renderMain() {
  if (view === 'portfolio') renderPortfolio();
  else renderEditor();
}

// ---------- sidebar / events ----------

function renderSidebar() {
  const list = $('#event-list');
  list.innerHTML =
    events
      .map(
        (e) => `
      <button class="event-item ${current && current.slug === e.slug ? 'active' : ''}" data-slug="${esc(e.slug)}">
        <img src="${esc(e.cover)}" alt="" loading="lazy" />
        <span class="ei-text"><strong>${esc(e.title)}</strong><small>${esc(e.date)}</small></span>
      </button>`
      )
      .join('') || '<p class="empty">No events yet.</p>';

  $$('#event-list .event-item').forEach((btn) => {
    btn.onclick = () => openEvent(btn.dataset.slug);
  });
}

async function loadEvents() {
  events = await api('/api/events');
}

function confirmDiscard() {
  return !dirty || confirm('Discard unsaved changes?');
}

async function openEvent(slug) {
  if (view !== 'events') {
    view = 'events';
    updateTabs();
  }
  if (!confirmDiscard()) return;
  const e = await api('/api/events/' + encodeURIComponent(slug));
  current = e;
  isNew = false;
  dirty = false;
  renderSidebar();
  renderEditor();
}

function newEvent() {
  if (!confirmDiscard()) return;
  current = { title: '', date: todayISO(), location: '', series: '', cover: '', description: '', photos: [] };
  isNew = true;
  dirty = false;
  renderSidebar();
  renderEditor();
  setTimeout(() => $('[data-field="title"]')?.focus(), 0);
}

// ---------- gallery component ----------

function thumbHtml(src, i) {
  return `<div class="thumb" draggable="true" data-index="${i}">
    <img src="${esc(src)}" alt="" />
    <button class="thumb-remove" data-remove="${i}" aria-label="Remove photo">&times;</button>
  </div>`;
}

const dropzoneHtml = () =>
  `<div class="dropzone" data-dropzone><span>Drag photos here<br />or click to upload</span></div>`;

function mountGallery({ grid, fileInput, photos, onChange }) {
  grid.innerHTML = photos.map((src, i) => thumbHtml(src, i)).join('') + dropzoneHtml();
  const dz = grid.querySelector('[data-dropzone]');

  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('drag');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', async (e) => {
    e.preventDefault();
    dz.classList.remove('drag');
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    for (const f of files) photos.push(await uploadFile(f));
    onChange();
  });

  fileInput.onchange = async () => {
    const files = [...fileInput.files];
    fileInput.value = '';
    if (!files.length) return;
    for (const f of files) photos.push(await uploadFile(f));
    onChange();
  };

  grid.querySelectorAll('[data-remove]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      photos.splice(Number(b.dataset.remove), 1);
      onChange();
    };
  });

  let dragIndex = null;
  grid.querySelectorAll('.thumb').forEach((t) => {
    t.addEventListener('dragstart', () => {
      dragIndex = Number(t.dataset.index);
      t.classList.add('dragging');
    });
    t.addEventListener('dragend', () => t.classList.remove('dragging'));
    t.addEventListener('dragover', (e) => e.preventDefault());
    t.addEventListener('drop', (e) => {
      e.preventDefault();
      const to = Number(t.dataset.index);
      if (dragIndex === null || dragIndex === to) return;
      const [moved] = photos.splice(dragIndex, 1);
      photos.splice(to, 0, moved);
      dragIndex = null;
      onChange();
    });
  });
}

// ---------- event editor ----------

function renderEditor() {
  const ed = $('#editor');
  if (!current) {
    ed.innerHTML = `<div class="placeholder"><h1>Select an event</h1><p class="lead">Choose an event from the list, or create a new one.</p></div>`;
    return;
  }
  const c = current;
  ed.innerHTML = `
    <div class="editor-head">
      <div>
        <p class="eyebrow">${isNew ? 'New event' : 'Editing'}</p>
        <h1>${esc(c.title || 'Untitled event')}</h1>
      </div>
      <div class="actions">
        ${isNew ? '' : '<button class="btn ghost" data-del>Delete</button>'}
        <button class="btn" data-save>Save</button>
      </div>
    </div>

    <div class="form-grid">
      <label>Title<input data-field="title" value="${esc(c.title)}" placeholder="WRC Portugal 2026" /></label>
      <label>Date<input type="date" data-field="date" value="${esc(c.date)}" /></label>
      <label>Location<input data-field="location" value="${esc(c.location)}" placeholder="Fafe, Portugal" /></label>
      <label>Series<input data-field="series" value="${esc(c.series)}" placeholder="World Rally Championship" /></label>
      <label class="full">Description<textarea data-field="description" rows="3" placeholder="A short intro for the event page.">${esc(c.description)}</textarea></label>
    </div>

    <section class="block">
      <div class="block-head">
        <h2>Cover image</h2>
        <button class="btn ghost small" data-cover-library>Choose from library</button>
      </div>
      <div class="cover ${c.cover ? 'has' : ''}" data-cover>
        ${
          c.cover
            ? `<img src="${esc(c.cover)}" alt="Cover" /><button class="cover-change btn ghost small" data-cover-change>Replace</button>`
            : `<div class="cover-empty">Drag an image here, or click to upload</div>`
        }
      </div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2>Gallery <span class="count">${c.photos.length} photo${c.photos.length === 1 ? '' : 's'}</span></h2>
        <button class="btn ghost small" data-gallery-library>Add from library</button>
      </div>
      <div class="gallery" data-gallery></div>
      <input type="file" accept="image/*" multiple hidden data-file-input />
    </section>
  `;

  wireEditor();
}

function wireEditor() {
  $$('[data-field]').forEach((el) => {
    el.oninput = () => {
      current[el.dataset.field] = el.value;
      dirty = true;
      if (el.dataset.field === 'title') {
        const h = $('.editor-head h1');
        if (h) h.textContent = current.title || 'Untitled event';
      }
    };
  });

  $('[data-save]')?.addEventListener('click', save);
  $('[data-del]')?.addEventListener('click', removeEvent);

  $('[data-cover-library]')?.addEventListener('click', () =>
    openLibrary((paths) => {
      if (paths[0]) current.cover = paths[0];
      dirty = true;
      renderEditor();
    })
  );

  const cover = $('[data-cover]');
  if (cover) {
    cover.addEventListener('click', (e) => {
      if (e.target.closest('[data-cover-change]')) return;
      pickFile(async (path) => {
        current.cover = path;
        dirty = true;
        renderEditor();
      });
    });
    cover.addEventListener('dragover', (e) => {
      e.preventDefault();
      cover.classList.add('drag');
    });
    cover.addEventListener('dragleave', () => cover.classList.remove('drag'));
    cover.addEventListener('drop', async (e) => {
      e.preventDefault();
      cover.classList.remove('drag');
      const f = e.dataTransfer.files[0];
      if (!f) return;
      current.cover = await uploadFile(f);
      dirty = true;
      renderEditor();
    });
  }

  mountGallery({
    grid: $('[data-gallery]'),
    fileInput: $('[data-file-input]'),
    photos: current.photos,
    onChange: () => {
      dirty = true;
      renderEditor();
    },
  });

  $('[data-gallery-library]')?.addEventListener('click', () =>
    openLibrary((paths) => {
      current.photos.push(...paths);
      dirty = true;
      renderEditor();
    })
  );
}

// ---------- portfolio editor ----------

function renderPortfolio() {
  const ed = $('#editor');
  ed.innerHTML = `
    <div class="editor-head">
      <div>
        <p class="eyebrow">Landing page</p>
        <h1>Portfolio</h1>
        <p class="muted" style="margin:.4rem 0 0">Set the hero image and pick the photos in the Portfolio grid. Drag to order, click &times; to remove.</p>
      </div>
      <div class="actions"><button class="btn" data-save-portfolio>Save</button></div>
    </div>

    <section class="block">
      <div class="block-head">
        <h2>Hero image</h2>
        <button class="btn ghost small" data-hero-library>Choose from library</button>
      </div>
      <div class="cover ${portfolio.hero ? 'has' : ''}" data-hero>
        ${
          portfolio.hero
            ? `<img src="${esc(portfolio.hero)}" alt="Hero" /><button class="cover-change btn ghost small" data-hero-change>Replace</button>`
            : `<div class="cover-empty">Drag an image here, or click to upload (PNG, JPG, WebP)</div>`
        }
      </div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2>Selected photos <span class="count">${portfolio.photos.length}</span></h2>
        <button class="btn ghost small" data-gallery-library>Add from library</button>
      </div>
      <div class="gallery" data-gallery></div>
      <input type="file" accept="image/*" multiple hidden data-file-input />
    </section>
  `;

  wireHero();

  mountGallery({
    grid: $('[data-gallery]'),
    fileInput: $('[data-file-input]'),
    photos: portfolio.photos,
    onChange: () => {
      portfolioDirty = true;
      renderPortfolio();
    },
  });

  $('[data-gallery-library]').onclick = () =>
    openLibrary((paths) => {
      portfolio.photos.push(...paths);
      portfolioDirty = true;
      renderPortfolio();
    });

  $('[data-save-portfolio]').onclick = savePortfolio;
}

function wireHero() {
  $('[data-hero-library]')?.addEventListener('click', () =>
    openLibrary((paths) => {
      if (paths[0]) portfolio.hero = paths[0];
      portfolioDirty = true;
      renderPortfolio();
    })
  );

  const hero = $('[data-hero]');
  if (!hero) return;
  hero.addEventListener('click', (e) => {
    if (e.target.closest('[data-hero-change]')) return;
    pickFile(async (path) => {
      portfolio.hero = path;
      portfolioDirty = true;
      renderPortfolio();
    });
  });
  hero.addEventListener('dragover', (e) => {
    e.preventDefault();
    hero.classList.add('drag');
  });
  hero.addEventListener('dragleave', () => hero.classList.remove('drag'));
  hero.addEventListener('drop', async (e) => {
    e.preventDefault();
    hero.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (!f) return;
    portfolio.hero = await uploadFile(f);
    portfolioDirty = true;
    renderPortfolio();
  });
}

async function savePortfolio() {
  try {
    portfolio = await api('/api/portfolio', {
      method: 'PUT',
      body: JSON.stringify({ hero: portfolio.hero, photos: portfolio.photos }),
    });
    portfolioDirty = false;
    renderPortfolio();
    toast('Portfolio saved');
  } catch (e) {
    toast(e.message, true);
  }
}

// ---------- uploads / library ----------

function pickFile(cb) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    if (input.files[0]) cb(await uploadFile(input.files[0]));
  };
  input.click();
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadFile(file) {
  const dataUrl = await readAsDataURL(file);
  const { path } = await api('/api/uploads', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, dataUrl }),
  });
  return path;
}

async function openLibrary(onPick) {
  uploads = await api('/api/uploads');
  const modal = $('#modal');
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-head">
        <h2>Media library</h2>
        <button class="btn ghost small" data-close>Close</button>
      </div>
      <div class="lib-grid">
        ${
          uploads
            .map(
              (u) => `<button class="lib-item" data-path="${esc(u.path)}" title="${esc(u.name)}"><img src="${esc(u.path)}" alt="" loading="lazy" /></button>`
            )
            .join('') || '<p class="empty">Nothing uploaded yet.</p>'
        }
      </div>
      <div class="modal-foot">
        <span class="muted">Click an image to select.</span>
        <input type="file" accept="image/*" multiple hidden data-lib-upload />
        <button class="btn" data-lib-upload-btn>Upload new</button>
      </div>
    </div>`;

  modal.hidden = false;
  const close = () => {
    modal.hidden = true;
    modal.innerHTML = '';
  };

  $('[data-close]', modal).onclick = close;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  $$('.lib-item', modal).forEach((b) => {
    b.onclick = () => {
      onPick([b.dataset.path]);
      close();
    };
  });

  const upInput = $('[data-lib-upload]', modal);
  $('[data-lib-upload-btn]', modal).onclick = () => upInput.click();
  upInput.onchange = async () => {
    const added = [];
    for (const f of [...upInput.files]) added.push(await uploadFile(f));
    if (added.length) {
      onPick(added);
      close();
    }
  };
}

// ---------- save / delete event ----------

async function save() {
  if (!current.title.trim()) return toast('Title is required', true);
  if (!current.date) return toast('Date is required', true);
  if (!current.cover) return toast('Cover image is required', true);

  try {
    if (isNew) {
      current = await api('/api/events', { method: 'POST', body: JSON.stringify(current) });
      isNew = false;
    } else {
      await api('/api/events/' + encodeURIComponent(current.slug), {
        method: 'PUT',
        body: JSON.stringify(current),
      });
    }
    dirty = false;
    await loadEvents();
    renderSidebar();
    renderEditor();
    toast('Saved');
  } catch (e) {
    toast(e.message, true);
  }
}

async function removeEvent() {
  if (!confirm(`Delete "${current.title}"? This cannot be undone.`)) return;
  await api('/api/events/' + encodeURIComponent(current.slug), { method: 'DELETE' });
  current = null;
  isNew = false;
  dirty = false;
  await loadEvents();
  renderSidebar();
  renderEditor();
  toast('Deleted');
}

// ---------- toast ----------

function toast(msg, error = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (error ? ' error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

// ---------- boot ----------

$('#new-event').onclick = newEvent;
$$('.tab').forEach((t) => (t.onclick = () => setView(t.dataset.view)));

(async () => {
  try {
    await loadEvents();
  } catch (e) {
    toast('Could not load events: ' + e.message, true);
  }
  try {
    portfolio = await api('/api/portfolio');
  } catch {}
  renderSidebar();
  updateTabs();
  renderMain();
})();
