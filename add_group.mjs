import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'gateway04.us-east-1.prod.aws.tidbcloud.com',
  user: 'dCz1QvnpntshJi7.root',
  password: 'tpdewH3RzK4N638K5Rga',
  database: 'jvZMyWuKFNHBGfG95CC7gr',
  ssl: { rejectUnauthorized: true }
});

// Add the group from the logs: 120363423043835752@g.us
const groupChatId = '120363423043835752@g.us';
const groupName = 'Bolted Iron Hub - Admin Group';

try {
  // Check if group already exists
  const [existing] = await connection.execute(
    'SELECT * FROM whatsapp_authorized_groups WHERE groupChatId = ?',
    [groupChatId]
  );

  if (existing.length > 0) {
    console.log('Group already authorized:', existing[0]);
  } else {
    // Insert the group
    const [result] = await connection.execute(
      'INSERT INTO whatsapp_authorized_groups (groupChatId, groupName, isEnabled) VALUES (?, ?, ?)',
      [groupChatId, groupName, true]
    );
    console.log('Group added successfully:', result);
  }

  // Show all authorized groups
  const [groups] = await connection.execute('SELECT * FROM whatsapp_authorized_groups WHERE isEnabled = true');
  console.log('\nAuthorized Groups:');
  console.log(JSON.stringify(groups, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}

await connection.end();
