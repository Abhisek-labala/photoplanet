const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/summary', async (req, res) => {
  try {
    // Key metrics
    const totalClientsRow = await db.prepare('SELECT COUNT(*) as count FROM clients WHERE archived = 0').get();
    const totalClients = parseInt(totalClientsRow?.count || 0, 10);

    const totalEventsRow = await db.prepare('SELECT COUNT(*) as count FROM events').get();
    const totalEvents = parseInt(totalEventsRow?.count || 0, 10);

    const totalQuotationsRow = await db.prepare('SELECT COUNT(*) as count FROM quotations WHERE archived = 0').get();
    const totalQuotations = parseInt(totalQuotationsRow?.count || 0, 10);

    // Quotation status counts and values
    const statusStats = await db.prepare(`
      SELECT status, COUNT(*) as count, SUM(grand_total) as total_value
      FROM quotations
      WHERE archived = 0
      GROUP BY status
    `).all();

    const totalQuotationValue = statusStats.reduce((acc, s) => acc + (parseFloat(s.total_value) || 0), 0);
    const acceptedValue = parseFloat(statusStats.find(s => s.status === 'Accepted' || s.status === 'Converted to Booking')?.total_value || 0);

    // Monthly quotation count & value for last 6 months
    const monthlyTrends = (await db.prepare(`
      SELECT strftime('%Y-%m', quotation_date) as month, 
             COUNT(*) as count, 
             SUM(grand_total) as total_value,
             SUM(CASE WHEN status IN ('Accepted', 'Converted to Booking') THEN grand_total ELSE 0 END) as accepted_value
      FROM quotations
      WHERE archived = 0
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6
    `).all()).reverse();

    // Event type breakdown
    const eventTypeBreakdown = await db.prepare(`
      SELECT qe.event_type as name, COUNT(*) as count
      FROM quotation_events qe
      JOIN quotations q ON qe.quotation_id = q.id
      WHERE q.archived = 0
      GROUP BY qe.event_type
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Top used services
    const topServices = await db.prepare(`
      SELECT qi.service_name_snapshot as name, 
             COUNT(*) as count, 
             SUM(qi.total) as total_revenue
      FROM quotation_items qi
      JOIN quotations q ON qi.quotation_id = q.id
      WHERE q.archived = 0
      GROUP BY qi.service_name_snapshot
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Quotations created by staff breakdown
    const staffBreakdown = await db.prepare(`
      SELECT u.name as staff_name, u.role, COUNT(q.id) as quotation_count, SUM(q.grand_total) as total_value
      FROM users u
      LEFT JOIN quotations q ON q.created_by = u.id AND q.archived = 0
      GROUP BY u.id, u.name, u.role
      ORDER BY quotation_count DESC
    `).all();

    // Upcoming events
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = await db.prepare(`
      SELECT e.*, c.name as client_name, c.mobile as client_mobile, et.name as event_type_name
      FROM events e
      JOIN clients c ON e.client_id = c.id
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.event_date >= ?
      ORDER BY e.event_date ASC
      LIMIT 5
    `).all(today);

    res.json({
      metrics: {
        totalClients,
        totalEvents,
        totalQuotations,
        totalQuotationValue,
        acceptedValue,
        draftCount: parseInt(statusStats.find(s => s.status === 'Draft')?.count || 0, 10),
        sentCount: parseInt(statusStats.find(s => s.status === 'Sent')?.count || 0, 10),
        acceptedCount: parseInt(statusStats.find(s => s.status === 'Accepted')?.count || 0, 10),
        convertedCount: parseInt(statusStats.find(s => s.status === 'Converted to Booking')?.count || 0, 10),
        rejectedCount: parseInt(statusStats.find(s => s.status === 'Rejected')?.count || 0, 10),
        cancelledCount: parseInt(statusStats.find(s => s.status === 'Cancelled')?.count || 0, 10),
      },
      monthlyTrends,
      eventTypeBreakdown,
      topServices,
      staffBreakdown,
      upcomingEvents
    });
  } catch (err) {
    console.error('Reports summary error:', err);
    res.status(500).json({ error: 'Failed to generate report summary', details: err.message });
  }
});

module.exports = router;
