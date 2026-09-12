const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

code = code.replace("videoEl.crossOrigin = 'anonymous';\n        videoEl.referrerPolicy = 'no-referrer';", "videoEl.referrerPolicy = 'no-referrer';");

fs.writeFileSync('public/admin.html', code);
