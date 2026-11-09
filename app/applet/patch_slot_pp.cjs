const fs = require('fs');
const path = require('path');

console.log('[Slot PP Patch] Starting PP slot folder patch...');

const targets = [
  path.join(__dirname, 'dist/assets/index-sn777-v12.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v12.js'),
  path.join(__dirname, 'original-index-sn777-v5.js')
];

const ppIcon = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMPZWLFyD6YlVWO4bmuZXAxlCYR8pjpFZHlqviWga8hDmHzZwLiaSt6FeiGbfDwQxVXO34aqc-cHN9KqGfgSKbcyt-ehIM8mniu9AdsRpPfyemOXN__7WFexeZGgtHPp4wVtduP_xKX6xDnB25i4 hely (Create a PP folder inside the Slot category with an icon ...)';
// Correct clean image URL:
const cleanPpIcon = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMPZWLFyD6YlVWO4bmuZXAxlCYR8pjpFZHlqviWga8hDmHzZwLiaSt6FeiGbfDwQxVXO34aqc-cHN9KqGfgSKbcyt-ehIM8mniu9AdsRpPfyemOXN__7WFexeZGgtHPp4wVtduP_xKX6xDnB25i4wyXbSNBhxEczajBFOnaGElEspurSpxOCgdfAGGpasr/s120/provider-awcv2_pp%20(1).png';

const ppProviderItem = `{title:"PP",image:"${cleanPpIcon}",category:"স্লট",isHot:!1}`;

let updatedCount = 0;

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add PP provider folder in category "স্লট" after FC if not already present
  if (!code.includes('{title:"PP",image:') || !code.includes('category:"স্লট"')) {
    // Check if PP provider item already exists in slot category
    const fcRegex = /\{title:"FC",image:"[^"]+",category:"স্লট",isHot:(!0|true|!1|false)\}/;
    if (fcRegex.test(code)) {
      code = code.replace(fcRegex, (match) => `${match},${ppProviderItem}`);
      changed = true;
      console.log(`[Slot PP Patch] Added PP slot folder after FC in ${path.basename(filePath)}`);
    } else {
      const jiliRegex = /\{title:"JILI",image:"[^"]+",category:"স্লট",isHot:(!0|true|!1|false)\}/;
      if (jiliRegex.test(code)) {
        code = code.replace(jiliRegex, (match) => `${match},${ppProviderItem}`);
        changed = true;
        console.log(`[Slot PP Patch] Added PP slot folder after JILI in ${path.basename(filePath)}`);
      }
    }
  }

  // 2. Ensure click handler includes if(E==="PP"){wr("PP");return}
  if (!code.includes('if(E==="PP"){wr("PP");return}')) {
    const clickJili = 'if(E==="JILI"){wr("JILI");return}';
    if (code.includes(clickJili)) {
      code = code.replace(clickJili, `if(E==="PP"){wr("PP");return}${clickJili}`);
      changed = true;
      console.log(`[Slot PP Patch] Added PP click handler in ${path.basename(filePath)}`);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    updatedCount++;
  }
});

console.log(`[Slot PP Patch] Completed! Updated ${updatedCount} files.`);
