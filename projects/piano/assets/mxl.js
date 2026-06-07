// MusicXML helpers: unzip compressed .mxl archives and patch raw MusicXML so
// OpenSheetMusicDisplay can render it without throwing on missing elements.
// Relies on the global JSZip (loaded via classic <script> before the app module).

export async function extractMxl(arrayBuffer) {
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

export function fixMusicXml(xml) {
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
