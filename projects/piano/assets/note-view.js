// Current-note display (note name + solfège + duration/hold hints), via lit-html.
// Rendered fresh on every step from the expected-notes array.
import { html, render } from './lit-html.js';
import { styleMap } from './style-map.js';

const HINT = { color: '#bbb', fontSize: '0.72em' };
const SOLFEGE = { color: '#888', fontSize: '0.85em' };
const SUSTAINED = { color: '#1565c0' };
const HOLD = { color: '#42a5f5', fontSize: '0.75em' };
const MATCHED = { color: '#2e7d32' };
const PAUSE = { color: '#999' };

const durationHint = (beats, ms) =>
  html`<span style=${styleMap(HINT)}>${beats}♩ ${ms}ms</span>`;

const solfege = e => html`<span style=${styleMap(SOLFEGE)}>${e.solfege}</span>`;

// One expected note. `showDuration` adds the beats/ms hint (duration & timed
// modes); `showNames` toggles the bold note name (solfège always stays).
const noteEntry = (e, showDuration, showNames, bpm) => {
  const ms = Math.round((e.durationBeats || 1) * 60000 / bpm);
  if (e.sustained) {
    return html`${showNames ? html`<b style=${styleMap(SUSTAINED)}>${e.name}</b> ` : ''}${solfege(e)}
      <span style=${styleMap(HOLD)}>⇑hold</span>${
        showDuration ? html` ${durationHint(+e.durationBeats.toFixed(2), ms)}` : ''}`;
  }
  return html`${showNames ? html`<b>${e.name}</b> ` : ''}${solfege(e)}${
    showDuration ? html` ${durationHint(e.durationBeats, ms)}` : ''}${
    e.matched ? html`<span style=${styleMap(MATCHED)}>✓</span>` : ''}`;
};

// Notes joined by " + " (entity preserved by living in the static template).
const view = (expected, showDuration, showNames, bpm) =>
  html`${expected.map((e, i) =>
    i === 0
      ? noteEntry(e, showDuration, showNames, bpm)
      : html`&nbsp;+&nbsp;${noteEntry(e, showDuration, showNames, bpm)}`)}`;

const pause = label => html`<span style=${styleMap(PAUSE)}>${label}</span>`;

// `ctx`: { bpm, showDuration, showNames, t }. Empty `expected` renders the pause label.
export function renderNoteDisplay(el, expected, ctx) {
  if (!expected.length) {
    render(pause(ctx.t('trainer.pause')), el);
    return;
  }
  render(view(expected, ctx.showDuration, ctx.showNames, ctx.bpm), el);
}

// Plain status text (start/done/reading prompts). Routed through lit so the
// element stays lit-managed and a later renderNoteDisplay won't hit stale markers.
export function renderNoteText(el, text) {
  render(text, el);
}
