import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'gateway04.us-east-1.prod.aws.tidbcloud.com',
  user: 'dCz1QvnpntshJi7.root',
  password: 'tpdewH3RzK4N638K5Rga',
  database: 'jvZMyWuKFNHBGfG95CC7gr',
  ssl: { rejectUnauthorized: true }
});

const [rows] = await connection.execute('SELECT * FROM whatsapp_admin_users');
console.log('Admin Users in Database:');
console.log(JSON.stringify(rows, null, 2));

const [perms] = await connection.execute('SELECT * FROM whatsapp_command_permissions');
console.log('\nCommand Permissions:');
console.log(JSON.stringify(perms, null, 2));

await connection.end();
