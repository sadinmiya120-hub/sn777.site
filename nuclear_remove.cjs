const fs = require('fs');
const path = require('path');

const targetStr = 'Hacksaw Fortune';

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.cjs') || file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.json')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(targetStr)) {
        console.log(`Found in ${fullPath}, removing...`);
        // Replace with empty string or comment out
        content = content.replace(new RegExp(`{title:"${targetStr}"[^}]+},?`, 'g'), '');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  });
}

walk('/app/applet');
console.log('Done.');
