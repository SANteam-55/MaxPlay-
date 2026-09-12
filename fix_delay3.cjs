const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const target = `        for (let i = 0; i < partUrls.length; i++) {
          const url = partUrls[i];
          if (!url) continue;

          try {
            const dur = await window.getVideoDuration(url);
            if (dur > 0) {
              totalSeconds += dur;
              successfulPartsCount++;
            }`;
const replacement = `        for (let i = 0; i < partUrls.length; i++) {
          const url = partUrls[i];
          if (!url) continue;

          try {
            const dur = await window.getVideoDuration(url);
            if (dur > 0) {
              totalSeconds += dur;
              successfulPartsCount++;
            }
            if (i < partUrls.length - 1) await new Promise(r => setTimeout(r, 1000)); // Delay between parts`;

code = code.replace(target, replacement);
fs.writeFileSync('public/admin.html', code);
