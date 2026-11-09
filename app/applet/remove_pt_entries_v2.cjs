const fs = require('fs');
const jsPath = 'dist/assets/index-sn777-v10.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Use a more robust way to find and replace the PT entries
const entries = [
  '{title:"PT",image:"/assets/provider_pt.png",category:"ক্যাসিনো",isHot:!0}',
  '{title:"PT",image:"/assets/provider_pt.png",category:"স্লট",isHot:!0}'
];

entries.forEach(entry => {
    js = js.split(entry).join('null');
});

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Successfully removed PT entries from bundle');
