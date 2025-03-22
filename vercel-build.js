// This is a simple build script that Vercel can use
const { execSync } = require('child_process');

// Run the build command
console.log('Running build...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Build completed successfully!'); 