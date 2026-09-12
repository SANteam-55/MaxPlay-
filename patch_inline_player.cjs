const fs = require('fs');

let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

// Fix GestureHandler props
code = code.replace(
  /<GestureHandler\s+onSingleTap=\{\(\) => setShowControls\(prev => !prev\)\}/g,
  `<GestureHandler
        isLocked={false}
        onToggleControls={() => setShowControls(prev => !prev)}
        onChangeBrightness={() => {}}
        onChangeVolume={() => {}}`
);

// Fix onError reference
code = code.replace(
  /onError=\{\(\) => \{/g,
  `onError={(e: any) => {`
);

fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
