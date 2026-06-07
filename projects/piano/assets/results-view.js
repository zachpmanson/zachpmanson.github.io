// Exercise-results popup, rendered via lit-html.
// `t` is the app's translation function; `onClose` closes the modal.
import { html, render } from './lit-html.js';

const results = (stats, t, onClose) => html`
  <h2>${t('trainer.finishTitle')}</h2>
  <div class="stat-row">${t('trainer.finishCorrect')} <b style="color:#2e7d32;">${stats.correctCount}</b></div>
  <div class="stat-row">${t('trainer.finishWrong')} <b style="color:#c62828;">${stats.wrongCount}</b></div>
  <div class="stat-row">${t('trainer.finishAccuracy')} <b>${stats.accuracy}%</b></div>
  <div class="stat-row">${t('trainer.finishTime')} <b>${stats.elapsed} ${t('trainer.sec')}</b></div>
  <button @click=${onClose}>${t('trainer.ok')}</button>`;

export function renderResults(contentEl, stats, t, onClose) {
  render(results(stats, t, onClose), contentEl);
}
