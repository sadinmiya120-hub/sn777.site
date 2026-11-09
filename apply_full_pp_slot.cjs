const fs = require('fs');
const path = require('path');

console.log('[PP Slot Aztec Only Patch] Starting execution...');

const ppIconUrl = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMPZWLFyD6YlVWO4bmuZXAxlCYR8pjpFZHlqviWga8hDmHzZwLiaSt6FeiGbfDwQxVXO34aqc-cHN9KqGfgSKbcyt-ehIM8mniu9AdsRpPfyemOXN__7WFexeZGgtHPp4wVtduP_xKX6xDnB25i4wyXbSNBhxEczajBFOnaGElEspurSpxOCgdfAGGpasr/s120/provider-awcv2_pp%20(1).png';

const ppSlotProviderItem = `{title:"PP",image:"${ppIconUrl}",category:"স্লট",isHot:!1}`;

const jsTargets = [
  path.join(__dirname, 'dist/assets/index-sn777-v12.js'),
  path.join(__dirname, 'dist_backup/assets/index-sn777-v12.js'),
  path.join(__dirname, 'original-index-sn777-v5.js')
];

// Extra games to remove so only Aztec Gems remains in PP slot folder
const extraGames = [
  `{title:"Gates of Olympus",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjZDAnbnzRlKQ_HZDYFN6O7YqIc4vubNCSvgZdzkVdA1TzZ8Gx8CciUSEolwnVCJILV9Z6IMH6VjxNmDxrMmRxWjr54koKxwFZw0OJ7XGSvZqT46ngCUxl84g1RE01YecVlDmkTkfmzLm3e2F1Eau3PpM9DOYKZkhhVeCjJUvRZZWy2JtwtWbm0eab7NqhW/s440/PP-LIVE-197%20(1).png",category:"PP",isHot:!0},`,
  `{title:"Sweet Bonanza",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgCyAPGy0bdD-q9xuX2w2PIrNVhU9638RTnlfdD6-5t8dz6Dq1iG4OQ7HoQh5u4Elvhlqya5LiQlZJuuDSRgj8wP05Ww_ntu1OAc06JVxVzhIA37RVMmp8HgkAl9rZ3xKI-YUESp-nj2RxgR6qX61qUulIIFfnhckJX7A9aOU0lh_S70AL4EaSnACbiR0tQ/s500/PP-LIVE-044.Sweet-Bonanza-CandyLand.png",category:"PP",isHot:!0},`,
  `{title:"Sugar Rush",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiDnZkpYqwEk1-jxXApuur04c9Xku9k6xkW7ZqYjeD8apOawODZrJZyezdkRUBJVraaYRzr3W3y6tj5kbQRkpFhHaQue6R2cSFeKCyV8lBVxZKFI7t7_KNgwyAEWRdkqNWHTiEUwRZ1yI8CYWJSpY84MnYdcV-L2EX8EspattaZewYPlBnR0gZ9H3SQ6zDg/s512/com.fufafa.jogo.superace.a",category:"PP",isHot:!0},`,
  // Without trailing commas in case formatted differently
  `{title:"Gates of Olympus",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjZDAnbnzRlKQ_HZDYFN6O7YqIc4vubNCSvgZdzkVdA1TzZ8Gx8CciUSEolwnVCJILV9Z6IMH6VjxNmDxrMmRxWjr54koKxwFZw0OJ7XGSvZqT46ngCUxl84g1RE01YecVlDmkTkfmzLm3e2F1Eau3PpM9DOYKZkhhVeCjJUvRZZWy2JtwtWbm0eab7NqhW/s440/PP-LIVE-197%20(1).png",category:"PP",isHot:!0}`,
  `{title:"Sweet Bonanza",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgCyAPGy0bdD-q9xuX2w2PIrNVhU9638RTnlfdD6-5t8dz6Dq1iG4OQ7HoQh5u4Elvhlqya5LiQlZJuuDSRgj8wP05Ww_ntu1OAc06JVxVzhIA37RVMmp8HgkAl9rZ3xKI-YUESp-nj2RxgR6qX61qUulIIFfnhckJX7A9aOU0lh_S70AL4EaSnACbiR0tQ/s500/PP-LIVE-044.Sweet-Bonanza-CandyLand.png",category:"PP",isHot:!0}`,
  `{title:"Sugar Rush",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiDnZkpYqwEk1-jxXApuur04c9Xku9k6xkW7ZqYjeD8apOawODZrJZyezdkRUBJVraaYRzr3W3y6tj5kbQRkpFhHaQue6R2cSFeKCyV8lBVxZKFI7t7_KNgwyAEWRdkqNWHTiEUwRZ1yI8CYWJSpY84MnYdcV-L2EX8EspattaZewYPlBnR0gZ9H3SQ6zDg/s512/com.fufafa.jogo.superace.a",category:"PP",isHot:!0}`
];

