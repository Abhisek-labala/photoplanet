const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PORT } = require('./src/config');
const { getLocalIpAddresses, getPrimaryLocalIp } = require('./src/utils/network');
const { db } = require('./src/db');

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health and Network Info
app.get('/api/health', (req, res) => {
  try {
    const row = db.prepare('SELECT 1 as alive').get();
    res.json({
      status: 'connected',
      server: 'Studio GFX Quotation Local Server',
      database: row.alive === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/network-info', (req, res) => {
  const ips = getLocalIpAddresses();
  const primary = getPrimaryLocalIp();
  res.json({
    port: PORT,
    primaryIp: primary,
    interfaces: ips,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${primary}:${PORT}`
  });
});

// Mount API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/clients', require('./src/routes/clients'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api/event-types', require('./src/routes/eventTypes'));
app.use('/api/services', require('./src/routes/services'));
app.use('/api/quotations', require('./src/routes/quotations'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/audit-logs', require('./src/routes/audit'));
app.use('/api/backup', require('./src/routes/backup'));

// Serve Frontend PWA Static Files if built
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // Client-side routing fallback for SPA
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Studio GFX Quotation Server</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h1 style="color: #38bdf8;">Studio GFX Quotation Server is Running</h1>
          <p>Local Server is active on port ${PORT}.</p>
          <p>API Endpoint: <a href="/api/health" style="color: #60a5fa;">/api/health</a></p>
          <p>Frontend dev server running on Vite or build frontend with <code>npm run build</code>.</p>
        </body>
      </html>
    `);
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  const primaryIp = getPrimaryLocalIp();
  console.log('====================================================');
  console.log('       PHOTO PLANET STUDIO QUOTATION SERVER       ');
  console.log('====================================================');
  console.log(` Status: Local Server Connected`);
  console.log(` Local:   http://localhost:${PORT}`);
  console.log(` Network: http://${primaryIp}:${PORT}`);
  console.log(` PWA App: http://${primaryIp}:${PORT}/quotation`);
  console.log('----------------------------------------------------');
  console.log(' Multiple devices on the same Wi-Fi can connect to:');
  console.log(` http://${primaryIp}:${PORT}`);
  console.log('====================================================');
});
