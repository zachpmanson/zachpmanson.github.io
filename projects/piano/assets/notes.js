// Pure pitch/MIDI/name/solfège conversions. No shared state — every function
// maps its inputs to a string or number.

// OSMD FundamentalNote enum uses SEMITONE values, NOT sequential indices!
// C=0, D=2, E=4, F=5, G=7, A=9, B=11
export const FN_TO_NAME = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
export const FN_TO_SOLFEGE = { 0: "Do", 2: "Re", 4: "Mi", 5: "Fa", 7: "Sol", 9: "La", 11: "Si" };
export const MIDI_SOLFEGE = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

export function osmdPitchToMidi(pitch) {
  if (!pitch) return -1;
  // Primary: use OSMD's getHalfTone() + 12
  // getHalfTone() = (xmlOctave)*12 + semitone, MIDI needs +12 offset (MIDI C0 = 12)
  if (typeof pitch.getHalfTone === "function") {
    return pitch.getHalfTone() + 12;
  }
  // Fallback: FundamentalNote IS already the semitone within octave
  const fn = pitch.FundamentalNote; // semitone: C=0, D=2, E=4, F=5, G=7, A=9, B=11
  const xmlOctave = pitch.Octave + 3; // OSMD stores xmlOctave - 3
  const acc = pitch.AccidentalHalfTones || 0;
  return (xmlOctave + 1) * 12 + fn + acc;
}

export function pitchToName(pitch) {
  if (!pitch) return "?";
  const fn = pitch.FundamentalNote;
  const step = FN_TO_NAME[fn] || "?";
  const accHalf = pitch.AccidentalHalfTones || 0;
  let accStr = "";
  if (accHalf === 1) accStr = "#";
  else if (accHalf === -1) accStr = "b";
  else if (accHalf === 2) accStr = "##";
  else if (accHalf === -2) accStr = "bb";
  const octave = pitch.Octave + 3;
  return `${step}${accStr}${octave}`;
}

export function pitchToSolfege(pitch) {
  if (!pitch) return "?";
  const fn = pitch.FundamentalNote;
  const base = FN_TO_SOLFEGE[fn] || "?";
  const accHalf = pitch.AccidentalHalfTones || 0;
  let accStr = "";
  if (accHalf === 1) accStr = "#";
  else if (accHalf === -1) accStr = "b";
  else if (accHalf === 2) accStr = "##";
  else if (accHalf === -2) accStr = "bb";
  return `${base}${accStr}`;
}

export function midiToName(midi) {
  const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${CHROMATIC[note]}${oct}`;
}

export function midiToSolfege(midi) {
  const note = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${MIDI_SOLFEGE[note]}${oct}`;
}

// Tone.js note name (e.g. 60 -> "C4"). Used by Listen playback.
export function midiToToneName(midi) {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}
