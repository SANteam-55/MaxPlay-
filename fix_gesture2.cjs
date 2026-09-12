const fs = require('fs');
let code = fs.readFileSync('src/components/player/GestureHandler.tsx', 'utf8');

const targetStr = `onClick={(e) => {
        // Desktop single-click fallback if clicked directly on gesture container
        if (e.pointerType === "mouse") {
          onToggleControls();
        }
      }}`;

code = code.replace(targetStr, `onClick={(e) => {
        // Prevent double fire on touch devices (where pointerType is touch or undefined)
        if (e.nativeEvent.pointerType === 'mouse' || e.nativeEvent.pointerType === undefined) {
          // Note: touch end already handles toggle in setTimeout. We only want true mouse clicks to toggle immediately.
          if (e.nativeEvent.pointerType === 'mouse') {
            onToggleControls();
          }
        }
      }}`);

fs.writeFileSync('src/components/player/GestureHandler.tsx', code);
