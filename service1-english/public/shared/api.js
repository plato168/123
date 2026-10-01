// Shared helpers for both the desktop (/web) and mobile (/m) front ends.
window.Site = (() => {
  async function get(path) {
    const res = await fetch('/api' + path);
    if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : 'Request failed');
    return res.json();
  }

  async function post(path, data) {
    const res = await fetch('/api' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body.errors || [body.error || 'Request failed']).join(' '));
    return body;
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Plain text with blank-line paragraphs -> <p> blocks
  const paras = (s) => String(s ?? '').split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('');

  // Minimal hash router: routes = { 'news/:slug': fn, ... }
  function router(routes, onChange) {
    const patterns = Object.entries(routes).filter(([pattern]) => pattern !== '*').map(([pattern, fn]) => {
      const keys = [];
      const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
      return { re, keys, fn };
    });
    async function run() {
      const hash = location.hash.replace(/^#\/?/, '');
      const [route, qs] = hash.split('?');
      const query = Object.fromEntries(new URLSearchParams(qs || ''));
      for (const { re, keys, fn } of patterns) {
        const m = route.match(re);
        if (m) {
          const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
          onChange && onChange(route.split('/')[0] || 'home');
          try { await fn(params, query); } catch (e) { routes['*'](e); }
          return;
        }
      }
      routes['*'](new Error('Not found'));
    }
    window.addEventListener('hashchange', run);
    run();
  }

  async function submitContact(form, source, statusEl) {
    const data = Object.fromEntries(new FormData(form));
    data.source = source;
    statusEl.className = 'form-status';
    statusEl.textContent = 'Sending…';
    try {
      await post('/contact', data);
      form.reset();
      statusEl.className = 'form-status ok';
      statusEl.textContent = 'Thank you! Your message has been sent. We will reply soon.';
    } catch (e) {
      statusEl.className = 'form-status err';
      statusEl.textContent = e.message;
    }
  }

  return { get, post, esc, paras, router, submitContact };
})();
