/**
 * piano-keyboard.js — Lightweight HTML piano keyboard visualization.
 *
 * Usage:
 *   const kb = new PianoKeyboard(containerEl, { startMidi: 48, endMidi: 84 });
 *   kb.highlightKey(60, '#4CAF50');
 *   kb.clear();
 */
(function () {
  'use strict';
  var BLACK = [1, 3, 6, 8, 10];
  function isBlack(m) { return BLACK.indexOf(m % 12) !== -1; }

  function PianoKeyboard(container, opts) {
    opts = opts || {};
    this.el = typeof container === 'string' ? document.querySelector(container) : container;
    this.lo = opts.startMidi || 48;
    this.hi = opts.endMidi   || 84;
    this.keys = {};
    this._active = [];
    this._render();
  }

  PianoKeyboard.prototype._render = function () {
    this.el.innerHTML = '';
    this.keys = {};
    this._active = [];
    var wrap = document.createElement('div');
    wrap.className = 'pk-wrap';

    // Collect white-key midi numbers
    var whites = [];
    for (var m = this.lo; m <= this.hi; m++) {
      if (!isBlack(m)) whites.push(m);
    }
    var total = whites.length;
    if (!total) return;

    var wIdx = {};
    whites.forEach(function (m, i) { wIdx[m] = i; });

    // White keys (flex layout)
    whites.forEach(function (m) {
      var k = document.createElement('div');
      k.className = 'pk-key pk-w';
      k.dataset.m = m;
      // Add octave label on C keys (midi % 12 === 0)
      if (m % 12 === 0 || m === whites[0] || m === whites[whites.length - 1]) {
        var lbl = document.createElement('span');
        lbl.className = 'pk-label';
        var noteNames = ['C','','D','','E','F','','G','','A','','B'];
        lbl.textContent = noteNames[m % 12] + (Math.floor(m / 12) - 1);
        k.appendChild(lbl);
      }
      wrap.appendChild(k);
      this.keys[m] = k;
    }.bind(this));

    // Black keys (absolute positioned)
    for (var m = this.lo; m <= this.hi; m++) {
      if (!isBlack(m)) continue;
      var lw = m - 1; // left white neighbour
      var idx = wIdx[lw];
      if (idx === undefined) continue;
      var k = document.createElement('div');
      k.className = 'pk-key pk-b';
      k.dataset.m = m;
      k.style.left  = ((idx + 0.65) / total * 100) + '%';
      k.style.width  = (0.7 / total * 100) + '%';
      wrap.appendChild(k);
      this.keys[m] = k;
    }

    this.el.appendChild(wrap);
  };

  PianoKeyboard.prototype.highlightKey = function (midi, color) {
    var k = this.keys[midi];
    if (!k) return;
    k.classList.add('pk-on');
    k.style.setProperty('--pkc', color);
    this._active.push(midi);
  };

  PianoKeyboard.prototype.clear = function () {
    for (var i = 0; i < this._active.length; i++) {
      var k = this.keys[this._active[i]];
      if (k) {
        k.classList.remove('pk-on');
        k.style.removeProperty('--pkc');
      }
    }
    this._active = [];
  };

  PianoKeyboard.prototype.setRange = function (lo, hi) {
    while (isBlack(lo) && lo > 0) lo--;
    while (isBlack(hi) && hi < 127) hi++;
    if (lo === this.lo && hi === this.hi) return;
    this.lo = lo;
    this.hi = hi;
    this._render();
  };

  window.PianoKeyboard = PianoKeyboard;
})();
