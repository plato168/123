-- Placeholder content. Replace with your own company data.
TRUNCATE site_settings, pages, milestones, services, product_categories, products, news, faqs RESTART IDENTITY CASCADE;

INSERT INTO site_settings (key, value) VALUES
  ('company_name', 'Service One Demo Co., Ltd.'),
  ('tagline',      'Reliable solutions, one partner.'),
  ('phone',        '+886-2-0000-0000'),
  ('fax',          '+886-2-0000-0001'),
  ('email',        'info@example.com'),
  ('address',      'No. 1, Example Rd., Taipei City, Taiwan'),
  ('hours',        'Mon - Fri, 09:00 - 18:00 (GMT+8)');

INSERT INTO pages (slug, title, summary, body) VALUES
  ('home-hero', 'Your One-Stop Service Partner',
   'Integrated products and services for businesses across Asia and beyond.',
   'We combine engineering expertise, dependable products and responsive support so that our customers can focus on growing their business.'),
  ('about', 'About Us',
   'Who we are and what drives us.',
   E'Founded in Taiwan, we provide integrated products and technical services to customers in manufacturing, logistics and retail.\n\nOur team of engineers and service specialists works closely with every customer, from initial consultation through installation and long-term maintenance.\n\nWe believe that quality, transparency and fast response are the foundation of lasting partnerships.'),
  ('mission', 'Our Mission',
   NULL,
   'To deliver dependable solutions and attentive service that create measurable value for our customers, employees and community.'),
  ('quality', 'Quality Policy',
   NULL,
   E'We follow a documented quality management system covering design, sourcing, production and after-sales service.\n\nEvery product is inspected before shipment, and customer feedback is reviewed regularly to drive continuous improvement.');

INSERT INTO milestones (year, description) VALUES
  (2005, 'Company founded in Taipei.'),
  (2010, 'Opened first regional service center.'),
  (2015, 'Launched the in-house product line.'),
  (2020, 'Expanded service network to Southeast Asia.'),
  (2025, 'Introduced online customer service portal.');

INSERT INTO services (slug, name, icon, summary, body, sort_order) VALUES
  ('consulting', 'Consulting & Planning', '🧭',
   'Needs assessment and solution design tailored to your operations.',
   E'Our consultants analyse your current workflow and recommend a practical plan, including equipment selection, budget and timeline.\n\nDeliverables include a written proposal, layout drawings and a risk checklist.', 1),
  ('installation', 'Installation & Integration', '🛠️',
   'On-site installation, configuration and system integration.',
   E'Certified technicians handle delivery, installation and commissioning, and integrate new equipment with your existing systems.\n\nWe provide acceptance testing and operator training on completion.', 2),
  ('maintenance', 'Maintenance Contracts', '🔧',
   'Preventive maintenance plans that keep downtime to a minimum.',
   E'Choose from basic, standard or premium plans with scheduled inspections, priority response and spare-part coverage.\n\nAll service visits are logged so you can review equipment history at any time.', 3),
  ('support', 'Technical Support', '📞',
   'Remote and on-site support by experienced engineers.',
   E'Reach our support desk by phone or email during business hours. Remote diagnosis resolves most issues quickly; on-site visits are dispatched when needed.', 4);

INSERT INTO product_categories (slug, name, sort_order) VALUES
  ('equipment',   'Equipment',   1),
  ('components',  'Components',  2),
  ('software',    'Software',    3);

INSERT INTO products (category_id, slug, name, model_no, summary, body, specs, sort_order) VALUES
  (1, 'sx-100', 'SX-100 Compact Unit', 'SX-100',
   'Space-saving unit for small production lines.',
   'The SX-100 offers dependable performance in a compact footprint, with a simple control panel and low maintenance requirements.',
   '{"Dimensions": "600 x 450 x 900 mm", "Weight": "48 kg", "Power": "AC 220V / 1.2 kW", "Warranty": "2 years"}', 1),
  (1, 'sx-300', 'SX-300 Industrial Unit', 'SX-300',
   'High-capacity unit for continuous operation.',
   'Designed for 24/7 operation, the SX-300 features redundant cooling, remote monitoring and a modular design for easy servicing.',
   '{"Dimensions": "1200 x 800 x 1500 mm", "Weight": "210 kg", "Power": "AC 380V / 5.5 kW", "Warranty": "3 years"}', 2),
  (2, 'cm-kit', 'CM Replacement Kit', 'CM-K01',
   'Genuine replacement parts kit for SX series.',
   'Includes filters, seals and fasteners for one scheduled maintenance cycle of SX-series units.',
   '{"Compatible": "SX-100, SX-300", "Contents": "12 items", "Interval": "Every 6 months"}', 1),
  (2, 'sensor-p2', 'P2 Precision Sensor', 'P2-S',
   'High-accuracy sensor module with digital output.',
   'The P2 sensor provides stable, high-resolution readings and connects via a standard digital interface.',
   '{"Accuracy": "±0.1%", "Output": "RS-485 / Modbus", "Operating temp.": "-10 to 60 °C"}', 2),
  (3, 'monitor-cloud', 'Monitor Cloud', 'MC-2026',
   'Web-based dashboard for equipment status and alerts.',
   'Monitor Cloud collects data from connected equipment and displays status, alarms and maintenance reminders on desktop and mobile browsers.',
   '{"Deployment": "Cloud / On-premise", "Users": "Unlimited", "Languages": "English, Chinese"}', 1);

INSERT INTO news (slug, title, summary, body, published_at) VALUES
  ('new-service-portal', 'Online Customer Service Portal Launched',
   'Customers can now submit and track service requests online.',
   E'Our new portal lets customers submit service requests, check progress and download service reports at any time.\n\nRegistered customers will receive login details by email.', '2026-09-15'),
  ('trade-show-2026', 'Meet Us at the 2026 Industry Expo',
   'Visit our booth to see the latest SX-series units.',
   E'We will exhibit our latest equipment and Monitor Cloud software at the 2026 Industry Expo in Taipei.\n\nOur engineers will be available for live demonstrations throughout the event.', '2026-08-20'),
  ('holiday-notice', 'Holiday Service Schedule',
   'Support hours during the upcoming national holidays.',
   'During national holidays our support desk will operate with limited hours. Emergency on-site service remains available for premium maintenance customers.', '2026-07-01');

INSERT INTO faqs (question, answer, sort_order) VALUES
  ('How do I request a quotation?', 'Use the contact form on this site or email us with your requirements. We usually reply within one business day.', 1),
  ('Do you ship overseas?', 'Yes. We ship to most countries in Asia, Europe and North America. Lead time depends on the destination and product.', 2),
  ('What does the warranty cover?', 'The warranty covers manufacturing defects in materials and workmanship. Consumable parts are excluded.', 3);
