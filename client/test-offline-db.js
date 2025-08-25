/**
 * Simple test script to verify offline database setup
 * Run with: node test-offline-db.js
 */

console.log('🧪 Testing Offline Database Setup...');

// Test 1: Check if dependencies are installed
console.log('\n📦 Checking dependencies...');

try {
  require('sql.js');
  console.log('✅ sql.js - OK');
} catch (e) {
  console.log('❌ sql.js - Missing');
}

try {
  require('idb');
  console.log('✅ idb - OK');
} catch (e) {
  console.log('❌ idb - Missing');
}

try {
  require('crypto-js');
  console.log('✅ crypto-js - OK');
} catch (e) {
  console.log('❌ crypto-js - Missing');
}

try {
  require('rxjs');
  console.log('✅ rxjs - OK');
} catch (e) {
  console.log('❌ rxjs - Missing');
}

// Test 2: Check if our files exist
console.log('\n📁 Checking file structure...');

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/database/DatabaseManager.js',
  'src/database/DatabaseService.js',
  'src/database/repositories/BaseRepository.js',
  'src/database/repositories/RoomsRepository.js',
  'src/database/migrations/001_initial_schema.js',
  'src/components/OfflineDatabaseTest.jsx'
];

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - OK`);
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// Test 3: Check directory structure
console.log('\n📂 Checking directory structure...');

const dirsToCheck = [
  'src/database',
  'src/database/migrations',
  'src/database/repositories',
  'src/database/sync',
  'src/database/utils'
];

dirsToCheck.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`✅ ${dir}/ - OK`);
  } else {
    console.log(`❌ ${dir}/ - Missing`);
  }
});

console.log('\n🎯 Test Summary:');
console.log('- Dependencies: Check the ✅/❌ status above');
console.log('- File Structure: Check the ✅/❌ status above');
console.log('- Next Step: Start the React app and navigate to /offline-test');
console.log('- URL: http://localhost:3000/offline-test');

console.log('\n🚀 To test the offline database:');
console.log('1. Run: npm start (in the client directory)');
console.log('2. Open: http://localhost:3000/offline-test');
console.log('3. Click "Reinitialize DB" to test the database');
console.log('4. Click "Test Room Operations" to test CRUD operations');

console.log('\n✅ Offline Database Setup Test Complete!'); 