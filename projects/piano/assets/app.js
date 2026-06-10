import { renderDebug } from "./debug-view.js";
import { findAncestorWithClass } from "./dom-utils.js";
import { initFullscreen } from "./fullscreen.js";
import { renderLibrary, renderLibraryMessage } from "./lib-render.js";
import { buildLibraryFileUrl, flattenLibraryFiles, getLibraryItemPath, normalizeLibraryGroups } from "./library.js";
import { setupMidi } from "./midi-input.js";
import { extractMxl, fixMusicXml } from "./mxl.js";
import { renderNoteDisplay, renderNoteText } from "./note-view.js";
import { midiToName, midiToSolfege, midiToToneName, osmdPitchToMidi, pitchToName, pitchToSolfege } from "./notes.js";
import { setSongQueryParam } from "./query.js";
import { generateRandomMusicXml } from "./random-music.js";
import { renderResults } from "./results-view.js";
import { createStaffHighlighter } from "./staff-highlight.js";
import { initWakeLock, releaseWakeLock, requestWakeLock } from "./wake-lock.js";

// ===================== I18N INIT =====================
(function () {
  const saved = localStorage.getItem("lang");
  const initialLang = saved || window.detectLanguage();
  window.setLanguage(initialLang);
})();

function applyI18n() {
  // header
  document.getElementById("lbl-file-btn").textContent = t("trainer.fileBtn");
  document.getElementById("lbl-library").textContent = t("trainer.libraryBtn");
  // settings labels
  document.getElementById("lbl-hand").textContent = t("trainer.settingsHand");
  document.getElementById("lbl-mode").textContent = t("trainer.settingsMode");
  // hand/mode options
  document.getElementById("opt-hand-both").textContent = t("trainer.handBoth");
  document.getElementById("opt-hand-right").textContent = t("trainer.handRight");
  document.getElementById("opt-hand-left").textContent = t("trainer.handLeft");
  document.getElementById("opt-mode-free").textContent = t("trainer.modeFree");
  document.getElementById("opt-mode-timed").textContent = t("trainer.modeTimed");
  document.getElementById("opt-mode-reading").textContent = t("trainer.modeReading");
  // stat labels
  document.getElementById("lbl-stat-correct").textContent = t("trainer.statCorrect");
  document.getElementById("lbl-stat-wrong").textContent = t("trainer.statWrong");
  document.getElementById("lbl-stat-time").textContent = t("trainer.statTime");
  document.getElementById("lbl-stat-progress").textContent = t("trainer.statProgress");
  // default placeholder text (only if not loading / no file)
  const fi = document.getElementById("file-info");
  if (!osmd) {
    fi.textContent = t("trainer.fileInfoDefault");
  } else if (loadedFileMeta) {
    const cm = loadedFileMeta.composer ? ` (${loadedFileMeta.composer})` : "";
    fi.textContent = `${loadedFileMeta.title}${cm} — ${loadedFileMeta.measures} ${t("trainer.measures")}`;
  }
  const ds = document.getElementById("debug-strip");
  if (!ds.dataset.midiInit) renderDebug(ds, t("trainer.debugDefault"));
  const scoreLoading = document.getElementById("score-loading");
  if (scoreLoading) scoreLoading.textContent = t("trainer.scoreDefault");
  const nd = document.getElementById("note-display");
  if (!osmd) renderNoteText(nd, t("trainer.noteDisplayDefault"));
  // library modal title
  document.getElementById("lib-title").textContent = t("trainer.libraryTitle");
  // AI generate modal
  document.getElementById("lbl-rand-btn").textContent = t("trainer.randBtn");
  document.getElementById("rand-title").textContent = t("trainer.randTitle");
  document.getElementById("rand-lbl-measures").textContent = t("trainer.randLblMeasures");
  document.getElementById("rand-lbl-hand").textContent = t("trainer.randLblHand");
  document.getElementById("rand-opt-right").textContent = t("trainer.randOptRight");
  document.getElementById("rand-opt-left").textContent = t("trainer.randOptLeft");
  document.getElementById("rand-opt-both").textContent = t("trainer.randOptBoth");
  document.getElementById("rand-lbl-notes").textContent = t("trainer.randLblNotes");
  document.getElementById("rand-opt-notes-1").textContent = t("trainer.randNotes1");
  document.getElementById("rand-opt-notes-2").textContent = t("trainer.randNotes2");
  document.getElementById("rand-opt-notes-3").textContent = t("trainer.randNotes3");
  document.getElementById("rand-opt-notes-4").textContent = t("trainer.randNotes4");
  document.getElementById("rand-lbl-accidentals").textContent = t("trainer.randLblAccidentals");
  document.getElementById("rand-opt-acc-none").textContent = t("trainer.randAccNone");
  document.getElementById("rand-opt-acc-sharps").textContent = t("trainer.randAccSharps");
  document.getElementById("rand-opt-acc-flats").textContent = t("trainer.randAccFlats");
  document.getElementById("rand-opt-acc-both").textContent = t("trainer.randAccBoth");

  document.getElementById("rand-lbl-generate").textContent = t("trainer.randGenerate");
  // action buttons
  document.getElementById("lbl-btn-start").textContent = " " + t("trainer.btnStart");
  document.getElementById("lbl-btn-stop").textContent = " " + t("trainer.btnStop");
  document.getElementById("lbl-btn-restart").textContent = " " + t("trainer.btnRestart");
  document.getElementById("lbl-btn-listen").textContent = " " + t("trainer.btnListen");
  document.getElementById("lbl-btn-loop").textContent = " " + t("trainer.btnLoop");
  if (typeof updateLoopButtonUI === "function") updateLoopButtonUI(); // re-derive state-specific label/icon
  // header title
  // Keep branding universal — no i18n for app title
  // document.getElementById('lbl-app-title').textContent    = t('trainer.appTitle');
  // duration checkbox
  document.getElementById("lbl-check-duration").textContent = t("trainer.settingsDuration");
  // keyboard checkbox
  document.getElementById("lbl-check-keyboard").textContent = t("trainer.showKeyboard");
  // note-names checkbox
  document.getElementById("lbl-check-note-names").textContent = t("trainer.showNoteNames");
  // hide-counters checkbox
  document.getElementById("lbl-check-hide-stats").textContent = t("trainer.hideStats");
  // restart-gesture checkbox
  document.getElementById("lbl-check-restart-gesture").textContent = t("trainer.restartGesture");
  // free mode skip wrong checkbox
  document.getElementById("lbl-check-skip-wrong-free").textContent = t("trainer.settingsSkipWrongFree");
  // zoom label
  document.getElementById("lbl-zoom").textContent = t("trainer.settingsZoom");
}

// English-only build: just apply the labels once the DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  applyI18n();
});

// ===================== STATE =====================
let osmd = null;
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
let heldKeys = new Set(); // tracks currently pressed MIDI keys
let confirmTimer = null; // delay to catch simultaneous extra keys
let skipWrongAdvanceTimer = null;
let skipWrongPending = false;
const CHORD_WINDOW_MS = 150; // max ms between first and last chord note
let chordPressTimestamps = {}; // midi -> timestamp when matched

// Duration tracking
let durationTimer = null; // fires when note hold time is complete
let requiredHeldKeys = new Set(); // keys that must stay held during duration
let durationBarRaf = null; // requestAnimationFrame id for progress bar
let durationBarStart = 0; // performance.now() when bar started
let durationBarTotal = 0; // total ms for current bar
let allMatchedAt = 0; // performance.now() when all notes first matched
let sustainedNotes = []; // notes carried over from previous position
let leftoverHeldKeys = new Set(); // keys held over from a previously-credited note; excluded from "too many keys"

// Loaded file metadata (for re-rendering fileInfo on lang change)
let loadedFileMeta = null; // { title, composer, measures }
let currentZoom = parseFloat(localStorage.getItem("osmdZoom")) || 1.0;

