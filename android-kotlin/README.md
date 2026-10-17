# MaxPlay Native Kotlin Android Project (`android-kotlin/`)

Yeh folder MaxPlay ka standalone **Native Kotlin Android App** project hai, jisme aapka poora MaxPlay UI/UX **100% bina kisi feature loss ke** chalta hai aur **Zero Browser CORS Policy** + **Inbuilt Stream Scraper Engine** deta hai.

---

## 🚀 Key Native Features Included

1. **Zero CORS Restrictions (`MainActivity.kt` & `CorsFreeWebViewClient.kt`)**:
   - `allowUniversalAccessFromFileURLs = true` aur `allowFileAccessFromFileURLs = true` enabled hain.
   - `CorsFreeWebViewClient` har outgoing `.m3u8`, `.ts`, `.m4s` request ko Native `OkHttp` se run karke `Access-Control-Allow-Origin: *` inject karta hai.
2. **Inbuilt Native Stream Scraper & Sniffer (`InbuiltStreamScraper.kt`)**:
   - **Fast OkHttp Scraper**: Custom `User-Agent`, `Referer`, VOE Base64/ROT13 decoder, aur Dean Edwards `eval(function(p,a,c,k,e,d))` packed JS unpacker.
   - **Headless WebView Stream Sniffer**: Obfuscated video host pages ko background me load karke `.m3u8` master stream automatically sniff kar leta hai.
3. **Direct Native Binary Segment Downloader (`MaxPlayNativeBridge.kt`)**:
   - `window.MaxPlayNative.fetchBytesBase64CorsFree` ke zariye `ClientHlsDownloader` seedha user ke phone se bina proxy delay ke video segments download karta hai.
4. **Native Hardware Landscape Lock**:
   - Fullscreen dabane par `ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE` aur immersive fullscreen activate hota hai.

---

## 📦 APK Kaise Build Karein? (2 Easy Tarike)

### Tarika 1: Bina PC ke Cloud par (GitHub Actions - 1 Click)
1. Apne project ko GitHub repository me push karein.
2. GitHub repo me **Actions** tab par jayein -> **Build MaxPlay Native Kotlin APK** workflow select karein -> **Run workflow** dabayein.
3. 2-3 minute me `MaxPlay-Android-Kotlin-APK` (`app-debug.apk`) ready ho jayega jise aap seedha phone me download aur install kar sakte hain!

### Tarika 2: Android Studio me
1. Pehle web bundle build karke assets me copy karein:
   ```bash
   npx vite build
   mkdir -p android-kotlin/app/src/main/assets/webapp
   cp -r dist/* android-kotlin/app/src/main/assets/webapp/
   ```
2. **Android Studio** open karein -> **Open** -> `android-kotlin` folder select karein.
3. **Build > Build Bundle(s) / APK(s) > Build APK(s)** par click karein.
