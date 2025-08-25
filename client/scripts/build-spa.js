// build-spa.js - Custom build script to ensure proper SPA packaging for Vercel
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Run the standard build with CI=false to prevent treating warnings as errors
console.log('Running React build...');
const buildResult = spawnSync('npx', ['react-scripts', 'build'], { 
  stdio: 'inherit',
  env: { ...process.env, CI: 'false' }
});

if (buildResult.status !== 0) {
  console.error('Build failed with status code:', buildResult.status);
  process.exit(buildResult.status);
}

// Copy the index.html to 200.html for SPA routing
console.log('Creating 200.html for SPA routing...');
const indexPath = path.join(__dirname, '../build/index.html');
const twoHundredPath = path.join(__dirname, '../build/200.html');

try {
  fs.copyFileSync(indexPath, twoHundredPath);
  console.log('Successfully created 200.html');
} catch (error) {
  console.error('Error creating 200.html:', error);
}

// Ensure _redirects is in the build folder
console.log('Creating _redirects file for SPA routing...');
const redirectsDest = path.join(__dirname, '../build/_redirects');

try {
  const redirectsContent = '/*    /index.html   200\n';
  fs.writeFileSync(redirectsDest, redirectsContent);
  console.log('Created _redirects file');
} catch (error) {
  console.error('Error creating _redirects file:', error);
}

console.log('Build for SPA completed successfully!');