const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const regex = /videoEl = document\.createElement\('video'\);\n\s*videoEl\.preload = 'metadata';\n\s*videoEl\.muted = true;\n\s*videoEl\.playsInline = true;/;

const replacement = `videoEl = document.createElement('video');
        videoEl.preload = 'metadata';
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.crossOrigin = 'anonymous';
        videoEl.referrerPolicy = 'no-referrer';`;

code = code.replace(regex, replacement);

const regex2 = /fetch\(cleanUrl\)/;
const replacement2 = `fetch(cleanUrl, { referrerPolicy: 'no-referrer' })`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('public/admin.html', code);
