const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.use(authenticateToken);

// Get all service categories with their services
router.get('/', async (req, res) => {
  const { all } = req.query;
  let catQuery = 'SELECT * FROM service_categories';
  if (all !== 'true') {
    catQuery += ' WHERE active = 1';
  }
  catQuery += ' ORDER BY sort_order ASC, name ASC';

  const categories = await db.prepare(catQuery).all();

  let svcQuery = 'SELECT * FROM services';
  if (all !== 'true') {
    svcQuery += ' WHERE active = 1';
  }
  svcQuery += ' ORDER BY sort_order ASC, name ASC';

  const services = await db.prepare(svcQuery).all();

  // Load event-specific pricing overrides
  const eventPriceMap = {};
  try {
    const epRows = await db.prepare('SELECT service_id, event_type_id, price FROM service_event_prices').all();
    for (const r of epRows) {
      if (!eventPriceMap[r.service_id]) eventPriceMap[r.service_id] = {};
      eventPriceMap[r.service_id][r.event_type_id] = Number(r.price);
    }
  } catch (err) {
    // If table doesn't exist yet, continue gracefully
  }

  const enrichedServices = services.map(s => ({
    ...s,
    event_prices: eventPriceMap[s.id] || {}
  }));

  // Group services by category
  const categoriesWithServices = categories.map(cat => ({
    ...cat,
    services: enrichedServices.filter(s => s.category_id === cat.id)
  }));

  res.json({ categories: categoriesWithServices, allServices: enrichedServices });
});

// Category operations (Admin only)
router.post('/categories', requireAdmin, async (req, res) => {
  const { name, description, sort_order } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const existing = await db.prepare('SELECT id FROM service_categories WHERE name = ? COLLATE NOCASE').get(name.trim());
  if (existing) {
    return res.status(400).json({ error: 'A category with this name already exists.' });
  }

  const result = await db.prepare(`
    INSERT INTO service_categories (name, description, sort_order)
    VALUES (?, ?, ?)
  `).run(name.trim(), description || null, sort_order || 0);

  await logAudit(req.user, 'CREATE_CATEGORY', 'service_categories', result.lastInsertRowid, null, { name }, req.ip);

  res.status(201).json({
    message: 'Category created successfully',
    category: { id: result.lastInsertRowid, name: name.trim(), description, active: 1, sort_order: sort_order || 0 }
  });
});

