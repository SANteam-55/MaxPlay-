1. Remove `src` from `<video>` JSX element.
2. In the `useEffect` for `activeVideoUrl`:
   - if `isHls`, setup Hls.js
   - else, setup native video:
     `video.src = activeVideoUrl;`
     `video.load();` // THIS is required for Safari and iOS, and to apply the new src.
   - If `shouldPlayRef.current`, wait for `canplay` or `loadedmetadata` before calling `play()`, OR catch the promise carefully.
3. Manage quality change seamlessly: Remember the `currentTime`, change the URL, `video.load()`, set `currentTime` when loaded, then `play()`.
4. Fix `getFastestInitialQuality` or auto-mode logic so it doesn't flicker URLs.
