const { Pool } = require('pg');

// Connects to AWS RDS PostgreSQL. In-cluster, these values are injected via the
// Helm-managed ConfigMap (non-secret) and Secret (credentials) as env vars.
const useSSL = (process.env.PGSSLMODE || 'require') !== 'disable';

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
