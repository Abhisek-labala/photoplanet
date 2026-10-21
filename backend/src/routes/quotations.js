const express = require('express');
const router = express.Router();
const { db, getNextQuotationNumber } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { generateQuotationPdf } = require('../utils/pdfGenerator');

router.use(authenticateToken);

// Safe monetary rounding to 2 decimals
function roundCurrency(val) {
  return Math.round((Number(val) || 0) * 100) / 100;
}

// List quotations with filters
router.get('/', async (req, res) => {
  try {
    const { search, status, clientId, startDate, endDate, includeArchived } = req.query;
    let query = `
      SELECT q.*, 
             c.name as client_name, 
             c.mobile as client_mobile, 
             c.client_code,
             u.name as created_by_name,
             (SELECT COUNT(DISTINCT qe.id) FROM quotation_events qe WHERE qe.quotation_id = q.id) as events_count,
             (SELECT COUNT(qi.id) FROM quotation_items qi WHERE qi.quotation_id = q.id) as items_count
      FROM quotations q
      JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Role check: non-admin can only see their own created quotations
    if (req.user.role !== 'ADMIN') {
      query += ' AND q.created_by = ?';
      params.push(req.user.id);
    }

    if (includeArchived !== 'true') {
      query += ' AND q.archived = 0';
    }

    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    if (clientId) {
      query += ' AND q.client_id = ?';
      params.push(clientId);
    }

    if (startDate) {
      query += ' AND q.quotation_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND q.quotation_date <= ?';
      params.push(endDate);
    }

    if (search && search.trim()) {
      query += ` AND (
        q.quotation_number LIKE ? OR 
        c.name LIKE ? OR 
        c.mobile LIKE ? OR 
        c.client_code LIKE ?
      )`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY q.created_at DESC';

    const quotations = await db.prepare(query).all(...params);
    res.json({ quotations });
  } catch (err) {
    console.error('List quotations error:', err);
    res.status(500).json({ error: 'Failed to retrieve quotations', details: err.message });
  }
});

// Get single quotation with complete details, events, snapshot items, payment terms, and status history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const quotation = await db.prepare(`
      SELECT q.*, 
             c.name as client_name, 
             c.mobile as client_mobile, 
             c.alternate_mobile as client_alternate_mobile,
             c.email as client_email, 
             c.address as client_address,
             c.city as client_city, 
             c.state as client_state, 
             c.pincode as client_pincode,
             c.client_code,
             u.name as created_by_name
      FROM quotations q
      JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = ?
    `).get(id);

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    if (req.user.role !== 'ADMIN' && quotation.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view quotations created by you.' });
    }

    const events = await db.prepare(`
      SELECT qe.*, e.event_name as original_event_name
      FROM quotation_events qe
      LEFT JOIN events e ON qe.event_id = e.id
      WHERE qe.quotation_id = ?
      ORDER BY qe.sort_order ASC, qe.event_date ASC
    `).all(id);

    const items = await db.prepare(`
      SELECT qi.*
      FROM quotation_items qi
      WHERE qi.quotation_id = ?
      ORDER BY qi.sort_order ASC, qi.id ASC
    `).all(id);

    // Group items by quotation_event_id
    const eventsWithItems = events.map(evt => ({
      ...evt,
      items: items.filter(it => it.quotation_event_id === evt.id)
    }));

    const paymentTerms = await db.prepare(`
      SELECT * FROM quotation_payment_terms
      WHERE quotation_id = ?
      ORDER BY sort_order ASC, id ASC
    `).all(id);

    const statusHistory = await db.prepare(`
      SELECT * FROM quotation_status_history
      WHERE quotation_id = ?
      ORDER BY created_at DESC
    `).all(id);

    // Also include studio settings snapshot for print/preview
    const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });

    res.json({
      quotation,
      events: eventsWithItems,
      items,
      paymentTerms,
      statusHistory,
      settings
    });
  } catch (err) {
    console.error('Get quotation error:', err);
    res.status(500).json({ error: 'Failed to retrieve quotation', details: err.message });
  }
});

// Helper to calculate totals safely
function calculateQuotationTotals(eventsData, discountType, discountValue, additionalCharges, taxEnabled, taxPercentage) {
  let subtotal = 0;

  eventsData.forEach(evt => {
    (evt.items || []).forEach(item => {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.unit_price) || 0;
      const discount = Number(item.discount) || 0;
      const itemTotal = roundCurrency(Math.max(0, (qty * price) - discount));
      item.total = itemTotal;
      subtotal += itemTotal;
    });
  });

  subtotal = roundCurrency(subtotal);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = roundCurrency((subtotal * (Number(discountValue) || 0)) / 100);
  } else {
    discountAmount = roundCurrency(Number(discountValue) || 0);
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const extraCharges = roundCurrency(Number(additionalCharges) || 0);
  const afterDiscount = Math.max(0, subtotal - discountAmount + extraCharges);

  let taxAmount = 0;
  if (taxEnabled) {
    taxAmount = roundCurrency((afterDiscount * (Number(taxPercentage) || 0)) / 100);
  }

  const grandTotal = roundCurrency(afterDiscount + taxAmount);

  return {
    subtotal,
    discountAmount,
    extraCharges,
    taxAmount,
    grandTotal
  };
}

// Create quotation
router.post('/', async (req, res) => {
  try {
    const {
      client_id,
      quotation_date,
      valid_until,
      discount_type,
      discount_value,
      additional_charges,
      tax_enabled,
      tax_percentage,
      status,
      notes,
      terms,
      events,
      payment_terms
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'Client selection is required.' });
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'At least one event is required in the quotation.' });
    }

    const totalItems = events.reduce((acc, evt) => acc + (evt.items ? evt.items.length : 0), 0);
    if (totalItems === 0) {
      return res.status(400).json({ error: 'At least one service item must be selected.' });
    }

    const client = await db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
    if (!client) {
      return res.status(400).json({ error: 'Client not found.' });
    }

    // Calculate totals
    const totals = calculateQuotationTotals(
      events,
      discount_type || 'percentage',
      discount_value || 0,
      additional_charges || 0,
      !!tax_enabled,
      tax_percentage !== undefined ? tax_percentage : 18
    );

    const quotationNumber = await getNextQuotationNumber();
    const qDate = quotation_date || new Date().toISOString().split('T')[0];

    // Default terms from settings if not provided
    let finalTerms = terms;
    if (!finalTerms) {
      const termsRow = await db.prepare("SELECT value FROM settings WHERE key = 'default_terms'").get();
      finalTerms = termsRow ? termsRow.value : '';
    }

    const newQuotationId = await db.transaction(async (tx) => {
      const qResult = await tx.prepare(`
        INSERT INTO quotations (
          quotation_number, client_id, quotation_date, valid_until,
          subtotal, discount_type, discount_value, discount_amount,
          additional_charges, tax_enabled, tax_percentage, tax_amount,
          grand_total, status, notes, terms, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quotationNumber,
        client_id,
        qDate,
        valid_until || null,
        totals.subtotal,
        discount_type || 'percentage',
        discount_value || 0,
        totals.discountAmount,
        totals.extraCharges,
        tax_enabled ? 1 : 0,
        tax_percentage !== undefined ? Number(tax_percentage) : 18,
        totals.taxAmount,
        totals.grandTotal,
        'Draft',
        notes || null,
        finalTerms,
        req.user.id
      );

      const quotationId = qResult.lastInsertRowid;

      for (let evtIdx = 0; evtIdx < events.length; evtIdx++) {
        const evt = events[evtIdx];
        const eRes = await tx.prepare(`
          INSERT INTO quotation_events (
            quotation_id, event_id, event_date, event_type, venue, requirements, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          quotationId,
          evt.event_id || null,
          evt.event_date || qDate,
          evt.event_type || 'Event',
          evt.venue || null,
          evt.requirements || null,
          evtIdx + 1
        );
        const quotationEventId = eRes.lastInsertRowid;

        const items = evt.items || [];
        for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
          const item = items[itemIdx];
          await tx.prepare(`
            INSERT INTO quotation_items (
              quotation_id, quotation_event_id, service_id, service_name_snapshot,
              description_snapshot, quantity, unit, unit_price, discount, total, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            quotationId,
            quotationEventId,
            item.service_id || null,
            item.service_name || item.service_name_snapshot || 'Service',
            item.description || item.description_snapshot || null,
            Number(item.quantity) || 1,
            item.unit || 'Event',
            Number(item.unit_price) || 0,
            Number(item.discount) || 0,
            Number(item.total) || 0,
            itemIdx + 1
          );
        }
      }

      // Payment schedule
      let finalPaymentTerms = payment_terms;
      if (!finalPaymentTerms || !finalPaymentTerms.length) {
        const defaultScheduleRow = await tx.prepare("SELECT value FROM settings WHERE key = 'default_payment_schedule'").get();
        if (defaultScheduleRow) {
          try {
            finalPaymentTerms = JSON.parse(defaultScheduleRow.value);
          } catch {
            finalPaymentTerms = [];
          }
        }
      }

      if (finalPaymentTerms && finalPaymentTerms.length) {
        for (let idx = 0; idx < finalPaymentTerms.length; idx++) {
          const pt = finalPaymentTerms[idx];
          const pct = Number(pt.percentage) || 0;
          const amt = roundCurrency((totals.grandTotal * pct) / 100);
          await tx.prepare(`
            INSERT INTO quotation_payment_terms (
              quotation_id, milestone, percentage, amount, due_date, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            quotationId,
            pt.milestone || `Milestone ${idx + 1}`,
            pct,
            amt,
            pt.due_date || null,
            idx + 1
          );
        }
      }

      // Status log
      await tx.prepare(`
        INSERT INTO quotation_status_history (quotation_id, user_id, username, old_status, new_status, notes)
        VALUES (?, ?, ?, null, 'Draft', 'Quotation created')
      `).run(quotationId, req.user.id, req.user.username);

      return quotationId;
    });

    if (status === 'Converted to Booking') {
      await syncQuotationEventsToShoots(newQuotationId);
    }
    await logAudit(req.user, 'CREATE_QUOTATION', 'quotations', newQuotationId, null, { quotationNumber, grandTotal: totals.grandTotal }, req.ip);

    res.status(201).json({
      message: 'Quotation created successfully',
      quotationId: newQuotationId,
      quotationNumber
    });
  } catch (err) {
    console.error('Create quotation error:', err);
    res.status(500).json({ error: 'Failed to create quotation', details: err.message });
  }
});

// Synchronize events from a quotation into the master Shoots & Events table
async function syncQuotationEventsToShoots(quotationId) {
  const quotation = await db.prepare('SELECT * FROM quotations WHERE id = ?').get(quotationId);
  if (!quotation) return;

  const client = await db.prepare('SELECT * FROM clients WHERE id = ?').get(quotation.client_id);
  const qEvents = await db.prepare('SELECT * FROM quotation_events WHERE quotation_id = ? ORDER BY sort_order ASC').all(quotationId);

  for (const qe of qEvents) {
    // Collect requirements / service names for this event
    let eventRequirements = qe.requirements || '';
    const items = await db.prepare('SELECT service_name_snapshot FROM quotation_items WHERE quotation_event_id = ?').all(qe.id);
    const itemNames = items.map(it => it.service_name_snapshot).filter(Boolean).join(', ');
    if (!eventRequirements && itemNames) {
      eventRequirements = itemNames;
    } else if (eventRequirements && itemNames && !eventRequirements.includes(itemNames)) {
      eventRequirements = `${eventRequirements} | ${itemNames}`;
    }

    // Match event_type_id
    let eventTypeId = null;
    if (qe.event_type) {
      const matchedType = await db.prepare('SELECT id FROM event_types WHERE LOWER(name) = LOWER(?)').get(qe.event_type);
      if (matchedType) {
        eventTypeId = matchedType.id;
      }
    }

    const eventName = client ? `${client.name} - ${qe.event_type}` : qe.event_type;
    const eventNotes = `Auto-scheduled from Quotation ${quotation.quotation_number}`;

    if (qe.event_id) {
      // Update existing event to Confirmed
      const existingEvt = await db.prepare('SELECT id FROM events WHERE id = ?').get(qe.event_id);
      if (existingEvt) {
        await db.prepare(`
          UPDATE events SET
            status = 'Confirmed',
            event_name = COALESCE(?, event_name),
            event_date = COALESCE(?, event_date),
            venue = COALESCE(?, venue),
            city = COALESCE(?, city),
            requirements = COALESCE(?, requirements),
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(eventName, qe.event_date, qe.venue, client ? client.city : null, eventRequirements, eventNotes, qe.event_id);
        continue;
      }
    }

    // Check if an event already exists for this client, date and name to avoid duplicate records
    const existingEvent = await db.prepare(`
      SELECT id FROM events 
      WHERE client_id = ? AND event_date = ? AND event_name = ?
    `).get(quotation.client_id, qe.event_date, eventName);

    let targetEventId;
    if (existingEvent) {
      targetEventId = existingEvent.id;
      await db.prepare(`
        UPDATE events SET 
          status = 'Confirmed',
          venue = COALESCE(?, venue),
          city = COALESCE(?, city),
          requirements = COALESCE(?, requirements),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(qe.venue, client ? client.city : null, eventRequirements, eventNotes, targetEventId);
    } else {
      const resEvent = await db.prepare(`
        INSERT INTO events (
          client_id, event_type_id, event_name, event_date,
          venue, city, requirements, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed')
      `).run(
        quotation.client_id,
        eventTypeId,
        eventName,
        qe.event_date,
        qe.venue || null,
        client ? client.city : null,
        eventRequirements || null,
        eventNotes
      );
      targetEventId = resEvent.lastInsertRowid;
    }

    // Link event_id in quotation_events
    await db.prepare('UPDATE quotation_events SET event_id = ? WHERE id = ?').run(targetEventId, qe.id);
  }
}

// Update quotation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    if (req.user.role !== 'ADMIN' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only edit quotations created by you.' });
    }

    const {
      client_id,
      quotation_date,
      valid_until,
      discount_type,
      discount_value,
      additional_charges,
      tax_enabled,
      tax_percentage,
      status,
      notes,
      terms,
      events,
      payment_terms
    } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'At least one event is required.' });
    }

    const totals = calculateQuotationTotals(
      events,
      discount_type || existing.discount_type,
      discount_value !== undefined ? discount_value : existing.discount_value,
      additional_charges !== undefined ? additional_charges : existing.additional_charges,
      tax_enabled !== undefined ? !!tax_enabled : !!existing.tax_enabled,
      tax_percentage !== undefined ? tax_percentage : existing.tax_percentage
    );

    await db.transaction(async (tx) => {
      await tx.prepare(`
        UPDATE quotations SET
          client_id = ?,
          quotation_date = ?,
          valid_until = ?,
          subtotal = ?,
          discount_type = ?,
          discount_value = ?,
          discount_amount = ?,
          additional_charges = ?,
          tax_enabled = ?,
          tax_percentage = ?,
          tax_amount = ?,
          grand_total = ?,
          status = ?,
          notes = ?,
          terms = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        client_id || existing.client_id,
        quotation_date || existing.quotation_date,
        valid_until !== undefined ? valid_until : existing.valid_until,
        totals.subtotal,
        discount_type || existing.discount_type,
        discount_value !== undefined ? Number(discount_value) : existing.discount_value,
        totals.discountAmount,
        totals.extraCharges,
        tax_enabled !== undefined ? (tax_enabled ? 1 : 0) : existing.tax_enabled,
        tax_percentage !== undefined ? Number(tax_percentage) : existing.tax_percentage,
        totals.taxAmount,
        totals.grandTotal,
        status || existing.status,
        notes !== undefined ? notes : existing.notes,
        terms !== undefined ? terms : existing.terms,
        id
      );

      // Replace events and items
      await tx.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(id);
      await tx.prepare('DELETE FROM quotation_events WHERE quotation_id = ?').run(id);

      for (let evtIdx = 0; evtIdx < events.length; evtIdx++) {
        const evt = events[evtIdx];
        const eRes = await tx.prepare(`
          INSERT INTO quotation_events (
            quotation_id, event_id, event_date, event_type, venue, requirements, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          evt.event_id || null,
          evt.event_date || existing.quotation_date,
          evt.event_type || 'Event',
          evt.venue || null,
          evt.requirements || null,
          evtIdx + 1
        );
        const quotationEventId = eRes.lastInsertRowid;

        const items = evt.items || [];
        for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
          const item = items[itemIdx];
          await tx.prepare(`
            INSERT INTO quotation_items (
              quotation_id, quotation_event_id, service_id, service_name_snapshot,
              description_snapshot, quantity, unit, unit_price, discount, total, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            id,
            quotationEventId,
            item.service_id || null,
            item.service_name || item.service_name_snapshot || 'Service',
            item.description || item.description_snapshot || null,
            Number(item.quantity) || 1,
            item.unit || 'Event',
            Number(item.unit_price) || 0,
            Number(item.discount) || 0,
            Number(item.total) || 0,
            itemIdx + 1
          );
        }
      }

      // Replace payment terms if provided
      if (payment_terms && Array.isArray(payment_terms)) {
        await tx.prepare('DELETE FROM quotation_payment_terms WHERE quotation_id = ?').run(id);
        for (let idx = 0; idx < payment_terms.length; idx++) {
          const pt = payment_terms[idx];
          const pct = Number(pt.percentage) || 0;
          const amt = roundCurrency((totals.grandTotal * pct) / 100);
          await tx.prepare(`
            INSERT INTO quotation_payment_terms (
              quotation_id, milestone, percentage, amount, due_date, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(id, pt.milestone, pct, amt, pt.due_date || null, idx + 1);
        }
      }

      if (status && status !== existing.status) {
        await tx.prepare(`
          INSERT INTO quotation_status_history (quotation_id, user_id, username, old_status, new_status, notes)
          VALUES (?, ?, ?, ?, ?, 'Status updated in editor')
        `).run(id, req.user.id, req.user.username, existing.status, status);
      }
    });

    if (status === 'Converted to Booking') {
      await syncQuotationEventsToShoots(id);
    }
    await logAudit(req.user, 'UPDATE_QUOTATION', 'quotations', id, existing, { grandTotal: totals.grandTotal }, req.ip);

    res.json({ message: 'Quotation updated successfully' });
  } catch (err) {
    console.error('Update quotation error:', err);
    res.status(500).json({ error: 'Failed to update quotation', details: err.message });
  }
});

// Convert quotation to booking & schedule into shoots
router.post('/:id/convert-to-booking', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.prepare('SELECT status, quotation_number, created_by FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    if (req.user.role !== 'ADMIN' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only convert quotations created by you.' });
    }

    await db.transaction(async (tx) => {
      await tx.prepare("UPDATE quotations SET status = 'Converted to Booking', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

      await tx.prepare(`
        INSERT INTO quotation_status_history (quotation_id, user_id, username, old_status, new_status, notes)
        VALUES (?, ?, ?, ?, 'Converted to Booking', 'Converted to booking and scheduled events into Shoots & Events')
      `).run(id, req.user.id, req.user.username, existing.status);
    });

    await syncQuotationEventsToShoots(id);
    await logAudit(req.user, 'CONVERT_TO_BOOKING', 'quotations', id, existing.status, 'Converted to Booking', req.ip);

    res.json({
      message: 'Quotation successfully converted to booking! Events have been scheduled in Shoots & Events.',
      status: 'Converted to Booking'
    });
  } catch (err) {
    console.error('Convert to booking error:', err);
    res.status(500).json({ error: 'Failed to convert quotation to booking', details: err.message });
  }
});

// Update status only
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Converted to Booking', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await db.prepare('SELECT status, quotation_number, created_by FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    if (req.user.role !== 'ADMIN' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only update quotations created by you.' });
    }

    await db.transaction(async (tx) => {
      await tx.prepare('UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

      await tx.prepare(`
        INSERT INTO quotation_status_history (quotation_id, user_id, username, old_status, new_status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, req.user.username, existing.status, status, notes || null);
    });

    if (status === 'Converted to Booking') {
      await syncQuotationEventsToShoots(id);
    }
    await logAudit(req.user, 'UPDATE_QUOTATION_STATUS', 'quotations', id, existing.status, status, req.ip);

    res.json({ message: `Quotation status updated to ${status}` });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update quotation status', details: err.message });
  }
});

// Duplicate quotation
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Original quotation not found.' });
    }

    if (req.user.role !== 'ADMIN' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only duplicate quotations created by you.' });
    }

    const events = await db.prepare('SELECT * FROM quotation_events WHERE quotation_id = ? ORDER BY sort_order ASC').all(id);
    const items = await db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC').all(id);
    const paymentTerms = await db.prepare('SELECT * FROM quotation_payment_terms WHERE quotation_id = ? ORDER BY sort_order ASC').all(id);

    const newQuotationNumber = await getNextQuotationNumber();
    const today = new Date().toISOString().split('T')[0];

    const duplicatedId = await db.transaction(async (tx) => {
      const qRes = await tx.prepare(`
        INSERT INTO quotations (
          quotation_number, client_id, quotation_date, valid_until,
          subtotal, discount_type, discount_value, discount_amount,
          additional_charges, tax_enabled, tax_percentage, tax_amount,
          grand_total, status, notes, terms, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?)
      `).run(
        newQuotationNumber,
        existing.client_id,
        today,
        existing.valid_until,
        existing.subtotal,
        existing.discount_type,
        existing.discount_value,
        existing.discount_amount,
        existing.additional_charges,
        existing.tax_enabled,
        existing.tax_percentage,
        existing.tax_amount,
        existing.grand_total,
        `Duplicated from ${existing.quotation_number}. ${existing.notes || ''}`.trim(),
        existing.terms,
        req.user.id
      );

      const newQuotationId = qRes.lastInsertRowid;

      for (const evt of events) {
        const eRes = await tx.prepare(`
          INSERT INTO quotation_events (
            quotation_id, event_id, event_date, event_type, venue, requirements, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          newQuotationId,
          evt.event_id,
          evt.event_date,
          evt.event_type,
          evt.venue,
          evt.requirements,
          evt.sort_order
        );
        const newEventId = eRes.lastInsertRowid;

        const evtItems = items.filter(it => it.quotation_event_id === evt.id);
        for (const item of evtItems) {
          await tx.prepare(`
            INSERT INTO quotation_items (
              quotation_id, quotation_event_id, service_id, service_name_snapshot,
              description_snapshot, quantity, unit, unit_price, discount, total, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            newQuotationId,
            newEventId,
            item.service_id,
            item.service_name_snapshot,
            item.description_snapshot,
            item.quantity,
            item.unit,
            item.unit_price,
            item.discount,
            item.total,
            item.sort_order
          );
        }
      }

      for (const pt of paymentTerms) {
        await tx.prepare(`
          INSERT INTO quotation_payment_terms (
            quotation_id, milestone, percentage, amount, due_date, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(newQuotationId, pt.milestone, pt.percentage, pt.amount, pt.due_date, pt.sort_order);
      }

      await tx.prepare(`
        INSERT INTO quotation_status_history (quotation_id, user_id, username, old_status, new_status, notes)
        VALUES (?, ?, ?, null, 'Draft', ?)
      `).run(newQuotationId, req.user.id, req.user.username, `Duplicated from ${existing.quotation_number}`);

      return newQuotationId;
    });

    await logAudit(req.user, 'DUPLICATE_QUOTATION', 'quotations', duplicatedId, existing.id, { newQuotationNumber }, req.ip);

    res.status(201).json({
      message: `Quotation duplicated successfully as ${newQuotationNumber}`,
      quotationId: duplicatedId,
      quotationNumber: newQuotationNumber
    });
  } catch (err) {
    console.error('Duplicate quotation error:', err);
    res.status(500).json({ error: 'Failed to duplicate quotation', details: err.message });
  }
});

// Archive quotation
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.prepare('SELECT id, quotation_number, created_by FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    if (req.user.role !== 'ADMIN' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only archive quotations created by you.' });
    }

    await db.prepare('UPDATE quotations SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    await logAudit(req.user, 'ARCHIVE_QUOTATION', 'quotations', id, existing, { archived: 1 }, req.ip);

    res.json({ message: 'Quotation archived successfully' });
  } catch (err) {
    console.error('Archive quotation error:', err);
    res.status(500).json({ error: 'Failed to archive quotation', details: err.message });
  }
});

// Admin-only hard delete
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.prepare('SELECT id, quotation_number FROM quotations WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    await db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
    await logAudit(req.user, 'DELETE_QUOTATION', 'quotations', id, existing, null, req.ip);

    res.json({ message: 'Quotation permanently deleted' });
  } catch (err) {
    console.error('Delete quotation error:', err);
    res.status(500).json({ error: 'Failed to delete quotation', details: err.message });
  }
});

// Export Pristine Vector A4 PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      delete require.cache[require.resolve('../utils/pdfGenerator')];
    } catch {}
    const { generateQuotationPdf } = require('../utils/pdfGenerator');
    const quotation = await db.prepare(`
      SELECT q.*, 
             c.name as client_name, 
             c.mobile as client_mobile, 
             c.email as client_email, 
             c.city as client_city, 
             c.client_code,
             u.name as created_by_name
      FROM quotations q
      JOIN clients c ON q.client_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.id = ?
    `).get(id);

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    if (req.user.role !== 'ADMIN' && quotation.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only download quotations created by you.' });
    }

    const events = await db.prepare(`
      SELECT * FROM quotation_events
      WHERE quotation_id = ?
      ORDER BY sort_order ASC, event_date ASC
    `).all(id);

    for (const evt of events) {
      evt.items = await db.prepare(`
        SELECT * FROM quotation_items WHERE quotation_event_id = ? ORDER BY sort_order ASC, id ASC
      `).all(evt.id);
    }

    const paymentTerms = await db.prepare(`
      SELECT * FROM quotation_payment_terms WHERE quotation_id = ? ORDER BY sort_order ASC, id ASC
    `).all(id);

    const settingsRows = await db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const s of settingsRows) {
      settings[s.key] = s.value;
    }

    const safeClient = (quotation.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${quotation.quotation_number}_${safeClient}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    generateQuotationPdf(quotation, events, paymentTerms, settings, res);
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
  }
});

module.exports = router;
