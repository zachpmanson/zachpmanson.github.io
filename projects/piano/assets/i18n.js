// i18n.js
// Global i18n dictionary and helpers (only trainer.* keys are used)
// English-only build.
window.I18N = {
  current: "en",
  dict: {
    en: {
      trainer: {
        fileBtn: "File",
        libraryBtn: "Library",
        settingsLang: "Language",
        settingsHand: "Hand",
        settingsMode: "Mode",
        handBoth: "Both",
        handRight: "Right",
        handLeft: "Left",
        modeFree: "Free",
        modeTimed: "Tempo",
        modeReading: "Reading",
        modeReadingStatus: "Auto-scrolling sheet music...",
        fileInfoDefault: "Choose a MusicXML file",
        fileInfoLoading: "Loading...",
        fileInfoError: "Load error",
        statCorrect: "Correct",
        statWrong: "Wrong",
        statTime: "Time",
        statProgress: "Progress",
        debugDefault: "Press a key — MIDI diagnostics will appear here",
        scoreDefault: "Choose a .mxl or .musicxml file",
        noteDisplayDefault: "Load a file",
        noteDisplayStart: "Press ▶ Start",
        noteDisplayDone: "Done!",
        pause: "Rest",
        btnStart: "Start",
        btnStop: "Stop",
        btnRestart: "Restart",
        btnListen: "Listen",
        btnListenStop: "Stop",
        btnLoop: "Loop",
        loopSelectStart: "Click the first note of the loop",
        loopSelectEnd: "Click the last note of the loop",
        appTitle: "Trainer",
        settingsDuration: "Hold notes (duration + legato)",
        showKeyboard: "Show keyboard",
        showNoteNames: "Show note names",
        hideStats: "Hide counters (correct / wrong / time)",
        restartGesture: "Restart by pressing 3 adjacent white keys together",
        settingsSkipWrongFree: "In free mode, move on after a wrong key",
        settingsZoom: "Zoom",
        durationRelease: "Released too early!",
        libraryTitle: "MusicXML Library",
        libraryLoading: "Loading list...",
        libraryEmpty: "List is empty.",
        libraryError: "Failed to load library.",
        aiBtn: "Randomizer",
        aiTitle: "🎲 Note Randomizer",
        aiLblPrompt: "Description (style, mood, difficulty...)",
        aiLblDifficulty: "Difficulty",
        aiLblMeasures: "Number of measures",
        aiDiffBeginner: "Beginner",
        aiDiffEasy: "Easy",
        aiDiffMedium: "Medium",
        aiDiffHard: "Hard",
        aiDiffExpert: "Expert",
        aiGenerate: "Generate",
        aiGenerating: "🎵 Generating... Please wait 20–60 seconds",
        aiErrorNoPrompt: "Enter a melody description",
        aiErrorGenerate: "Generation error",
        aiPlaceholder: "A cheerful melody in C major, easy, 8 measures",
        randBtn: "Randomizer",
        randTitle: "🎲 Note Randomizer",
        randLblMeasures: "Number of measures",
        randLblHand: "Hands",
        randOptRight: "Right (treble clef)",
        randOptLeft: "Left (bass clef)",
        randOptBoth: "Both",
        randLblNotes: "Max simultaneous notes (chord)",
        randNotes1: "1 (melody)",
        randNotes2: "2 (intervals)",
        randNotes3: "3 (triad)",
        randNotes4: "4 (seventh chord)",
        randLblAccidentals: "Accidentals",
        randAccNone: "No sharps or flats",
        randAccSharps: "Sharps only",
        randAccFlats: "Flats only",
        randAccBoth: "Sharps and flats",
        randLblRhythm: "Rhythm (note durations)",
        randRhySimple: "Simple (half, quarter)",
        randRhyMedium: "Medium (+ eighth)",
        randRhyComplex: "Complex (+ sixteenth)",
        randLblRange: "Note range",
        randRangeNarrow: "Narrow (C4–G4 / C2–G2)",
        randRangeMedium: "Medium (C4–C5 / C2–C3)",
        randRangeWide: "Wide (C4–B5 / C2–B3)",
        randGenerate: "Generate",
        finishTitle: "🎉 Completed!",
        finishCorrect: "✅ Correct:",
        finishWrong: "❌ Wrong:",
        finishAccuracy: "🎯 Accuracy:",
        finishTime: "⏱ Time:",
        sec: "sec",
        measures: "measures",
        ok: "OK",
        midiNo: "No device",
        midiNone: "None",
        midiErr: "Error",
        helpTitle: "📖 Help",
        helpBody:
          '<div class="help-section"><h3>🎹 What is this app?</h3>' +
          '<p>This is an unauthorized fork of <a href="https://learnpiano.online" target="_blank">learnpiano.online</a>. I was unable to find a contact method, or any trace of the original author, but I hope they are doing well. I had some modifications I wanted to make. Sight-reading trainer for piano. Load a MusicXML score, connect a MIDI piano, and play the notes shown by the cursor.</p></div>' +
          '<div class="help-section"><h3>🔌 How to connect?</h3><ol>' +
          "<li>You need a <b>USB-MIDI cable</b>.</li>" +
          "<li>Connect it to your piano and computer (or phone via OTG).</li>" +
          "<li>Open this page in <b>Google Chrome</b>.</li>" +
          "<li>Allow MIDI access when prompted.</li>" +
          "</ol>" +
          '<p>⚠️ <b>iPad / iPhone (iOS):</b> Safari and Chrome on iOS do not support Web MIDI. Install the free <a href="https://apps.apple.com/app/web-midi-browser/id953846217" target="_blank">Web MIDI Browser</a> app from the App Store and open this page in it.</p></div>' +
          '<div class="help-section"><h3>📂 Load sheet music</h3><ul>' +
          "<li>Click <b>📚 Library</b> — pick a score.</li>" +
          "<li>Or click <b>📂 File</b> — upload <code>.mxl</code> or <code>.musicxml</code>.</li>" +
          "</ul></div>" +
          '<div class="help-section"><h3>⚙️ Settings</h3><ul>' +
          "<li><b>Hand:</b> Both / Right / Left.</li>" +
          "<li><b>Modes:</b></li>" +
          "<li><b>Free:</b> Play at your own pace; the cursor advances after correct notes.</li>" +
          "<li><b>Tempo:</b> The cursor advances automatically by BPM; you need to play notes in time.</li>" +
          "<li><b>Reading:</b> Auto-scrolls the sheet by BPM, without cursor tracking and without mistake counting.</li>" +
          "<li><b>Hold notes:</b> Duration checking.</li>" +
          "<li><b>Move on after mistake:</b> In plain free mode the cursor advances even after a wrong key.</li>" +
          "<li><b>Show keyboard:</b> Virtual keyboard with key highlighting.</li>" +
          "</ul></div>" +
          '<div class="help-section"><h3>▶ How to play?</h3><ol>' +
          "<li>Load a score.</li><li>Press <b>▶ Start</b> (or the <b>Spacebar</b> to play/pause; <b>Enter</b> to restart).</li>" +
          "<li>Press the expected notes on your piano.</li>" +
          "<li>Stats shown when finished.</li></ol></div>" +
          '<div class="help-section"><h3>🎲 Randomizer</h3>' +
          "<p>Press <b>🎲 Randomizer</b> — generates random notes for sight-reading practice. Choose measures, hand, chords and accidentals.</p></div>" +
          '<div class="help-section"><h3>💬 Community</h3>' +
          '<p>Join our <a href="https://t.me/LearnPiano_online" target="_blank">Telegram group</a> to share experience and tips.</p></div>',
      },
    },
  },
};

window.t = function t(path) {
  var parts = path.split(".");
  var obj = window.I18N.dict[window.I18N.current];
  for (var i = 0; i < parts.length; i++) {
    if (!obj) return path;
    obj = obj[parts[i]];
  }
  return obj !== undefined && obj !== null ? obj : path;
};

window.detectLanguage = function detectLanguage() {
  return "en";
};

window.setLanguage = function setLanguage(lang) {
  window.I18N.current = window.I18N.dict[lang] ? lang : "en";
  document.documentElement.setAttribute("lang", window.I18N.current);
  localStorage.setItem("lang", window.I18N.current);
  var select = document.getElementById("lang-select");
  if (select && select.value !== window.I18N.current) select.value = window.I18N.current;
};
