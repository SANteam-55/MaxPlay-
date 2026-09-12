const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');

const targetStr = `        {/* Resources / Episodes Box */}
        {(activeEpisodeList.length > 0 || availableLanguages.length > 0 || activeParts.length > 0) && (
            <div className="bg-[#0f0f0f] rounded-2xl p-4 sm:p-5 mb-8">`;

const newStr = `        {/* Resources / Episodes Box */}
        {(activeEpisodeList.length > 0 || availableLanguages.length > 0 || activeParts.length > 0) && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4 sm:p-5 mb-8">`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
