// Debug-strip play feedback (✓/✗ + optional "Expected: …"), via lit-html.
// MIDI status lines stay plain textContent — this is only for note feedback.
import { html, render } from './lit-html.js';
import { classMap } from './class-map.js';

const feedback = (ok, label, expected) => html`<span class=${classMap({ 'debug-ok': ok, 'debug-err': !ok })}>${
  ok ? '✓' : '✗'} ${label}</span>${expected != null ? html` | Expected: ${expected}` : ''}`;

// Pass a string for a plain status line (e.g. MIDI messages), or an options
// object { ok, label, expected } for note feedback. Routing every write through
// lit keeps the element lit-managed (a stray textContent= would strip lit's
// markers and break the next render).
export function renderDebug(el, arg) {
  if (typeof arg === 'string') {
    render(arg, el);
    return;
  }
  const { ok, label, expected } = arg || {};
  render(feedback(ok, label, expected), el);
}
