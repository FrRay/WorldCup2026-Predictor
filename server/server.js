const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { getPool } = require('./db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static frontend from parent directory
app.use(express.static(path.join(__dirname, '..')));

// ── GET /api/health ──
app.get('/api/health', async (_req, res) => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: e.message });
  }
});

// ── POST /api/predictions ──
app.post('/api/predictions', async (req, res) => {
  try {
    const { id, gm, ko, slog, play_mode, encoded } = req.body || {};

    // Validate required JSON fields
    if (!gm || !ko || !slog || typeof gm !== 'object' || typeof ko !== 'object' || !Array.isArray(slog)) {
      return res.status(400).json({ error: 'invalid_body', message: 'gm, ko (objects) and slog (array) are required' });
    }

    const pool = getPool();
    const newId = id || crypto.randomBytes(9).toString('base64url');

    // Extract champion from knockout
    const champion = (ko && ko.FINAL && ko.FINAL.w) ? ko.FINAL.w : null;

    await pool.query(
      `INSERT INTO predictions (id, gm, ko, slog, play_mode, encoded, champion)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         gm = VALUES(gm),
         ko = VALUES(ko),
         slog = VALUES(slog),
         play_mode = VALUES(play_mode),
         encoded = VALUES(encoded),
         champion = VALUES(champion)`,
      [
        newId,
        JSON.stringify(gm),
        JSON.stringify(ko),
        JSON.stringify(slog),
        play_mode || 'normal',
        encoded || null,
        champion,
      ]
    );

    res.json({
      id: newId,
      share_url: `${req.protocol}://${req.get('host')}/#p=${encoded || ''}`,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('POST /api/predictions error:', e.message);
    res.status(500).json({ error: 'server_error', message: e.message });
  }
});

// ── GET /api/predictions/:id ──
app.get('/api/predictions/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM predictions WHERE id = ?', [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'not_found' });
    }

    const row = rows[0];
    res.json({
      id: row.id,
      gm: row.gm,
      ko: row.ko,
      slog: row.slog,
      play_mode: row.play_mode,
      encoded: row.encoded,
      champion: row.champion,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (e) {
    console.error('GET /api/predictions/:id error:', e.message);
    res.status(500).json({ error: 'server_error', message: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`World Cup Predictor server on http://localhost:${PORT}`);
});
