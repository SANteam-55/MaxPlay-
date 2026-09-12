const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

if (!code.includes('videoSources?: Record<string, Record<string, string>>; // Episode')) {
    code = code.replace('qualityLinks?: Record<string, string>;', 'qualityLinks?: Record<string, string>;\n  videoSources?: Record<string, Record<string, string>>; // Episode');
}

fs.writeFileSync('src/types/index.ts', code);
