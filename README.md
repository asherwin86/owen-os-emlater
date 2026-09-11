# OS Emulator

A full x86 PC — CPU, BIOS, VGA, disk controller — emulated in WebAssembly and
running entirely inside a browser tab. No install, no server-side work beyond
handing out static files: boot a bundled demo Linux instantly, or point it at
any ISO/IMG file on your own computer and it boots that instead, entirely
client-side.

Built on [v86](https://github.com/copy/v86) (BSD-2-licensed) — this repo
vendors its prebuilt core (`vendor/libv86.js`, `vendor/v86.wasm`, BIOS files)
plus a small demo Linux ISO (`images/demo-linux.iso`, ~7 MB, same one the
v86 project's own live demo uses) so the whole thing runs offline once
cloned.

## What this can and can't do

- **Small Linux distros**: genuinely work, and work well — the bundled demo
  boots in a few seconds. Most lightweight ISOs (TinyCore, Alpine, Damn Small
  Linux, etc.) will run fine.
- **Old Windows (98 / 2000-era)**: possible with the right ISO, but slow and
  occasionally flaky — this is a full software CPU emulator, not
  virtualization, so it's inherently much slower than real hardware or a
  proper VM.
- **Modern Windows (10/11) or any mainstream modern Linux desktop**: not
  realistic here. They assume hardware acceleration and fast disk I/O this
  approach can't provide — expect it to hang or take "forever" to boot, if it
  boots at all. For that, you want a real VM (VirtualBox, VMware, Hyper-V,
  QEMU with KVM) or the [remote-desktop](../remote-desktop) project's actual
  screen-sharing approach against a real machine, not an emulator.

## Getting it

Three ways to run this, all sharing the same `index.html`/`app.js`:

- **Prebuilt apps** (easiest): grab the latest release —
  [Windows installer or portable exe](https://github.com/asherwin86/owen-os-emlater/releases/latest)
  and an Android APK, both on the same release. The desktop app checks that
  page for updates on every launch and installs them automatically
  (`electron-updater`); the Android app can't do that silently (sideloading
  always needs a tap-through install prompt), so it shows a banner instead
  when a newer release exists.
- **In a browser, from source** — see below.
- **Build the apps yourself** — see "Building the desktop app" and "Building
  the Android app" further down.

## Running it from source

```
npm start
```
then open <http://localhost:6060>, or `npm run electron:start` for the
desktop-app version of the same thing. Two ways to boot:

1. **Boot Demo Linux** — instant, no file needed.
2. **Your own ISO / IMG** — pick a file, choose how much RAM to give it, hit
   Boot. `.iso` mounts as a CD-ROM; anything else is treated as a raw hard
   disk image.

Nothing you pick is uploaded anywhere — the file is handed to the emulator
directly in the browser (`{ buffer: file }`, read locally via the File API).
`server.js` never sees its contents; it only serves this page and the
vendored demo ISO/core files, with HTTP range-request support so the browser
can seek into large files instead of loading them whole.

## Updating the vendored v86 core

The v86 project ships prebuilt files at `copy.sh/v86/build/` and
`copy.sh/v86/bios/`. To refresh:
```
curl -sL -o vendor/libv86.js https://copy.sh/v86/build/libv86.js
curl -sL -o vendor/v86.wasm  https://copy.sh/v86/build/v86.wasm
curl -sL -o vendor/seabios.bin https://copy.sh/v86/bios/seabios.bin
curl -sL -o vendor/vgabios.bin https://copy.sh/v86/bios/vgabios.bin
```
The exported global is `V86` (constructor), not the older `V86Starter` name
some tutorials still reference — confirmed by reading the actual downloaded
source, not assumed.

## Building the desktop app

```
npm install
USE_SYSTEM_WINE=true npx electron-builder --win nsis portable --publish always
gh release edit v<version> --draft=false --latest
```
(`USE_SYSTEM_WINE` only matters when cross-building for Windows from
Linux/WSL — see the mini_games CLAUDE.md for why. `--publish always` is
required, not optional: a hand-made release skips `latest.yml`, and without
it `electron-updater` can never detect a new version.)

## Building the Android app

Needs a JDK 21+ and the Android SDK (`ANDROID_HOME`/`ANDROID_SDK_ROOT`) —
neither is bundled in this repo.
```
npm run android:sync        # copies index.html/app.js/vendor/images into
                             # www/, then `cap sync` into android/
cd android
ANDROID_KEYSTORE_PATH=/path/to/release.keystore \
ANDROID_KEYSTORE_PASSWORD=... ANDROID_KEY_ALIAS=os-emulator ANDROID_KEY_PASSWORD=... \
./gradlew assembleRelease
```
Without those four env vars set, `assembleRelease` still builds, just
unsigned — fine for local testing, not for anything meant to be installed.
**The signing keystore must stay identical across every release** — Android
refuses to install an "update" signed by a different key than whatever's
already on the device, so losing it silently breaks updates for anyone who
installed an earlier build (they'd have to uninstall the old one first).
Keep both the version bump (`package.json`, `android/app/build.gradle`'s
`versionCode`/`versionName`, and `app.js`'s `APP_VERSION`) and the upload to
the same GitHub release the desktop build publishes to:
```
gh release upload v<version> app-release.apk --clobber
```
