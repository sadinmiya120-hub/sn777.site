const fs = require('fs');
const jsPath = '/app/applet/dist/assets/index-sn777-v10.js';
let js = fs.readFileSync(jsPath, 'utf8');

// The original problematic line:
// const _cu=(Ue.username&&Ue.username!=="ব্যবহারকারী"&&Ue.username!=="User")?Ue.username:(Ue.email?Ue.email.split("@")[0]:(Ue.phone||""));
//
// We change it to:
// const _cu=Ue.username||"";
// This ensures that if Ue.username is "ব্যবহারকারী" (or anything else), it stays "ব্যবহারকারী".

const targetLine = 'const _cu=(Ue.username&&Ue.username!=="ব্যবহারকারী"&&Ue.username!=="User")?Ue.username:(Ue.email?Ue.email.split("@")[0]:(Ue.phone||""));';
const replacement = 'const _cu=Ue.username||"";';

if (js.includes(targetLine)) {
  js = js.replace(targetLine, replacement);
  fs.writeFileSync(jsPath, js, 'utf8');
  console.log('Successfully patched index-sn777-v10.js');
} else {
  console.log('Could not find target line to patch');
}
