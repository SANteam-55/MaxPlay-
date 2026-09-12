const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

code = code.replace(
  /onError=\{\(e: any\) => \{[\s\S]*?\}\}/,
  `onError={(e: any) => {
    setIsLoading(false);
    const err = e.currentTarget.error;
    let msg = "Unknown";
    if (err) {
      if (err.code === 1) msg = "MEDIA_ERR_ABORTED";
      else if (err.code === 2) msg = "MEDIA_ERR_NETWORK";
      else if (err.code === 3) msg = "MEDIA_ERR_DECODE";
      else if (err.code === 4) msg = "MEDIA_ERR_SRC_NOT_SUPPORTED";
      if (err.message) msg += " (" + err.message + ")";
    }
    console.error("Video Error:", msg, activeVideoUrl);
    setPlaybackError('Failed to load video: ' + msg);
  }}`
);
fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
