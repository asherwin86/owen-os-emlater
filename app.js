// OS Emulator — boots v86 (a WebAssembly x86 PC emulator) either against the
// bundled demo Linux ISO or a disk image the user picks from their own
// computer. Everything happens client-side: a picked File is handed to v86
// directly as `{ buffer: file }` (libv86.js reads it with FileReader/slice
// internally), so nothing is ever uploaded to this server — server.js only
// serves the static files and the demo ISO's bytes.
(function () {
  "use strict";

  // Bump alongside package.json's "version" on every release — there's no
  // build step here to inject it automatically, and a packaged Android app
  // has no package.json to read at runtime, so this is the one place it has
  // to be kept in sync by hand.
  const APP_VERSION = "1.1.0";

  // Sideloaded Android apps can't silently self-update the way the desktop
  // Electron build does (electron-updater) — Android requires the user to
  // tap through an install prompt no matter what. This is the realistic
  // ceiling: notice a newer GitHub release exists and hand over a direct
  // download link. window.Capacitor only exists when running inside the
  // native Android app (Capacitor injects its bridge at runtime) — never in
  // a plain browser tab or the Electron build, so this naturally only ever
  // fires there.
  async function checkForAndroidUpdate() {
    if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return;
    try {
      const res = await fetch("https://api.github.com/repos/asherwin86/owen-os-emlater/releases/latest");
      if (!res.ok) return;
      const data = await res.json();
      const latestVersion = (data.tag_name || "").replace(/^v/, "");
      if (!latestVersion || latestVersion === APP_VERSION) return;
      const apkAsset = (data.assets || []).find((a) => a.name.endsWith(".apk"));
      if (!apkAsset) return;

      const bar = document.createElement("div");
      bar.id = "updateBanner";
      bar.innerHTML = `Update ${latestVersion} available — <a href="${apkAsset.browser_download_url}" target="_blank" rel="noopener">tap to download</a>`;
      document.body.prepend(bar);
    } catch (e) {
      // Offline, rate-limited, or GitHub unreachable — this is a courtesy
      // check, not something worth surfacing as an error.
    }
  }
  checkForAndroidUpdate();

  const setupScreen = document.getElementById("setupScreen");
  const emulatorScreen = document.getElementById("emulatorScreen");
  const bootDemoBtn = document.getElementById("bootDemoBtn");
  const bootFileBtn = document.getElementById("bootFileBtn");
  const fileInput = document.getElementById("fileInput");
  const fileLabel = document.getElementById("fileLabel");
  const memSelect = document.getElementById("memSelect");
  const statusEl = document.getElementById("status");
  const emuStatus = document.getElementById("emuStatus");
  const resetBtn = document.getElementById("resetBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const powerBtn = document.getElementById("powerBtn");
  const screenContainer = document.getElementById("screen_container");

  let emulator = null;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = kind || "";
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) { bootFileBtn.disabled = true; fileLabel.textContent = ""; return; }
    const mb = (file.size / 1024 / 1024).toFixed(1);
    fileLabel.textContent = `${file.name} (${mb} MB)`;
    bootFileBtn.disabled = false;
  });

  function diskConfigFor(file) {
    // .iso mounts as a CD-ROM (ide/atapi); anything else is treated as a
    // raw hard-disk image — the common case for a .img you made yourself.
    const isIso = /\.iso$/i.test(file.name);
    return isIso ? { cdrom: { buffer: file } } : { hda: { buffer: file } };
  }

  function startEmulator(diskConfig, memoryMB) {
    setupScreen.classList.add("hidden");
    emulatorScreen.classList.add("active");
    emuStatus.textContent = "Starting…";

    emulator = new V86({
      wasm_path: "vendor/v86.wasm",
      bios: { url: "vendor/seabios.bin" },
      vga_bios: { url: "vendor/vgabios.bin" },
      memory_size: memoryMB * 1024 * 1024,
      vga_memory_size: 8 * 1024 * 1024,
      screen_container: screenContainer,
      autostart: true,
      ...diskConfig,
    });

    emulator.add_listener("download-progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        emuStatus.textContent = `Loading ${(e.file_name || "").split("/").pop()} — ${pct}%`;
      }
    });
    emulator.add_listener("emulator-ready", () => { emuStatus.textContent = "Booting…"; });
    emulator.add_listener("emulator-started", () => { emuStatus.textContent = "Running"; });
    emulator.add_listener("emulator-stopped", () => { emuStatus.textContent = "Stopped"; });
  }

  bootDemoBtn.addEventListener("click", () => {
    setStatus("");
    startEmulator({ cdrom: { url: "images/demo-linux.iso" } }, 256);
  });

  bootFileBtn.addEventListener("click", () => {
    const file = fileInput.files[0];
    if (!file) return;
    setStatus("");
    startEmulator(diskConfigFor(file), parseInt(memSelect.value, 10));
  });

  resetBtn.addEventListener("click", () => { if (emulator) emulator.restart(); });

  fullscreenBtn.addEventListener("click", () => {
    if (emulator) emulator.screen_go_fullscreen();
  });

  powerBtn.addEventListener("click", async () => {
    if (!emulator) return;
    powerBtn.disabled = true;
    await emulator.destroy();
    emulator = null;
    powerBtn.disabled = false;
    screenContainer.innerHTML = "";
    emulatorScreen.classList.remove("active");
    setupScreen.classList.remove("hidden");
    setStatus("");
  });
})();
