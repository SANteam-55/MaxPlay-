const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

// replace LanguageDrawer with AudioLangDrawer
code = code.replace("import { LanguageDrawer } from './LanguageDrawer';", "import { AudioLangDrawer } from './AudioLangDrawer';");

// Insert the Drawer UI at the bottom
const idxDrawer = code.indexOf('<QualityDrawer');
const drawerUI = `
      {availableLanguages && availableLanguages.length > 0 && (
          <AudioLangDrawer
             visible={showLanguageDrawer}
             currentLanguage={activeLanguage}
             availableLanguages={availableLanguages}
             onSelectLanguage={handleChangeLanguage}
             onClose={() => setShowLanguageDrawer(false)}
          />
      )}
`;
code = code.substring(0, idxDrawer) + drawerUI + code.substring(idxDrawer);

// Ensure PlayerControls gets the props
code = code.replace("<PlayerControls", "<PlayerControls\n        currentLanguage={availableLanguages && availableLanguages.length > 0 ? activeLanguage : undefined}\n        onLanguagePress={() => setShowLanguageDrawer(true)}");

fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
