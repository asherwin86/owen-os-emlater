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

## Running it

```
npm start
```
then open <http://localhost:6060>. Two ways to boot:

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
