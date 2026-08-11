const jwt = require('jsonwebtoken');
const { tenantStorage } = require('./tenantContext');

// SaaS backend will set 'companyId' and 'role' in JWT
// This middleware extracts it and attaches tenant info
const tenantMiddleware = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    // If no token, just proceed. authMiddleware will catch it if route is protected.
    return tenantStorage.run({}, () => next());
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    
    // Validate if the request is trying to maliciously pass a companyId in body/query
    if (req.body.companyId || req.query.companyId) {
      // We ignore them, but just to be safe, we strip them out
      delete req.body.companyId;
      delete req.query.companyId;
    }

    req.tenant = {
      companyId: decoded.companyId || 'company_madhura',
      role: decoded.role || 'Field Executive'
    };

    // Override req.io.to to automatically scope emits to this company
    if (req.io) {
      const originalTo = req.io.to.bind(req.io);
      req.io.to = (room) => {
        // If room is an array, map it. Otherwise prepend.
        if (Array.isArray(room)) {
          return originalTo(room.map(r => `${req.tenant.companyId}_${r}`));
        }
        return originalTo(`${req.tenant.companyId}_${room}`);
      };
    }

    tenantStorage.run(req.tenant, () => {
      next();
    });
  } catch (error) {
    // If token verification fails, just proceed. authMiddleware will handle 401 if needed.
    tenantStorage.run({}, () => next());
  }
};

const internalApiAuth = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];
  if (!apiKey || apiKey !== (process.env.CRM_INTERNAL_API_KEY || 'very_strong_random_secret')) {
    return res.status(403).json({ success: false, message: 'Forbidden internal API access' });
  }
  next();
};

module.exports = { tenantMiddleware, internalApiAuth };
