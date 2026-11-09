const fs = require('fs');
const path = require('path');

console.log('[DG Game Patch] Starting DG ThreeCard D19 patch...');

const targets = [
  path.join(__dirname, 'dist_backup/assets/index-sn777-v10.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v10.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v9.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v9.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v8.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v8.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v7.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v7.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v6.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v6.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v5.js'),
  path.join(__dirname, 'dist/assets/index-sn777-v5.js'),
  path.join(__dirname, 'original-index-sn777-v5.js')
];

const threeFaceD20Game = `{title:"DG Three Face D20",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhZ2bliaS4zCWOg-e4ataddbBDnE7w8jxUj0sbIGm7Y2WM5i7suY3n1Kkh_X6A-U2ZxyLKD9MXQ-GOgcUBQ1T2IBU3e4Vttz4paH0NdQ7pYADrIQ4vJtXowhZmGLcxiE73Vt8869h-lQ0qQMr3LMDrxprDiwE1YnbTMTua0OnREQ1-M9FQAAcBax4ot0DnU/s500/DREAMGAMING-LIVE-020.png",category:"DG"}`;

const threeCardD19Game = `{title:"DG ThreeCard D19",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgeQQ5XY0j9L1vOHo60-zWdxbI5cITTAyE6HyCM3WUtYy6HAcOHGg9YjdHR75Bar3M6EK6n69BQUKERDi1da4g73DVCpuOpXaEprl_3cjsfVSaR4csCW-Vx1_LMEqIJPD1rxoZ-cgTQXunoY_nvKr1oC1-JUc5pm24iEqcc0xPf6QFx9E7reTN1HLSxr8Kb/s500/DREAMGAMING-LIVE-019.png",category:"DG"}`;

let updatedCount = 0;

targets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Place DG ThreeCard D19 right after DG Three Face D20 (at bottom of DG list)
  if (!code.includes('DG ThreeCard D19')) {
    if (code.includes(threeFaceD20Game)) {
      code = code.replace(threeFaceD20Game, `${threeFaceD20Game},${threeCardD19Game}`);
      changed = true;
      console.log(`[DG Game Patch] Successfully placed DG ThreeCard D19 after DG Three Face D20 in ${path.basename(filePath)}`);
    } else {
      const threeFaceD20Regex = /\{title:"DG Three Face D20",image:"[^"]+",category:"DG"\}/;
      if (threeFaceD20Regex.test(code)) {
        code = code.replace(threeFaceD20Regex, (match) => `${match},${threeCardD19Game}`);
        changed = true;
        console.log(`[DG Game Patch] Successfully placed DG ThreeCard D19 via regex in ${path.basename(filePath)}`);
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    updatedCount++;
  }
});

console.log(`[DG Game Patch] Completed! Updated ${updatedCount} files.`);
