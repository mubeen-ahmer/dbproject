import { neon } from '@neondatabase/serverless';

let sql;

function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in .env.local');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
}

const pool = {
  async query(text, params = []) {
    const rows = await getSql().query(text, params);
    return { rows };
  },
};

export default pool;
