import bcrypt from 'bcryptjs';
import { db } from './db.js';

const email = process.env.ADMIN_EMAIL || 'admin@zppsu.edu.ph';
const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
await db.query(
  `INSERT INTO users (name, email, password_hash, role) VALUES ('Campus Admin', ?, ?, 'admin')
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`, [email, hash]);
console.log('Admin ready:', email);
process.exit(0);
