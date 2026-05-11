import postgres from 'postgres';

let sql;

function getSql() {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in .env.local');
    }
    sql = postgres(process.env.DATABASE_URL, {
      prepare: false,
      idle_timeout: 20,
      max: 10,
    });
  }
  return sql;
}

const pool = {
  async query(text, params = []) {
    const rows = await getSql().unsafe(text, params);
    return { rows };
  },
};

export default pool;
