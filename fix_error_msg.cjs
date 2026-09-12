const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

code = code.replace(
  /onError=\{\(e: any\) => \{[\s\S]*?\}\}/,
  `onError={(e: any) => {
    setIsLoading(false);
    const err = e.currentTarget.error;
    let msg = "Unknown Error";
    if (err) {
      switch (err.code) {
        case 1: msg = "Aborted"; break;
        case 2: msg = "Network Error"; break;
        case 3: msg = "Decode Error"; break;
        case 4: msg = "Format Not Supported / URL Expired"; break;
        default: msg = "Code " + err.code;
      }
      if (err.message) msg += " (" + err.message + ")";
    }
    console.error("Video Error Details:", err ? err.code : "null");
    setPlaybackError('Failed to load video: ' + msg);
  }}`
);
fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
