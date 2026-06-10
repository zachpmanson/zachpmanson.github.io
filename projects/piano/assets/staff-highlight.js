// Staff-note SVG coloring: paints noteheads/stems/beams green (correct) or red
// (wrong) as the player progresses, and replays that coloring after a re-render
// (zoom/resize). The two state maps below are private to this module — nothing
// else touches them.
//
// Decoupled from app.js globals via accessors passed to createStaffHighlighter:
//   getOsmd() -> the live OSMD instance (or null)
//   getHand() -> "both" | "right" | "left"
import { osmdPitchToMidi } from "./notes.js";
import { findAncestorWithClass } from "./dom-utils.js";

export function createStaffHighlighter({ getOsmd, getHand }) {
  // svg element -> { fill, stroke } original inline styles (for restore)
  var coloredNoteElements = new Map();
  // sourceNote -> color (the logical state, replayed after a re-render)
  var staffHighlightState = new Map();

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
    var children = el.querySelectorAll("*");
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
      var color = item.failed ? "#c62828" : item.matched ? "#2e7d32" : "";
      if (!color) continue;
      if (!midiMap[item.midi]) midiMap[item.midi] = [];
      midiMap[item.midi].push(color);
    }
    return midiMap;
  }

  function paintGraphicalNote(gNote, color, seen) {
    if (!gNote || !color) return;
    var noteEl = null;
    try {
      noteEl = gNote.getSVGGElement ? gNote.getSVGGElement() : null;
    } catch (e) {}
    if (!noteEl) return;

    paintSvgElement(noteEl, color, seen);

    var staveNoteGroup = findAncestorWithClass(noteEl, "vf-stavenote");
    if (!staveNoteGroup) return;

    paintSvgElement(staveNoteGroup, color, seen);

    var noteId = staveNoteGroup.getAttribute("id") || "";
    if (!noteId) return;

    paintSvgElement(document.getElementById(noteId + "-stem"), color, seen);
    for (var beamIdx = 0; beamIdx < 4; beamIdx++) {
      paintSvgElement(document.getElementById(noteId + "-beam" + beamIdx), color, seen);
    }
  }

  function replayStaffHighlights() {
    var osmd = getOsmd();
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
    var osmd = getOsmd();
    if (!osmd || !osmd.cursor || !expected || expected.length === 0) return;

    var midiColorQueue = buildMidiColorQueue(expected);
    if (Object.keys(midiColorQueue).length === 0) return;

    var cursorIt = osmd.cursor.Iterator;
    if (!cursorIt || cursorIt.EndReached) return;
    var cursorEntries = cursorIt.CurrentVoiceEntries;
    if (!cursorEntries || !cursorEntries.length) return;

    var seen = new Set();
    var hand = getHand();
    var measureIdx = cursorIt.CurrentMeasureIndex;
    var parts = osmd.graphic && osmd.graphic.MeasureList;
    if (!parts || !parts[measureIdx]) return;

    for (var v = 0; v < cursorEntries.length; v++) {
      var ve = cursorEntries[v];
      var staffIdx = 0;
      try {
        staffIdx = ve.ParentSourceStaffEntry ? ve.ParentSourceStaffEntry.ParentStaff.idInMusicSheet : 0;
      } catch (e1) {}
      if (hand === "right" && staffIdx !== 0) continue;
      if (hand === "left" && staffIdx !== 1) continue;

      var sourceStaffEntry = ve.ParentSourceStaffEntry;
      if (!sourceStaffEntry) continue;

      for (var p = 0; p < parts[measureIdx].length; p++) {
        var gMeasure = parts[measureIdx][p];
        if (!gMeasure || !gMeasure.staffEntries) continue;

        for (var se = 0; se < gMeasure.staffEntries.length; se++) {
          var gStaffEntry = gMeasure.staffEntries[se];
          if (!gStaffEntry || gStaffEntry.sourceStaffEntry !== sourceStaffEntry || !gStaffEntry.graphicalVoiceEntries)
            continue;

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

  return {
    clearRenderedStaffHighlights,
    resetStaffNoteHighlights,
    replayStaffHighlights,
    highlightCurrentStaffNotes,
  };
}