router.put('/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, active, sort_order } = req.body;

  const existing = await db.prepare('SELECT * FROM service_categories WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  await db.prepare(`
    UPDATE service_categories SET
      name = ?, description = ?, active = ?, sort_order = ?
    WHERE id = ?
  `).run(
    name ? name.trim() : existing.name,
    description !== undefined ? description : existing.description,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    sort_order !== undefined ? sort_order : existing.sort_order,
    id
  );

  await logAudit(req.user, 'UPDATE_CATEGORY', 'service_categories', id, existing, { name, active }, req.ip);

  res.json({ message: 'Category updated successfully' });
});

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const servicesCount = await db.prepare('SELECT COUNT(*) as count FROM services WHERE category_id = ?').get(id);
  if (servicesCount && Number(servicesCount.count) > 0) {
    await db.prepare('UPDATE service_categories SET active = 0 WHERE id = ?').run(id);
    return res.json({ message: 'Category contains active services. It has been deactivated.' });
  }

  await db.prepare('DELETE FROM service_categories WHERE id = ?').run(id);
  await logAudit(req.user, 'DELETE_CATEGORY', 'service_categories', id, null, null, req.ip);
  res.json({ message: 'Category deleted successfully' });
});

// Service operations (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { category_id, name, description, unit, price, sort_order, event_prices } = req.body;
  if (!category_id) {
    return res.status(400).json({ error: 'Category is required.' });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Service name is required.' });
  }
  if (price === undefined || price === null || isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'Valid price (>= 0) is required.' });
  }

  const result = await db.prepare(`
    INSERT INTO services (category_id, name, description, unit, price, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(category_id, name.trim(), description || null, unit || 'Event', Number(price), sort_order || 0);

  const newServiceId = result.lastInsertRowid;

  // Save event-specific prices if provided
  if (event_prices && typeof event_prices === 'object') {
    for (const [etId, evPrice] of Object.entries(event_prices)) {
      if (evPrice !== '' && evPrice !== null && !isNaN(Number(evPrice))) {
        try {
          await db.prepare(`
            INSERT INTO service_event_prices (service_id, event_type_id, price)
            VALUES (?, ?, ?)
            ON CONFLICT (service_id, event_type_id) DO UPDATE SET price = excluded.price, updated_at = CURRENT_TIMESTAMP
          `).run(newServiceId, Number(etId), Number(evPrice));
        } catch (e) {
          console.warn('Failed to insert service_event_price:', e.message);
        }
      }
    }
  }

  const newService = await db.prepare('SELECT * FROM services WHERE id = ?').get(newServiceId);
  const epRows = await db.prepare('SELECT event_type_id, price FROM service_event_prices WHERE service_id = ?').all(newServiceId).catch(() => []);
  const epMap = {};
  for (const r of epRows) epMap[r.event_type_id] = Number(r.price);
  newService.event_prices = epMap;

  await logAudit(req.user, 'CREATE_SERVICE', 'services', newServiceId, null, newService, req.ip);

  res.status(201).json({
    message: 'Service created successfully',
    service: newService
  });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { category_id, name, description, unit, price, active, sort_order, event_prices } = req.body;

  const existing = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  await db.prepare(`
    UPDATE services SET
      category_id = ?,
      name = ?,
      description = ?,
      unit = ?,
      price = ?,
      active = ?,
      sort_order = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    category_id || existing.category_id,
    name ? name.trim() : existing.name,
    description !== undefined ? description : existing.description,
    unit || existing.unit,
    price !== undefined ? Number(price) : existing.price,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    sort_order !== undefined ? sort_order : existing.sort_order,
    id
  );

  // Update event-specific prices if provided
  if (event_prices && typeof event_prices === 'object') {
    for (const [etId, evPrice] of Object.entries(event_prices)) {
      try {
        if (evPrice === '' || evPrice === null || isNaN(Number(evPrice))) {
          await db.prepare('DELETE FROM service_event_prices WHERE service_id = ? AND event_type_id = ?').run(id, Number(etId));
        } else {
          await db.prepare(`
            INSERT INTO service_event_prices (service_id, event_type_id, price)
            VALUES (?, ?, ?)
            ON CONFLICT (service_id, event_type_id) DO UPDATE SET price = excluded.price, updated_at = CURRENT_TIMESTAMP
          `).run(id, Number(etId), Number(evPrice));
        }
      } catch (e) {
        console.warn('Failed to update service_event_price:', e.message);
      }
    }
  }

  const updated = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  const epRows = await db.prepare('SELECT event_type_id, price FROM service_event_prices WHERE service_id = ?').all(id).catch(() => []);
  const epMap = {};
  for (const r of epRows) epMap[r.event_type_id] = Number(r.price);
  updated.event_prices = epMap;

  await logAudit(req.user, 'UPDATE_SERVICE_PRICE', 'services', id, existing, updated, req.ip);

  res.json({ message: 'Service updated successfully', service: updated });
});

// Directly set all event prices for a service
router.put('/:id/event-prices', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { event_prices } = req.body; // { [event_type_id]: price }

  const service = await db.prepare('SELECT id FROM services WHERE id = ?').get(id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  if (event_prices && typeof event_prices === 'object') {
    for (const [etId, evPrice] of Object.entries(event_prices)) {
      try {
        if (evPrice === '' || evPrice === null || isNaN(Number(evPrice))) {
          await db.prepare('DELETE FROM service_event_prices WHERE service_id = ? AND event_type_id = ?').run(id, Number(etId));
        } else {
          await db.prepare(`
            INSERT INTO service_event_prices (service_id, event_type_id, price)
            VALUES (?, ?, ?)
            ON CONFLICT (service_id, event_type_id) DO UPDATE SET price = excluded.price, updated_at = CURRENT_TIMESTAMP
          `).run(id, Number(etId), Number(evPrice));
        }
      } catch (e) {
        console.warn('Failed to set service_event_price:', e.message);
      }
    }
  }

  const epRows = await db.prepare('SELECT event_type_id, price FROM service_event_prices WHERE service_id = ?').all(id).catch(() => []);
  const epMap = {};
  for (const r of epRows) epMap[r.event_type_id] = Number(r.price);

  res.json({ message: 'Event prices updated successfully', event_prices: epMap });
});

// Quick set price for a single (service, event_type) - accessible to staff & admin
router.post('/set-event-price', async (req, res) => {
  const { service_id, event_type_id, price } = req.body;
  if (!service_id || !event_type_id || price === undefined || isNaN(Number(price))) {
    return res.status(400).json({ error: 'service_id, event_type_id, and valid price are required.' });
  }

  try {
    await db.prepare(`
      INSERT INTO service_event_prices (service_id, event_type_id, price)
      VALUES (?, ?, ?)
      ON CONFLICT (service_id, event_type_id) DO UPDATE SET price = excluded.price, updated_at = CURRENT_TIMESTAMP
    `).run(Number(service_id), Number(event_type_id), Number(price));

    res.json({
      message: 'Event price configured successfully',
      service_id: Number(service_id),
      event_type_id: Number(event_type_id),
      price: Number(price)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save event price', details: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const existing = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  // Check if used in quotation items
  const used = await db.prepare('SELECT COUNT(*) as count FROM quotation_items WHERE service_id = ?').get(id);
  if (used && Number(used.count) > 0) {
    await db.prepare('UPDATE services SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    return res.json({ message: 'Service is referenced in quotations. It has been deactivated instead of deleted.' });
  }

  await db.prepare('DELETE FROM services WHERE id = ?').run(id);
  await logAudit(req.user, 'DELETE_SERVICE', 'services', id, existing, null, req.ip);
  res.json({ message: 'Service deleted successfully' });
});

module.exports = router;