// DOM refs
const container = document.getElementById("score-container");
const scoreArea = document.getElementById("score-area");
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnRestart = document.getElementById("btn-restart");
const btnListen = document.getElementById("btn-listen");
const handSelect = document.getElementById("hand-select");
const modeSelect = document.getElementById("mode-select");
const tempoInput = document.getElementById("tempo-input");
const midiChip = document.getElementById("midi-chip");
const midiLabel = document.getElementById("midi-label");
const fileInfo = document.getElementById("file-info");
const noteDisplay = document.getElementById("note-display");
const checkDuration = document.getElementById("check-duration");
const checkKeyboard = document.getElementById("check-keyboard");
const checkNoteNames = document.getElementById("check-note-names");
const checkSkipWrongFree = document.getElementById("check-skip-wrong-free");
const skipWrongWrap = document.getElementById("skip-wrong-wrap");
const checkHideStats = document.getElementById("check-hide-stats");
const checkRestartGesture = document.getElementById("check-restart-gesture");
let pianoKeyboard = null;
let scoreNoteRange = null; // { lo, hi } — MIDI range of loaded score
let readingScrollRaf = null;
let readingLastFrameTs = 0;

// ---- Loop a section ----
let loopActive = false; // a loop region is committed
let loopStartStep = null,
  loopEndStep = null; // raw cursor posIdx (inclusive)
let loopSelecting = false; // Loop button armed, capturing clicks
let loopSelectPhase = "start"; // 'start' | 'end'
let pendingLoopStartStep = null;
let staveNoteIdToStep = new Map(); // vf-stavenote id -> posIdx (click lookup)
let stepToNoteIds = new Map(); // posIdx -> [vf-stavenote id ...] (shading)
let currentCursorStep = 0; // live posIdx the cursor sits on during play
let loopHoverStep = null; // posIdx (slice) currently hovered while selecting
let loopHitCache = null; // [{step, x, sys}] slice x-centers (client coords) for nearest-slice hit-testing
let loopSysYCache = null; // music-system -> {top, bottom} client-coord vertical band (row selection)
let loopHoverRaf = null;
let stepToSystem = new Map(); // posIdx -> OSMD music-system object (for full-height band)
let systemToIds = new Map(); // music-system object -> [stavenote id ...]
let loopBandCache = null; // music-system -> {top, bottom} container-relative px
let loopBandEls = null; // { start, end, hover } overlay band divs

// Staff-note coloring lives in staff-highlight.js; it owns its own state maps
// and reads the live osmd instance / selected hand through these accessors.
const { clearRenderedStaffHighlights, resetStaffNoteHighlights, replayStaffHighlights, highlightCurrentStaffNotes } =
  createStaffHighlighter({
    getOsmd: () => osmd,
    getHand: () => handSelect.value,
  });

// Keyboard display helpers
function initKeyboard() {
  const kb = document.getElementById("piano-kb-container");
  if (!pianoKeyboard) {
    pianoKeyboard = new PianoKeyboard(kb, {
      startMidi: scoreNoteRange ? scoreNoteRange.lo : 48,
      endMidi: scoreNoteRange ? scoreNoteRange.hi : 84,
    });
  } else if (scoreNoteRange) {
    pianoKeyboard.setRange(scoreNoteRange.lo, scoreNoteRange.hi);
  }
}
function toggleKeyboardDisplay() {
  const show = checkKeyboard.checked;
  noteDisplay.style.display = show ? "none" : "";
  document.getElementById("piano-kb-container").style.display = show ? "" : "none";
  localStorage.setItem("showKeyboard", show ? "1" : "0");
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
    var color = e.matched ? "#43a047" : e.sustained ? "#1565c0" : "#42a5f5";
    pianoKeyboard.highlightKey(e.midi, color);
  });
}

function updateSkipWrongVisibility() {
  var visible = modeSelect.value === "free" && !checkDuration.checked;
  skipWrongWrap.classList.toggle("settings-hidden", !visible);
}

function isReadingMode() {
  return modeSelect.value === "reading";
}

function updateReadingModeVisibility() {
  var wrongStat = document.getElementById("stat-wrong");
  if (wrongStat && wrongStat.parentElement) {
    wrongStat.parentElement.classList.toggle("settings-hidden", isReadingMode());
  }
}

function updateModeControls() {
  var isTimed = modeSelect.value === "timed";
  var isReading = isReadingMode();
  if (isReading && checkDuration.checked) {
    checkDuration.checked = false;
  }
  checkDuration.disabled = isReading;
  document.getElementById("tempo-group").classList.toggle("visible", isTimed || isReading || checkDuration.checked);
  updateSkipWrongVisibility();
  updateReadingModeVisibility();

  // Section looping is cursor-driven, so it's unavailable in reading mode.
  var btnLoop = document.getElementById("btn-loop");
  if (btnLoop) {
    if (isReading) {
      clearLoop();
      btnLoop.disabled = true;
    } else {
      btnLoop.disabled = !loadedFileMeta;
    }
  }
}

function isSkipWrongFreeEnabled() {
  return modeSelect.value === "free" && !checkDuration.checked && checkSkipWrongFree.checked;
}

// ===================== LOOP A SECTION =====================
// Build the click<->step map: sweep the cursor and, at each raw position
// (posIdx), record the SVG vf-stavenote group id(s) for the notes there.
// We store IDS (stable strings), never element references — OSMD reuses the
// same vf-auto#### ids each render but replaces the DOM nodes, so a stored
// reference would go stale after any re-render. posIdx is render-independent,
// so loop bounds survive zoom/resize; we just rebuild this map per render.
function buildLoopStepMap() {
  staveNoteIdToStep = new Map();
  stepToNoteIds = new Map();
  stepToSystem = new Map();
  systemToIds = new Map();
  loopHitCache = null;
  loopBandCache = null;
  // OSMD's render may discard our overlay band divs; force a fresh set.
  if (container)
    container.querySelectorAll(".loop-band").forEach(function (e) {
      e.remove();
    });
  loopBandEls = null;
  if (!osmd || !osmd.cursor || !osmd.graphic) return;
  var parts = osmd.graphic.MeasureList;
  if (!parts) return;

  // The sweep below moves the cursor; remember where it was so a rebuild
  // triggered mid-play (zoom/resize) can restore the live position.
  var savedStep = currentCursorStep;

  osmd.cursor.reset();
  var posIdx = 0;
  while (!osmd.cursor.Iterator.EndReached) {
    var it = osmd.cursor.Iterator;
    var measureIdx = it.CurrentMeasureIndex;
    var veList = it.CurrentVoiceEntries || [];
    var ids = [];
    for (var v = 0; v < veList.length; v++) {
      var sourceStaffEntry = veList[v].ParentSourceStaffEntry;
      if (!sourceStaffEntry || !parts[measureIdx]) continue;
      for (var p = 0; p < parts[measureIdx].length; p++) {
        var gMeasure = parts[measureIdx][p];
        if (!gMeasure || !gMeasure.staffEntries) continue;
        var gSystem = gMeasure.parentMusicSystem || null;
        for (var se = 0; se < gMeasure.staffEntries.length; se++) {
          var gStaffEntry = gMeasure.staffEntries[se];
          if (!gStaffEntry || gStaffEntry.sourceStaffEntry !== sourceStaffEntry || !gStaffEntry.graphicalVoiceEntries)
            continue;
          for (var gv = 0; gv < gStaffEntry.graphicalVoiceEntries.length; gv++) {
            var gve = gStaffEntry.graphicalVoiceEntries[gv];
            if (!gve.notes) continue;
            for (var ni = 0; ni < gve.notes.length; ni++) {
              var svgEl = null;
              try {
                svgEl = gve.notes[ni].getSVGGElement ? gve.notes[ni].getSVGGElement() : null;
              } catch (e) {}
              if (!svgEl) continue;
              var staveNote = findAncestorWithClass(svgEl, "vf-stavenote");
              if (!staveNote) continue;
              var id = staveNote.getAttribute("id");
              if (id && !staveNoteIdToStep.has(id)) {
                staveNoteIdToStep.set(id, posIdx);
                ids.push(id);
                if (gSystem) {
                  if (stepToSystem.get(posIdx) == null) stepToSystem.set(posIdx, gSystem);
                  if (!systemToIds.has(gSystem)) systemToIds.set(gSystem, []);
                  systemToIds.get(gSystem).push(id);
                }
              }
            }
          }
        }
      }
    }
    if (ids.length) stepToNoteIds.set(posIdx, ids);
    posIdx++;
    osmd.cursor.next();
  }

  // Restore the live cursor position (no-op at rest, where savedStep is 0).
  seekCursorToStep(savedStep);
  if (isPlaying && osmd.cursor.show) osmd.cursor.show();

  // Restore any visual after a re-render rebuilt the SVG elements.
  if (loopActive) applyLoopShading();
  else if (loopSelecting) {
    paintSelectionStart();
  }
}

