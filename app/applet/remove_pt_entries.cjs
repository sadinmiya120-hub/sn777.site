const fs = require('fs');
const jsPath = 'dist/assets/index-sn777-v10.js';
let js = fs.readFileSync(jsPath, 'utf8');

const entry1 = '{title:"PT",image:"/assets/provider_pt.png",category:"ক্যাসিনো",isHot:!0}';
const entry2 = '{title:"PT",image:"/assets/provider_pt.png",category:"স্লট",isHot:!0}';

js = js.replace(entry1, 'null');
js = js.replace(entry2, 'null');

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Successfully removed PT entries from bundle');
