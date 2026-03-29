const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'signbridge-dev-secret-change-me';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ') || header.slice(7) === 'guest-token') {
    // Guest Mode: Automatically inject dummy user
    req.user = { 
       id: 'guest-id', 
       email: 'guest@example.com', 
       name: 'Guest User', 
       role: 'candidate' 
    };
    return next();
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    next();
  } catch {
    // Guest fallback in case of expired legacy tokens
    req.user = { id: 'guest-id', email: 'guest@example.com', name: 'Guest User', role: 'candidate' };
    next();
  }
}
module.exports = { authMiddleware, JWT_SECRET };
