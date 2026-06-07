    // ===================== I18N INIT =====================
    (function () {
      const saved = localStorage.getItem('lang');
      const initialLang = saved || window.detectLanguage();
      window.setLanguage(initialLang);
    })();

    function applyI18n() {
      // header
      document.getElementById('lbl-file-btn').textContent     = t('trainer.fileBtn');
      document.getElementById('lbl-library').textContent      = t('trainer.libraryBtn');
      // settings labels
      document.getElementById('lbl-hand').textContent         = t('trainer.settingsHand');
      document.getElementById('lbl-mode').textContent         = t('trainer.settingsMode');
      // hand/mode options
      document.getElementById('opt-hand-both').textContent    = t('trainer.handBoth');
      document.getElementById('opt-hand-right').textContent   = t('trainer.handRight');
      document.getElementById('opt-hand-left').textContent    = t('trainer.handLeft');
      document.getElementById('opt-mode-free').textContent    = t('trainer.modeFree');
      document.getElementById('opt-mode-timed').textContent   = t('trainer.modeTimed');
      document.getElementById('opt-mode-reading').textContent = t('trainer.modeReading');
      // stat labels
      document.getElementById('lbl-stat-correct').textContent = t('trainer.statCorrect');
      document.getElementById('lbl-stat-wrong').textContent   = t('trainer.statWrong');
      document.getElementById('lbl-stat-time').textContent    = t('trainer.statTime');
      document.getElementById('lbl-stat-progress').textContent= t('trainer.statProgress');
      // default placeholder text (only if not loading / no file)
      const fi = document.getElementById('file-info');
      if (!osmd) {
        fi.textContent = t('trainer.fileInfoDefault');
      } else if (loadedFileMeta) {
        const cm = loadedFileMeta.composer ? ` (${loadedFileMeta.composer})` : '';
        fi.textContent = `${loadedFileMeta.title}${cm} — ${loadedFileMeta.measures} ${t('trainer.measures')}`;
      }
      const ds = document.getElementById('debug-strip');
      if (!ds.dataset.midiInit) ds.textContent = t('trainer.debugDefault');
      const scoreLoading = document.getElementById('score-loading');
      if (scoreLoading) scoreLoading.textContent = t('trainer.scoreDefault');
      const nd = document.getElementById('note-display');
      if (!osmd) nd.textContent = t('trainer.noteDisplayDefault');
      // library modal title
      document.getElementById('lib-title').textContent        = t('trainer.libraryTitle');
      // AI generate modal
      document.getElementById('lbl-rand-btn').textContent     = t('trainer.randBtn');
      document.getElementById('rand-title').textContent        = t('trainer.randTitle');
      document.getElementById('rand-lbl-measures').textContent = t('trainer.randLblMeasures');
      document.getElementById('rand-lbl-hand').textContent     = t('trainer.randLblHand');
      document.getElementById('rand-opt-right').textContent    = t('trainer.randOptRight');
      document.getElementById('rand-opt-left').textContent     = t('trainer.randOptLeft');
      document.getElementById('rand-opt-both').textContent     = t('trainer.randOptBoth');
      document.getElementById('rand-lbl-notes').textContent    = t('trainer.randLblNotes');
      document.getElementById('rand-opt-notes-1').textContent    = t('trainer.randNotes1');
      document.getElementById('rand-opt-notes-2').textContent    = t('trainer.randNotes2');
      document.getElementById('rand-opt-notes-3').textContent    = t('trainer.randNotes3');
      document.getElementById('rand-opt-notes-4').textContent    = t('trainer.randNotes4');
      document.getElementById('rand-lbl-accidentals').textContent = t('trainer.randLblAccidentals');
      document.getElementById('rand-opt-acc-none').textContent = t('trainer.randAccNone');
      document.getElementById('rand-opt-acc-sharps').textContent = t('trainer.randAccSharps');
      document.getElementById('rand-opt-acc-flats').textContent  = t('trainer.randAccFlats');
      document.getElementById('rand-opt-acc-both').textContent   = t('trainer.randAccBoth');

      document.getElementById('rand-lbl-generate').textContent = t('trainer.randGenerate');
      // action buttons
      document.getElementById('lbl-btn-start').textContent    = ' ' + t('trainer.btnStart');
      document.getElementById('lbl-btn-stop').textContent     = ' ' + t('trainer.btnStop');
      document.getElementById('lbl-btn-restart').textContent  = ' ' + t('trainer.btnRestart');
      document.getElementById('lbl-btn-listen').textContent   = ' ' + t('trainer.btnListen');
      // header title
      // Keep branding universal — no i18n for app title
      // document.getElementById('lbl-app-title').textContent    = t('trainer.appTitle');
      // duration checkbox
      document.getElementById('lbl-check-duration').textContent = t('trainer.settingsDuration');
      // keyboard checkbox
      document.getElementById('lbl-check-keyboard').textContent = t('trainer.showKeyboard');
      // hide-counters checkbox
      document.getElementById('lbl-check-hide-stats').textContent = t('trainer.hideStats');
      // restart-gesture checkbox
      document.getElementById('lbl-check-restart-gesture').textContent = t('trainer.restartGesture');
      // free mode skip wrong checkbox
      document.getElementById('lbl-check-skip-wrong-free').textContent = t('trainer.settingsSkipWrongFree');
      // zoom label
      document.getElementById('lbl-zoom').textContent = t('trainer.settingsZoom');
    }

    // English-only build: just apply the labels once the DOM is ready.
    document.addEventListener('DOMContentLoaded', () => {
      applyI18n();
    });

    // ===================== STATE =====================
    let osmd = null;
    let midiInput = null;
    let isPlaying = false;
    let startTime = null;
    let timerInterval = null;
    let elapsedBeforePauseMs = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let totalPresses = 0;
    let totalNotes = 0;
    let notesPlayed = 0;
    let hasActiveSession = false;
    let isPaused = false;

    let currentBPM = 80;
    let wakeLock = null;
    let heldKeys = new Set();      // tracks currently pressed MIDI keys
    let confirmTimer = null;       // delay to catch simultaneous extra keys
    let skipWrongAdvanceTimer = null;
    let skipWrongPending = false;
    const CHORD_WINDOW_MS = 150;   // max ms between first and last chord note
    let chordPressTimestamps = {}; // midi -> timestamp when matched

    // Duration tracking
    let durationTimer = null;      // fires when note hold time is complete
    let requiredHeldKeys = new Set(); // keys that must stay held during duration
    let durationBarRaf = null;     // requestAnimationFrame id for progress bar
    let durationBarStart = 0;      // performance.now() when bar started
    let durationBarTotal = 0;      // total ms for current bar
    let allMatchedAt = 0;          // performance.now() when all notes first matched
    let sustainedNotes = [];       // notes carried over from previous position
    let leftoverHeldKeys = new Set(); // keys held over from a previously-credited note; excluded from "too many keys"

    // Loaded file metadata (for re-rendering fileInfo on lang change)
    let loadedFileMeta = null; // { title, composer, measures }
    let currentZoom = parseFloat(localStorage.getItem('osmdZoom')) || 1.0;

    // DOM refs
    const container = document.getElementById('score-container');
    const scoreArea = document.getElementById('score-area');
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnRestart = document.getElementById('btn-restart');
    const btnListen = document.getElementById('btn-listen');
    const handSelect = document.getElementById('hand-select');
    const modeSelect = document.getElementById('mode-select');
    const tempoInput = document.getElementById('tempo-input');
    const midiChip = document.getElementById('midi-chip');
    const midiLabel = document.getElementById('midi-label');
    const fileInfo = document.getElementById('file-info');
    const noteDisplay = document.getElementById('note-display');
    const checkDuration = document.getElementById('check-duration');
    const checkKeyboard = document.getElementById('check-keyboard');
    const checkSkipWrongFree = document.getElementById('check-skip-wrong-free');
    const skipWrongWrap = document.getElementById('skip-wrong-wrap');
    const checkHideStats = document.getElementById('check-hide-stats');
    const checkRestartGesture = document.getElementById('check-restart-gesture');
    let pianoKeyboard = null;
    let scoreNoteRange = null; // { lo, hi } — MIDI range of loaded score
    let coloredNoteElements = new Map(); // svg element -> original styles
    let staffHighlightState = new Map(); // sourceNote -> color
    let readingScrollRaf = null;
    let readingLastFrameTs = 0;

    // Keyboard display helpers
    function initKeyboard() {
      const kb = document.getElementById('piano-kb-container');
      if (!pianoKeyboard) {
        pianoKeyboard = new PianoKeyboard(kb, {
          startMidi: scoreNoteRange ? scoreNoteRange.lo : 48,
          endMidi:   scoreNoteRange ? scoreNoteRange.hi : 84
        });
      } else if (scoreNoteRange) {
        pianoKeyboard.setRange(scoreNoteRange.lo, scoreNoteRange.hi);
      }
    }
    function toggleKeyboardDisplay() {
      const show = checkKeyboard.checked;
      noteDisplay.style.display = show ? 'none' : '';
      document.getElementById('piano-kb-container').style.display = show ? '' : 'none';
      localStorage.setItem('showKeyboard', show ? '1' : '0');
      if (show) {
        initKeyboard();
        if (scoreNoteRange) pianoKeyboard.setRange(scoreNoteRange.lo, scoreNoteRange.hi);
        if (isPlaying && currentExpected.length > 0) updateKeyboardHighlight(currentExpected);
      } else if (pianoKeyboard) {
        pianoKeyboard.clear();
      }
    }
    function updateKeyboardHighlight(expected) {
      if (!pianoKeyboard || !checkKeyboard.checked) return;
      pianoKeyboard.clear();
      expected.forEach(function (e) {
        var color = e.matched ? '#43a047' : (e.sustained ? '#1565c0' : '#42a5f5');
        pianoKeyboard.highlightKey(e.midi, color);
      });
    }

    function updateSkipWrongVisibility() {
      var visible = modeSelect.value === 'free' && !checkDuration.checked;
      skipWrongWrap.classList.toggle('settings-hidden', !visible);
    }

    function isReadingMode() {
      return modeSelect.value === 'reading';
    }

    function updateReadingModeVisibility() {
      var wrongStat = document.getElementById('stat-wrong');
      if (wrongStat && wrongStat.parentElement) {
        wrongStat.parentElement.classList.toggle('settings-hidden', isReadingMode());
      }
    }

    function updateModeControls() {
      var isTimed = modeSelect.value === 'timed';
      var isReading = isReadingMode();
      if (isReading && checkDuration.checked) {
        checkDuration.checked = false;
      }
      checkDuration.disabled = isReading;
      document.getElementById('tempo-group').classList.toggle('visible', isTimed || isReading || checkDuration.checked);
      updateSkipWrongVisibility();
      updateReadingModeVisibility();
    }

    function isSkipWrongFreeEnabled() {
      return modeSelect.value === 'free' && !checkDuration.checked && checkSkipWrongFree.checked;
    }

    function clearRenderedStaffHighlights() {
      coloredNoteElements.forEach(function (style, el) {
        if (!el) return;
        el.style.fill = style.fill;
        el.style.stroke = style.stroke;
      });
      coloredNoteElements.clear();
    }

    function resetStaffNoteHighlights() {
      clearRenderedStaffHighlights();
      staffHighlightState.clear();
    }

    function paintSvgElement(el, color, seen) {
      if (!el || seen.has(el)) return;
      seen.add(el);
      if (!coloredNoteElements.has(el)) {
        coloredNoteElements.set(el, { fill: el.style.fill, stroke: el.style.stroke });
      }
      el.style.fill = color;
      el.style.stroke = color;
      var children = el.querySelectorAll('*');
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (seen.has(child)) continue;
        seen.add(child);
        if (!coloredNoteElements.has(child)) {
          coloredNoteElements.set(child, { fill: child.style.fill, stroke: child.style.stroke });
        }
        child.style.fill = color;
        child.style.stroke = color;
      }
    }

    function findAncestorWithClass(el, className) {
      var node = el;
      while (node && node.tagName !== 'svg') {
        var cls = node.getAttribute ? (node.getAttribute('class') || '') : '';
        if (cls.indexOf(className) >= 0) return node;
        node = node.parentElement;
      }
      return null;
    }

    function getGraphicNoteMidi(gNote) {
      try {
        if (gNote && gNote.sourceNote && gNote.sourceNote.Pitch) {
          return osmdPitchToMidi(gNote.sourceNote.Pitch);
        }
      } catch (e) {}
      return -1;
    }

    function buildMidiColorQueue(expected) {
      var midiMap = {};
      for (var i = 0; i < expected.length; i++) {
        var item = expected[i];
        var color = item.failed ? '#c62828' : (item.matched ? '#2e7d32' : '');
        if (!color) continue;
        if (!midiMap[item.midi]) midiMap[item.midi] = [];
        midiMap[item.midi].push(color);
      }
      return midiMap;
    }

    function paintGraphicalNote(gNote, color, seen) {
      if (!gNote || !color) return;
      var noteEl = null;
      try { noteEl = gNote.getSVGGElement ? gNote.getSVGGElement() : null; } catch (e) {}
      if (!noteEl) return;

      paintSvgElement(noteEl, color, seen);

      var staveNoteGroup = findAncestorWithClass(noteEl, 'vf-stavenote');
      if (!staveNoteGroup) return;

      paintSvgElement(staveNoteGroup, color, seen);

      var noteId = staveNoteGroup.getAttribute('id') || '';
      if (!noteId) return;

      paintSvgElement(document.getElementById(noteId + '-stem'), color, seen);
      for (var beamIdx = 0; beamIdx < 4; beamIdx++) {
        paintSvgElement(document.getElementById(noteId + '-beam' + beamIdx), color, seen);
      }
    }

    function replayStaffHighlights() {
      if (!osmd || !osmd.graphic || staffHighlightState.size === 0) return;
      var parts = osmd.graphic.MeasureList;
      if (!parts) return;
      var seen = new Set();

      for (var measureIdx = 0; measureIdx < parts.length; measureIdx++) {
        var measureParts = parts[measureIdx];
        if (!measureParts) continue;
        for (var p = 0; p < measureParts.length; p++) {
          var gMeasure = measureParts[p];
          if (!gMeasure || !gMeasure.staffEntries) continue;
          for (var se = 0; se < gMeasure.staffEntries.length; se++) {
            var gStaffEntry = gMeasure.staffEntries[se];
            if (!gStaffEntry || !gStaffEntry.graphicalVoiceEntries) continue;
            for (var gv = 0; gv < gStaffEntry.graphicalVoiceEntries.length; gv++) {
              var gve = gStaffEntry.graphicalVoiceEntries[gv];
              if (!gve.notes) continue;
              for (var ni = 0; ni < gve.notes.length; ni++) {
                var gNote = gve.notes[ni];
                var color = staffHighlightState.get(gNote && gNote.sourceNote);
                if (color) paintGraphicalNote(gNote, color, seen);
              }
            }
          }
        }
      }
    }

    function highlightCurrentStaffNotes(expected) {
      if (!osmd || !osmd.cursor || !expected || expected.length === 0) return;

      var midiColorQueue = buildMidiColorQueue(expected);
      if (Object.keys(midiColorQueue).length === 0) return;

      var cursorIt = osmd.cursor.Iterator;
      if (!cursorIt || cursorIt.EndReached) return;
      var cursorEntries = cursorIt.CurrentVoiceEntries;
      if (!cursorEntries || !cursorEntries.length) return;

      var seen = new Set();
      var hand = handSelect.value;
      var measureIdx = cursorIt.CurrentMeasureIndex;
      var parts = osmd.graphic && osmd.graphic.MeasureList;
      if (!parts || !parts[measureIdx]) return;

      for (var v = 0; v < cursorEntries.length; v++) {
        var ve = cursorEntries[v];
        var staffIdx = 0;
        try { staffIdx = ve.ParentSourceStaffEntry ? ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0; } catch (e1) {}
        if (hand === 'right' && staffIdx !== 0) continue;
        if (hand === 'left' && staffIdx !== 1) continue;

        var sourceStaffEntry = ve.ParentSourceStaffEntry;
        if (!sourceStaffEntry) continue;

        for (var p = 0; p < parts[measureIdx].length; p++) {
          var gMeasure = parts[measureIdx][p];
          if (!gMeasure || !gMeasure.staffEntries) continue;

          for (var se = 0; se < gMeasure.staffEntries.length; se++) {
            var gStaffEntry = gMeasure.staffEntries[se];
            if (!gStaffEntry || gStaffEntry.sourceStaffEntry !== sourceStaffEntry || !gStaffEntry.graphicalVoiceEntries) continue;

            for (var gv = 0; gv < gStaffEntry.graphicalVoiceEntries.length; gv++) {
              var gve = gStaffEntry.graphicalVoiceEntries[gv];
              if (!gve.notes) continue;

              for (var ni = 0; ni < gve.notes.length; ni++) {
                var gNote = gve.notes[ni];
                var midi = getGraphicNoteMidi(gNote);
                var queue = midiColorQueue[midi];
                if (!queue || !queue.length) continue;

                var color = queue.shift();
                if (gNote && gNote.sourceNote) {
                  staffHighlightState.set(gNote.sourceNote, color);
                }
                paintGraphicalNote(gNote, color, seen);
              }
            }
          }
        }
      }
    }

    // Restore keyboard checkbox state
    (function() {
      var saved = localStorage.getItem('showKeyboard') === '1';
      checkKeyboard.checked = saved;
      checkSkipWrongFree.checked = localStorage.getItem('skipWrongFree') === '1';
      if (saved) {
        noteDisplay.style.display = 'none';
        document.getElementById('piano-kb-container').style.display = '';
      }
      updateSkipWrongVisibility();
    })();
    checkKeyboard.addEventListener('change', toggleKeyboardDisplay);
    checkSkipWrongFree.addEventListener('change', function() {
      localStorage.setItem('skipWrongFree', checkSkipWrongFree.checked ? '1' : '0');
    });

    // Hide / show the correct / wrong / time counters (Progress stays visible)
    function applyHideStats() {
      const hidden = checkHideStats.checked;
      ['stat-correct-wrap', 'stat-wrong-wrap', 'stat-time-wrap'].forEach(function (id) {
        document.getElementById(id).style.display = hidden ? 'none' : '';
      });
      localStorage.setItem('hideStats', hidden ? '1' : '0');
    }
    checkHideStats.checked = localStorage.getItem('hideStats') === '1';
    applyHideStats();
    checkHideStats.addEventListener('change', applyHideStats);

    // Restart gesture toggle (on by default)
    checkRestartGesture.checked = localStorage.getItem('restartGesture') !== '0';
    checkRestartGesture.addEventListener('change', function () {
      localStorage.setItem('restartGesture', checkRestartGesture.checked ? '1' : '0');
    });

    // ===================== ZOOM =====================
    function updateZoomDisplay() {
      document.getElementById('zoom-value').textContent = Math.round(currentZoom * 100) + '%';
    }
    function applyZoom(delta) {
      currentZoom = Math.min(2.0, Math.max(0.4, Math.round((currentZoom + delta) * 10) / 10));
      localStorage.setItem('osmdZoom', currentZoom);
      updateZoomDisplay();
      if (osmd) {
        clearRenderedStaffHighlights();
        osmd.Zoom = currentZoom;
        osmd.render();
        replayStaffHighlights();
        if (isPlaying) highlightCurrentStaffNotes(currentExpected);
      }
    }
    document.getElementById('btn-zoom-in').addEventListener('click', function() { applyZoom(0.1); });
    document.getElementById('btn-zoom-out').addEventListener('click', function() { applyZoom(-0.1); });
    updateZoomDisplay();

    // ===================== WAKE LOCK (keep screen on) =====================
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; });
        }
      } catch (e) { /* ignore */ }
    }
    function releaseWakeLock() {
      if (wakeLock) { wakeLock.release(); wakeLock = null; }
    }

    // Re-request on visibility change (mobile browser returns from bg)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && isPlaying) requestWakeLock();
    });

    // ===================== FULLSCREEN =====================
    (function initFullscreen() {
      const app = document.getElementById('app');
      const btnFs = document.getElementById('btn-fullscreen');
      const btnExit = document.getElementById('btn-exit-fullscreen');
      const hasNativeFs = !!(app.requestFullscreen || app.webkitRequestFullscreen || app.msRequestFullscreen);

      function enterFullscreen() {
        app.classList.add('fullscreen-active');
        if (hasNativeFs) {
          (app.requestFullscreen || app.webkitRequestFullscreen || app.msRequestFullscreen).call(app).catch(() => {});
        }
      }
      function exitFullscreen() {
        app.classList.remove('fullscreen-active');
        if (hasNativeFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
          (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document).catch(() => {});
        }
      }

      btnFs.addEventListener('click', () => {
        if (app.classList.contains('fullscreen-active')) {
          exitFullscreen();
        } else {
          enterFullscreen();
        }
      });
      btnExit.addEventListener('click', () => exitFullscreen());
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          app.classList.remove('fullscreen-active');
        }
      });
    })();

    // ===================== SETTINGS TOGGLE =====================
    document.getElementById('btn-settings').addEventListener('click', () => {
      const panel = document.getElementById('settings-panel');
      panel.classList.toggle('open');
      document.getElementById('btn-settings').classList.toggle('active-toggle');
    });

    // Restore persisted exercise settings before wiring change handlers
    (function () {
      var savedHand = localStorage.getItem('hand');
      if (savedHand !== null) handSelect.value = savedHand;
      var savedMode = localStorage.getItem('mode');
      if (savedMode !== null) modeSelect.value = savedMode;
      var savedTempo = localStorage.getItem('tempo');
      if (savedTempo !== null) tempoInput.value = savedTempo;
      checkDuration.checked = localStorage.getItem('holdNotes') === '1';
    })();

    handSelect.addEventListener('change', () => {
      localStorage.setItem('hand', handSelect.value);
    });
    modeSelect.addEventListener('change', () => {
      localStorage.setItem('mode', modeSelect.value);
      updateModeControls();
    });
    tempoInput.addEventListener('change', () => {
      localStorage.setItem('tempo', tempoInput.value);
    });
    checkDuration.addEventListener('change', () => {
      localStorage.setItem('holdNotes', checkDuration.checked ? '1' : '0');
      updateModeControls();
    });
    updateModeControls();

    // ===================== MXL LOADING =====================
    async function extractMxl(arrayBuffer) {
      const zip = await JSZip.loadAsync(arrayBuffer);
      let xmlFileName = null;
      const containerFile = zip.file('META-INF/container.xml');
      if (containerFile) {
        const containerXml = await containerFile.async('string');
        const parser = new DOMParser();
        const doc = parser.parseFromString(containerXml, 'application/xml');
        const rootFile = doc.querySelector('rootfile');
        if (rootFile) xmlFileName = rootFile.getAttribute('full-path');
      }
      if (!xmlFileName) {
        for (const name of Object.keys(zip.files)) {
          if (name.endsWith('.xml') && !name.startsWith('META-INF')) {
            xmlFileName = name;
            break;
          }
        }
      }
      if (!xmlFileName) throw new Error('No MusicXML found in .mxl archive');
      return await zip.file(xmlFileName).async('string');
    }

    async function loadFile(file) {
      container.innerHTML = '<div class="loading" id="score-loading"></div>';
      document.getElementById('score-loading').textContent = t('trainer.fileInfoLoading');
      fileInfo.textContent = t('trainer.fileInfoLoading');
      btnStart.disabled = true;
      if (isPlaying || timerInterval || durationTimer) {
        stopExercise({ hardReset: true });
      } else {
        stopReadingScroll();
        resetSessionState();
      }

      try {
        let xmlString;
        if (file.name.endsWith('.mxl')) {
          const buf = await file.arrayBuffer();
          xmlString = await extractMxl(buf);
        } else {
          xmlString = await file.text();
        }

        container.innerHTML = '';
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
          autoResize: true,
          drawTitle: false,
          drawComposer: false,
          drawPartNames: false,
          drawMeasureNumbers: true,
          followCursor: true,
          cursorsOptions: [{
            type: 0,
            color: '#43a047',
            alpha: 0.5,
            follow: true,
          }],
        });

        await osmd.load(xmlString);
        osmd.Zoom = currentZoom;
        osmd.render();
        clearRenderedStaffHighlights();
        replayStaffHighlights();

        const measures = osmd.Sheet.SourceMeasures.length;
        const title = osmd.Sheet.TitleString || file.name;
        loadedFileMeta = { title, composer: null, measures };
        fileInfo.textContent = `${title} — ${measures} ${t('trainer.measures')}`;

        totalNotes = countTotalNotes();

        btnStart.disabled = false;
        btnRestart.disabled = false;
        btnListen.disabled = false;
        noteDisplay.textContent = t('trainer.noteDisplayStart');
        if (checkKeyboard.checked) initKeyboard();
      } catch (e) {
        container.innerHTML = `<div class="loading" style="color:#c62828;">${t('trainer.fileInfoError')}: ${e.message}</div>`;
        fileInfo.textContent = t('trainer.fileInfoError');
        console.error(e);
      }
    }

    // Re-render on resize (orientation change, etc.)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (osmd) {
          try {
            clearRenderedStaffHighlights();
            osmd.render();
            replayStaffHighlights();
            highlightCurrentStaffNotes(currentExpected);
          } catch (e) { console.warn('Resize render error:', e); }
        }
      }, 300);
    });

    // ===================== NOTE HELPERS =====================
    // OSMD FundamentalNote enum uses SEMITONE values, NOT sequential indices!
    // C=0, D=2, E=4, F=5, G=7, A=9, B=11
    const FN_TO_NAME    = { 0:'C', 2:'D', 4:'E', 5:'F', 7:'G', 9:'A', 11:'B' };
    const FN_TO_SOLFEGE = { 0:'Do', 2:'Re', 4:'Mi', 5:'Fa', 7:'Sol', 9:'La', 11:'Si' };
    const MIDI_SOLFEGE  = ['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];

    function osmdPitchToMidi(pitch) {
      if (!pitch) return -1;
      // Primary: use OSMD's getHalfTone() + 12
      // getHalfTone() = (xmlOctave)*12 + semitone, MIDI needs +12 offset (MIDI C0 = 12)
      if (typeof pitch.getHalfTone === 'function') {
        return pitch.getHalfTone() + 12;
      }
      // Fallback: FundamentalNote IS already the semitone within octave
      const fn = pitch.FundamentalNote; // semitone: C=0, D=2, E=4, F=5, G=7, A=9, B=11
      const xmlOctave = pitch.Octave + 3; // OSMD stores xmlOctave - 3
      const acc = pitch.AccidentalHalfTones || 0;
      return (xmlOctave + 1) * 12 + fn + acc;
    }

    function pitchToName(pitch) {
      if (!pitch) return '?';
      const fn = pitch.FundamentalNote;
      const step = FN_TO_NAME[fn] || '?';
      const accHalf = pitch.AccidentalHalfTones || 0;
      let accStr = '';
      if (accHalf === 1) accStr = '#';
      else if (accHalf === -1) accStr = 'b';
      else if (accHalf === 2) accStr = '##';
      else if (accHalf === -2) accStr = 'bb';
      const octave = pitch.Octave + 3;
      return `${step}${accStr}${octave}`;
    }

    function pitchToSolfege(pitch) {
      if (!pitch) return '?';
      const fn = pitch.FundamentalNote;
      const base = FN_TO_SOLFEGE[fn] || '?';
      const accHalf = pitch.AccidentalHalfTones || 0;
      let accStr = '';
      if (accHalf === 1) accStr = '#';
      else if (accHalf === -1) accStr = 'b';
      else if (accHalf === 2) accStr = '##';
      else if (accHalf === -2) accStr = 'bb';
      return `${base}${accStr}`;
    }

    function midiToName(midi) {
      const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const note = midi % 12;
      const oct = Math.floor(midi / 12) - 1;
      return `${CHROMATIC[note]}${oct}`;
    }

    function midiToSolfege(midi) {
      const note = midi % 12;
      const oct = Math.floor(midi / 12) - 1;
      return `${MIDI_SOLFEGE[note]}${oct}`;
    }

    // ===================== EXPECTED NOTES =====================
    function getExpectedNotes() {
      if (!osmd || !osmd.cursor) return [];
      const iterator = osmd.cursor.Iterator;
      if (iterator.EndReached) return [];

      const hand = handSelect.value;
      const voices = iterator.CurrentVoiceEntries;
      const expected = [];

      voices.forEach(ve => {
        const staffIndex = ve.ParentSourceStaffEntry ?
          ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0;
        if (hand === 'right' && staffIndex !== 0) return;
        if (hand === 'left' && staffIndex !== 1) return;

        ve.Notes.forEach(note => {
          if (note.isRest()) return;
          // Skip tied continuation notes (only match on first attack)
          if (note.NoteTie && note.NoteTie.Notes && note.NoteTie.Notes.length > 0) {
            if (note.NoteTie.Notes[0] !== note) return;
          }
          const p = note.Pitch;
          if (!p) return;
          const midi = osmdPitchToMidi(p);
          if (midi > 0) {
            expected.push({
              midi,
              name: pitchToName(p),
              solfege: pitchToSolfege(p),
              staffIndex,
              matched: false,
              failed: false,
              durationBeats: getNoteTiedDurationBeats(note),
            });
          }
        });
      });

      return expected;
    }

    function countTotalNotes() {
      if (!osmd || !osmd.cursor) return 0;
      osmd.cursor.reset();
      let count = 0;
      let rangeLo = 127, rangeHi = 0;
      const hand = handSelect.value;

      while (!osmd.cursor.Iterator.EndReached) {
        const voices = osmd.cursor.Iterator.CurrentVoiceEntries;
        voices.forEach(ve => {
          const staffIndex = ve.ParentSourceStaffEntry ?
            ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0;
          if (hand === 'right' && staffIndex !== 0) return;
          if (hand === 'left' && staffIndex !== 1) return;
          ve.Notes.forEach(note => {
            if (!note.isRest()) {
              // Also skip tied continuations in count
              if (note.NoteTie && note.NoteTie.Notes && note.NoteTie.Notes.length > 0) {
                if (note.NoteTie.Notes[0] !== note) return;
              }
              count++;
              const midi = osmdPitchToMidi(note.Pitch);
              if (midi > 0) {
                if (midi < rangeLo) rangeLo = midi;
                if (midi > rangeHi) rangeHi = midi;
              }
            }
          });
        });
        osmd.cursor.next();
      }

      osmd.cursor.reset();
      if (rangeLo <= rangeHi) {
        rangeLo = Math.floor(rangeLo / 12) * 12;       // round down to C
        rangeHi = Math.ceil((rangeHi + 1) / 12) * 12 - 1; // round up to B
        scoreNoteRange = { lo: rangeLo, hi: rangeHi };
        if (pianoKeyboard) pianoKeyboard.setRange(rangeLo, rangeHi);
      }
      return count;
    }

    // ===================== UI UPDATES =====================
    function updateStats() {
      document.getElementById('stat-correct').textContent = correctCount;
      document.getElementById('stat-wrong').textContent = wrongCount;
      if (isReadingMode()) {
        var maxScroll = Math.max(0, scoreArea.scrollHeight - scoreArea.clientHeight);
        var pct = maxScroll > 0 ? Math.round((scoreArea.scrollTop / maxScroll) * 100) : 0;
        document.getElementById('stat-progress').textContent = pct + '%';
        return;
      }
      document.getElementById('stat-progress').textContent =
        totalNotes > 0 ? Math.round((notesPlayed / totalNotes) * 100) + '%' : '0%';
    }

    function updateTimer() {
      const runningElapsed = startTime ? (performance.now() - startTime) : 0;
      const elapsed = Math.floor((elapsedBeforePauseMs + runningElapsed) / 1000);
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      document.getElementById('stat-time').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
    }

    function updateNoteDisplay(expected) {
      // Update keyboard visualization
      updateKeyboardHighlight(expected);
      highlightCurrentStaffNotes(expected);

      if (expected.length === 0) {
        noteDisplay.innerHTML = `<span style="color:#999;">${t('trainer.pause')}</span>`;
        return;
      }
      const bpmInput = parseInt(tempoInput.value) || 0;
      const bpm = bpmInput > 0 ? bpmInput : (getScoreTempo() || 100);
      const names = expected.map(e => {
        let durationHint = '';
        if (e.sustained) {
          let rem = '';
          if (isDurationMode() || modeSelect.value === 'timed') {
            const ms = Math.round((e.durationBeats || 1) * 60000 / bpm);
            rem = ` <span style="color:#bbb;font-size:0.72em;">${(+e.durationBeats.toFixed(2))}♩ ${ms}ms</span>`;
          }
          return `<b style="color:#1565c0;">${e.name}</b>`
               + ` <span style="color:#888;font-size:0.85em;">${e.solfege}</span>`
               + ` <span style="color:#42a5f5;font-size:0.75em;">⇑hold</span>${rem}`;
        }
        const mark = e.matched ? '<span style="color:#2e7d32;">✓</span>' : '';
        if (isDurationMode() || modeSelect.value === 'timed') {
          const ms = Math.round((e.durationBeats || 1) * 60000 / bpm);
          durationHint = ` <span style="color:#bbb;font-size:0.72em;">${e.durationBeats}♩ ${ms}ms</span>`;
        }
        return `<b>${e.name}</b> <span style="color:#888;font-size:0.85em;">${e.solfege}</span>${durationHint}${mark}`;
      });
      noteDisplay.innerHTML = names.join('&nbsp;+&nbsp;');
    }

    /** Scroll score so the cursor line is visible */
    function scrollToCursor() {
      if (!osmd || !osmd.cursor) return;
      const cursorEl = container.querySelector('.cursor-main, img[class*="cursor"]');
      if (!cursorEl) {
        // Fallback: use OSMD's cursorElement
        const el = osmd.cursor.cursorElement;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      cursorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ===================== DURATION HELPERS =====================
    function getScoreTempo() {
      try {
        // Try OSMD cursor first
        const cursorBpm = osmd.cursor.Iterator.CurrentTempoInBPM;
        if (cursorBpm && cursorBpm > 0) return cursorBpm;
      } catch (e) {}
      try {
        // Fallback: read from sheet's first tempo expression
        const measures = osmd.Sheet.SourceMeasures;
        if (measures && measures.length > 0) {
          const entries = measures[0].TempoExpressions;
          if (entries && entries.length > 0) {
            const tempo = entries[0].InstantaneousTempo;
            if (tempo && tempo.TempoInBpm > 0) return tempo.TempoInBpm;
          }
        }
      } catch (e) {}
      return 0; // 0 means "not found in score"
    }

    // Returns total duration in quarter-note beats, following tie chain from attack note.
    function getNoteTiedDurationBeats(note) {
      const len = v => (v && typeof v.RealValue === 'number') ? v.RealValue * 4 : 1;
      if (note.NoteTie && note.NoteTie.Notes && note.NoteTie.Notes.length > 1
          && note.NoteTie.Notes[0] === note) {
        return note.NoteTie.Notes.reduce((sum, n) => sum + len(n.Length), 0);
      }
      return len(note.Length);
    }

    // Returns the step size in ms: how long until cursor advances.
    // = min(durationBeats) across currentExpected.
    // Sustained notes already have their REMAINING beats, so this naturally
    // fires at the earliest expiry.
    function getStepDurationMs() {
      const bpmInput = parseInt(tempoInput.value) || 0;
      const bpm = bpmInput > 0 ? bpmInput : (getScoreTempo() || 100);
      const beatMs = 60000 / bpm;
      if (!currentExpected || currentExpected.length === 0) return beatMs;
      const minBeats = Math.min(...currentExpected.map(e => e.durationBeats || 1));
      return minBeats * beatMs;
    }

    // Alias used by timed mode (timed still uses max — whole position duration)
    function getPositionDurationMs() {
      const bpmInput = parseInt(tempoInput.value) || 0;
      const bpm = bpmInput > 0 ? bpmInput : (getScoreTempo() || 100);
      const beatMs = 60000 / bpm;
      if (!currentExpected || currentExpected.length === 0) return beatMs;
      const maxBeats = Math.max(...currentExpected.map(e => e.durationBeats || 1));
      return maxBeats * beatMs;
    }

    function startDurationBar(ms, alreadyElapsedMs) {
      const fill = document.getElementById('duration-bar-fill');
      const wrap = document.getElementById('duration-bar-wrap');
      const offset = alreadyElapsedMs || 0;
      durationBarStart = performance.now() - offset;
      durationBarTotal = ms + offset;
      fill.style.width = Math.min(100, (offset / durationBarTotal) * 100) + '%';
      wrap.classList.add('active');
      if (durationBarRaf) cancelAnimationFrame(durationBarRaf);
      function animate() {
        if (!durationBarRaf) return;
        const pct = Math.min(100, ((performance.now() - durationBarStart) / durationBarTotal) * 100);
        fill.style.width = pct + '%';
        if (pct < 100) durationBarRaf = requestAnimationFrame(animate);
      }
      durationBarRaf = requestAnimationFrame(animate);
    }

    function stopDurationBar() {
      if (durationBarRaf) { cancelAnimationFrame(durationBarRaf); durationBarRaf = null; }
      document.getElementById('duration-bar-wrap').classList.remove('active');
      document.getElementById('duration-bar-fill').style.width = '0%';
    }

    function isDurationMode() {
      return checkDuration.checked && modeSelect.value === 'free';
    }

    // ===================== GAME LOGIC =====================
    let currentExpected = [];

    // Advance cursor, merging carryOver (sustained) notes.
    // carryOver = [ {midi, name, solfege, durationBeats, sustained:true, matched:true} ]
    function advanceCursor(carryOver) {
      if (!osmd || !osmd.cursor) return;
      carryOver = carryOver || [];
      let maxSkips = 200;
      let freshNotes = [];
      do {
        osmd.cursor.next();
        if (osmd.cursor.Iterator.EndReached) {
          sustainedNotes = [];
          finishExercise();
          return;
        }
        // Get fresh notes, but exclude midi numbers already covered by carryOver
        const sustainedMidiSet = new Set(carryOver.map(s => s.midi));
        freshNotes = getExpectedNotes().filter(n => !sustainedMidiSet.has(n.midi));
        maxSkips--;
        // Stop skipping if we have fresh notes, or if carryOver keeps us busy
      } while (freshNotes.length === 0 && carryOver.length === 0 && maxSkips > 0);

      // If we exhausted skips looking for notes but carryOver has content, that's fine
      sustainedNotes = carryOver;
      currentExpected = [...carryOver, ...freshNotes];

      // Any key still physically held that is neither a fresh-expected note nor a
      // sustained carry-over is a benign leftover from a previous position
      // (e.g. the player holding a tie/legato note into the next note).
      const freshMidiSet = new Set(freshNotes.map(n => n.midi));
      const sustainedMidi = new Set(carryOver.map(s => s.midi));
      leftoverHeldKeys = new Set(
        [...heldKeys].filter(k => !freshMidiSet.has(k) && !sustainedMidi.has(k))
      );

      const iter = osmd.cursor.Iterator;
      const measure = iter.CurrentMeasureIndex + 1;
      console.log(`Cursor → measure ${measure}:`,
        currentExpected.map(e => `${e.name}=${e.midi}${e.sustained ? '(sus)' : ''}`).join(', '));

      updateNoteDisplay(currentExpected);
      scrollToCursor();
    }

    // ===================== RESTART GESTURE =====================
    // Pressing 3 adjacent white keys together (e.g. C-D-E) acts like the Restart button.
    const WHITE_KEY_POS = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }; // C D E F G A B
    const gestureHeld = new Set();
    let restartGestureFired = false;

    function whiteKeyIndex(midi) {
      const pos = WHITE_KEY_POS[midi % 12];
      return pos === undefined ? null : Math.floor(midi / 12) * 7 + pos;
    }

    function hasThreeAdjacentWhites() {
      const idx = new Set();
      gestureHeld.forEach((m) => {
        const w = whiteKeyIndex(m);
        if (w !== null) idx.add(w);
      });
      for (const n of idx) {
        if (idx.has(n + 1) && idx.has(n + 2)) return true;
      }
      return false;
    }

    // Track held keys and fire Restart on the gesture.
    // Returns true if a restart was triggered (caller should ignore the note).
    function updateRestartGesture(midiNumber, pressed) {
      if (pressed) gestureHeld.add(midiNumber);
      else gestureHeld.delete(midiNumber);

      if (!pressed) {
        // Re-arm once the cluster is released so the gesture can repeat.
        if (gestureHeld.size < 3) restartGestureFired = false;
        return false;
      }
      if (restartGestureFired || !checkRestartGesture.checked) return false;
      if (!hasThreeAdjacentWhites()) return false;

      restartGestureFired = true;
      gestureHeld.clear(); // ignore the still-held keys so we don't immediately re-fire
      if (btnRestart && !btnRestart.disabled) {
        btnRestart.click();
        return true;
      }
      return false;
    }

    function handleMidiNoteOff(midiNumber) {
      updateRestartGesture(midiNumber, false);
      if (isReadingMode()) return;
      heldKeys.delete(midiNumber);
      leftoverHeldKeys.delete(midiNumber);
      if (skipWrongPending) return;
      // If a required hold key is released early → error
      if (durationTimer && requiredHeldKeys.has(midiNumber)) {
        clearTimeout(durationTimer);
        durationTimer = null;
        stopDurationBar();
        requiredHeldKeys.clear();
        sustainedNotes = [];
        wrongCount++;
        currentExpected.forEach(e => {
          e.matched = false;
          e.sustained = false;
          e.failed = true;
        });
        const debugStrip = document.getElementById('debug-strip');
        debugStrip.innerHTML = `<span class="debug-err">✗ ${t('trainer.durationRelease')}</span>`;
        updateNoteDisplay(currentExpected);
        updateStats();
      }
    }

    function resetChordAttempt(debugStrip, expectedStr, reason) {
      if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
      // Notes are NOT yet credited to correctCount at this point
      // (credits happen later in confirmTimer callback or onStepComplete),
      // so we only need to reset matched flags and count the error.
      wrongCount++;
      currentExpected.forEach(e => {
        if (!e.sustained) {
          e.matched = false;
          e.failed = true;
        }
      });
      chordPressTimestamps = {};
      debugStrip.innerHTML = `<span class="debug-err">✗ ${reason}</span> | Expected: ${expectedStr}`;
      updateNoteDisplay(currentExpected);
      updateStats();
    }

    function skipFreeModePositionOnWrong(debugStrip, expectedStr, reason, freshExpected) {
      if (skipWrongPending) return;
      if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
      const unresolved = (freshExpected && freshExpected.length) ? freshExpected.length : currentExpected.filter(e => !e.sustained).length;
      const waitMs = (freshExpected && freshExpected.length > 1) ? CHORD_WINDOW_MS : 70;
      skipWrongPending = true;
      currentExpected.forEach(e => {
        if (!e.sustained) {
          e.matched = false;
          e.failed = true;
        }
      });
      chordPressTimestamps = {};
      heldKeys.clear();
      leftoverHeldKeys.clear();
      wrongCount += unresolved;
      notesPlayed += unresolved;
      debugStrip.innerHTML = `<span class="debug-err">✗ ${reason}</span> | Expected: ${expectedStr}`;
      updateNoteDisplay(currentExpected);
      updateStats();
      skipWrongAdvanceTimer = setTimeout(() => {
        skipWrongAdvanceTimer = null;
        skipWrongPending = false;
        if (!isPlaying) return;
        heldKeys.clear();
        leftoverHeldKeys.clear();
        chordPressTimestamps = {};
        advanceCursor([]);
      }, waitMs);
    }

    // Fire when a step timer completes: credit notes, compute carry-overs, advance.
    function onStepComplete(stepBeats, isFromTimedMode) {
      durationTimer = null;
      stopDurationBar();
      if (!isPlaying) return; // exercise was stopped/finished — bail out

      const bpmInput = parseInt(tempoInput.value) || 0;
      const bpm = bpmInput > 0 ? bpmInput : (getScoreTempo() || 100);
      const beatMs = 60000 / bpm;

      // Credit all notes that were correctly matched at this step
      const freshMatched = currentExpected.filter(e => e.matched && !e.sustained);
      const freshUnmatched = currentExpected.filter(e => !e.matched && !e.sustained);
      if (isFromTimedMode) {
        correctCount += freshMatched.length;
        wrongCount += freshUnmatched.length;
      } else {
        // duration-free mode: only credit fresh (sustained were credited in their own step)
        correctCount += freshMatched.length;
      }
      notesPlayed += freshMatched.length + freshUnmatched.length;

      // Compute carry-over: notes whose remaining duration exceeds stepBeats
      const nextCarryOver = currentExpected
        .filter(e => (e.durationBeats || 1) > stepBeats)
        .map(e => ({
          midi: e.midi,
          name: e.name,
          solfege: e.solfege,
          staffIndex: e.staffIndex,
          durationBeats: +(e.durationBeats - stepBeats).toFixed(6),
          sustained: true,
          matched: true,
          failed: false,
        }));

      requiredHeldKeys = new Set(nextCarryOver.map(n => n.midi));

      // In timed mode: clear held keys so stale keys from previous position
      // don't cause false "too many keys" errors at the new position.
      if (isFromTimedMode) {
        heldKeys.clear();
        chordPressTimestamps = {};
      }

      advanceCursor(nextCarryOver);
      if (!isPlaying) return; // advanceCursor may have called finishExercise
      updateStats();

      if (isDurationMode() || isFromTimedMode) {
        // Start the next step timer immediately
        if (currentExpected.length > 0) {
          const freshAtNewPos = currentExpected.filter(e => !e.sustained);
          // In duration-free mode: only auto-continue if there are no fresh notes to press
          // (cursor moved to a position that only has sustained carry-overs).
          // Otherwise, handleMidiNoteOn will start the timer once the user presses the new notes.
          if (isFromTimedMode || freshAtNewPos.length === 0) {
            const nextStepMs = isFromTimedMode ? getPositionDurationMs() : getStepDurationMs();
            startDurationBar(nextStepMs, 0);
            const nextStepBeats = isFromTimedMode
              ? Math.max(...currentExpected.map(e => e.durationBeats || 1))
              : Math.min(...currentExpected.map(e => e.durationBeats || 1));
            durationTimer = setTimeout(() => {
              onStepComplete(nextStepBeats, isFromTimedMode);
            }, nextStepMs);
          }
        }
      }
    }

    function handleMidiNoteOn(midiNumber) {
      // Restart gesture works regardless of play state; if it fires, ignore this note.
      if (updateRestartGesture(midiNumber, true)) return;
      if (isReadingMode()) return;
      if (!isPlaying) return;
      if (skipWrongPending) return;
      if (!startTime) startTime = performance.now();
      totalPresses++;
      heldKeys.add(midiNumber);

      const debugStrip = document.getElementById('debug-strip');
      const pressedName = `${midiToName(midiNumber)} (${midiToSolfege(midiNumber)}) MIDI=${midiNumber}`;
      const expectedStr = currentExpected.map(e => `${e.name}(${e.solfege})=${e.midi}${e.matched ? '✓' : ''}`).join(', ');

      console.log(`MIDI IN: ${pressedName}`, 'Expected:', expectedStr);

      const now = performance.now();

      // Fresh (non-sustained) notes that still need to be pressed
      const freshExpected = currentExpected.filter(e => !e.sustained);
      const isFreshChord = freshExpected.length > 1;

      // Ignore presses of sustained (already-held) keys
      if (currentExpected.some(e => e.sustained && e.midi === midiNumber)) {
        // Already held as a sustained note — don't count as press or error
        return;
      }

      // Too many NON-sustained keys pressed simultaneously
      const freshHeldCount = [...heldKeys].filter(k =>
        !sustainedNotes.some(s => s.midi === k) && !leftoverHeldKeys.has(k)).length;
      if (freshHeldCount > freshExpected.length) {
        if (isSkipWrongFreeEnabled()) {
          skipFreeModePositionOnWrong(debugStrip, expectedStr, `Too many keys! ${pressedName}`, freshExpected);
          return;
        }
        resetChordAttempt(debugStrip, expectedStr, `Too many keys! ${pressedName}`);
        console.warn(`WRONG (extra keys): freshHeld=${freshHeldCount}, expected=${freshExpected.length}`);
        return;
      }

      // Chord timing: only for fresh notes
      if (isFreshChord) {
        const timestamps = Object.values(chordPressTimestamps);
        if (timestamps.length > 0) {
          const firstTime = Math.min(...timestamps);
          if (now - firstTime > CHORD_WINDOW_MS) {
            if (isSkipWrongFreeEnabled()) {
              skipFreeModePositionOnWrong(
                debugStrip,
                expectedStr,
                `Chord — press simultaneously! (gap ${Math.round(now - firstTime)} ms)`,
                freshExpected
              );
              return;
            }
            resetChordAttempt(debugStrip, expectedStr,
              `Chord — press simultaneously! (gap ${Math.round(now - firstTime)} ms)`);
            console.warn(`CHORD TIMING: spread=${Math.round(now - firstTime)}ms > ${CHORD_WINDOW_MS}ms`);
          }
        }
      }

      let matched = false;
      for (const exp of currentExpected) {
        if (!exp.matched && !exp.sustained && exp.midi === midiNumber) {
          exp.matched = true;
          exp.failed = false;
          chordPressTimestamps[midiNumber] = now;
          matched = true;
          break;
        }
      }

      if (matched) {
        debugStrip.innerHTML = `<span class="debug-ok">✓ ${pressedName}</span> | Expected: ${expectedStr}`;
        updateNoteDisplay(currentExpected);

        const allFreshMatched = freshExpected.every(e => e.matched);
        if (allFreshMatched) {
          allMatchedAt = performance.now();
          if (confirmTimer) clearTimeout(confirmTimer);
          confirmTimer = setTimeout(() => {
            confirmTimer = null;

            const currentFreshHeld = [...heldKeys].filter(k =>
              !sustainedNotes.some(s => s.midi === k) && !leftoverHeldKeys.has(k));
            if (currentFreshHeld.length > freshExpected.length) {
              if (isSkipWrongFreeEnabled()) {
                skipFreeModePositionOnWrong(debugStrip, expectedStr, 'Too many keys at once!', freshExpected);
                return;
              }
              resetChordAttempt(debugStrip, expectedStr, 'Too many keys at once!');
              return;
            }

            if (isFreshChord) {
              const times = Object.values(chordPressTimestamps);
              const spread = times.length > 1 ? Math.max(...times) - Math.min(...times) : 0;
              if (spread > CHORD_WINDOW_MS) {
                if (isSkipWrongFreeEnabled()) {
                  skipFreeModePositionOnWrong(
                    debugStrip,
                    expectedStr,
                    `Chord — press simultaneously! (gap ${Math.round(spread)} ms)`,
                    freshExpected
                  );
                  return;
                }
                resetChordAttempt(debugStrip, expectedStr,
                  `Chord — press simultaneously! (gap ${Math.round(spread)} ms)`);
                console.warn(`CHORD TIMING fail: spread=${Math.round(spread)}ms`);
                updateStats();
                return;
              }
            }

            chordPressTimestamps = {};

            if (isDurationMode()) {
              // Hold mode: wait for step duration (min beats), then carry over longer notes
              const stepMs = getStepDurationMs();
              const stepBeats = Math.min(...currentExpected.map(e => e.durationBeats || 1));
              const elapsed = performance.now() - allMatchedAt;
              // requiredHeldKeys = all notes (fresh + sustained) until step completes
              requiredHeldKeys = new Set(currentExpected.map(e => e.midi));
              startDurationBar(stepMs, elapsed);
              durationTimer = setTimeout(() => { onStepComplete(stepBeats, false); }, Math.max(0, stepMs - elapsed));
            } else if (modeSelect.value !== 'timed') {
              // Plain free mode: credit fresh notes and advance immediately
              if (isFreshChord) {
                correctCount += freshExpected.length;
              } else {
                correctCount++;
              }
              notesPlayed += freshExpected.length;
              advanceCursor([]);
              updateStats();
            }
            // In timed mode: scheduleTimedStep handles advance
          }, 60);
        }
      } else {
        if (isSkipWrongFreeEnabled()) {
          skipFreeModePositionOnWrong(debugStrip, expectedStr, pressedName, freshExpected);
          return;
        }
        wrongCount++;
        currentExpected.forEach(e => {
          if (!e.sustained && !e.matched) e.failed = true;
        });
        debugStrip.innerHTML = `<span class="debug-err">✗ ${pressedName}</span> | Expected: ${expectedStr}`;
        console.warn(`WRONG: pressed ${pressedName}, expected: ${expectedStr}`);
        updateNoteDisplay(currentExpected);
        updateStats();
      }
      if (!freshExpected.every(e => e.matched)) updateStats();
    }

    function startTimedMode() {
      currentBPM = parseInt(tempoInput.value) || 80;
      scheduleTimedStep();
    }

    function scheduleTimedStep() {
      if (!isPlaying || modeSelect.value !== 'timed') return;
      if (durationTimer) return; // already running (onStepComplete reschedules itself)
      const durMs = getPositionDurationMs();
      const stepBeats = Math.max(...currentExpected.map(e => e.durationBeats || 1));
      startDurationBar(durMs);
      durationTimer = setTimeout(() => { onStepComplete(stepBeats, true); }, durMs);
    }

    function getReadingDurationMs() {
      const bpmInput = parseInt(tempoInput.value) || 0;
      const bpm = bpmInput > 0 ? bpmInput : (getScoreTempo() || 80);
      osmd.cursor.reset();
      let beats = 0;
      let guard = 0;
      while (!osmd.cursor.Iterator.EndReached && guard < 5000) {
        const expected = getExpectedNotes();
        if (expected.length > 0) {
          beats += Math.max(...expected.map(e => e.durationBeats || 1));
        }
        osmd.cursor.next();
        guard++;
      }
      osmd.cursor.reset();
      if (beats <= 0) beats = Math.max(4, totalNotes || 4);
      return Math.max(1000, beats * (60000 / bpm));
    }

    function stopReadingScroll() {
      if (readingScrollRaf) {
        cancelAnimationFrame(readingScrollRaf);
        readingScrollRaf = null;
      }
      readingLastFrameTs = 0;
    }

    function startReadingScroll() {
      stopReadingScroll();
      if (!osmd || !isPlaying || !isReadingMode()) return;

      const maxScroll = Math.max(0, scoreArea.scrollHeight - scoreArea.clientHeight);
      if (maxScroll <= 0) {
        finishExercise();
        return;
      }

      const durationMs = getReadingDurationMs();
      const pxPerMs = maxScroll / durationMs;
      readingLastFrameTs = 0;

      function tick(ts) {
        if (!isPlaying || !isReadingMode()) return;
        if (!readingLastFrameTs) {
          readingLastFrameTs = ts;
        }
        const dt = ts - readingLastFrameTs;
        readingLastFrameTs = ts;
        scoreArea.scrollTop = Math.min(maxScroll, scoreArea.scrollTop + pxPerMs * dt);
        updateStats();
        if (scoreArea.scrollTop >= maxScroll - 1) {
          finishExercise();
          return;
        }
        readingScrollRaf = requestAnimationFrame(tick);
      }

      readingScrollRaf = requestAnimationFrame(tick);
    }

    function resetSessionState() {
      hasActiveSession = false;
      isPaused = false;
      elapsedBeforePauseMs = 0;
      startTime = null;
      currentExpected = [];
      heldKeys.clear();
      leftoverHeldKeys.clear();
      chordPressTimestamps = {};
      requiredHeldKeys.clear();
      sustainedNotes = [];
      skipWrongPending = false;
    }

    function startExercise() {
      if (!osmd) return;
      if (isPlaying) return;

      const resumeFromPause = hasActiveSession && isPaused;
      isPaused = false;
      isPlaying = true;

      if (!resumeFromPause) {
        correctCount = 0;
        wrongCount = 0;
        totalPresses = 0;
        notesPlayed = 0;
        elapsedBeforePauseMs = 0;
        startTime = null;

        totalNotes = countTotalNotes();
        if (checkKeyboard.checked) { initKeyboard(); }
        heldKeys.clear();
        leftoverHeldKeys.clear();
        chordPressTimestamps = {};
        if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
        if (skipWrongAdvanceTimer) { clearTimeout(skipWrongAdvanceTimer); skipWrongAdvanceTimer = null; }
        skipWrongPending = false;
        if (durationTimer) { clearTimeout(durationTimer); durationTimer = null; }
        stopReadingScroll();
        stopDurationBar();
        resetStaffNoteHighlights();
        requiredHeldKeys.clear();
        sustainedNotes = [];
        hasActiveSession = true;
        isPaused = false;

        if (isReadingMode()) {
          scoreArea.scrollTop = 0;
        } else {
          osmd.cursor.reset();
        }
      }

      startTime = performance.now();

      if (isReadingMode()) {
        osmd.cursor.hide();
        currentExpected = [];
        noteDisplay.textContent = t('trainer.modeReadingStatus');
        startReadingScroll();
      } else {
        osmd.cursor.show();
        currentExpected = getExpectedNotes();
        if (currentExpected.length === 0) advanceCursor();
        updateNoteDisplay(currentExpected);
        scrollToCursor();
      }

      updateStats();
      updateTimer();

      timerInterval = setInterval(updateTimer, 500);
      if (modeSelect.value === 'timed') {
        if (resumeFromPause) {
          scheduleTimedStep();
        } else {
          startTimedMode();
        }
      }

      btnStart.disabled = true;
      btnStop.disabled = false;
      btnRestart.disabled = false;
      btnListen.disabled = true;

      // Close settings when starting
      document.getElementById('settings-panel').classList.remove('open');
      document.getElementById('btn-settings').classList.remove('active-toggle');

      requestWakeLock();
    }

function stopExercise(options) {
  options = options || {};
  const hardReset = !!options.hardReset;
  const finish = !!options.finish;

  if (isPlaying && startTime) {
    elapsedBeforePauseMs += (performance.now() - startTime);
    startTime = null;
  }

      isPlaying = false;
      clearInterval(timerInterval);
      if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
      if (skipWrongAdvanceTimer) { clearTimeout(skipWrongAdvanceTimer); skipWrongAdvanceTimer = null; }
      skipWrongPending = false;
      if (durationTimer) { clearTimeout(durationTimer); durationTimer = null; }
  stopReadingScroll();
      stopDurationBar();
      resetStaffNoteHighlights();
      requiredHeldKeys.clear();
      sustainedNotes = [];
      timerInterval = null;
      heldKeys.clear();
      leftoverHeldKeys.clear();
      chordPressTimestamps = {};
      if (pianoKeyboard) pianoKeyboard.clear();

      if (hardReset || finish) {
        resetSessionState();
      } else if (hasActiveSession) {
        isPaused = true;
      }

      btnStart.disabled = false;
      btnStop.disabled = true;
      btnListen.disabled = false;
      if (isListening) stopListening();
      releaseWakeLock();
    }

    function finishExercise() {
      const elapsed = ((elapsedBeforePauseMs + (startTime ? (performance.now() - startTime) : 0)) / 1000).toFixed(1);
      stopExercise({ finish: true });
      const accuracy = totalPresses > 0 ? ((correctCount / totalPresses) * 100).toFixed(1) : 0;

      const modal = document.getElementById('result-modal');
      const content = document.getElementById('result-content');
      content.innerHTML = `
        <h2>${t('trainer.finishTitle')}</h2>
        <div class="stat-row">${t('trainer.finishCorrect')} <b style="color:#2e7d32;">${correctCount}</b></div>
        <div class="stat-row">${t('trainer.finishWrong')} <b style="color:#c62828;">${wrongCount}</b></div>
        <div class="stat-row">${t('trainer.finishAccuracy')} <b>${accuracy}%</b></div>
        <div class="stat-row">${t('trainer.finishTime')} <b>${elapsed} ${t('trainer.sec')}</b></div>
        <button onclick="document.getElementById('result-modal').classList.remove('active')">${t('trainer.ok')}</button>
      `;
      modal.classList.add('active');
      noteDisplay.textContent = t('trainer.noteDisplayDone');
    }

    // ===================== LISTEN / PLAYBACK =====================
    let pianoSampler = null;
    let isListening = false;
    let listenCancelToken = { cancelled: false };

    function midiToToneName(midi) {
      const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const octave = Math.floor(midi / 12) - 1;
      return names[midi % 12] + octave;
    }

    async function ensureSampler() {
      if (pianoSampler) return pianoSampler;

      await Tone.start();

      const baseUrl = 'https://tonejs.github.io/audio/salamander/';
      pianoSampler = new Tone.Sampler({
        urls: {
          A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
          A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
          A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
          A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
          A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
          A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
          A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3',
          A7: 'A7.mp3', C8: 'C8.mp3',
        },
        release: 1,
        baseUrl: baseUrl,
      }).toDestination();

      // Wait for all samples to load
      await Tone.loaded();
      return pianoSampler;
    }

    function collectAllNotesForPlayback() {
      if (!osmd || !osmd.cursor) return [];

      osmd.cursor.reset();
      const hand = handSelect.value;
      const events = [];
      let posIdx = 0;

      while (!osmd.cursor.Iterator.EndReached) {
        const voices = osmd.cursor.Iterator.CurrentVoiceEntries;
        // Get beat position from OSMD's timestamp (quarter-note beats)
        const ts = osmd.cursor.Iterator.CurrentSourceTimestamp;
        const beatOffset = (ts && typeof ts.RealValue === 'number') ? ts.RealValue * 4 : 0;

        voices.forEach(ve => {
          const staffIndex = ve.ParentSourceStaffEntry
            ? ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0;
          if (hand === 'right' && staffIndex !== 0) return;
          if (hand === 'left' && staffIndex !== 1) return;

          ve.Notes.forEach(note => {
            if (note.isRest()) return;
            // Skip tie continuations — only play the attack note
            if (note.NoteTie && note.NoteTie.Notes && note.NoteTie.Notes[0] !== note) return;
            const p = note.Pitch;
            if (!p) return;
            const midi = osmdPitchToMidi(p);
            if (midi <= 0) return;

            const dur = getNoteTiedDurationBeats(note);
            events.push({
              midi,
              startBeat: beatOffset,
              durationBeats: dur,
              _cursorPos: posIdx,
            });
          });
        });

        posIdx++;
        osmd.cursor.next();
      }

      osmd.cursor.reset();
      return events;
    }

    async function startListening() {
      if (!osmd) return;
      if (isPlaying) stopExercise();

      const sampler = await ensureSampler();

      const events = collectAllNotesForPlayback();
      if (events.length === 0) return;

      isListening = true;
      const token = { cancelled: false };
      listenCancelToken = token;

      btnListen.classList.add('listening');
      const lblEl = document.getElementById('lbl-btn-listen');
      lblEl.textContent = ' ' + t('trainer.btnListenStop');
      btnStart.disabled = true;

      // Priority: score tempo > UI BPM > default 100
      const scoreBpm = getScoreTempo();
      const uiBpm = parseInt(tempoInput.value) || 0;
      const bpm = scoreBpm > 0 ? scoreBpm : (uiBpm > 0 ? uiBpm : 100);
      console.log('Listen BPM:', bpm, '(score:', scoreBpm, 'ui:', uiBpm, ')');
      const beatMs = 60000 / bpm;

      // Show cursor and move it through the piece
      osmd.cursor.show();
      osmd.cursor.reset();

      let lastBeat = -1;
      let cursorPos = 0;

      for (let i = 0; i < events.length; i++) {
        if (token.cancelled) break;

        const ev = events[i];
        // Wait until this event's beat
        if (ev.startBeat > lastBeat + 0.001) {
          const waitMs = (ev.startBeat - Math.max(lastBeat, 0)) * beatMs;
          if (waitMs > 0 && lastBeat >= 0) {
            await new Promise(r => setTimeout(r, waitMs));
          }
          if (token.cancelled) break;
          lastBeat = ev.startBeat;
        }

        // Advance cursor to match the event's cursor position
        // (handles rest-only positions that produce no events)
        const targetPos = ev._cursorPos;
        while (cursorPos < targetPos) {
          try { osmd.cursor.next(); } catch(e) {}
          cursorPos++;
        }
        scrollToCursor();

        // Play the note
        const noteName = midiToToneName(ev.midi);
        const durSec = Math.max(0.1, (ev.durationBeats * beatMs) / 1000);
        sampler.triggerAttackRelease(noteName, durSec);

        // Highlight on virtual keyboard
        if (pianoKeyboard) {
          pianoKeyboard.highlightKey(ev.midi, '#42a5f5');
          setTimeout(() => {
            if (pianoKeyboard) {
              var k = pianoKeyboard.keys[ev.midi];
              if (k) { k.classList.remove('pk-on'); k.style.removeProperty('--pkc'); }
            }
          }, durSec * 1000);
        }
      }

      // Wait for the last notes to finish
      if (!token.cancelled && events.length > 0) {
        const lastEvent = events[events.length - 1];
        const finalWaitMs = lastEvent.durationBeats * beatMs;
        await new Promise(r => setTimeout(r, finalWaitMs));
      }

      stopListening();
    }

    function stopListening() {
      listenCancelToken.cancelled = true;
      isListening = false;

      if (pianoSampler) {
        pianoSampler.releaseAll();
      }

      btnListen.classList.remove('listening');
      const lblEl = document.getElementById('lbl-btn-listen');
      lblEl.textContent = ' ' + t('trainer.btnListen');
      btnStart.disabled = false;

      if (osmd && osmd.cursor) {
        osmd.cursor.reset();
        osmd.cursor.hide();
      }
      if (pianoKeyboard) pianoKeyboard.clear();
    }

    btnListen.addEventListener('click', () => {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });

    // ===================== LIBRARY =====================
    function getLibraryItemPath(item) {
      return item && (item.path || item.filename) ? (item.path || item.filename) : '';
    }

    function buildLibraryFileUrl(item) {
      const path = getLibraryItemPath(item);
      return 'music_xml/' + path.split('/').map(part => encodeURIComponent(part)).join('/');
    }

    function normalizeLibraryGroups(data) {
      const groups = [];

      if (Array.isArray(data.folders)) {
        data.folders.forEach((folder, index) => {
          if (!folder) return;
          const files = Array.isArray(folder.files)
            ? folder.files.filter(item => getLibraryItemPath(item))
            : [];
          if (files.length === 0) return;
          groups.push({
            id: folder.id || `folder-${index + 1}`,
            title: folder.title || folder.name || '',
            files
          });
        });
      }

      const rootFiles = Array.isArray(data.files)
        ? data.files.filter(item => getLibraryItemPath(item))
        : [];

      if (rootFiles.length > 0) {
        groups.push({ id: 'root', title: '', files: rootFiles });
      }

      return groups;
    }

    function flattenLibraryFiles(groups) {
      const files = [];
      groups.forEach(group => {
        group.files.forEach(item => files.push(item));
      });
      return files;
    }

    function createLibraryEntry(item, modal) {
      const entry = document.createElement('div');
      entry.className = 'lib-entry';

      const title = item.title || getLibraryItemPath(item);
      entry.textContent = item.composer ? `${title} — ${item.composer}` : title;

      entry.addEventListener('click', async () => {
        modal.classList.remove('active');
        await loadFileFromUrl(buildLibraryFileUrl(item), title, item.composer);
      });

      return entry;
    }

    function renderLibraryGroups(listEl, groups, modal) {
      listEl.innerHTML = '';

      groups.forEach((group, index) => {
        if (!group.title) {
          group.files.forEach(item => {
            listEl.appendChild(createLibraryEntry(item, modal));
          });
          return;
        }

        const details = document.createElement('details');
        details.className = 'lib-folder';
        if (index === 0) details.open = true;

        const summary = document.createElement('summary');
        summary.textContent = `${group.title} (${group.files.length})`;
        details.appendChild(summary);

        group.files.forEach(item => {
          details.appendChild(createLibraryEntry(item, modal));
        });

        listEl.appendChild(details);
      });
    }

    async function openLibrary() {
      const modal = document.getElementById('lib-modal');
      const listEl = document.getElementById('lib-list');
      const titleEl = document.getElementById('lib-title');
      titleEl.textContent = t('trainer.libraryTitle');
      listEl.innerHTML = `<div style="color:#888;padding:10px 0;">${t('trainer.libraryLoading')}</div>`;
      modal.classList.add('active');

      try {
        const res = await fetch('music_xml/library.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const groups = normalizeLibraryGroups(data);
        const files = flattenLibraryFiles(groups);
        if (files.length === 0) {
          listEl.innerHTML = `<div style="color:#888;padding:10px 0;">${t('trainer.libraryEmpty')}</div>`;
          return;
        }
        renderLibraryGroups(listEl, groups, modal);
      } catch (e) {
        listEl.innerHTML = `<div style="color:#c62828;padding:10px 0;">${t('trainer.libraryError')}</div>`;
        console.error('Library load error:', e);
      }
    }

    async function loadFileFromUrl(url, displayName, composer) {
      container.innerHTML = '<div class="loading" id="score-loading"></div>';
      document.getElementById('score-loading').textContent = t('trainer.fileInfoLoading');
      fileInfo.textContent = t('trainer.fileInfoLoading');
      btnStart.disabled = true;
      if (isPlaying || timerInterval || durationTimer) {
        stopExercise({ hardReset: true });
      } else {
        stopReadingScroll();
        resetSessionState();
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const buf = await res.arrayBuffer();
        let xmlString;
        if (url.endsWith('.mxl')) {
          xmlString = await extractMxl(buf);
        } else {
          xmlString = new TextDecoder().decode(buf);
        }

        container.innerHTML = '';
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
          autoResize: true,
          drawTitle: false,
          drawComposer: false,
          drawPartNames: false,
          drawMeasureNumbers: true,
          followCursor: true,
          cursorsOptions: [{ type: 0, color: '#43a047', alpha: 0.5, follow: true }],
        });

        await osmd.load(xmlString);
        osmd.Zoom = currentZoom;
        osmd.render();
        clearRenderedStaffHighlights();
        replayStaffHighlights();

        const measures = osmd.Sheet.SourceMeasures.length;
        const title = displayName || osmd.Sheet.TitleString || url.split('/').pop();
        loadedFileMeta = { title, composer: composer || null, measures };
        const infoComposer = composer ? ` (${composer})` : '';
        fileInfo.textContent = `${title}${infoComposer} — ${measures} ${t('trainer.measures')}`;

        totalNotes = countTotalNotes();
        btnStart.disabled = false;
        btnRestart.disabled = false;
        btnListen.disabled = false;
        noteDisplay.textContent = t('trainer.noteDisplayStart');
        if (checkKeyboard.checked) initKeyboard();
      } catch (e) {
        container.innerHTML = `<div class="loading" style="color:#c62828;">${t('trainer.fileInfoError')}: ${e.message}</div>`;
        fileInfo.textContent = t('trainer.fileInfoError');
        console.error(e);
      }
    }

    document.getElementById('btn-library').addEventListener('click', openLibrary);
    document.getElementById('lib-close').addEventListener('click', () => {
      document.getElementById('lib-modal').classList.remove('active');
    });
    document.getElementById('lib-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
    });

    // ===================== AI GENERATE =====================
    function fixMusicXml(xml) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        if (doc.querySelector('parsererror')) return xml;

        const root = doc.querySelector('score-partwise');
        if (!root) return xml;

        // Ensure <part-list> exists
        if (!root.querySelector('part-list')) {
          const pl = doc.createElement('part-list');
          const sp = doc.createElement('score-part');
          sp.setAttribute('id', 'P1');
          const pn = doc.createElement('part-name');
          pn.textContent = 'Piano';
          sp.appendChild(pn);
          pl.appendChild(sp);
          root.insertBefore(pl, root.firstChild);
        }

        // Ensure every <score-part> has required children
        doc.querySelectorAll('score-part').forEach(sp => {
          const id = sp.getAttribute('id') || 'P1';

          // <part-name> is required
          if (!sp.querySelector('part-name')) {
            const pn = doc.createElement('part-name');
            pn.textContent = 'Piano';
            sp.insertBefore(pn, sp.firstChild);
          } else if (!sp.querySelector('part-name').textContent) {
            sp.querySelector('part-name').textContent = 'Piano';
          }

          // <score-instrument> → <instrument-name> (OSMD calls .toLowerCase() on this)
          let si = sp.querySelector('score-instrument');
          if (si) {
            if (!si.getAttribute('id')) si.setAttribute('id', id + '-I1');
            let iname = si.querySelector('instrument-name');
            if (!iname) {
              iname = doc.createElement('instrument-name');
              iname.textContent = 'Piano';
              si.appendChild(iname);
            } else if (!iname.textContent) {
              iname.textContent = 'Piano';
            }
          }

          // <midi-instrument> → <midi-channel>, <midi-program>
          let mi = sp.querySelector('midi-instrument');
          if (mi) {
            if (!mi.getAttribute('id')) mi.setAttribute('id', si ? si.getAttribute('id') : id + '-I1');
            if (!mi.querySelector('midi-channel')) {
              const mc = doc.createElement('midi-channel');
              mc.textContent = '1';
              mi.appendChild(mc);
            }
            if (!mi.querySelector('midi-program')) {
              const mp = doc.createElement('midi-program');
              mp.textContent = '1';
              mi.appendChild(mp);
            }
          }
        });

        // Ensure every <clef> has a <sign> element (OSMD calls .toLowerCase() on clef sign)
        doc.querySelectorAll('clef').forEach(clef => {
          let sign = clef.querySelector('sign');
          if (!sign) {
            sign = doc.createElement('sign');
            sign.textContent = 'G';
            clef.insertBefore(sign, clef.firstChild);
          } else if (!sign.textContent) {
            sign.textContent = 'G';
          }
        });

        // Ensure every <key> has a <fifths> element
        doc.querySelectorAll('key').forEach(key => {
          if (!key.querySelector('fifths')) {
            const f = doc.createElement('fifths');
            f.textContent = '0';
            key.insertBefore(f, key.firstChild);
          }
        });

        return new XMLSerializer().serializeToString(doc);
      } catch (e) {
        return xml;
      }
    }

    async function loadMusicXmlString(xmlString, title) {
      container.innerHTML = '<div class="loading" id="score-loading"></div>';
      document.getElementById('score-loading').textContent = t('trainer.fileInfoLoading');
      fileInfo.textContent = t('trainer.fileInfoLoading');
      btnStart.disabled = true;
      if (isPlaying || timerInterval || durationTimer) {
        stopExercise({ hardReset: true });
      } else {
        stopReadingScroll();
        resetSessionState();
      }

      try {
        // Sanitize AI-generated MusicXML: ensure required elements exist
        xmlString = fixMusicXml(xmlString);
        console.log('AI MusicXML (first 2000 chars):', xmlString.substring(0, 2000));

        container.innerHTML = '';
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, {
          autoResize: true,
          drawTitle: false,
          drawComposer: false,
          drawPartNames: false,
          drawMeasureNumbers: true,
          followCursor: true,
          cursorsOptions: [{ type: 0, color: '#43a047', alpha: 0.5, follow: true }],
        });

        await osmd.load(xmlString);
        osmd.Zoom = currentZoom;
        osmd.render();
        clearRenderedStaffHighlights();
        replayStaffHighlights();

        const measures = osmd.Sheet.SourceMeasures.length;
        const displayTitle = title || osmd.Sheet.TitleString || 'Random';
        loadedFileMeta = { title: displayTitle, composer: 'Random', measures };
        fileInfo.textContent = `${displayTitle} — ${measures} ${t('trainer.measures')}`;

        totalNotes = countTotalNotes();
        btnStart.disabled = false;
        btnRestart.disabled = false;
        btnListen.disabled = false;
        noteDisplay.textContent = t('trainer.noteDisplayStart');
        if (checkKeyboard.checked) initKeyboard();
      } catch (e) {
        container.innerHTML = `<div class="loading" style="color:#c62828;">${t('trainer.fileInfoError')}: ${e.message}</div>`;
        fileInfo.textContent = t('trainer.fileInfoError');
        console.error(e);
      }
    }

    (function initRandomizer() {
      const modal = document.getElementById('rand-modal');
      const btnOpen = document.getElementById('btn-randomizer');
      const btnCancel = document.getElementById('rand-cancel');
      const btnGenerate = document.getElementById('rand-do-generate');
      const measuresSelect = document.getElementById('rand-measures');
      const handSelect2 = document.getElementById('rand-hand');
      const maxNotesSelect = document.getElementById('rand-max-notes');
      const accidentalsSelect = document.getElementById('rand-accidentals');

      const statusEl = document.getElementById('rand-status');

      btnOpen.addEventListener('click', () => {
        statusEl.textContent = '';
        statusEl.className = 'ai-status';
        modal.classList.add('active');
      });
      btnCancel.addEventListener('click', () => modal.classList.remove('active'));
      modal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
      });

      btnGenerate.addEventListener('click', async () => {
        const numMeasures = parseInt(measuresSelect.value, 10);
        const hand = handSelect2.value;
        const maxNotes = parseInt(maxNotesSelect.value, 10);
        const accidentals = accidentalsSelect.value;
        try {
          const xml = generateRandomMusicXml({
            measures: numMeasures,
            hand,
            maxNotes,
            accidentals,
          });

          modal.classList.remove('active');
          await loadMusicXmlString(xml, t('trainer.randTitle'));
        } catch (e) {
          statusEl.textContent = e.message;
          statusEl.className = 'ai-status error';
          console.error('Randomizer error:', e);
        }
      });

      // ── Random MusicXML generator ──
      function generateRandomMusicXml(opts) {
        const divisions = 4; // 4 = quarter note
        const beats = 4;
        const beatType = 4;
        const measureDuration = divisions * beats; // 16

        // Note pools
        const NATURAL = ['C','D','E','F','G','A','B'];
        const SHARP_NOTES = ['C','D','F','G','A'];
        const FLAT_NOTES = ['D','E','G','A','B'];

        // Max 1 ledger line per clef
        const trebleRange = { notes: NATURAL, octaves: [4, 5], loMidi: 60, hiMidi: 83 }; // C4–B5
        const bassRange   = { notes: NATURAL, octaves: [2, 4], loMidi: 38, hiMidi: 62 }; // D2–D4

        // Simple rhythm only (half + quarter notes)
        const durPool = [[8,'half'], [4,'quarter']];

        function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
        function rndInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

        // Build available pitch pool for a clef (filtered to 1 ledger line max)
        function buildPitchPool(clef) {
          const r = clef === 'G' ? trebleRange : bassRange;
          const pool = [];
          for (let oct = r.octaves[0]; oct <= r.octaves[1]; oct++) {
            for (const step of r.notes) {
              pool.push({ step, octave: oct, alter: 0 });
              if (opts.accidentals === 'sharps' || opts.accidentals === 'both') {
                if (SHARP_NOTES.includes(step)) pool.push({ step, octave: oct, alter: 1 });
              }
              if (opts.accidentals === 'flats' || opts.accidentals === 'both') {
                if (FLAT_NOTES.includes(step)) pool.push({ step, octave: oct, alter: -1 });
              }
            }
          }
          return pool.filter(n => {
            const m = noteToMidi(n);
            return m >= r.loMidi && m <= r.hiMidi;
          });
        }

        // Pick a note close to the previous one (stepwise motion preference)
        function pickNextNote(pool, prevNote) {
          if (!prevNote) return rnd(pool);
          // Sort by distance from previous note
          const prevMidi = noteToMidi(prevNote);
          const sorted = pool.slice().sort((a, b) =>
            Math.abs(noteToMidi(a) - prevMidi) - Math.abs(noteToMidi(b) - prevMidi)
          );
          // Pick from closest 30% with bias toward very close notes
          const top = Math.max(2, Math.floor(sorted.length * 0.3));
          // Weighted: 60% closest, 30% mid, 10% far
          const r = Math.random();
          if (r < 0.6) return sorted[rndInt(0, Math.min(2, top - 1))];
          if (r < 0.9) return sorted[rndInt(0, top - 1)];
          return rnd(sorted.slice(0, Math.floor(sorted.length * 0.5)));
        }

        function noteToMidi(n) {
          const s = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
          return (n.octave + 1) * 12 + (s[n.step] || 0) + (n.alter || 0);
        }

        // Generate notes for one measure on one staff
        function genMeasureNotes(pool, prevNote) {
          const notes = [];
          let remaining = measureDuration;
          let prev = prevNote;

          while (remaining > 0) {
            // Filter durations that fit
            const fits = durPool.filter(d => d[0] <= remaining);
            if (fits.length === 0) break;
            const [dur, typeName] = rnd(fits);

            // How many simultaneous notes (chord)?
            const simul = opts.maxNotes > 1 ? rndInt(1, opts.maxNotes) : 1;

            const picked = [];
            const base = pickNextNote(pool, prev);
            picked.push(base);

            // For chords: add notes at intervals of 2-4 semitones above
            if (simul > 1) {
              const baseMidi = noteToMidi(base);
              const chordPool = pool.filter(p => {
                const m = noteToMidi(p);
                return m > baseMidi && m <= baseMidi + 12;
              });
              for (let c = 1; c < simul && chordPool.length > 0; c++) {
                const cn = chordPool.splice(rndInt(0, chordPool.length - 1), 1)[0];
                if (cn) picked.push(cn);
              }
            }

            picked.forEach((p, idx) => {
              notes.push({
                step: p.step,
                octave: p.octave,
                alter: p.alter,
                duration: dur,
                type: typeName,
                chord: idx > 0,
              });
            });

            prev = base;
            remaining -= dur;
          }

          // Fill any remaining with a rest
          if (remaining > 0) {
            notes.push({ rest: true, duration: remaining, type: durToType(remaining) });
          }

          return { notes, lastNote: prev };
        }

        function durToType(d) {
          if (d >= 16) return 'whole';
          if (d >= 8)  return 'half';
          if (d >= 4)  return 'quarter';
          if (d >= 2)  return 'eighth';
          return '16th';
        }

        // Build XML
        const hasTreble = opts.hand === 'right' || opts.hand === 'both';
        const hasBass  = opts.hand === 'left'  || opts.hand === 'both';
        const twoStaves = hasTreble && hasBass;

        const treblePool = hasTreble ? buildPitchPool('G') : [];
        const bassPool   = hasBass   ? buildPitchPool('F') : [];

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
        xml += '<score-partwise version="3.1">\n';
        xml += '  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>\n';
        xml += '  <part id="P1">\n';

        let prevTreble = null;
        let prevBass = null;

        for (let m = 1; m <= opts.measures; m++) {
          xml += `    <measure number="${m}">\n`;

          // Attributes in first measure
          if (m === 1) {
            xml += '      <attributes>\n';
            xml += `        <divisions>${divisions}</divisions>\n`;
            xml += '        <key><fifths>0</fifths></key>\n';
            xml += `        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>\n`;
            if (twoStaves) xml += '        <staves>2</staves>\n';
            if (hasTreble) {
              xml += twoStaves
                ? '        <clef number="1"><sign>G</sign><line>2</line></clef>\n'
                : '        <clef><sign>G</sign><line>2</line></clef>\n';
            }
            if (hasBass && twoStaves) {
              xml += '        <clef number="2"><sign>F</sign><line>4</line></clef>\n';
            } else if (hasBass && !hasTreble) {
              xml += '        <clef><sign>F</sign><line>4</line></clef>\n';
            }
            xml += '      </attributes>\n';
          }

          // Treble (voice 1, staff 1)
          if (hasTreble) {
            const res = genMeasureNotes(treblePool, prevTreble);
            prevTreble = res.lastNote;
            res.notes.forEach(n => {
              if (n.rest) {
                xml += `      <note><rest/><duration>${n.duration}</duration><type>${n.type}</type>`;
                if (twoStaves) xml += '<voice>1</voice><staff>1</staff>';
                xml += '</note>\n';
              } else {
                xml += '      <note>';
                if (n.chord) xml += '<chord/>';
                xml += `<pitch><step>${n.step}</step>`;
                if (n.alter !== 0) xml += `<alter>${n.alter}</alter>`;
                xml += `<octave>${n.octave}</octave></pitch>`;
                xml += `<duration>${n.duration}</duration><type>${n.type}</type>`;
                if (twoStaves) xml += '<voice>1</voice><staff>1</staff>';
                xml += '</note>\n';
              }
            });
          }

          // Bass (voice 2, staff 2) — two staves
          if (hasBass && twoStaves) {
            xml += `      <backup><duration>${measureDuration}</duration></backup>\n`;
            const res = genMeasureNotes(bassPool, prevBass);
            prevBass = res.lastNote;
            res.notes.forEach(n => {
              if (n.rest) {
                xml += `      <note><rest/><duration>${n.duration}</duration><type>${n.type}</type><voice>2</voice><staff>2</staff></note>\n`;
              } else {
                xml += '      <note>';
                if (n.chord) xml += '<chord/>';
                xml += `<pitch><step>${n.step}</step>`;
                if (n.alter !== 0) xml += `<alter>${n.alter}</alter>`;
                xml += `<octave>${n.octave}</octave></pitch>`;
                xml += `<duration>${n.duration}</duration><type>${n.type}</type>`;
                xml += '<voice>2</voice><staff>2</staff>';
                xml += '</note>\n';
              }
            });
          }

          // Bass only (single staff, no treble)
          if (hasBass && !hasTreble) {
            const res = genMeasureNotes(bassPool, prevBass);
            prevBass = res.lastNote;
            res.notes.forEach(n => {
              if (n.rest) {
                xml += `      <note><rest/><duration>${n.duration}</duration><type>${n.type}</type></note>\n`;
              } else {
                xml += '      <note>';
                if (n.chord) xml += '<chord/>';
                xml += `<pitch><step>${n.step}</step>`;
                if (n.alter !== 0) xml += `<alter>${n.alter}</alter>`;
                xml += `<octave>${n.octave}</octave></pitch>`;
                xml += `<duration>${n.duration}</duration><type>${n.type}</type>`;
                xml += '</note>\n';
              }
            });
          }

          xml += '    </measure>\n';
        }

        xml += '  </part>\n';
        xml += '</score-partwise>';
        return xml;
      }
    })();

    // ===================== HELP MODAL =====================
    function openHelp() {
      const modal = document.getElementById('help-modal');
      document.getElementById('help-title').textContent = t('trainer.helpTitle');
      document.getElementById('help-body').innerHTML = t('trainer.helpBody');
      modal.classList.add('active');
    }
    document.getElementById('btn-help').addEventListener('click', openHelp);
    document.getElementById('help-close').addEventListener('click', () => {
      document.getElementById('help-modal').classList.remove('active');
    });
    document.getElementById('help-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
    });

    // First-visit: show help automatically
    if (!localStorage.getItem('trainer-help-shown')) {
      localStorage.setItem('trainer-help-shown', '1');
      // Delay slightly to let the page render
      setTimeout(openHelp, 400);
    }

    // ===================== MIDI SETUP =====================
    let midiPollTimer = null;
    const debugStrip = document.getElementById('debug-strip');

    function setupMidi() {
      debugStrip.dataset.midiInit = '1';
      debugStrip.textContent = 'MIDI: init...';

      // On browsers with native requestMIDIAccess but where WebMidi.js may not work
      // (e.g. WebMidiBrowser on iPad), try native first if WebMidi.js enable doesn't
      // resolve quickly.
      if (typeof WebMidi !== 'undefined') {
        debugStrip.textContent = 'MIDI: WebMidi.js found, enabling...';
        var settled = false;
        var timer = setTimeout(function() {
          if (!settled) {
            settled = true;
            debugStrip.textContent = 'MIDI: WebMidi.js timeout, trying native...';
            setupMidiNative();
          }
        }, 3000);

        WebMidi.enable()
          .then(() => {
            if (settled) return; // native already took over
            settled = true;
            clearTimeout(timer);
            debugStrip.textContent = 'MIDI: enabled, inputs=' + WebMidi.inputs.length;
            function connectInput(input) {
              midiInput = input;
              midiLabel.textContent = input.name.length > 16 ? input.name.slice(0, 16) + '…' : input.name;
              midiChip.className = 'midi-chip ok';
              debugStrip.textContent = 'MIDI: connected ' + input.name;
              if (midiPollTimer) { clearInterval(midiPollTimer); midiPollTimer = null; }
              input.removeListener();
              input.addListener('noteon', e => {
                if (e.rawAttack === 0 || e.note.attack === 0) {
                  handleMidiNoteOff(e.note.number);
                  return;
                }
                handleMidiNoteOn(e.note.number);
              });
              input.addListener('noteoff', e => {
                handleMidiNoteOff(e.note.number);
              });
            }

            if (WebMidi.inputs.length > 0) {
              connectInput(WebMidi.inputs[0]);
            } else {
              midiLabel.textContent = t('trainer.midiNone');
              midiChip.className = 'midi-chip no';
              // Poll for late-appearing devices (Android, Bluetooth MIDI)
              midiPollTimer = setInterval(() => {
                if (WebMidi.inputs.length > 0 && !midiInput) {
                  connectInput(WebMidi.inputs[0]);
                }
              }, 2000);
            }

            WebMidi.addListener('connected', () => {
              if (WebMidi.inputs.length > 0 && !midiInput) connectInput(WebMidi.inputs[0]);
            });
            WebMidi.addListener('disconnected', () => {
              if (WebMidi.inputs.length === 0) {
                midiInput = null;
                midiLabel.textContent = t('trainer.midiNone');
                midiChip.className = 'midi-chip no';
                // Resume polling
                if (!midiPollTimer) {
                  midiPollTimer = setInterval(() => {
                    if (WebMidi.inputs.length > 0 && !midiInput) {
                      connectInput(WebMidi.inputs[0]);
                    }
                  }, 2000);
                }
              }
            });
          })
          .catch(err => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            console.warn('WebMidi.js enable failed, trying native API:', err);
            debugStrip.textContent = 'MIDI: WebMidi.js failed, trying native...';
            setupMidiNative();
          });
        return;
      }

      setupMidiNative();
    }

    function setupMidiNative() {
      // Fallback: native Web MIDI API (WebMidiBrowser on iPad, etc.)
      if (navigator.requestMIDIAccess) {
        debugStrip.textContent = 'MIDI: native API fallback...';
        navigator.requestMIDIAccess({ sysex: false }).then(function(access) {
          var nativeInputs = [];
          var it0 = access.inputs.values();
          for (var o0 = it0.next(); !o0.done; o0 = it0.next()) nativeInputs.push(o0.value);
          debugStrip.textContent = 'MIDI native: OK, inputs=' + nativeInputs.length +
            ' [' + nativeInputs.map(function(i) { return i.name; }).join(', ') + ']';

          function isVirtualSession(port) {
            return /^Session\s*\d*$/i.test(port.name);
          }

          // Prefer a real hardware device over virtual iOS "Session" ports
          var preferredInput = null;
          for (var i = 0; i < nativeInputs.length; i++) {
            if (!isVirtualSession(nativeInputs[i])) {
              preferredInput = nativeInputs[i];
              break;
            }
          }

          function connectNativeInput(port) {
            midiInput = port;
            midiLabel.textContent = port.name.length > 16 ? port.name.slice(0, 16) + '…' : port.name;
            midiChip.className = 'midi-chip ok';
            debugStrip.textContent = 'MIDI native: connected ' + port.name;
            port.onmidimessage = function(event) {
              var data = event.data;
              var cmd = data[0] & 0xf0;
              var note = data[1];
              var velocity = data.length > 2 ? data[2] : 0;
              if (cmd === 0x90 && velocity > 0) {
                handleMidiNoteOn(note);
              } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
                handleMidiNoteOff(note);
              }
            };
          }

          if (preferredInput) {
            connectNativeInput(preferredInput);
          } else {
            // Only Session ports or no ports — wait for real device via onstatechange
            midiLabel.textContent = t('trainer.midiNone');
            midiChip.className = 'midi-chip no';
            debugStrip.textContent = 'MIDI native: waiting for real device...';
          }

          access.onstatechange = function(event) {
            var port = event.port;
            // Always prefer a real device; upgrade from Session if needed
            if (port.type === 'input' && port.state === 'connected') {
              if (!isVirtualSession(port)) {
                connectNativeInput(port);
              } else if (!midiInput) {
                // No device at all — connect Session as last resort
                connectNativeInput(port);
              }
            } else if (port.type === 'input' && port.state === 'disconnected') {
              var remaining = [];
              var it = access.inputs.values();
              for (var o = it.next(); !o.done; o = it.next()) remaining.push(o.value);
              if (remaining.length === 0) {
                midiInput = null;
                midiLabel.textContent = t('trainer.midiNone');
                midiChip.className = 'midi-chip no';
              }
            }
          };
        }).catch(function(err) {
          midiLabel.textContent = t('trainer.midiErr');
          debugStrip.textContent = 'Native MIDI err: ' + err.message;
          console.error('Native MIDI error:', err);
        });
        return;
      }

      midiLabel.textContent = t('trainer.midiNo');
      debugStrip.textContent = 'MIDI: no API available';
    }



    // ===================== EVENT HANDLERS =====================
    document.getElementById('file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) loadFile(file);
    });

    function toggleExerciseByFullscreenShortcut() {
      const app = document.getElementById('app');
      if (!app.classList.contains('fullscreen-active')) return;

      if (isPlaying) {
        if (!btnStop.disabled) btnStop.click();
        return;
      }

      if (!btnStart.disabled) btnStart.click();
    }

    // Spacebar = play/pause toggle, Enter = restart (work anywhere, not only fullscreen).
    function togglePlayPause() {
      if (isPlaying) {
        if (!btnStop.disabled) btnStop.click();
      } else if (!btnStart.disabled) {
        btnStart.click();
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.isContentEditable)) {
        return;
      }
      // Don't hijack keys while a modal is open.
      if (document.querySelector('.help-overlay.active, .lib-overlay.active, .ai-overlay.active, .modal-overlay.active')) {
        return;
      }
      e.preventDefault();
      if (e.code === 'Space') {
        togglePlayPause();
      } else {
        if (!btnRestart.disabled) btnRestart.click();
      }
    });

    scoreArea.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('#btn-exit-fullscreen')) return;
      toggleExerciseByFullscreenShortcut();
    });

    btnStart.addEventListener('click', startExercise);
    btnStop.addEventListener('click', stopExercise);
    btnRestart.addEventListener('click', () => {
      stopExercise({ hardReset: true });
      startExercise();
    });

    document.getElementById('result-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
    });

    // Init MIDI on load
    setupMidi();

    // ===================== AUTO-LOAD FIRST COMPOSITION =====================
    (async function autoLoadFirst() {
      try {
        const res = await fetch('music_xml/library.json');
        if (!res.ok) return;
        const data = await res.json();
        const groups = normalizeLibraryGroups(data);
        const files = flattenLibraryFiles(groups);
        if (files.length > 0) {
          const first = files[0];
          await loadFileFromUrl(buildLibraryFileUrl(first), first.title || getLibraryItemPath(first), first.composer);
        }
      } catch (e) {
        console.warn('Auto-load first composition failed:', e);
      }
    })();
