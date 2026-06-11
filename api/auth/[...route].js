// Catch-all router for /api/auth/* — keeps Hobby-plan function count under 12.

const handlers = {
  device: require('../_lib/handlers/auth-device'),
  token: require('../_lib/handlers/auth-token'),
  refresh: require('../_lib/handlers/auth-refresh'),
  authorize: require('../_lib/handlers/auth-authorize'),
};

function routeName(req) {
  const raw = req.query.route;
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

module.exports = async (req, res) => {
  const handler = handlers[routeName(req)];
  if (!handler) {
    return res.status(404).json({ error: 'Not Found' });
  }
  return handler(req, res);
};
