const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Settings = require('../models/Settings');
const Work = require('../models/Work');
const { refreshYouTubeData, getYouTubeStatus } = require('../services/youtube');

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'kira@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kira2025';
const JWT_SECRET     = process.env.JWT_SECRET     || 'kira_super_secret_jwt_key_2026';
const ADMIN_SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

/** Helper to get or create settings */
async function getSettings(key, defaultValue = {}) {
  let settings = await Settings.findOne({ key });
  if (!settings) {
    settings = await Settings.create({ key, data: defaultValue });
  }
  return settings;
}

/** Validates admin session token and ensures role is admin */
function requireAdmin(req, res, next) {
  const token = req.cookies.admin_session || req.headers['x-admin-token'];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Please login.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { email: decoded.email, role: decoded.role };
    
    // Sliding session: Refresh the cookie for another 7 days
    res.cookie('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
      sameSite: 'lax',
      maxAge: ADMIN_SESSION_TTL
    });

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

// Legacy name used by upload route
const requireAuth = requireAdmin;

// ─── POST /api/admin/login ───
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required.' });
  }
  if (email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Invalid credentials.' });
  }

  const token = jwt.sign({ email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });

  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_TTL
  });

  res.json({
    success: true,
    token,
    user: { email: ADMIN_EMAIL, role: 'admin' }
  });
});

// ─── POST /api/admin/logout ───
router.post('/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true });
});

// ─── POST /api/admin/verify ───
router.post('/verify', requireAdmin, (req, res) => {
  // Sign a fresh token for the sliding session so frontend can update localStorage
  const freshToken = jwt.sign({ email: req.user.email, role: req.user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    token: freshToken,
    email: req.user.email,
    role: req.user.role
  });
});

// ─── GET /api/admin/messages ───
router.get('/messages', requireAdmin, async (req, res) => {
  try {
    const settings = await getSettings('messages', []);
    res.json({ success: true, data: settings.data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ─── DELETE /api/admin/messages/:id ───
router.delete('/messages/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const settings = await getSettings('messages', []);
    settings.data = settings.data.filter(m => m.id !== id);
    settings.markModified('data');
    await settings.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ─── PUT /api/admin/messages/:id/read ───
router.put('/messages/:id/read', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const settings = await getSettings('messages', []);
    const msg = settings.data.find(m => m.id === id);
    if (msg) { 
      msg.read = true; 
      settings.markModified('data');
      await settings.save(); 
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ─── GET /api/admin/overview ───
router.get('/overview', requireAdmin, async (req, res) => {
  try {
    const work = await Work.find({}).lean();
    const globalSettings = await getSettings('global', { available: true, stats: {} });
    const messagesSettings = await getSettings('messages', []);
    const servicesSettings = await getSettings('services', []);
    
    res.json({
      success: true,
      data: {
        totalWork: work.length,
        totalThumbnails: work.filter(w => (!w.type || w.type === 'thumbnail')).length,
        totalVideos: work.filter(w => w.type === 'video').length,
        totalShorts: work.filter(w => w.type === 'short' || w.type === 'clip').length,
        totalMessages: messagesSettings.data.length,
        unreadMessages: messagesSettings.data.filter(m => !m.read).length,
        totalServices: servicesSettings.data.length,
        available: globalSettings.data.available,
        stats: globalSettings.data.stats,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

router.post('/youtube/refresh', requireAdmin, async (req, res) => {
  try {
    const result = await refreshYouTubeData({ includeArchive: true, force: true });
    res.json({ success: true, data: result });
  } catch (e) {
    console.error('YouTube refresh error', e);
    res.status(500).json({ success: false, error: 'Failed to refresh YouTube data.' });
  }
});

router.get('/youtube/status', requireAdmin, async (req, res) => {
  try {
    const status = await getYouTubeStatus();
    res.json({ success: true, data: status });
  } catch (e) {
    console.error('YouTube status error', e);
    res.status(500).json({ success: false, error: 'Failed to read YouTube status.' });
  }
});

module.exports = router;
module.exports.requireAdmin = requireAdmin;
module.exports.requireAuth = requireAuth;

