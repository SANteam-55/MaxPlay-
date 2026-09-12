const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const target = `                        const xDur = await window.getVideoDuration(xpu);
                        ep.duration += xDur;`;
const replacement = `                        const xDur = await window.getVideoDuration(xpu);
                        ep.duration += xDur;
                        await new Promise(r => setTimeout(r, 500)); // Small delay for extra parts`;

code = code.replace(target, replacement);
fs.writeFileSync('public/admin.html', code);
