import mysql from 'mysql2/promise';

let pool;

function getPool() {
  if (!pool) {
    const config = {
      host: process.env.MYSQL_HOST || process.env.MYSQL__HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || process.env.MYSQL__PORT) || 3306,
      user: process.env.MYSQL_USER || process.env.MYSQL__USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.MYSQL__PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.MYSQL__DATABASE || 'kurvas_curveup',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    };

    if (process.env.MYSQL_SSL === 'true') {
      config.ssl = { rejectUnauthorized: false };
    }

    pool = mysql.createPool(config);
  }
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const exec = async (sql, params = []) => {
      const [rows] = await conn.execute(sql, params);
      return rows;
    };
    const result = await fn(exec);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function resolveUserId(role, maybeId) {
  if (maybeId) {
    const byId = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [maybeId]);
    if (byId.length) return byId[0].id;
  }
  const byRole = await query('SELECT id FROM users WHERE role = ? LIMIT 1', [role]);
  if (byRole.length) return byRole[0].id;
  throw new Error('No account is available for this role.');
}

export async function getActiveProyekId() {
  const rows = await query('SELECT id FROM proyek ORDER BY id DESC LIMIT 1');
  return rows[0]?.id || null;
}
