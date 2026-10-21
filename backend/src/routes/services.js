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

  // Group services by category
  const categoriesWithServices = categories.map(cat => ({
    ...cat,
    services: services.filter(s => s.category_id === cat.id)
  }));

  res.json({ categories: categoriesWithServices, allServices: services });
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
  const { category_id, name, description, unit, price, sort_order } = req.body;
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

  const newService = await db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
  await logAudit(req.user, 'CREATE_SERVICE', 'services', result.lastInsertRowid, null, newService, req.ip);

  res.status(201).json({
    message: 'Service created successfully',
    service: newService
  });
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { category_id, name, description, unit, price, active, sort_order } = req.body;

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

  const updated = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  await logAudit(req.user, 'UPDATE_SERVICE_PRICE', 'services', id, existing, updated, req.ip);

  res.json({ message: 'Service updated successfully', service: updated });
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
