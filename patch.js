const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');
code = code.replace(
  '  useEffect(() => {',
`  const handlePlayerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.progress-bar-container') || target.closest('input')) {
      resetHideTimer();
      return;
    }
    if (showControls) {
      setShowControls(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      resetHideTimer();
    }
  };

  useEffect(() => {`
);
fs.writeFileSync('src/components/player/InlinePlayer.tsx', code);
