const { get, esc, paras, router, submitContact } = Site;
const app = document.getElementById('app');

const render = (html) => { app.innerHTML = html; window.scrollTo(0, 0); };
const banner = (title, crumbs = []) => `
  <section class="page-banner"><div class="wrap">
    <h1>${esc(title)}</h1>
    <div class="crumbs"><a href="#/">Home</a>${crumbs.map(([t, h]) => h ? ` / <a href="${h}">${esc(t)}</a>` : ` / ${esc(t)}`).join('')}</div>
  </div></section>`;

const card = (href, title, text, extra = '') => `
  <a class="card" href="${href}">${extra}<h3>${esc(title)}</h3><p>${esc(text)}</p><span class="more">Learn more →</span></a>`;

async function initChrome() {
  const [site, services, categories] = await Promise.all([get('/site'), get('/services'), get('/categories')]);
  document.getElementById('brand').textContent = site.company_name;
  document.getElementById('top-contact').textContent = `☎ ${site.phone}   ✉ ${site.email}`;
  document.getElementById('f-name').textContent = site.company_name;
  document.getElementById('f-tagline').textContent = site.tagline;
  document.getElementById('f-contact').innerHTML = [site.address, 'Tel: ' + site.phone, 'Fax: ' + site.fax, site.email].map(esc).join('<br>');
  document.getElementById('f-copy').textContent = site.company_name;
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('menu-services').innerHTML = services.map((s) => `<a href="#/services/${s.slug}">${esc(s.name)}</a>`).join('');
  document.getElementById('menu-products').innerHTML = categories.map((c) => `<a href="#/products?category=${c.slug}">${esc(c.name)}</a>`).join('');
  return site;
}
const sitePromise = initChrome();

const setActive = (section) => document.querySelectorAll('[data-nav]').forEach((a) =>
  a.classList.toggle('active', a.dataset.nav === section));

