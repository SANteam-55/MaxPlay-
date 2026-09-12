const fs = require('fs');
let code = fs.readFileSync('src/components/player/PlayerControls.tsx', 'utf8');

code = code.replace("currentQuality?: string;", "currentQuality?: string;\n  currentLanguage?: string;\n  onLanguagePress?: () => void;");
code = code.replace("onQualityPress,", "onQualityPress,\n  currentLanguage,\n  onLanguagePress,");

// Also add a button for Language if currentLanguage is provided
const qualityBtnIdx = code.indexOf('<button\n            type="button"\n            onClick={onQualityPress}');

const languageBtn = `
          {currentLanguage && onLanguagePress && (
            <button
              type="button"
              onClick={onLanguagePress}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer text-white"
              title="Audio Language"
            >
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">{currentLanguage}</span>
            </button>
          )}
          `;

if (qualityBtnIdx !== -1) {
   code = code.substring(0, qualityBtnIdx) + languageBtn + code.substring(qualityBtnIdx);
}

fs.writeFileSync('src/components/player/PlayerControls.tsx', code);
