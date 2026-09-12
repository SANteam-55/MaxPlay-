const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('window.switchTab =')) {
    console.log(i + 1, l.trim());
  }
});
