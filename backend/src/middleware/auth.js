const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { db } = require('../db');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }

    // Verify user is still active in database
    const user = db.prepare('SELECT id, name, username, role, active FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.active) {
      return res.status(403).json({ error: 'User account is inactive or no longer exists.' });
    }

    req.user = user;
    next();
  });
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden. This operation requires one of the following roles: ${allowedRoles.join(', ')}.` 
      });
    }
    next();
  };
}

const requireAdmin = requireRole(['ADMIN']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin
};