// Reset the cursor to the score start and step forward to `target`,
// keeping currentCursorStep in sync. Mirrors the reset+next idiom used
// by countTotalNotes / collectAllNotesForPlayback.
function seekCursorToStep(target) {
  if (!osmd || !osmd.cursor) return;
  osmd.cursor.reset();
  var step = 0;
  while (step < target && !osmd.cursor.Iterator.EndReached) {
    osmd.cursor.next();
    step++;
  }
  currentCursorStep = step;
}

// ----- Loop visuals -----
// Dim classes are toggled on the live elements resolved by id (group + its
// separate stem/beam elements), so the whole note dims and nothing ever
// points at a stale node. Independent of the inline fill/stroke
// play-coloring, so the two never collide. The start/end/hover markers are
// vertical bands spanning the whole music system (like the OSMD cursor).
function loopNoteEls(id) {
  var els = [];
  var g = document.getElementById(id);
  if (g) els.push(g);
  var stem = document.getElementById(id + "-stem");
  if (stem) els.push(stem);
  for (var b = 0; b < 4; b++) {
    var bm = document.getElementById(id + "-beam" + b);
    if (bm) els.push(bm);
  }
  return els;
}

function setLoopClass(id, cls, on) {
  loopNoteEls(id).forEach(function (el) {
    el.classList.toggle(cls, on);
  });
}

// --- vertical band overlays (start / end / hover) ---
function ensureBandEls() {
  if (loopBandEls && loopBandEls.start.isConnected) return;
  if (!container) return;
  container.querySelectorAll(".loop-band").forEach(function (e) {
    e.remove();
  });
  function mk(cls) {
    var d = document.createElement("div");
    d.className = "loop-band " + cls;
    d.style.display = "none";
    container.appendChild(d);
    return d;
  }
  loopBandEls = { start: mk("loop-band-end-cap"), end: mk("loop-band-end-cap"), hover: mk("loop-band-hover") };
}

// Container-relative vertical extent of a music system (cached per render).
function systemBand(sys) {
  if (!loopBandCache) loopBandCache = new Map();
  if (loopBandCache.has(sys)) return loopBandCache.get(sys);
  var ids = systemToIds.get(sys) || [];
  var crect = container.getBoundingClientRect();
  var top = Infinity,
    bottom = -Infinity;
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    if (r.top < top) top = r.top;
    if (r.bottom > bottom) bottom = r.bottom;
  });
  var band = top === Infinity ? null : { top: top - crect.top, bottom: bottom - crect.top };
  loopBandCache.set(sys, band);
  return band;
}

// Container-relative centre-x of a slice.
function sliceX(step) {
  var ids = stepToNoteIds.get(step) || [];
  var crect = container.getBoundingClientRect();
  var sum = 0,
    n = 0;
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    sum += r.left + r.width / 2;
    n++;
  });
  return n ? sum / n - crect.left : null;
}

function showBand(which, step) {
  ensureBandEls();
  if (!loopBandEls) return;
  var el = loopBandEls[which];
  if (step == null) {
    el.style.display = "none";
    return;
  }
  var sys = stepToSystem.get(step);
  var band = sys != null ? systemBand(sys) : null;
  var x = sliceX(step);
  if (!band || x == null) {
    el.style.display = "none";
    return;
  }
  var pad = 8; // reach a touch beyond the outermost notes toward the staff lines
  var width = 22; // wide column so the clickable slice is obvious
  el.style.width = width + "px";
  el.style.left = x - width / 2 + "px";
  el.style.top = band.top - pad + "px";
  el.style.height = band.bottom - band.top + pad * 2 + "px";
  el.style.display = "block";
}

function hideAllBands() {
  if (!loopBandEls) return;
  ["start", "end", "hover"].forEach(function (k) {
    loopBandEls[k].style.display = "none";
  });
}

function clearLoopShading() {
  staveNoteIdToStep.forEach(function (step, id) {
    loopNoteEls(id).forEach(function (el) {
      el.classList.remove("loop-dim");
    });
  });
  hideAllBands();
  loopHoverStep = null;
}

// Committed loop: dim everything OUTSIDE the section so only the looped
// notes stay full black; mark the two endpoints with full-height bands.
function applyLoopShading() {
  clearLoopShading();
  if (!loopActive || loopStartStep == null || loopEndStep == null) return;
  stepToNoteIds.forEach(function (ids, step) {
    var inRange = step >= loopStartStep && step <= loopEndStep;
    ids.forEach(function (id) {
      if (!inRange) setLoopClass(id, "loop-dim", true);
    });
  });
  showBand("start", loopStartStep);
  showBand("end", loopEndStep);
}

// While picking the end note, mark the chosen start note with its band.
function paintSelectionStart() {
  showBand("start", pendingLoopStartStep);
}

// Selection snaps to the nearest vertical slice (cursor step) — like the
// OSMD cursor, which spans both clefs at one time point. We first pick the
// music system (staff line) the pointer is over by its y, then the nearest
// slice by x WITHIN that system. Picking the row first is essential on
// multi-line scores: every system shares the same x-range, so an x-only
// search would jump to the wrong line. This is forgiving (no need to hit a
// notehead, works in the hollow centre of half/whole notes) and makes the
// whole height of a staff line a hoverable target. Cached in client coords;
// invalidated on scroll and on rebuild.
function buildLoopHitCache() {
  loopHitCache = [];
  loopSysYCache = new Map();
  stepToNoteIds.forEach(function (ids, step) {
    var sumX = 0,
      n = 0;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.getBoundingClientRect) return;
      var r = el.getBoundingClientRect();
      sumX += r.left + r.width / 2;
      n++;
    });
    if (n) loopHitCache.push({ step: step, x: sumX / n, sys: stepToSystem.get(step) || null });
  });
  systemToIds.forEach(function (ids, sys) {
    var top = Infinity,
      bottom = -Infinity;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.getBoundingClientRect) return;
      var r = el.getBoundingClientRect();
      if (r.top < top) top = r.top;
      if (r.bottom > bottom) bottom = r.bottom;
    });
    if (top !== Infinity) loopSysYCache.set(sys, { top: top, bottom: bottom });
  });
}

function nearestStep(x, y) {
  if (!loopHitCache) buildLoopHitCache();
  // 1) which staff line (music system) is the pointer over/closest to?
  var bestSys = null,
    bestYD = Infinity;
  loopSysYCache.forEach(function (b, sys) {
    var pad = 14;
    var d = y >= b.top - pad && y <= b.bottom + pad ? 0 : Math.min(Math.abs(y - b.top), Math.abs(y - b.bottom));
    if (d < bestYD) {
      bestYD = d;
      bestSys = sys;
    }
  });
  // 2) nearest slice by x within that system (x tiles the line, so one always wins).
  var best = null,
    bestD = Infinity;
  for (var i = 0; i < loopHitCache.length; i++) {
    var c = loopHitCache[i];
    if (bestSys != null && c.sys !== bestSys) continue;
    var d = Math.abs(x - c.x);
    if (d < bestD) {
      bestD = d;
      best = c.step;
    }
  }
  return best;
}

// Resolve a pointer event to a cursor step: direct notehead hit first
// (precise), else the nearest vertical slice in the pointer's staff line.
function resolveStep(e) {
  var sn = findAncestorWithClass(e.target, "vf-stavenote");
  if (sn) {
    var id = sn.getAttribute("id");
    if (id && staveNoteIdToStep.has(id)) return staveNoteIdToStep.get(id);
  }
  return nearestStep(e.clientX, e.clientY);
}

// Hover highlights the whole vertical slice with a band (like the cursor).
function setLoopHoverStep(step) {
  if (loopHoverStep === step) return;
  loopHoverStep = step;
  showBand("hover", step);
}

