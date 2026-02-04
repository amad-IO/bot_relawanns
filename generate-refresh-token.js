/**
 * Google OAuth Refresh Token Generator
 * 
 * Script untuk generate refresh token baru untuk Google Drive & Sheets access
 * Run: node generate-refresh-token.js
 */

const http = require('http');
const url = require('url');
const open = require('open');
const { config } = require('dotenv');

// Load environment variables
config({ path: './worker/.env' });

// OAuth Configuration - read from environment
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing OAuth credentials!');
  console.error('   Please ensure GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET');
  console.error('   are set in worker/.env file\n');
  process.exit(1);
}

// Scopes needed for Drive & Sheets
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets'
];

console.log('\n🔑 Google OAuth Refresh Token Generator\n');
console.log('📋 Scopes:');
SCOPES.forEach(scope => console.log(`   - ${scope}`));
console.log('');

// Step 1: Generate authorization URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_type=code&` +
  `scope=${encodeURIComponent(SCOPES.join(' '))}&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log('📍 Step 1: Opening browser for authorization...\n');

// Create HTTP server to receive callback
const server = http.createServer(async (req, res) => {
  const queryObject = url.parse(req.url, true).query;

  if (queryObject.code) {
    const code = queryObject.code;

    // Send success page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: green;">✅ Authorization Successful!</h1>
          <p>You can close this window and return to the terminal.</p>
        </body>
      </html>
    `);

    console.log('✅ Authorization code received!\n');
    console.log('📍 Step 2: Exchanging code for refresh token...\n');

    // Exchange code for tokens
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('❌ Error:', tokens.error_description || tokens.error);
        server.close();
        process.exit(1);
      }

      console.log('✅ Tokens received!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 SUCCESS! Copy these values to your .env file:\n');
      console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📝 Next steps:');
      console.log('   1. Copy the GOOGLE_OAUTH_REFRESH_TOKEN above');
      console.log('   2. SSH to your VM');
      console.log('   3. Edit worker/.env file');
      console.log('   4. Replace old token with new token');
      console.log('   5. Restart worker: docker-compose restart queue-worker');
      console.log('');

      server.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error.message);
      server.close();
      process.exit(1);
    }
  } else if (queryObject.error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: red;">❌ Authorization Failed</h1>
          <p>${queryObject.error}</p>
          <p>Please return to the terminal and try again.</p>
        </body>
      </html>
    `);

    console.error('❌ Authorization failed:', queryObject.error);
    server.close();
    process.exit(1);
  }
});

// Start server
server.listen(3000, () => {
  console.log('🌐 Local server started on http://localhost:3000\n');
  console.log('🔓 Opening browser for Google authentication...\n');
  console.log('⚠️  If browser doesn\'t open, copy this URL:\n');
  console.log(`   ${authUrl}\n`);

  // Open browser
  open(authUrl).catch(err => {
    console.log('❌ Could not open browser automatically.');
    console.log('   Please open the URL above manually.\n');
  });
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('❌ Port 3000 is already in use!');
    console.error('   Please close any application using port 3000 and try again.\n');
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process cancelled by user.\n');
  server.close();
  process.exit(0);
});
