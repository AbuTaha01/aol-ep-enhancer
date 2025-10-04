// Build script for Vercel deployment
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build process...');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
  console.log('✅ Created dist directory');
} else {
  console.log('✅ dist directory already exists');
}

// Copy public files to dist
if (fs.existsSync('public/index.html')) {
  fs.copyFileSync('public/index.html', 'dist/index.html');
  console.log('✅ Copied index.html to dist');
} else {
  console.log('❌ public/index.html not found');
}

// Verify dist contents
try {
  const distContents = fs.readdirSync('dist');
  console.log('✅ Build completed successfully!');
  console.log('📁 Contents of dist:', distContents);
} catch (error) {
  console.error('❌ Error reading dist directory:', error);
  process.exit(1);
}