// The Loop control is self-describing: its icon, label and colour state what
// it is and what a click does. off = grey "🔁 Loop" (start picking); both
// picking and active = blue "✕ Cancel" (click to abort/clear back to off) —
// picking pulses to show a selection is in progress.
function updateLoopButtonUI() {
  var btn = document.getElementById("btn-loop");
  if (!btn) return;
  var ico = document.getElementById("ico-btn-loop");
  var lbl = document.getElementById("lbl-btn-loop");
  var isSet = loopActive && !loopSelecting;
  btn.classList.toggle("loop-armed", loopSelecting);
  btn.classList.toggle("loop-set", isSet);
  if (loopSelecting || isSet) {
    if (ico) ico.textContent = "✕";
    if (lbl) lbl.textContent = " " + t("trainer.btnLoopCancel");
    btn.title = t("trainer.btnLoopCancel");
  } else {
    if (ico) ico.textContent = "🔁";
    if (lbl) lbl.textContent = " " + t("trainer.btnLoop");
    btn.title = t("trainer.btnLoop");
  }
}

function clearLoop(opts) {
  opts = opts || {};
  clearLoopShading();
  loopActive = false;
  loopStartStep = null;
  loopEndStep = null;
  loopSelecting = false;
  loopSelectPhase = "start";
  pendingLoopStartStep = null;
  if (scoreArea) scoreArea.classList.remove("loop-selecting");
  if (!opts.keepButton) updateLoopButtonUI();
}

function refreshNoteDisplayIdle() {
  // After leaving selection mode while not playing, restore a sensible label
  // (the Loop button is only enabled once a file is loaded).
  if (isPlaying) return;
  renderNoteText(noteDisplay, t("trainer.noteDisplayStart"));
}

function toggleLoopMode() {
  if (!osmd || isReadingMode()) return;
  if (loopSelecting || loopActive) {
    // cancel: abort an in-progress pick OR clear an active loop
    clearLoop();
    refreshNoteDisplayIdle();
    return;
  }
  // Off → arm selection.
  clearLoop({ keepButton: true });
  loopSelecting = true;
  loopSelectPhase = "start";
  pendingLoopStartStep = null;
  loopHitCache = null;
  scoreArea.classList.add("loop-selecting");
  updateLoopButtonUI();
  renderNoteText(noteDisplay, t("trainer.loopSelectStart"));
}

function commitLoop(a, b) {
  loopActive = true;
  loopStartStep = a;
  loopEndStep = b;
  loopSelecting = false;
  loopSelectPhase = "start";
  pendingLoopStartStep = null;
  setLoopHoverStep(null);
  scoreArea.classList.remove("loop-selecting");
  applyLoopShading();
  updateLoopButtonUI();
  refreshNoteDisplayIdle();
}

function handleLoopSelectionClick(e) {
  var step = resolveStep(e);
  if (step == null) return;

  if (loopSelectPhase === "start") {
    pendingLoopStartStep = step;
    loopSelectPhase = "end";
    setLoopHoverStep(null);
    clearLoopShading();
    paintSelectionStart();
    renderNoteText(noteDisplay, t("trainer.loopSelectEnd"));
  } else {
    var a = pendingLoopStartStep,
      b = step;
    if (a > b) {
      var tmp = a;
      a = b;
      b = tmp;
    } // normalize reversed selection
    commitLoop(a, b);
  }
}

function handleLoopHover(e) {
  if (!loopSelecting) return;
  if (loopHoverRaf) return;
  var x = e.clientX,
    y = e.clientY;
  loopHoverRaf = requestAnimationFrame(function () {
    loopHoverRaf = null;
    if (!loopSelecting) {
      setLoopHoverStep(null);
      return;
    }
    setLoopHoverStep(nearestStep(x, y));
  });
}

// Restore keyboard checkbox state
(function () {
  var saved = localStorage.getItem("showKeyboard") === "1";
  checkKeyboard.checked = saved;
  checkSkipWrongFree.checked = localStorage.getItem("skipWrongFree") === "1";
  if (saved) {
    noteDisplay.style.display = "none";
    document.getElementById("piano-kb-container").style.display = "";
  }
  updateSkipWrongVisibility();
})();
checkKeyboard.addEventListener("change", toggleKeyboardDisplay);
checkSkipWrongFree.addEventListener("change", function () {
  localStorage.setItem("skipWrongFree", checkSkipWrongFree.checked ? "1" : "0");
});

// Hide / show the correct / wrong / time counters (Progress stays visible)
function applyHideStats() {
  const hidden = checkHideStats.checked;
  ["stat-correct-wrap", "stat-wrong-wrap", "stat-time-wrap"].forEach(function (id) {
    document.getElementById(id).style.display = hidden ? "none" : "";
  });
  localStorage.setItem("hideStats", hidden ? "1" : "0");
}
checkHideStats.checked = localStorage.getItem("hideStats") === "1";
applyHideStats();
checkHideStats.addEventListener("change", applyHideStats);

// Show / hide the note name in the current-note display (on by default).
// Solfège stays visible so the display never goes blank.
checkNoteNames.checked = localStorage.getItem("showNoteNames") !== "0";
checkNoteNames.addEventListener("change", function () {
  localStorage.setItem("showNoteNames", checkNoteNames.checked ? "1" : "0");
  updateNoteDisplay(currentExpected);
});

// Restart gesture toggle (on by default)
checkRestartGesture.checked = localStorage.getItem("restartGesture") !== "0";
checkRestartGesture.addEventListener("change", function () {
  localStorage.setItem("restartGesture", checkRestartGesture.checked ? "1" : "0");
});

// ===================== ZOOM =====================
function updateZoomDisplay() {
  document.getElementById("zoom-value").textContent = Math.round(currentZoom * 100) + "%";
}
function applyZoom(delta) {
  currentZoom = Math.min(2.0, Math.max(0.4, Math.round((currentZoom + delta) * 10) / 10));
  localStorage.setItem("osmdZoom", currentZoom);
  updateZoomDisplay();
  if (osmd) {
    clearRenderedStaffHighlights();
    osmd.Zoom = currentZoom;
    osmd.render();
    buildLoopStepMap();
    replayStaffHighlights();
    if (isPlaying) highlightCurrentStaffNotes(currentExpected);
  }
}
document.getElementById("btn-zoom-in").addEventListener("click", function () {
  applyZoom(0.1);
});
document.getElementById("btn-zoom-out").addEventListener("click", function () {
  applyZoom(-0.1);
});
updateZoomDisplay();

// ===================== WAKE LOCK + FULLSCREEN =====================
// Implementations live in wake-lock.js / fullscreen.js.
initWakeLock({ isActive: () => isPlaying });
initFullscreen();

// ===================== SETTINGS TOGGLE =====================
document.getElementById("btn-settings").addEventListener("click", () => {
  const panel = document.getElementById("settings-panel");
  panel.classList.toggle("open");
  document.getElementById("btn-settings").classList.toggle("active-toggle");
});

// Restore persisted exercise settings before wiring change handlers
(function () {
  var savedHand = localStorage.getItem("hand");
  if (savedHand !== null) handSelect.value = savedHand;
  var savedMode = localStorage.getItem("mode");
  if (savedMode !== null) modeSelect.value = savedMode;
  var savedTempo = localStorage.getItem("tempo");
  if (savedTempo !== null) tempoInput.value = savedTempo;
  checkDuration.checked = localStorage.getItem("holdNotes") === "1";
})();

handSelect.addEventListener("change", () => {
  localStorage.setItem("hand", handSelect.value);
});
modeSelect.addEventListener("change", () => {
  localStorage.setItem("mode", modeSelect.value);
  updateModeControls();
});
tempoInput.addEventListener("change", () => {
  localStorage.setItem("tempo", tempoInput.value);
});
checkDuration.addEventListener("change", () => {
  localStorage.setItem("holdNotes", checkDuration.checked ? "1" : "0");
  updateModeControls();
});
updateModeControls();

// ===================== SCORE LOADING =====================
// All three entry points (file picker, library URL, AI generate) share this
// core: reset the file-info UI, stop any running exercise, build + render the
// OSMD instance, then refresh metadata / note count / loop map. They differ
// only in how the XML string is produced and the metadata shown, so each is a
// thin wrapper that hands `loadScore` a `getXmlString` thunk plus meta.
const OSMD_OPTIONS = {
  autoResize: true,
  drawTitle: false,
  drawComposer: false,
  drawPartNames: false,
  drawMeasureNumbers: true,
  followCursor: true,
  cursorsOptions: [{ type: 0, color: "#43a047", alpha: 0.5, follow: true }],
};

