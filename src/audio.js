// Background music, click sound, rock-paper-scissors music and the sound settings menu.
(function () {
  'use strict';

  // ---- Edit these to match your files ----
  const FILES = { intro: 'audio/intro.wav', loop: 'audio/loop.wav', click: 'audio/click.wav' };
  const RPS_SONGS = [
    { id: 'dual', label: 'Dual', src: 'audio/dual.wav' },
    { id: 'monk', label: 'Monk', src: 'audio/monk.wav' },
    { id: '8bit', label: '8-bit', src: 'audio/8bit.wav' },
  ];
  // ----------------------------------------

  const STORAGE_KEY = 'redvsblue.audioSettings.v1';
  const DEFAULTS = {
    muteMusic: false,
    muteRps: false,
    muteAll: false,
    rpsSong: RPS_SONGS[0].id,
    musicVolume: 40, // 0 to 100
    rpsVolume: 50,
    sfxVolume: 60,
  };

  const clampVolume = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
  };

  function loadSettings() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch {}
    const merged = { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
    merged.musicVolume = clampVolume(merged.musicVolume, DEFAULTS.musicVolume);
    merged.rpsVolume = clampVolume(merged.rpsVolume, DEFAULTS.rpsVolume);
    merged.sfxVolume = clampVolume(merged.sfxVolume, DEFAULTS.sfxVolume);
    if (!RPS_SONGS.some((s) => s.id === merged.rpsSong)) merged.rpsSong = RPS_SONGS[0].id;
    return merged;
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }

  let settings = loadSettings();

  const intro = new Audio(FILES.intro);
  const loop = new Audio(FILES.loop);
  const clickSound = new Audio(FILES.click);
  intro.preload = 'auto';
  loop.preload = 'auto';
  clickSound.preload = 'auto';
  loop.loop = true;
  intro.addEventListener('error', () => console.warn('Could not load', FILES.intro));
  loop.addEventListener('error', () => console.warn('Could not load', FILES.loop));

  let rpsAudio = null;
  let musicStarted = false;
  let introDone = false;
  let rpsActive = false;

  function applyMute() {
    const backgroundMuted = settings.muteAll || settings.muteMusic;
    intro.muted = backgroundMuted;
    loop.muted = backgroundMuted;
    if (rpsAudio) rpsAudio.muted = settings.muteAll || settings.muteRps;
  }

  function applyVolumes() {
    intro.volume = loop.volume = settings.musicVolume / 100;
    if (rpsAudio) rpsAudio.volume = settings.rpsVolume / 100;
  }

  // ---- Background music: intro once, then the loop ----
  intro.addEventListener('ended', () => {
    introDone = true;
    if (!rpsActive) loop.play().catch(() => {});
  });

  function startMusic() {
    if (musicStarted) return Promise.resolve(true);
    applyMute();
    applyVolumes();
    return intro.play().then(
      () => { musicStarted = true; return true; },
      (err) => { console.warn('Music could not start:', err); return false; }
    );
  }

  function resumeBackground() {
    if (!musicStarted) return;
    (introDone ? loop : intro).play().catch(() => {});
  }

  // Browsers only allow sound after the visitor interacts, so start on the first gesture.
  const GESTURES = ['pointerdown', 'pointerup', 'keydown'];
  function onFirstGesture() {
    startMusic().then((ok) => {
      if (ok) GESTURES.forEach((e) => document.removeEventListener(e, onFirstGesture, true));
    });
  }
  GESTURES.forEach((e) => document.addEventListener(e, onFirstGesture, true));

  // Click sound
  function playClick() {
    if (settings.muteAll || settings.sfxVolume === 0) return;
    const c = clickSound.cloneNode();
    c.volume = settings.sfxVolume / 100;
    c.play().catch(() => {});
  }
  const captureButton = document.getElementById('captureButton');
  if (captureButton) captureButton.addEventListener('click', playClick); // a disabled button fires no click

  // Click sound when a rock / paper / scissors option is pressed.
  // Capture phase, so it plays even if the duel code stops the event from bubbling.
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-rps-move]')) playClick();
  }, true);

  // Rock-paper-scissors music
  function startRps() {
    if (rpsActive) return;
    rpsActive = true;
    intro.pause();
    loop.pause();
    const song = RPS_SONGS.find((s) => s.id === settings.rpsSong) || RPS_SONGS[0];
    rpsAudio = new Audio(song.src);
    rpsAudio.loop = false;
    applyMute();
    applyVolumes();
    rpsAudio.play().catch(() => {});
  }
  function stopRps() {
    if (!rpsActive) return;
    rpsActive = false;
    if (rpsAudio) { rpsAudio.pause(); rpsAudio = null; }
    resumeBackground();
  }

  const overlay = document.getElementById('rpsOverlay');
  if (overlay) {
    const isOpen = () => !overlay.hidden && getComputedStyle(overlay).display !== 'none';
    const sync = () => (isOpen() ? startRps() : stopRps());
    new MutationObserver(sync).observe(overlay, {
      attributes: true, attributeFilter: ['hidden', 'class', 'style'],
    });
  }

  // Settings menu
  const style = document.createElement('style');
  style.textContent = `
    .audio-settings { position: fixed; top: 12px; right: 12px; z-index: 9999; }
    .audio-gear { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #ccc;
      background: #fff; font-size: 20px; line-height: 1; cursor: pointer; }
    .audio-panel { position: absolute; top: 48px; right: 0; width: 280px; padding: 14px;
      background: #fff; color: #111; border: 1px solid #ccc; border-radius: 10px;
      box-shadow: 0 6px 20px rgba(0,0,0,.18); text-align: left; }
    .audio-panel[hidden] { display: none; }
    .audio-panel h2 { margin: 0 0 10px; font-size: 1rem; }
    .audio-panel label { display: block; margin: 8px 0; font-size: .9rem; }
    .audio-panel select { display: block; width: 100%; margin-top: 4px; padding: 4px; }
    .audio-panel input[type="range"] { display: block; width: 100%; margin: 4px 0 0; }
    .audio-panel .audio-value { float: right; font-variant-numeric: tabular-nums; opacity: .7; }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'audio-settings';
  root.innerHTML = `
    <button type="button" class="audio-gear" id="audioGear"
      aria-label="Sound settings" aria-expanded="false" aria-controls="audioPanel">&#9881;</button>
    <div class="audio-panel" id="audioPanel" hidden>
      <h2>Sound settings</h2>

      <label><input type="checkbox" id="optMuteMusic"> Mute background song</label>
      <label>Background music volume <span class="audio-value" id="valMusic"></span>
        <input type="range" id="volMusic" min="0" max="100" step="1"></label>

      <label><input type="checkbox" id="optMuteRps"> Mute rock paper scissors songs</label>
      <label>Rock paper scissors song
        <select id="optRpsSong"></select></label>
      <label>Rock paper scissors volume <span class="audio-value" id="valRps"></span>
        <input type="range" id="volRps" min="0" max="100" step="1"></label>

      <label>Sound effects volume <span class="audio-value" id="valSfx"></span>
        <input type="range" id="volSfx" min="0" max="100" step="1"></label>

      <label><input type="checkbox" id="optMuteAll"> Mute all website sound</label>
    </div>`;
  document.body.appendChild(root);

  const $ = (id) => root.querySelector('#' + id);
  const gear = $('audioGear');
  const panel = $('audioPanel');
  const optMuteMusic = $('optMuteMusic');
  const optMuteRps = $('optMuteRps');
  const optMuteAll = $('optMuteAll');
  const optRpsSong = $('optRpsSong');
  const volMusic = $('volMusic');
  const volRps = $('volRps');
  const volSfx = $('volSfx');

  RPS_SONGS.forEach((s) => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.label;
    optRpsSong.appendChild(option);
  });

  function updateLabels() {
    $('valMusic').textContent = settings.musicVolume + '%';
    $('valRps').textContent = settings.rpsVolume + '%';
    $('valSfx').textContent = settings.sfxVolume + '%';
  }

  function syncControls() {
    optMuteMusic.checked = settings.muteMusic;
    optMuteRps.checked = settings.muteRps;
    optMuteAll.checked = settings.muteAll;
    optRpsSong.value = settings.rpsSong;
    volMusic.value = settings.musicVolume;
    volRps.value = settings.rpsVolume;
    volSfx.value = settings.sfxVolume;
    updateLabels();
  }

  function readControls() {
    settings = {
      muteMusic: optMuteMusic.checked,
      muteRps: optMuteRps.checked,
      muteAll: optMuteAll.checked,
      rpsSong: optRpsSong.value,
      musicVolume: clampVolume(volMusic.value, DEFAULTS.musicVolume),
      rpsVolume: clampVolume(volRps.value, DEFAULTS.rpsVolume),
      sfxVolume: clampVolume(volSfx.value, DEFAULTS.sfxVolume),
    };
    applyMute();
    applyVolumes();
    updateLabels();
  }

  // 'input' fires while dragging a slider (live change); 'change' fires when done, so save and click then.
  [optMuteMusic, optMuteRps, optMuteAll, optRpsSong, volMusic, volRps, volSfx].forEach((el) => {
    el.addEventListener('input', readControls);
    el.addEventListener('change', () => { readControls(); saveSettings();});
  });

  function setPanel(open) {
    panel.hidden = !open;
    gear.setAttribute('aria-expanded', String(open));
  }
  gear.addEventListener('click', () => setPanel(panel.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setPanel(false); });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) setPanel(false); });

  syncControls();
  applyMute();
  applyVolumes();

  window.GameAudio = { startMusic, playClick };
})();