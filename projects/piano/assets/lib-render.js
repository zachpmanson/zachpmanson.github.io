// Library modal rendering via lit-html.
import { html, render } from './lit-html.js';
import { getLibraryItemPath } from './library.js';

const entryLabel = item => {
  const title = item.title || getLibraryItemPath(item);
  return item.composer ? `${title} — ${item.composer}` : title;
};

const entry = (item, onSelect) => html`
  <div class="lib-entry" @click=${() => onSelect(item)}>${entryLabel(item)}</div>`;

const view = (groups, onSelect) => html`${groups.map((group, i) =>
  group.title
    ? html`
        <details class="lib-folder" ?open=${i === 0}>
          <summary>${group.title} (${group.files.length})</summary>
          ${group.files.map(item => entry(item, onSelect))}
        </details>`
    : group.files.map(item => entry(item, onSelect))
)}`;

const message = (text, color) => html`<div style="color:${color};padding:10px 0;">${text}</div>`;

// All states render through lit-html so the container stays lit-managed
// (lit updates in place; mixing innerHTML would leave stale siblings behind).
export function renderLibraryMessage(listEl, text, color = '#888') {
  render(message(text, color), listEl);
}

export function renderLibrary(listEl, groups, onSelect) {
  render(view(groups, onSelect), listEl);
}
