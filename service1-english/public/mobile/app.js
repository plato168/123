const { get, esc, paras, router, submitContact } = Site;
const app = document.getElementById('app');
const drawer = document.getElementById('drawer');
const mask = document.getElementById('mask');
const backBtn = document.getElementById('back');

const toggleDrawer = (open) => { drawer.classList.toggle('open', open); mask.classList.toggle('show', open); };
document.getElementById('menu-btn').onclick = () => toggleDrawer(!drawer.classList.contains('open'));
mask.onclick = () => toggleDrawer(false);
drawer.addEventListener('click', (e) => { if (e.target.tagName === 'A') toggleDrawer(false); });
backBtn.onclick = () => history.back();

const render = (html, { back = false } = {}) => { backBtn.hidden = !back; app.innerHTML = html; window.scrollTo(0, 0); };
const head = (title) => `<h1 class="page-title">${esc(title)}</h1>`;
const item = (href, title, text, lead = '') => `
  <a class="item" href="${href}">${lead}<div class="item-body"><b>${esc(title)}</b><small>${esc(text)}</small></div><i>›</i></a>`;

const sitePromise = get('/site').then((site) => {
  document.getElementById('title').textContent = site.company_name;
  document.getElementById('drawer-head').innerHTML = `<b>${esc(site.company_name)}</b><small>${esc(site.tagline)}</small>`;
  return site;
});

const setActive = (section) => document.querySelectorAll('[data-nav]').forEach((a) =>
  a.classList.toggle('active', a.dataset.nav === section));

router({
  '': async () => {
    const [hero, services, products, news, site] = await Promise.all([
      get('/pages/home-hero'), get('/services'), get('/products'), get('/news?limit=3'), sitePromise]);
    render(`
      <section class="hero"><h1>${esc(hero.title)}</h1><p>${esc(hero.summary)}</p>
        <div class="hero-btns"><a class="btn" href="#/products">Products</a><a class="btn ghost" href="tel:${esc(site.phone.replace(/[^\d+]/g, ''))}">Call Us</a></div></section>
      <section class="block"><h2>Services</h2>
        <div class="tiles">${services.map((s) => `<a class="tile" href="#/services/${s.slug}"><span>${s.icon || ''}</span>${esc(s.name)}</a>`).join('')}</div></section>
      <section class="block"><h2>Products <a href="#/products">All ›</a></h2>
        <div class="hscroll">${products.map((p) => `<a class="pcard" href="#/products/${p.slug}"><div class="thumb">${esc(p.model_no || '')}</div><b>${esc(p.name)}</b></a>`).join('')}</div></section>
      <section class="block"><h2>Latest News <a href="#/news">All ›</a></h2>
        <div class="list">${news.map((n) => item(`#/news/${n.slug}`, n.title, n.date)).join('')}</div></section>`);
  },

  about: async () => {
    const [about, mission, quality, milestones] = await Promise.all([
      get('/pages/about'), get('/pages/mission'), get('/pages/quality'), get('/milestones')]);
    render(`${head(about.title)}
      <section class="block text">${paras(about.body)}</section>
      <details class="acc" open><summary>${esc(mission.title)}</summary>${paras(mission.body)}</details>
      <details class="acc"><summary>History</summary><ul class="timeline">${milestones.map((m) => `<li><b>${m.year}</b> ${esc(m.description)}</li>`).join('')}</ul></details>
      <details class="acc"><summary>${esc(quality.title)}</summary>${paras(quality.body)}</details>`);
  },

  services: async () => {
    const services = await get('/services');
    render(`${head('Services')}<div class="list">${services.map((s) => item(`#/services/${s.slug}`, s.name, s.summary, `<span class="lead-icon">${s.icon || ''}</span>`)).join('')}</div>`);
  },

  'services/:slug': async ({ slug }) => {
    const s = await get('/services/' + slug);
    render(`${head(s.name)}<section class="block text"><p class="lead">${esc(s.summary)}</p>${paras(s.body)}</section>
      <div class="sticky-cta"><a class="btn block-btn" href="#/contact">Ask about this service</a></div>`, { back: true });
  },

  products: async (_, q) => {
    const [cats, products] = await Promise.all([
      get('/categories'), get('/products' + (q.category ? '?category=' + encodeURIComponent(q.category) : ''))]);
    render(`${head('Products')}
      <div class="chips"><a href="#/products" class="${!q.category ? 'on' : ''}">All</a>${cats.map((c) => `<a href="#/products?category=${c.slug}" class="${q.category === c.slug ? 'on' : ''}">${esc(c.name)}</a>`).join('')}</div>
      <div class="list">${products.map((p) => item(`#/products/${p.slug}`, p.name, p.summary, `<span class="lead-thumb">${esc(p.model_no || '')}</span>`)).join('') || '<p class="block">No products.</p>'}</div>`);
  },

  'products/:slug': async ({ slug }) => {
    const p = await get('/products/' + slug);
    render(`<div class="thumb big">${esc(p.model_no || '')}</div>
      <section class="block text"><small class="muted">${esc(p.category_name)} · ${esc(p.model_no)}</small><h1 class="ptitle">${esc(p.name)}</h1>
        <p class="lead">${esc(p.summary)}</p>${paras(p.body)}</section>
      <details class="acc" open><summary>Specifications</summary>
        <dl class="specs">${Object.entries(p.specs).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>
      <div class="sticky-cta"><a class="btn block-btn" href="#/contact">Request a Quote</a></div>`, { back: true });
  },

  news: async () => {
    const news = await get('/news');
    render(`${head('News')}<div class="list">${news.map((n) => item(`#/news/${n.slug}`, n.title, `${n.date} · ${n.summary}`)).join('')}</div>`);
  },

  'news/:slug': async ({ slug }) => {
    const n = await get('/news/' + slug);
    render(`<section class="block text"><small class="muted">${n.date}</small><h1 class="ptitle">${esc(n.title)}</h1>${paras(n.body)}</section>`, { back: true });
  },

  faq: async () => {
    const faqs = await get('/faqs');
    render(`${head('FAQ')}${faqs.map((f) => `<details class="acc"><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}`);
  },

  contact: async () => {
    const site = await sitePromise;
    const tel = site.phone.replace(/[^\d+]/g, '');
    render(`${head('Contact Us')}
      <div class="quick">
        <a href="tel:${esc(tel)}">📞<span>Call</span></a>
        <a href="mailto:${esc(site.email)}">✉️<span>Email</span></a>
        <a href="https://maps.google.com/?q=${encodeURIComponent(site.address)}" target="_blank" rel="noopener">📍<span>Map</span></a>
      </div>
      <section class="block text small"><p>${esc(site.address)}<br>${esc(site.hours)}</p></section>
      <form id="contact-form" class="form block">
        <input name="name" placeholder="Name *" required maxlength="120" autocomplete="name">
        <input name="email" type="email" placeholder="Email *" required maxlength="200" autocomplete="email">
        <input name="phone" type="tel" placeholder="Phone" maxlength="60" autocomplete="tel">
        <input name="company" placeholder="Company" maxlength="200" autocomplete="organization">
        <input name="subject" placeholder="Subject" maxlength="200">
        <textarea name="message" rows="5" placeholder="Message *" required maxlength="5000"></textarea>
        <button class="btn block-btn" type="submit">Send</button>
        <p class="form-status" id="form-status"></p>
      </form>`);
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', (e) => { e.preventDefault(); submitContact(form, 'mobile', document.getElementById('form-status')); });
  },

  '*': (err) => render(`${head('Page not available')}<p class="block">${esc(err.message)}. <a href="#/">Home</a></p>`, { back: true }),
}, setActive);