router({
  '': async () => {
    const [hero, services, products, news] = await Promise.all([
      get('/pages/home-hero'), get('/services'), get('/products'), get('/news?limit=3')]);
    render(`
      <section class="hero"><div class="wrap">
        <h1>${esc(hero.title)}</h1>
        <p class="lead">${esc(hero.summary)}</p>
        <p>${esc(hero.body)}</p>
        <div class="btns"><a class="btn" href="#/products">Our Products</a><a class="btn ghost" href="#/contact">Get a Quote</a></div>
      </div></section>
      <section class="wrap section">
        <h2 class="sec-title">Our Services</h2>
        <div class="grid g4">${services.map((s) => card(`#/services/${s.slug}`, s.name, s.summary, `<div class="icon">${s.icon || ''}</div>`)).join('')}</div>
      </section>
      <section class="band"><div class="wrap section">
        <h2 class="sec-title">Featured Products</h2>
        <div class="grid g3">${products.slice(0, 3).map((p) => card(`#/products/${p.slug}`, p.name, p.summary, `<div class="thumb">${esc(p.model_no || '')}</div>`)).join('')}</div>
      </div></section>
      <section class="wrap section">
        <h2 class="sec-title">Latest News</h2>
        <ul class="news-list">${news.map((n) => `<li><time>${n.date}</time><a href="#/news/${n.slug}">${esc(n.title)}</a></li>`).join('')}</ul>
        <p><a href="#/news">All news →</a></p>
      </section>`);
  },

  about: async (_, q) => {
    const [about, mission, quality, milestones] = await Promise.all([
      get('/pages/about'), get('/pages/mission'), get('/pages/quality'), get('/milestones')]);
    render(`${banner('About Us', [['About Us']])}
      <div class="wrap section two-col">
        <aside class="side">
          <a href="#/about">Company Profile</a><a href="#/about?section=history">History</a><a href="#/about?section=quality">Quality Policy</a>
        </aside>
        <article class="content">
          <h2>${esc(about.title)}</h2>${paras(about.body)}
          <h3>${esc(mission.title)}</h3>${paras(mission.body)}
          <h2 id="history">History</h2>
          <ul class="timeline">${milestones.map((m) => `<li><b>${m.year}</b><span>${esc(m.description)}</span></li>`).join('')}</ul>
          <h2 id="quality">${esc(quality.title)}</h2>${paras(quality.body)}
        </article>
      </div>`);
    if (q.section) document.getElementById(q.section)?.scrollIntoView();
  },

  services: async () => {
    const services = await get('/services');
    render(`${banner('Services', [['Services']])}
      <div class="wrap section"><div class="grid g2">${services.map((s) => card(`#/services/${s.slug}`, s.name, s.summary, `<div class="icon">${s.icon || ''}</div>`)).join('')}</div></div>`);
  },

  'services/:slug': async ({ slug }) => {
    const [s, all] = await Promise.all([get('/services/' + slug), get('/services')]);
    render(`${banner(s.name, [['Services', '#/services'], [s.name]])}
      <div class="wrap section two-col">
        <aside class="side">${all.map((x) => `<a href="#/services/${x.slug}" class="${x.slug === slug ? 'on' : ''}">${esc(x.name)}</a>`).join('')}</aside>
        <article class="content"><p class="lead">${esc(s.summary)}</p>${paras(s.body)}
          <a class="btn" href="#/contact">Ask about this service</a></article>
      </div>`);
  },

  products: async (_, q) => {
    const [cats, products] = await Promise.all([
      get('/categories'), get('/products' + (q.category ? '?category=' + encodeURIComponent(q.category) : ''))]);
    const current = cats.find((c) => c.slug === q.category);
    render(`${banner(current ? current.name : 'Products', [['Products', '#/products'], ...(current ? [[current.name]] : [])])}
      <div class="wrap section two-col">
        <aside class="side"><a href="#/products" class="${!current ? 'on' : ''}">All Products</a>
          ${cats.map((c) => `<a href="#/products?category=${c.slug}" class="${current?.slug === c.slug ? 'on' : ''}">${esc(c.name)} (${c.product_count})</a>`).join('')}</aside>
        <div class="content"><div class="grid g3">${products.map((p) => card(`#/products/${p.slug}`, p.name, p.summary, `<div class="thumb">${esc(p.model_no || '')}</div>`)).join('') || '<p>No products.</p>'}</div></div>
      </div>`);
  },

  'products/:slug': async ({ slug }) => {
    const p = await get('/products/' + slug);
    render(`${banner(p.name, [['Products', '#/products'], [p.category_name, `#/products?category=${p.category}`], [p.name]])}
      <div class="wrap section product">
        <div class="thumb big">${esc(p.model_no || '')}</div>
        <div>
          <p class="model">Model: ${esc(p.model_no)}</p>
          <p class="lead">${esc(p.summary)}</p>${paras(p.body)}
          <table class="specs">${Object.entries(p.specs).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
          <a class="btn" href="#/contact">Request a Quote</a>
        </div>
      </div>`);
  },

  news: async () => {
    const news = await get('/news');
    render(`${banner('News', [['News']])}
      <div class="wrap section">${news.map((n) => `
        <article class="news-item"><time>${n.date}</time><h3><a href="#/news/${n.slug}">${esc(n.title)}</a></h3><p>${esc(n.summary)}</p></article>`).join('')}</div>`);
  },

  'news/:slug': async ({ slug }) => {
    const n = await get('/news/' + slug);
    render(`${banner('News', [['News', '#/news'], [n.title]])}
      <article class="wrap section content narrow"><time>${n.date}</time><h2>${esc(n.title)}</h2>${paras(n.body)}<p><a href="#/news">← Back to news</a></p></article>`);
  },

  faq: async () => {
    const faqs = await get('/faqs');
    render(`${banner('FAQ', [['FAQ']])}
      <div class="wrap section narrow">${faqs.map((f) => `<details class="faq"><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}</div>`);
  },

  contact: async () => {
    const site = await sitePromise;
    render(`${banner('Contact Us', [['Contact Us']])}
      <div class="wrap section two-col contact">
        <div class="info">
          <h3>${esc(site.company_name)}</h3>
          <p>📍 ${esc(site.address)}</p><p>☎ ${esc(site.phone)}</p><p>📠 ${esc(site.fax)}</p><p>✉ ${esc(site.email)}</p><p>🕘 ${esc(site.hours)}</p>
        </div>
        <form id="contact-form" class="form">
          <div class="row"><label>Name *<input name="name" required maxlength="120"></label><label>Email *<input name="email" type="email" required maxlength="200"></label></div>
          <div class="row"><label>Company<input name="company" maxlength="200"></label><label>Phone<input name="phone" maxlength="60"></label></div>
          <label>Subject<input name="subject" maxlength="200"></label>
          <label>Message *<textarea name="message" rows="6" required maxlength="5000"></textarea></label>
          <button class="btn" type="submit">Send Message</button>
          <p class="form-status" id="form-status"></p>
        </form>
      </div>`);
    const form = document.getElementById('contact-form');
    form.addEventListener('submit', (e) => { e.preventDefault(); submitContact(form, 'web', document.getElementById('form-status')); });
  },

  '*': (err) => render(`${banner('Page not available')}<div class="wrap section"><p>${esc(err.message)}. <a href="#/">Back to home</a></p></div>`),
}, setActive);