jsTargets.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Remove extra games
  extraGames.forEach(g => {
    if (code.includes(g)) {
      code = code.replace(g, "");
      modified = true;
      console.log(`[PP Slot Aztec Only] Removed extra game from ${path.basename(filePath)}`);
    }
  });

  // Clean any double commas that might occur from removals
  if (code.includes(',')) {
    code = code.replace(/,+/g, ',');
    modified = true;
  }

  // 2. Ensure Aztec Gems is ONLY in category: "PP_SLOT"
  const aztecPatterns = [
    `{title:"Aztec Gems",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgOSGlVG75irdPLRrnglicgZxF9XMKNk2lSC330daVv2qfAfa5qMq6nMOCOM8G246Mgty4rnqsHetvxM-rv-K2nXp9bmSqabzzqLOgRXdyr3nVRMfCHE2UNM-A3vFKtqMqvkVUvBcJmmeZvBywCDQwR3-As97q_o0oOenSAcyoQBzTLXeqgIGEh35L5_7Go/s120/lightIcon%20(2).png",category:"PP"`,
    `{title:"Aztec Gems",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgOSGlVG75irdPLRrnglicgZxF9XMKNk2lSC330daVv2qfAfa5qMq6nMOCOM8G246Mgty4rnqsHetvxM-rv-K2nXp9bmSqabzzqLOgRXdyr3nVRMfCHE2UNM-A3vFKtqMqvkVUvBcJmmeZvBywCDQwR3-As97q_o0oOenSAcyoQBzTLXeqgIGEh35L5_7Go/s120/lightIcon%20(2).png",category:"স্লট"`
  ];

  const aztecTarget = `{title:"Aztec Gems",image:"https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgOSGlVG75irdPLRrnglicgZxF9XMKNk2lSC330daVv2qfAfa5qMq6nMOCOM8G246Mgty4rnqsHetvxM-rv-K2nXp9bmSqabzzqLOgRXdyr3nVRMfCHE2UNM-A3vFKtqMqvkVUvBcJmmeZvBywCDQwR3-As97q_o0oOenSAcyoQBzTLXeqgIGEh35L5_7Go/s120/lightIcon%20(2).png",category:"PP_SLOT"`;

  aztecPatterns.forEach(pat => {
    if (code.includes(pat)) {
      code = code.replace(pat, aztecTarget);
      modified = true;
      console.log(`[PP Slot Aztec Only] Set Aztec Gems to category: PP_SLOT in ${path.basename(filePath)}`);
    }
  });

  // 3. Ensure PP slot folder icon is in category: "স্লট"
  const hasPpInSlot = code.includes('category:"স্লট"') && code.includes(`{title:"PP",image:"${ppIconUrl}",category:"স্লট"`);
  if (!hasPpInSlot) {
    const fcRegex = /\{title:"FC",image:"[^"]+",category:"স্লট",isHot:[^}]+\}/;
    if (fcRegex.test(code)) {
      code = code.replace(fcRegex, match => `${match},${ppSlotProviderItem}`);
      modified = true;
      console.log(`[PP Slot Aztec Only] Injected PP slot folder icon after FC in ${path.basename(filePath)}`);
    }
  }

  // 4. Update click handler: when user clicks PP from Slot (Tt === "স্লট" || Tt === "PP_SLOT"), go to "PP_SLOT"
  const ppClickPatterns = [
    `if(E==="PP"){if(Tt==="স্লট"||Tt==="PP_SLOT"){wr("PP_SLOT");return}wr("PP");return}`,
    `if(E==="PP"){wr("PP");return}`
  ];

  const desiredClick = `if(E==="PP"){if(Tt==="স্লট"||Tt==="PP_SLOT"){wr("PP_SLOT");return}wr("PP");return}`;

  if (!code.includes(desiredClick)) {
    if (code.includes(`if(E==="PP"){wr("PP");return}`)) {
      code = code.replace(`if(E==="PP"){wr("PP");return}`, desiredClick);
      modified = true;
      console.log(`[PP Slot Aztec Only] Updated PP click handler in ${path.basename(filePath)}`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`[PP Slot Aztec Only] Successfully updated ${path.basename(filePath)}`);
  }
});

// Update index.html files with new cache-busting timestamp
const newVersion = '20261023_slot_pp_aztec_only_v1';
const htmlFiles = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'dist/index.html'),
  path.join(__dirname, 'dist_backup/index.html')
];

htmlFiles.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/index-sn777-v12\.js\?v=[a-zA-Z0-9_-]+/g, `index-sn777-v12.js?v=${newVersion}`);
    fs.writeFileSync(f, content, 'utf8');
    console.log(`[PP Slot Aztec Only] Updated version in ${f} to ${newVersion}`);
  }
});

// Update sw.js files with new cache name to wipe old cache
const newCacheName = 'sn777-v11';
const swFiles = [
  path.join(__dirname, 'sw.js'),
  path.join(__dirname, 'public/sw.js'),
  path.join(__dirname, 'dist/sw.js')
];

swFiles.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/const CACHE_NAME = "sn777-v[0-9]+";/, `const CACHE_NAME = "${newCacheName}";`);
    fs.writeFileSync(f, content, 'utf8');
    console.log(`[PP Slot Aztec Only] Updated cache name in ${f} to ${newCacheName}`);
  }
});

console.log('[PP Slot Aztec Only Patch] All updates complete!');
