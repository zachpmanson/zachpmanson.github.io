// Random MusicXML generator for the "AI generate" feature. Fully self-contained:
// produces a score-partwise XML string from { measures, hand, maxNotes,
// accidentals }, with stepwise-motion bias and 1-ledger-line range limits.

export function generateRandomMusicXml(opts) {
  const divisions = 4; // 4 = quarter note
  const beats = 4;
  const beatType = 4;
  const measureDuration = divisions * beats; // 16

  // Note pools
  const NATURAL = ["C", "D", "E", "F", "G", "A", "B"];
  const SHARP_NOTES = ["C", "D", "F", "G", "A"];
  const FLAT_NOTES = ["D", "E", "G", "A", "B"];

  // Max 1 ledger line per clef
  const trebleRange = { notes: NATURAL, octaves: [4, 5], loMidi: 60, hiMidi: 83 }; // C4–B5
  const bassRange = { notes: NATURAL, octaves: [2, 4], loMidi: 38, hiMidi: 62 }; // D2–D4

  // Simple rhythm only (half + quarter notes)
  const durPool = [
    [8, "half"],
    [4, "quarter"],
  ];

  function rnd(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function rndInt(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }

  // Build available pitch pool for a clef (filtered to 1 ledger line max)
  function buildPitchPool(clef) {
    const r = clef === "G" ? trebleRange : bassRange;
    const pool = [];
    for (let oct = r.octaves[0]; oct <= r.octaves[1]; oct++) {
      for (const step of r.notes) {
        pool.push({ step, octave: oct, alter: 0 });
        if (opts.accidentals === "sharps" || opts.accidentals === "both") {
          if (SHARP_NOTES.includes(step)) pool.push({ step, octave: oct, alter: 1 });
        }
        if (opts.accidentals === "flats" || opts.accidentals === "both") {
          if (FLAT_NOTES.includes(step)) pool.push({ step, octave: oct, alter: -1 });
        }
      }
    }
    return pool.filter((n) => {
      const m = noteToMidi(n);
      return m >= r.loMidi && m <= r.hiMidi;
    });
  }

  // Pick a note close to the previous one (stepwise motion preference)
  function pickNextNote(pool, prevNote) {
    if (!prevNote) return rnd(pool);
    // Sort by distance from previous note
    const prevMidi = noteToMidi(prevNote);
    const sorted = pool
      .slice()
      .sort((a, b) => Math.abs(noteToMidi(a) - prevMidi) - Math.abs(noteToMidi(b) - prevMidi));
    // Pick from closest 30% with bias toward very close notes
    const top = Math.max(2, Math.floor(sorted.length * 0.3));
    // Weighted: 60% closest, 30% mid, 10% far
    const r = Math.random();
    if (r < 0.6) return sorted[rndInt(0, Math.min(2, top - 1))];
    if (r < 0.9) return sorted[rndInt(0, top - 1)];
    return rnd(sorted.slice(0, Math.floor(sorted.length * 0.5)));
  }

  function noteToMidi(n) {
    const s = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return (n.octave + 1) * 12 + (s[n.step] || 0) + (n.alter || 0);
  }

  // Generate notes for one measure on one staff
  function genMeasureNotes(pool, prevNote) {
    const notes = [];
    let remaining = measureDuration;
    let prev = prevNote;

    while (remaining > 0) {
      // Filter durations that fit
      const fits = durPool.filter((d) => d[0] <= remaining);
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
        const chordPool = pool.filter((p) => {
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
    if (d >= 16) return "whole";
    if (d >= 8) return "half";
    if (d >= 4) return "quarter";
    if (d >= 2) return "eighth";
    return "16th";
  }

  // Build XML
  const hasTreble = opts.hand === "right" || opts.hand === "both";
  const hasBass = opts.hand === "left" || opts.hand === "both";
  const twoStaves = hasTreble && hasBass;

  const treblePool = hasTreble ? buildPitchPool("G") : [];
  const bassPool = hasBass ? buildPitchPool("F") : [];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml +=
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="3.1">\n';
  xml += '  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>\n';
  xml += '  <part id="P1">\n';

  let prevTreble = null;
  let prevBass = null;

  for (let m = 1; m <= opts.measures; m++) {
    xml += `    <measure number="${m}">\n`;

    // Attributes in first measure
    if (m === 1) {
      xml += "      <attributes>\n";
      xml += `        <divisions>${divisions}</divisions>\n`;
      xml += "        <key><fifths>0</fifths></key>\n";
      xml += `        <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>\n`;
      if (twoStaves) xml += "        <staves>2</staves>\n";
      if (hasTreble) {
        xml += twoStaves
          ? '        <clef number="1"><sign>G</sign><line>2</line></clef>\n'
          : "        <clef><sign>G</sign><line>2</line></clef>\n";
      }
      if (hasBass && twoStaves) {
        xml += '        <clef number="2"><sign>F</sign><line>4</line></clef>\n';
      } else if (hasBass && !hasTreble) {
        xml += "        <clef><sign>F</sign><line>4</line></clef>\n";
      }
      xml += "      </attributes>\n";
    }

    // Treble (voice 1, staff 1)
    if (hasTreble) {
      const res = genMeasureNotes(treblePool, prevTreble);
      prevTreble = res.lastNote;
      res.notes.forEach((n) => {
        if (n.rest) {
          xml += `      <note><rest/><duration>${n.duration}</duration><type>${n.type}</type>`;
          if (twoStaves) xml += "<voice>1</voice><staff>1</staff>";
          xml += "</note>\n";
        } else {
          xml += "      <note>";
          if (n.chord) xml += "<chord/>";
          xml += `<pitch><step>${n.step}</step>`;
          if (n.alter !== 0) xml += `<alter>${n.alter}</alter>`;
          xml += `<octave>${n.octave}</octave></pitch>`;
          xml += `<duration>${n.duration}</duration><type>${n.type}</type>`;
          if (twoStaves) xml += "<voice>1</voice><staff>1</staff>";
          xml += "</note>\n";
        }
      });
    }

    // Bass (voice 2, staff 2) — two staves
    if (hasBass && twoStaves) {
      xml += `      <backup><duration>${measureDuration}</duration></backup>\n`;
      const res = genMeasureNotes(bassPool, prevBass);
      prevBass = res.lastNote;
      res.notes.forEach((n) => {
        if (n.rest) {
          xml += `      <note><rest/><duration>${n.duration}</duration><type>${n.type}</type><voice>2</voice><staff>2</staff></note>\n`;
        } else {
          xml += "      <note>";
          if (n.chord) xml += "<chord/>";
          xml += `<pitch><step>${n.step}</step>`;
          if (n.alter !== 0) xml += `<alter>${n.alter}</alter>`;
          xml += `<octave>${n.octave}</octave></pitch>`;
          xml += `<duration>${n.duration}</duration><type>${n.type}</type>`;
          xml += "<voice>2</voice><staff>2</staff>";
          xml += "</note>\n";
        }
      });
    }

    // Bass only (single staff, no treble)
    if (hasBass && !hasTreble) {
      const res = genMeasureNotes(bassPool, prevBass);
      prevBass = res.lastNote;
      res.notes.forEach((n) => {
        if (n.rest) {
          xml += `      <note><rest/><duration>${n.duration}</duration><type>${n.type}</type></note>\n`;
        } else {
          xml += "      <note>";
          if (n.chord) xml += "<chord/>";
          xml += `<pitch><step>${n.step}</step>`;
          if (n.alter !== 0) xml += `<alter>${n.alter}</alter>`;
          xml += `<octave>${n.octave}</octave></pitch>`;
          xml += `<duration>${n.duration}</duration><type>${n.type}</type>`;
          xml += "</note>\n";
        }
      });
    }

    xml += "    </measure>\n";
  }

  xml += "  </part>\n";
  xml += "</score-partwise>";
  return xml;
}
