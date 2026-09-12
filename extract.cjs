const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');
let match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (match) {
  fs.writeFileSync('test_script.js', match[1]);
  console.log("Extracted");
}
