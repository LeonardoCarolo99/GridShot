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

// ---------- sidebar ----------

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

// ---------- editor ----------

function confirmDiscard() {
  return !dirty || confirm('Discard unsaved changes?');
}

async function openEvent(slug) {
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
      <div class="gallery" data-gallery>
        ${c.photos
          .map(
            (src, i) => `
          <div class="thumb" draggable="true" data-index="${i}">
            <img src="${esc(src)}" alt="" />
            <button class="thumb-remove" data-remove="${i}" aria-label="Remove photo">&times;</button>
          </div>`
          )
          .join('')}
        <div class="dropzone" data-dropzone><span>Drag photos here<br />or click to upload</span></div>
      </div>
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

  const dz = $('[data-dropzone]');
  const input = $('[data-file-input]');
  if (dz && input) {
    dz.addEventListener('click', () => input.click());
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('drag');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', async (e) => {
      e.preventDefault();
      dz.classList.remove('drag');
      await addFiles([...e.dataTransfer.files]);
    });
    input.onchange = () => addFiles([...input.files]);
  }

  $$('[data-remove]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      current.photos.splice(Number(b.dataset.remove), 1);
      dirty = true;
      renderEditor();
    };
  });

  let dragIndex = null;
  $$('.thumb').forEach((t) => {
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
      const [moved] = current.photos.splice(dragIndex, 1);
      current.photos.splice(to, 0, moved);
      dragIndex = null;
      dirty = true;
      renderEditor();
    });
  });

  $('[data-gallery-library]')?.addEventListener('click', () =>
    openLibrary((paths) => {
      current.photos.push(...paths);
      dirty = true;
      renderEditor();
    })
  );
}

async function addFiles(files) {
  if (!files.length) return;
  for (const f of files) current.photos.push(await uploadFile(f));
  dirty = true;
  renderEditor();
}

function pickFile(cb) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    if (input.files[0]) cb(await uploadFile(input.files[0]));
  };
  input.click();
}

// ---------- uploads ----------

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

// ---------- library modal ----------

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

// ---------- save / delete ----------

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

(async () => {
  try {
    await loadEvents();
  } catch (e) {
    toast('Could not load events: ' + e.message, true);
  }
  renderSidebar();
  renderEditor();
})();
