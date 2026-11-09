const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, 'original-index-sn777-v5.js'),
  path.join(__dirname, 'public/assets/index-sn777-v12.js')
];

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  console.log(`Cleaning ${filePath}...`);
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Fix duplicated isHot/closing braces
  code = code.replace(/isHot:!1\},isHot:!1\}/g, 'isHot:!1}');
  code = code.replace(/isHot:!0\},isHot:!0\}/g, 'isHot:!0}');
  code = code.replace(/isHot:!1\},isHot:!1\}/g, 'isHot:!1}'); // Run twice for triple repeats
  
  // 2. Fix the "Unexpected ," error near "const" again just in case
  code = code.replace(/\}\),\{const/g, '}){const');
  code = code.replace(/\}\),\{const/g, '}){const');
  
  // 3. Fix missing commas between objects
  code = code.replace(/(![01])\}\{title:/g, '$1},{title:');
  code = code.replace(/(![01])\{title:/g, '$1},{title:');
  
  // 4. Remove any }, before keywords that was incorrectly added
  code = code.replace(/\},(?=else|catch|finally|\)|;|\])/g, '}');
  code = code.replace(/\},\{if/g, '}{if');
  code = code.replace(/\},\{const/g, '}{const');

  // 5. Final comma cleanup
  code = code.replace(/,+/g, ',');
  code = code.replace(/\[,/g, '[');
  code = code.replace(/,\]/g, ']');

  fs.writeFileSync(filePath, code, 'utf8');
});
console.log("Cleanup done.");
