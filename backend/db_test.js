const mariadb = require('mariadb');
require('dotenv').config();

const url = process.env.DATABASE_URL || "mysql://root:@localhost:3306/aams_db";
const u = new URL(url);
const config = {
  host: u.hostname,
  port: u.port ? parseInt(u.port, 10) : 3306,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password || ''),
  database: decodeURIComponent((u.pathname || '').replace(/^\//, '').split('?')[0] || ''),
  prepareCacheLength: 0,
};

console.log('Creating pool with config:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database,
  passwordLength: config.password.length,
});

const pool = mariadb.createPool(config);

console.log('Pool created. Attempting to get connection...');
pool.getConnection()
  .then(conn => {
    console.log('Successfully retrieved connection from pool!');
    return conn.query('SELECT 1 + 1 AS solution')
      .then(rows => {
        console.log('Query result:', rows);
        conn.release();
        return pool.end();
      });
  })
  .catch(err => {
    console.error('Failed to get connection from pool:', err);
    return pool.end();
  });
