const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

if (!code.includes('availableLanguages')) {
    code = code.replace('qualityLinks?: Record<string, string>;', 'qualityLinks?: Record<string, string>;\n  availableLanguages?: string[];\n  videoSources?: Record<string, Record<string, string>>;');
}

fs.writeFileSync('src/types/index.ts', code);
