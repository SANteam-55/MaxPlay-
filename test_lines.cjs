const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (match) {
  const lines = match[1].split('\n');
  console.log(lines.slice(-20).join('\n'));
}
