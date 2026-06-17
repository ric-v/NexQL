// Catch-all router for /api/sync/* — keeps Hobby-plan function count under 12.

const { catchAllSegments } = require('../_lib/catch-all-route');

const v2Pull = require('../_lib/handlers/sync-v2-pull');
const v2Push = require('../_lib/handlers/sync-v2-push');
const v2Reset = require('../_lib/handlers/sync-v2-reset');
const v2Spaces = require('../_lib/handlers/sync-v2-spaces');
const quota = require('../_lib/handlers/sync-quota');
const devices = require('../_lib/handlers/sync-devices');

module.exports = async (req, res) => {
  const segments = catchAllSegments(req, 'path', 'sync');
  const [head, sub, id] = segments;

  if (head === 'v2') {
    if (sub === 'pull' && segments.length === 2) {
      return v2Pull(req, res);
    }
    if (sub === 'push' && segments.length === 2) {
      return v2Push(req, res);
    }
    if (sub === 'reset' && segments.length === 2) {
      return v2Reset(req, res);
    }
    if (sub === 'spaces' && segments.length === 2) {
      return v2Spaces(req, res);
    }
  }

  if (head === 'quota' && segments.length === 1) {
    return quota(req, res);
  }
  if (head === 'devices' && segments.length === 1) {
    return devices(req, res);
  }
  if (head === 'devices' && segments.length === 2) {
    req.query.deviceId = sub;
    return devices(req, res);
  }

  return res.status(404).json({ error: 'Not Found' });
};
