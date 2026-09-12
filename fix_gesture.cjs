const fs = require('fs');
let code = fs.readFileSync('src/components/player/GestureHandler.tsx', 'utf8');

const targetStr = `onClick={(e) => {
        onToggleControls();
      }}`;

code = code.replace(targetStr, `onClick={(e) => {
        // Desktop single-click fallback if clicked directly on gesture container
        if (e.pointerType === "mouse") {
          onToggleControls();
        }
      }}`);

fs.writeFileSync('src/components/player/GestureHandler.tsx', code);
