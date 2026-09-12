const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

const insertPoint = code.indexOf('const togglePlayPause = () => {');

const changeLangInsert = `
  const handleChangeLanguage = (lang: string) => {
    if (lang === activeLanguage) return;
    setActiveLanguage(lang);
    setShowLanguageDrawer(false);
  };
`;

code = code.substring(0, insertPoint) + changeLangInsert + '\n' + code.substring(insertPoint);

fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
