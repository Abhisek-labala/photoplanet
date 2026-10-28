const { db } = require('../src/db');

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.log('Usage: node backend/scripts/reset-2fa.js <username>');
    process.exit(1);
  }

  const user = await db.prepare('SELECT id, username, name FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (!user) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }

  await db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  console.log(`✓ Google Authenticator 2FA successfully reset for user "${user.username}" (${user.name}).`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error resetting 2FA:', err);
  process.exit(1);
});
