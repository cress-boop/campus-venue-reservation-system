import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { db } from './db.js';
import { sign, requireAuth, requireAdmin } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Name, email, and a password of 6+ characters are required.' });
  const safeRole = ['student', 'faculty', 'staff'].includes(role) ? role : 'student';
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)', [name, email, hash, safeRole]);
    const user = { id: r.insertId, name, role: safeRole };
    res.json({ token: sign(user), user });
  } catch (e) {
    res.status(e.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: e.code === 'ER_DUP_ENTRY' ? 'Email is already registered.' : 'Server error.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const [[u]] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
    return res.status(401).json({ error: 'Wrong email or password.' });
  const user = { id: u.id, name: u.name, role: u.role };
  res.json({ token: sign(user), user });
});

// ---------- Venues ----------
app.get('/api/venues', requireAuth, async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM venues WHERE is_active = 1 ORDER BY name');
  res.json(rows);
});

app.post('/api/venues', requireAuth, requireAdmin, async (req, res) => {
  const { name, location, capacity, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Venue name is required.' });
  const [r] = await db.query('INSERT INTO venues (name, location, capacity, description) VALUES (?,?,?,?)',
    [name, location, capacity || 0, description]);
  res.json({ id: r.insertId });
});

app.put('/api/venues/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, location, capacity, description } = req.body;
  await db.query('UPDATE venues SET name=?, location=?, capacity=?, description=? WHERE id=?',
    [name, location, capacity || 0, description, req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/venues/:id', requireAuth, requireAdmin, async (req, res) => {
  await db.query('UPDATE venues SET is_active = 0 WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// Schedule for one venue on one date (YYYY-MM-DD)
app.get('/api/venues/:id/schedule', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, start_time, end_time, status, purpose FROM reservations
     WHERE venue_id = ? AND status IN ('pending','approved') AND DATE(start_time) <= ? AND DATE(end_time) >= ?
     ORDER BY start_time`, [req.params.id, req.query.date, req.query.date]);
  res.json(rows);
});

// ---------- Reservations ----------
const hasConflict = async (venueId, start, end, ignoreId = 0) => {
  const [rows] = await db.query(
    `SELECT id FROM reservations WHERE venue_id = ? AND status = 'approved' AND id <> ?
     AND start_time < ? AND end_time > ?`, [venueId, ignoreId, end, start]);
  return rows.length > 0;
};

app.get('/api/reservations', requireAuth, async (req, res) => {
  const admin = req.user.role === 'admin';
  const [rows] = await db.query(
    `SELECT r.*, v.name AS venue_name, u.name AS user_name FROM reservations r
     JOIN venues v ON v.id = r.venue_id JOIN users u ON u.id = r.user_id
     ${admin ? '' : 'WHERE r.user_id = ?'} ORDER BY r.start_time DESC`, admin ? [] : [req.user.id]);
  res.json(rows);
});

app.post('/api/reservations', requireAuth, async (req, res) => {
  const { venue_id, purpose, start_time, end_time } = req.body;
  if (!venue_id || !purpose || !start_time || !end_time)
    return res.status(400).json({ error: 'Fill in the venue, purpose, start, and end.' });
  if (new Date(end_time) <= new Date(start_time))
    return res.status(400).json({ error: 'End time must be after start time.' });
  if (new Date(start_time) < new Date())
    return res.status(400).json({ error: 'Start time must be in the future.' });
  if (await hasConflict(venue_id, start_time, end_time))
    return res.status(409).json({ error: 'That venue is already booked for this time.' });
  const [r] = await db.query(
    'INSERT INTO reservations (user_id, venue_id, purpose, start_time, end_time) VALUES (?,?,?,?,?)',
    [req.user.id, venue_id, purpose, start_time, end_time]);
  res.json({ id: r.insertId });
});

app.patch('/api/reservations/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const [[r]] = await db.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Reservation not found.' });
  if (status === 'approved' && await hasConflict(r.venue_id, r.start_time, r.end_time, r.id))
    return res.status(409).json({ error: 'Conflict: another approved reservation overlaps this time.' });
  await db.query('UPDATE reservations SET status = ?, remarks = ? WHERE id = ?', [status, remarks || null, r.id]);
  res.json({ ok: true });
});

app.patch('/api/reservations/:id/cancel', requireAuth, async (req, res) => {
  const [r] = await db.query(
    `UPDATE reservations SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status IN ('pending','approved')`,
    [req.params.id, req.user.id]);
  res.json({ ok: r.affectedRows > 0 });
});

// ---------- Reports ----------
app.get('/api/reports', requireAuth, requireAdmin, async (_req, res) => {
  const [byStatus] = await db.query('SELECT status, COUNT(*) AS total FROM reservations GROUP BY status');
  const [byVenue] = await db.query(
    `SELECT v.name, COUNT(r.id) AS total FROM venues v
     LEFT JOIN reservations r ON r.venue_id = v.id AND r.status = 'approved'
     WHERE v.is_active = 1 GROUP BY v.id ORDER BY total DESC`);
  res.json({ byStatus, byVenue });
});

app.listen(process.env.PORT || 5000, () => console.log('API running on port', process.env.PORT || 5000));