// meta: { title, composer, fallbackTitle, showComposerInInfo }
async function loadScore(getXmlString, meta) {
  container.innerHTML = '<div class="loading" id="score-loading"></div>';
  document.getElementById("score-loading").textContent = t("trainer.fileInfoLoading");
  fileInfo.textContent = t("trainer.fileInfoLoading");
  btnStart.disabled = true;
  if (isPlaying || timerInterval || durationTimer) {
    stopExercise({ hardReset: true });
  } else {
    stopReadingScroll();
    resetSessionState();
  }

  try {
    const xmlString = await getXmlString();

    container.innerHTML = "";
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, OSMD_OPTIONS);

    await osmd.load(xmlString);
    osmd.Zoom = currentZoom;
    osmd.render();
    clearRenderedStaffHighlights();
    replayStaffHighlights();

    const measures = osmd.Sheet.SourceMeasures.length;
    const title = meta.title || osmd.Sheet.TitleString || meta.fallbackTitle;
    const composer = meta.composer || null;
    loadedFileMeta = { title, composer, measures };
    const infoComposer = composer && meta.showComposerInInfo !== false ? ` (${composer})` : "";
    fileInfo.textContent = `${title}${infoComposer} — ${measures} ${t("trainer.measures")}`;

    totalNotes = countTotalNotes();
    clearLoop(); // a new score invalidates any previous loop bounds
    buildLoopStepMap();

    btnStart.disabled = false;
    btnRestart.disabled = false;
    btnListen.disabled = false;
    document.getElementById("btn-loop").disabled = isReadingMode();
    renderNoteText(noteDisplay, t("trainer.noteDisplayStart"));
    if (checkKeyboard.checked) initKeyboard();
  } catch (e) {
    container.innerHTML = `<div class="loading" style="color:#c62828;">${t("trainer.fileInfoError")}: ${e.message}</div>`;
    fileInfo.textContent = t("trainer.fileInfoError");
    console.error(e);
  }
}

// File picker: read .mxl (zipped) or plain MusicXML text.
function loadFile(file) {
  return loadScore(
    async () => {
      if (file.name.endsWith(".mxl")) {
        return extractMxl(await file.arrayBuffer());
      }
      return file.text();
    },
    { composer: null, fallbackTitle: file.name },
  );
}

// Re-render on resize (orientation change, etc.)
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (osmd) {
      try {
        clearRenderedStaffHighlights();
        osmd.render();
        buildLoopStepMap();
        replayStaffHighlights();
        highlightCurrentStaffNotes(currentExpected);
      } catch (e) {
        console.warn("Resize render error:", e);
      }
    }
  }, 300);
});

// Pitch/MIDI/name/solfège conversions live in notes.js (imported above).

