// build-spa.js - Custom build script to ensure proper SPA packaging for Vercel
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Run the standard build
console.log('Running React build...');
execSync('CI=false react-scripts build', { stdio: 'inherit' });

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
console.log('Checking _redirects file...');
const redirectsSource = path.join(__dirname, '../public/_redirects');
const redirectsDest = path.join(__dirname, '../build/_redirects');

try {
  if (fs.existsSync(redirectsSource)) {
    fs.copyFileSync(redirectsSource, redirectsDest);
    console.log('Successfully copied _redirects file');
  } else {
    const redirectsContent = '/*    /index.html   200\n';
    fs.writeFileSync(redirectsDest, redirectsContent);
    console.log('Created new _redirects file');
  }
} catch (error) {
  console.error('Error handling _redirects file:', error);
}

console.log('Build for SPA completed successfully!'); 