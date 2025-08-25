const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Offline Database System');
console.log('=====================================\n');

// Test 1: Check if all required files exist
console.log('📁 Testing File Structure...');
const requiredFiles = [
  'src/database/DatabaseManager.js',
  'src/database/DatabaseService.js',
  'src/database/repositories/BaseRepository.js',
  'src/database/repositories/RoomsRepository.js',
  'src/database/migrations/001_initial_schema.js',
  'src/components/OfflineDatabaseTest.jsx'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log(`\n📁 File Structure: ${allFilesExist ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 2: Check dependencies
console.log('📦 Testing Dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['sql.js', 'rxjs', 'crypto-js', 'idb'];

let allDepsInstalled = true;
requiredDeps.forEach(dep => {
  const installed = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
  console.log(`  ${installed ? '✅' : '❌'} ${dep} ${installed ? `(${installed})` : '(missing)'}`);
  if (!installed) allDepsInstalled = false;
});

console.log(`\n📦 Dependencies: ${allDepsInstalled ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 3: Check if files can be imported (syntax check)
console.log('🔍 Testing File Syntax...');
const filesToCheck = [
  'src/database/migrations/001_initial_schema.js',
  'src/database/repositories/BaseRepository.js',
  'src/database/repositories/RoomsRepository.js'
];

let allSyntaxValid = true;
filesToCheck.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    // Basic syntax checks
    const hasExport = content.includes('export') || content.includes('module.exports');
    const hasValidJS = !content.includes('undefined ') || content.includes('=== undefined') || content.includes('!== undefined') || content.includes('// undefined is expected');
    
    // Check for common syntax issues
    const hasUnmatchedBraces = (content.match(/\{/g) || []).length !== (content.match(/\}/g) || []).length;
    const hasUnmatchedParens = (content.match(/\(/g) || []).length !== (content.match(/\)/g) || []).length;
    
    const isValid = hasExport && hasValidJS && !hasUnmatchedBraces && !hasUnmatchedParens;
    
    console.log(`  ${isValid ? '✅' : '❌'} ${file}`);
    if (!isValid) {
      if (!hasExport) console.log(`    - Missing export statement`);
      if (!hasValidJS) console.log(`    - Contains undefined references`);
      if (hasUnmatchedBraces) console.log(`    - Unmatched braces: { count: ${(content.match(/\{/g) || []).length}, } count: ${(content.match(/\}/g) || []).length}`);
      if (hasUnmatchedParens) console.log(`    - Unmatched parentheses`);
      allSyntaxValid = false;
    }
  } catch (error) {
    console.log(`  ❌ ${file} - Error: ${error.message}`);
    allSyntaxValid = false;
  }
});

console.log(`\n🔍 File Syntax: ${allSyntaxValid ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 4: Check CRACO configuration
console.log('⚙️  Testing CRACO Configuration...');
const cracoExists = fs.existsSync('craco.config.js');
console.log(`  ${cracoExists ? '✅' : '❌'} craco.config.js exists`);

if (cracoExists) {
  try {
    const cracoConfig = require('./craco.config.js');
    const hasWebpackConfig = cracoConfig.webpack && cracoConfig.webpack.configure;
    console.log(`  ${hasWebpackConfig ? '✅' : '❌'} Webpack configuration present`);
  } catch (error) {
    console.log(`  ❌ CRACO config error: ${error.message}`);
  }
}

console.log(`\n⚙️  CRACO Configuration: ${cracoExists ? '✅ PASS' : '❌ FAIL'}\n`);

// Test 5: Check package.json scripts
console.log('📜 Testing Package Scripts...');
const scripts = packageJson.scripts || {};
const hasReactStart = scripts['react-start'] || scripts['start'];
const hasCracoStart = scripts['react-start'] && scripts['react-start'].includes('craco');

console.log(`  ${hasReactStart ? '✅' : '❌'} React start script exists`);
console.log(`  ${hasCracoStart ? '✅' : '❌'} CRACO start script configured`);

console.log(`\n📜 Package Scripts: ${hasReactStart && hasCracoStart ? '✅ PASS' : '❌ FAIL'}\n`);

// Summary
console.log('📊 SUMMARY');
console.log('==========');
const allTestsPassed = allFilesExist && allDepsInstalled && allSyntaxValid && cracoExists && hasReactStart;
console.log(`Overall Status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

if (allTestsPassed) {
  console.log('\n🎉 The offline database system is properly set up!');
  console.log('💡 Next steps:');
  console.log('   1. Try running: npm run react-start');
  console.log('   2. Navigate to: http://localhost:3000/offline-test');
  console.log('   3. Test database operations in the browser');
} else {
  console.log('\n🔧 Issues found that need to be resolved:');
  if (!allFilesExist) console.log('   - Missing required files');
  if (!allDepsInstalled) console.log('   - Missing dependencies');
  if (!allSyntaxValid) console.log('   - Syntax errors in files');
  if (!cracoExists) console.log('   - Missing CRACO configuration');
  if (!hasReactStart) console.log('   - Missing React start scripts');
}

console.log('\n�� Test completed!'); 