// ===================== EXPECTED NOTES =====================
function getExpectedNotes() {
  if (!osmd || !osmd.cursor) return [];
  const iterator = osmd.cursor.Iterator;
  if (iterator.EndReached) return [];

  const hand = handSelect.value;
  const voices = iterator.CurrentVoiceEntries;
  const expected = [];

  voices.forEach((ve) => {
    const staffIndex = ve.ParentSourceStaffEntry ? ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0;
    if (hand === "right" && staffIndex !== 0) return;
    if (hand === "left" && staffIndex !== 1) return;

    ve.Notes.forEach((note) => {
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
  let rangeLo = 127,
    rangeHi = 0;
  const hand = handSelect.value;

  while (!osmd.cursor.Iterator.EndReached) {
    const voices = osmd.cursor.Iterator.CurrentVoiceEntries;
    voices.forEach((ve) => {
      const staffIndex = ve.ParentSourceStaffEntry ? ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0;
      if (hand === "right" && staffIndex !== 0) return;
      if (hand === "left" && staffIndex !== 1) return;
      ve.Notes.forEach((note) => {
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
    rangeLo = Math.floor(rangeLo / 12) * 12; // round down to C
    rangeHi = Math.ceil((rangeHi + 1) / 12) * 12 - 1; // round up to B
    scoreNoteRange = { lo: rangeLo, hi: rangeHi };
    if (pianoKeyboard) pianoKeyboard.setRange(rangeLo, rangeHi);
  }
  return count;
}

// ===================== UI UPDATES =====================
function updateStats() {
  document.getElementById("stat-correct").textContent = correctCount;
  document.getElementById("stat-wrong").textContent = wrongCount;
  if (isReadingMode()) {
    var maxScroll = Math.max(0, scoreArea.scrollHeight - scoreArea.clientHeight);
    var pct = maxScroll > 0 ? Math.round((scoreArea.scrollTop / maxScroll) * 100) : 0;
    document.getElementById("stat-progress").textContent = pct + "%";
    return;
  }
  document.getElementById("stat-progress").textContent =
    totalNotes > 0 ? Math.round((notesPlayed / totalNotes) * 100) + "%" : "0%";
}

function updateTimer() {
  const runningElapsed = startTime ? performance.now() - startTime : 0;
  const elapsed = Math.floor((elapsedBeforePauseMs + runningElapsed) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  document.getElementById("stat-time").textContent = `${min}:${sec.toString().padStart(2, "0")}`;
}

function updateNoteDisplay(expected) {
  // Update keyboard visualization
  updateKeyboardHighlight(expected);
  highlightCurrentStaffNotes(expected);

  const bpmInput = parseInt(tempoInput.value) || 0;
  const bpm = bpmInput > 0 ? bpmInput : getScoreTempo() || 100;
  const showDuration = isDurationMode() || modeSelect.value === "timed";
  const showNames = checkNoteNames.checked;
  renderNoteDisplay(noteDisplay, expected, { bpm, showDuration, showNames, t });
}

/** Scroll score so the cursor line is visible */
function scrollToCursor() {
  if (!osmd || !osmd.cursor) return;
  const cursorEl = container.querySelector('.cursor-main, img[class*="cursor"]');
  if (!cursorEl) {
    // Fallback: use OSMD's cursorElement
    const el = osmd.cursor.cursorElement;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  cursorEl.scrollIntoView({ behavior: "smooth", block: "center" });
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
  const len = (v) => (v && typeof v.RealValue === "number" ? v.RealValue * 4 : 1);
  if (note.NoteTie && note.NoteTie.Notes && note.NoteTie.Notes.length > 1 && note.NoteTie.Notes[0] === note) {
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
  const bpm = bpmInput > 0 ? bpmInput : getScoreTempo() || 100;
  const beatMs = 60000 / bpm;
  if (!currentExpected || currentExpected.length === 0) return beatMs;
  const minBeats = Math.min(...currentExpected.map((e) => e.durationBeats || 1));
  return minBeats * beatMs;
}

// Alias used by timed mode (timed still uses max — whole position duration)
function getPositionDurationMs() {
  const bpmInput = parseInt(tempoInput.value) || 0;
  const bpm = bpmInput > 0 ? bpmInput : getScoreTempo() || 100;
  const beatMs = 60000 / bpm;
  if (!currentExpected || currentExpected.length === 0) return beatMs;
  const maxBeats = Math.max(...currentExpected.map((e) => e.durationBeats || 1));
  return maxBeats * beatMs;
}

function startDurationBar(ms, alreadyElapsedMs) {
  const fill = document.getElementById("duration-bar-fill");
  const wrap = document.getElementById("duration-bar-wrap");
  const offset = alreadyElapsedMs || 0;
  durationBarStart = performance.now() - offset;
  durationBarTotal = ms + offset;
  fill.style.width = Math.min(100, (offset / durationBarTotal) * 100) + "%";
  wrap.classList.add("active");
  if (durationBarRaf) cancelAnimationFrame(durationBarRaf);
  function animate() {
    if (!durationBarRaf) return;
    const pct = Math.min(100, ((performance.now() - durationBarStart) / durationBarTotal) * 100);
    fill.style.width = pct + "%";
    if (pct < 100) durationBarRaf = requestAnimationFrame(animate);
  }
  durationBarRaf = requestAnimationFrame(animate);
}

function stopDurationBar() {
  if (durationBarRaf) {
    cancelAnimationFrame(durationBarRaf);
    durationBarRaf = null;
  }
  document.getElementById("duration-bar-wrap").classList.remove("active");
  document.getElementById("duration-bar-fill").style.width = "0%";
}

function isDurationMode() {
  return checkDuration.checked && modeSelect.value === "free";
}

// ===================== GAME LOGIC =====================
let currentExpected = [];

// Advance cursor, merging carryOver (sustained) notes.
// carryOver = [ {midi, name, solfege, durationBeats, sustained:true, matched:true} ]
function advanceCursor(carryOver, skipLoopWrap) {
  if (!osmd || !osmd.cursor) return;
  carryOver = carryOver || [];

  // Loop wrap: when sitting on (or past) the loop end and asked to advance,
  // jump back to the loop start instead of continuing. Carry-over/sustained
  // state is dropped at the boundary so a held last note can't bleed across.
  // skipLoopWrap guards the re-entrant call below from wrapping again (which
  // would recurse forever on a degenerate single-position, no-notes loop).
  if (loopActive && loopEndStep != null && currentCursorStep >= loopEndStep && !skipLoopWrap) {
    seekCursorToStep(loopStartStep);
    sustainedNotes = [];
    leftoverHeldKeys = new Set();
    requiredHeldKeys.clear();
    currentExpected = getExpectedNotes();
    if (currentExpected.length === 0) {
      advanceCursor([], true);
      return;
    } // start has no playable notes
    if (osmd.cursor.show) osmd.cursor.show();
    updateNoteDisplay(currentExpected);
    scrollToCursor();
    return;
  }

  let maxSkips = 200;
  let freshNotes = [];
  do {
    osmd.cursor.next();
    currentCursorStep++;
    if (osmd.cursor.Iterator.EndReached) {
      sustainedNotes = [];
      finishExercise();
      return;
    }
    // Get fresh notes, but exclude midi numbers already covered by carryOver
    const sustainedMidiSet = new Set(carryOver.map((s) => s.midi));
    freshNotes = getExpectedNotes().filter((n) => !sustainedMidiSet.has(n.midi));
    maxSkips--;
    // Stop skipping if we have fresh notes, or if carryOver keeps us busy
  } while (freshNotes.length === 0 && carryOver.length === 0 && maxSkips > 0);

  // If we exhausted skips looking for notes but carryOver has content, that's fine
  sustainedNotes = carryOver;
  currentExpected = [...carryOver, ...freshNotes];

  // Any key still physically held that is neither a fresh-expected note nor a
  // sustained carry-over is a benign leftover from a previous position
  // (e.g. the player holding a tie/legato note into the next note).
  const freshMidiSet = new Set(freshNotes.map((n) => n.midi));
  const sustainedMidi = new Set(carryOver.map((s) => s.midi));
  leftoverHeldKeys = new Set([...heldKeys].filter((k) => !freshMidiSet.has(k) && !sustainedMidi.has(k)));

  const iter = osmd.cursor.Iterator;
  const measure = iter.CurrentMeasureIndex + 1;
  console.log(
    `Cursor → measure ${measure}:`,
    currentExpected.map((e) => `${e.name}=${e.midi}${e.sustained ? "(sus)" : ""}`).join(", "),
  );

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
    currentExpected.forEach((e) => {
      e.matched = false;
      e.sustained = false;
      e.failed = true;
    });
    const debugStrip = document.getElementById("debug-strip");
    renderDebug(debugStrip, { ok: false, label: t("trainer.durationRelease") });
    updateNoteDisplay(currentExpected);
    updateStats();
  }
}

function resetChordAttempt(debugStrip, expectedStr, reason) {
  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
  // Notes are NOT yet credited to correctCount at this point
  // (credits happen later in confirmTimer callback or onStepComplete),
  // so we only need to reset matched flags and count the error.
  wrongCount++;
  currentExpected.forEach((e) => {
    if (!e.sustained) {
      e.matched = false;
      e.failed = true;
    }
  });
  chordPressTimestamps = {};
  renderDebug(debugStrip, { ok: false, label: reason, expected: expectedStr });
  updateNoteDisplay(currentExpected);
  updateStats();
}

function skipFreeModePositionOnWrong(debugStrip, expectedStr, reason, freshExpected) {
  if (skipWrongPending) return;
  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
  const unresolved =
    freshExpected && freshExpected.length ? freshExpected.length : currentExpected.filter((e) => !e.sustained).length;
  const waitMs = freshExpected && freshExpected.length > 1 ? CHORD_WINDOW_MS : 70;
  skipWrongPending = true;
  currentExpected.forEach((e) => {
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
  renderDebug(debugStrip, { ok: false, label: reason, expected: expectedStr });
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
  const bpm = bpmInput > 0 ? bpmInput : getScoreTempo() || 100;
  const beatMs = 60000 / bpm;

  // Credit all notes that were correctly matched at this step
  const freshMatched = currentExpected.filter((e) => e.matched && !e.sustained);
  const freshUnmatched = currentExpected.filter((e) => !e.matched && !e.sustained);
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
    .filter((e) => (e.durationBeats || 1) > stepBeats)
    .map((e) => ({
      midi: e.midi,
      name: e.name,
      solfege: e.solfege,
      staffIndex: e.staffIndex,
      durationBeats: +(e.durationBeats - stepBeats).toFixed(6),
      sustained: true,
      matched: true,
      failed: false,
    }));

  requiredHeldKeys = new Set(nextCarryOver.map((n) => n.midi));

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
      const freshAtNewPos = currentExpected.filter((e) => !e.sustained);
      // In duration-free mode: only auto-continue if there are no fresh notes to press
      // (cursor moved to a position that only has sustained carry-overs).
      // Otherwise, handleMidiNoteOn will start the timer once the user presses the new notes.
      if (isFromTimedMode || freshAtNewPos.length === 0) {
        const nextStepMs = isFromTimedMode ? getPositionDurationMs() : getStepDurationMs();
        startDurationBar(nextStepMs, 0);
        const nextStepBeats = isFromTimedMode
          ? Math.max(...currentExpected.map((e) => e.durationBeats || 1))
          : Math.min(...currentExpected.map((e) => e.durationBeats || 1));
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

  const debugStrip = document.getElementById("debug-strip");
  const pressedName = `${midiToName(midiNumber)} (${midiToSolfege(midiNumber)}) MIDI=${midiNumber}`;
  const expectedStr = currentExpected.map((e) => `${e.name}(${e.solfege})=${e.midi}${e.matched ? "✓" : ""}`).join(", ");

  console.log(`MIDI IN: ${pressedName}`, "Expected:", expectedStr);

  const now = performance.now();

  // Fresh (non-sustained) notes that still need to be pressed
  const freshExpected = currentExpected.filter((e) => !e.sustained);
  const isFreshChord = freshExpected.length > 1;

  // Ignore presses of sustained (already-held) keys
  if (currentExpected.some((e) => e.sustained && e.midi === midiNumber)) {
    // Already held as a sustained note — don't count as press or error
    return;
  }

  // Too many NON-sustained keys pressed simultaneously
  const freshHeldCount = [...heldKeys].filter(
    (k) => !sustainedNotes.some((s) => s.midi === k) && !leftoverHeldKeys.has(k),
  ).length;
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
            freshExpected,
          );
          return;
        }
        resetChordAttempt(
          debugStrip,
          expectedStr,
          `Chord — press simultaneously! (gap ${Math.round(now - firstTime)} ms)`,
        );
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
    renderDebug(debugStrip, { ok: true, label: pressedName, expected: expectedStr });
    updateNoteDisplay(currentExpected);

    const allFreshMatched = freshExpected.every((e) => e.matched);
    if (allFreshMatched) {
      allMatchedAt = performance.now();
      if (confirmTimer) clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => {
        confirmTimer = null;

        const currentFreshHeld = [...heldKeys].filter(
          (k) => !sustainedNotes.some((s) => s.midi === k) && !leftoverHeldKeys.has(k),
        );
        if (currentFreshHeld.length > freshExpected.length) {
          if (isSkipWrongFreeEnabled()) {
            skipFreeModePositionOnWrong(debugStrip, expectedStr, "Too many keys at once!", freshExpected);
            return;
          }
          resetChordAttempt(debugStrip, expectedStr, "Too many keys at once!");
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
                freshExpected,
              );
              return;
            }
            resetChordAttempt(debugStrip, expectedStr, `Chord — press simultaneously! (gap ${Math.round(spread)} ms)`);
            console.warn(`CHORD TIMING fail: spread=${Math.round(spread)}ms`);
            updateStats();
            return;
          }
        }

        chordPressTimestamps = {};

        if (isDurationMode()) {
          // Hold mode: wait for step duration (min beats), then carry over longer notes
          const stepMs = getStepDurationMs();
          const stepBeats = Math.min(...currentExpected.map((e) => e.durationBeats || 1));
          const elapsed = performance.now() - allMatchedAt;
          // requiredHeldKeys = all notes (fresh + sustained) until step completes
          requiredHeldKeys = new Set(currentExpected.map((e) => e.midi));
          startDurationBar(stepMs, elapsed);
          durationTimer = setTimeout(
            () => {
              onStepComplete(stepBeats, false);
            },
            Math.max(0, stepMs - elapsed),
          );
        } else if (modeSelect.value !== "timed") {
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
    currentExpected.forEach((e) => {
      if (!e.sustained && !e.matched) e.failed = true;
    });
    renderDebug(debugStrip, { ok: false, label: pressedName, expected: expectedStr });
    console.warn(`WRONG: pressed ${pressedName}, expected: ${expectedStr}`);
    updateNoteDisplay(currentExpected);
    updateStats();
  }
  if (!freshExpected.every((e) => e.matched)) updateStats();
}

function startTimedMode() {
  currentBPM = parseInt(tempoInput.value) || 80;
  scheduleTimedStep();
}

function scheduleTimedStep() {
  if (!isPlaying || modeSelect.value !== "timed") return;
  if (durationTimer) return; // already running (onStepComplete reschedules itself)
  const durMs = getPositionDurationMs();
  const stepBeats = Math.max(...currentExpected.map((e) => e.durationBeats || 1));
  startDurationBar(durMs);
  durationTimer = setTimeout(() => {
    onStepComplete(stepBeats, true);
  }, durMs);
}

function getReadingDurationMs() {
  const bpmInput = parseInt(tempoInput.value) || 0;
  const bpm = bpmInput > 0 ? bpmInput : getScoreTempo() || 80;
  osmd.cursor.reset();
  let beats = 0;
  let guard = 0;
  while (!osmd.cursor.Iterator.EndReached && guard < 5000) {
    const expected = getExpectedNotes();
    if (expected.length > 0) {
      beats += Math.max(...expected.map((e) => e.durationBeats || 1));
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
    if (checkKeyboard.checked) {
      initKeyboard();
    }
    heldKeys.clear();
    leftoverHeldKeys.clear();
    chordPressTimestamps = {};
    if (confirmTimer) {
      clearTimeout(confirmTimer);
      confirmTimer = null;
    }
    if (skipWrongAdvanceTimer) {
      clearTimeout(skipWrongAdvanceTimer);
      skipWrongAdvanceTimer = null;
    }
    skipWrongPending = false;
    if (durationTimer) {
      clearTimeout(durationTimer);
      durationTimer = null;
    }
    stopReadingScroll();
    stopDurationBar();
    resetStaffNoteHighlights();
    requiredHeldKeys.clear();
    sustainedNotes = [];
    hasActiveSession = true;
    isPaused = false;

    if (isReadingMode()) {
      scoreArea.scrollTop = 0;
    } else if (loopActive && loopStartStep != null) {
      seekCursorToStep(loopStartStep); // begin at the loop start
    } else {
      osmd.cursor.reset();
      currentCursorStep = 0;
    }
  }

  startTime = performance.now();

  if (isReadingMode()) {
    osmd.cursor.hide();
    currentExpected = [];
    renderNoteText(noteDisplay, t("trainer.modeReadingStatus"));
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
  if (modeSelect.value === "timed") {
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
  document.getElementById("settings-panel").classList.remove("open");
  document.getElementById("btn-settings").classList.remove("active-toggle");

  requestWakeLock();
}

function stopExercise(options) {
  options = options || {};
  const hardReset = !!options.hardReset;
  const finish = !!options.finish;

  if (isPlaying && startTime) {
    elapsedBeforePauseMs += performance.now() - startTime;
    startTime = null;
  }

  isPlaying = false;
  clearInterval(timerInterval);
  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
  if (skipWrongAdvanceTimer) {
    clearTimeout(skipWrongAdvanceTimer);
    skipWrongAdvanceTimer = null;
  }
  skipWrongPending = false;
  if (durationTimer) {
    clearTimeout(durationTimer);
    durationTimer = null;
  }
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
  const elapsed = ((elapsedBeforePauseMs + (startTime ? performance.now() - startTime : 0)) / 1000).toFixed(1);
  stopExercise({ finish: true });
  const accuracy = totalPresses > 0 ? ((correctCount / totalPresses) * 100).toFixed(1) : 0;

  const modal = document.getElementById("result-modal");
  const content = document.getElementById("result-content");
  renderResults(content, { correctCount, wrongCount, accuracy, elapsed }, t, () => modal.classList.remove("active"));
  modal.classList.add("active");
  renderNoteText(noteDisplay, t("trainer.noteDisplayDone"));
}

// ===================== LISTEN / PLAYBACK =====================
let pianoSampler = null;
let isListening = false;
let listenCancelToken = { cancelled: false };

async function ensureSampler() {
  if (pianoSampler) return pianoSampler;

  await Tone.start();

  const baseUrl = "https://tonejs.github.io/audio/salamander/";
  pianoSampler = new Tone.Sampler({
    urls: {
      A0: "A0.mp3",
      C1: "C1.mp3",
      "D#1": "Ds1.mp3",
      "F#1": "Fs1.mp3",
      A1: "A1.mp3",
      C2: "C2.mp3",
      "D#2": "Ds2.mp3",
      "F#2": "Fs2.mp3",
      A2: "A2.mp3",
      C3: "C3.mp3",
      "D#3": "Ds3.mp3",
      "F#3": "Fs3.mp3",
      A3: "A3.mp3",
      C4: "C4.mp3",
      "D#4": "Ds4.mp3",
      "F#4": "Fs4.mp3",
      A4: "A4.mp3",
      C5: "C5.mp3",
      "D#5": "Ds5.mp3",
      "F#5": "Fs5.mp3",
      A5: "A5.mp3",
      C6: "C6.mp3",
      "D#6": "Ds6.mp3",
      "F#6": "Fs6.mp3",
      A6: "A6.mp3",
      C7: "C7.mp3",
      "D#7": "Ds7.mp3",
      A7: "A7.mp3",
      C8: "C8.mp3",
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
    const beatOffset = ts && typeof ts.RealValue === "number" ? ts.RealValue * 4 : 0;

    voices.forEach((ve) => {
      const staffIndex = ve.ParentSourceStaffEntry ? ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0;
      if (hand === "right" && staffIndex !== 0) return;
      if (hand === "left" && staffIndex !== 1) return;

      ve.Notes.forEach((note) => {
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

  btnListen.classList.add("listening");
  const lblEl = document.getElementById("lbl-btn-listen");
  lblEl.textContent = " " + t("trainer.btnListenStop");
  btnStart.disabled = true;

  // Priority: score tempo > UI BPM > default 100
  const scoreBpm = getScoreTempo();
  const uiBpm = parseInt(tempoInput.value) || 0;
  const bpm = scoreBpm > 0 ? scoreBpm : uiBpm > 0 ? uiBpm : 100;
  console.log("Listen BPM:", bpm, "(score:", scoreBpm, "ui:", uiBpm, ")");
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
        await new Promise((r) => setTimeout(r, waitMs));
      }
      if (token.cancelled) break;
      lastBeat = ev.startBeat;
    }

    // Advance cursor to match the event's cursor position
    // (handles rest-only positions that produce no events)
    const targetPos = ev._cursorPos;
    while (cursorPos < targetPos) {
      try {
        osmd.cursor.next();
      } catch (e) {}
      cursorPos++;
    }
    scrollToCursor();

    // Play the note
    const noteName = midiToToneName(ev.midi);
    const durSec = Math.max(0.1, (ev.durationBeats * beatMs) / 1000);
    sampler.triggerAttackRelease(noteName, durSec);

    // Highlight on virtual keyboard
    if (pianoKeyboard) {
      pianoKeyboard.highlightKey(ev.midi, "#42a5f5");
      setTimeout(() => {
        if (pianoKeyboard) {
          var k = pianoKeyboard.keys[ev.midi];
          if (k) {
            k.classList.remove("pk-on");
            k.style.removeProperty("--pkc");
          }
        }
      }, durSec * 1000);
    }
  }

  // Wait for the last notes to finish
  if (!token.cancelled && events.length > 0) {
    const lastEvent = events[events.length - 1];
    const finalWaitMs = lastEvent.durationBeats * beatMs;
    await new Promise((r) => setTimeout(r, finalWaitMs));
  }

  stopListening();
}

function stopListening() {
  listenCancelToken.cancelled = true;
  isListening = false;

  if (pianoSampler) {
    pianoSampler.releaseAll();
  }

  btnListen.classList.remove("listening");
  const lblEl = document.getElementById("lbl-btn-listen");
  lblEl.textContent = " " + t("trainer.btnListen");
  btnStart.disabled = false;

  if (osmd && osmd.cursor) {
    osmd.cursor.reset();
    osmd.cursor.hide();
  }
  if (pianoKeyboard) pianoKeyboard.clear();
}

btnListen.addEventListener("click", () => {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
});

// ===================== LIBRARY =====================
// Data helpers live in library.js; rendering in lib-render.js (both imported above).
function renderLibraryGroups(listEl, groups, modal) {
  renderLibrary(listEl, groups, async (item) => {
    modal.classList.remove("active");
    const title = item.title || getLibraryItemPath(item);
    setSongQueryParam(getLibraryItemPath(item));
    await loadFileFromUrl(buildLibraryFileUrl(item), title, item.composer);
  });
}

async function openLibrary() {
  const modal = document.getElementById("lib-modal");
  const listEl = document.getElementById("lib-list");
  const titleEl = document.getElementById("lib-title");
  titleEl.textContent = t("trainer.libraryTitle");
  modal.classList.add("active");
  renderLibraryMessage(listEl, t("trainer.libraryLoading"));

  try {
    const res = await fetch("music_xml/library.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const groups = normalizeLibraryGroups(data);
    const files = flattenLibraryFiles(groups);
    if (files.length === 0) {
      renderLibraryMessage(listEl, t("trainer.libraryEmpty"));
      return;
    }
    renderLibraryGroups(listEl, groups, modal);
  } catch (e) {
    renderLibraryMessage(listEl, t("trainer.libraryError"), "#c62828");
    console.error("Library load error:", e);
  }
}

// Library item: fetch the URL, then decode .mxl (zipped) or plain MusicXML.
function loadFileFromUrl(url, displayName, composer) {
  return loadScore(
    async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = await res.arrayBuffer();
      return url.endsWith(".mxl") ? extractMxl(buf) : new TextDecoder().decode(buf);
    },
    { title: displayName, composer, fallbackTitle: url.split("/").pop() },
  );
}

document.getElementById("btn-library").addEventListener("click", openLibrary);
document.getElementById("lib-close").addEventListener("click", () => {
  document.getElementById("lib-modal").classList.remove("active");
});
document.getElementById("lib-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("active");
});

// ===================== AI GENERATE =====================
// Random MusicXML generation lives in random-music.js; sanitization in mxl.js.
// (composer is "Random" for metadata but kept out of the file-info line.)
function loadMusicXmlString(xmlString, title) {
  return loadScore(
    () => {
      // Sanitize AI-generated MusicXML: ensure required elements exist
      const fixed = fixMusicXml(xmlString);
      console.log("AI MusicXML (first 2000 chars):", fixed.substring(0, 2000));
      return fixed;
    },
    { title, composer: "Random", fallbackTitle: "Random", showComposerInInfo: false },
  );
}

(function initRandomizer() {
  const modal = document.getElementById("rand-modal");
  const btnOpen = document.getElementById("btn-randomizer");
  const btnCancel = document.getElementById("rand-cancel");
  const btnGenerate = document.getElementById("rand-do-generate");
  const measuresSelect = document.getElementById("rand-measures");
  const handSelect2 = document.getElementById("rand-hand");
  const maxNotesSelect = document.getElementById("rand-max-notes");
  const accidentalsSelect = document.getElementById("rand-accidentals");

  const statusEl = document.getElementById("rand-status");

  btnOpen.addEventListener("click", () => {
    statusEl.textContent = "";
    statusEl.className = "ai-status";
    modal.classList.add("active");
  });
  btnCancel.addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove("active");
  });

  btnGenerate.addEventListener("click", async () => {
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

      modal.classList.remove("active");
      await loadMusicXmlString(xml, t("trainer.randTitle"));
    } catch (e) {
      statusEl.textContent = e.message;
      statusEl.className = "ai-status error";
      console.error("Randomizer error:", e);
    }
  });

})();

// ===================== HELP MODAL =====================
function openHelp() {
  const modal = document.getElementById("help-modal");
  document.getElementById("help-title").textContent = t("trainer.helpTitle");
  document.getElementById("help-body").innerHTML = t("trainer.helpBody");
  modal.classList.add("active");
}
document.getElementById("btn-help").addEventListener("click", openHelp);
document.getElementById("help-close").addEventListener("click", () => {
  document.getElementById("help-modal").classList.remove("active");
});
document.getElementById("help-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("active");
});

// First-visit: show help automatically
if (!localStorage.getItem("trainer-help-shown")) {
  localStorage.setItem("trainer-help-shown", "1");
  // Delay slightly to let the page render
  setTimeout(openHelp, 400);
}

// ===================== EVENT HANDLERS =====================
document.getElementById("file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    setSongQueryParam(null);
    loadFile(file);
  }
});

function toggleExerciseByFullscreenShortcut() {
  const app = document.getElementById("app");
  if (!app.classList.contains("fullscreen-active")) return;

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

document.addEventListener("keydown", (e) => {
  if (e.code !== "Space" && e.code !== "Enter" && e.code !== "NumpadEnter") return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.tagName === "BUTTON" ||
      target.isContentEditable)
  ) {
    return;
  }
  // Don't hijack keys while a modal is open.
  if (document.querySelector(".help-overlay.active, .lib-overlay.active, .ai-overlay.active, .modal-overlay.active")) {
    return;
  }
  e.preventDefault();
  if (e.code === "Space") {
    togglePlayPause();
  } else {
    if (!btnRestart.disabled) btnRestart.click();
  }
});

// Escape closes any open modal/overlay.
const MODAL_SELECTOR = ".help-overlay.active, .lib-overlay.active, .ai-overlay.active, .modal-overlay.active";
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = document.querySelectorAll(MODAL_SELECTOR);
  if (!open.length) return;
  e.preventDefault();
  open.forEach((el) => el.classList.remove("active"));
});

scoreArea.addEventListener("click", (e) => {
  if (e.target && e.target.closest && e.target.closest("#btn-exit-fullscreen")) return;
  if (loopSelecting) {
    // capturing loop bounds — don't toggle play/pause
    handleLoopSelectionClick(e);
    return;
  }
  toggleExerciseByFullscreenShortcut();
});
scoreArea.addEventListener("pointermove", handleLoopHover);
scoreArea.addEventListener("scroll", () => {
  loopHitCache = null;
});

document.getElementById("btn-loop").addEventListener("click", toggleLoopMode);

btnStart.addEventListener("click", startExercise);
btnStop.addEventListener("click", stopExercise);
btnRestart.addEventListener("click", () => {
  stopExercise({ hardReset: true });
  startExercise();
});

document.getElementById("result-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("active");
});

// Init MIDI on load — device setup lives in midi-input.js; it forwards note
// events back into the game logic via these callbacks.
setupMidi({ onNoteOn: handleMidiNoteOn, onNoteOff: handleMidiNoteOff });

// ===================== AUTO-LOAD FIRST COMPOSITION =====================
(async function autoLoadFirst() {
  try {
    const res = await fetch("music_xml/library.json");
    if (!res.ok) return;
    const data = await res.json();
    const groups = normalizeLibraryGroups(data);
    const files = flattenLibraryFiles(groups);
    if (files.length === 0) return;

    const requested = new URL(window.location.href).searchParams.get("song");
    const target = (requested && files.find((item) => getLibraryItemPath(item) === requested)) || files[0];
    setSongQueryParam(getLibraryItemPath(target));
    await loadFileFromUrl(buildLibraryFileUrl(target), target.title || getLibraryItemPath(target), target.composer);
  } catch (e) {
    console.warn("Auto-load first composition failed:", e);
  }
})();
