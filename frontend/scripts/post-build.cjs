const fs = require('fs');
const path = require('path');

// Create _redirects file for SPA routing
const redirectsContent = '/*    /index.html   200\n';
const redirectsPath = path.join(__dirname, '../dist/_redirects');

try {
  fs.writeFileSync(redirectsPath, redirectsContent);
  console.log('✅ Created _redirects file for SPA routing');
} catch (error) {
  console.error('❌ Failed to create _redirects file:', error.message);
  process.exit(1);
}