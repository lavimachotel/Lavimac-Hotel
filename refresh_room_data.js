// Simple script to write a refresh token file to force the application to reload data
const fs = require('fs');
const path = require('path');

// Create or update the refresh token file
const refreshToken = {
  timestamp: new Date().toISOString(),
  forceRefresh: true
};

// Write it to the client/public folder so it's accessible to the app
const refreshTokenPath = path.join('client', 'public', 'refresh_token.json');
fs.writeFileSync(refreshTokenPath, JSON.stringify(refreshToken, null, 2));

console.log(`Created refresh token at ${refreshTokenPath}`);
console.log('Restart the client app to force data reload'); 