// MIDI device discovery and connection. Tries WebMidi.js first (loaded as a
// global), falling back to the native Web MIDI API (e.g. WebMidiBrowser on
// iPad). Note events are forwarded to the caller via { onNoteOn, onNoteOff };
// the module owns the device/poll state and updates the MIDI status chip.
//
// Uses the global `t` (i18n) and `WebMidi`, same as the rest of the app.
import { renderDebug } from "./debug-view.js";

export function setupMidi({ onNoteOn, onNoteOff }) {
  const debugStrip = document.getElementById("debug-strip");
  const midiChip = document.getElementById("midi-chip");
  const midiLabel = document.getElementById("midi-label");
  let midiInput = null;
  let midiPollTimer = null;

  debugStrip.dataset.midiInit = "1";
  renderDebug(debugStrip, "MIDI: init...");

  // On browsers with native requestMIDIAccess but where WebMidi.js may not work
  // (e.g. WebMidiBrowser on iPad), try native first if WebMidi.js enable doesn't
  // resolve quickly.
  if (typeof WebMidi !== "undefined") {
    renderDebug(debugStrip, "MIDI: WebMidi.js found, enabling...");
    var settled = false;
    var timer = setTimeout(function () {
      if (!settled) {
        settled = true;
        renderDebug(debugStrip, "MIDI: WebMidi.js timeout, trying native...");
        setupMidiNative();
      }
    }, 3000);

    WebMidi.enable()
      .then(() => {
        if (settled) return; // native already took over
        settled = true;
        clearTimeout(timer);
        renderDebug(debugStrip, "MIDI: enabled, inputs=" + WebMidi.inputs.length);
        function connectInput(input) {
          midiInput = input;
          midiLabel.textContent = input.name.length > 16 ? input.name.slice(0, 16) + "…" : input.name;
          midiChip.className = "midi-chip ok";
          renderDebug(debugStrip, "MIDI: connected " + input.name);
          if (midiPollTimer) {
            clearInterval(midiPollTimer);
            midiPollTimer = null;
          }
          input.removeListener();
          input.addListener("noteon", (e) => {
            if (e.rawAttack === 0 || e.note.attack === 0) {
              onNoteOff(e.note.number);
              return;
            }
            onNoteOn(e.note.number);
          });
          input.addListener("noteoff", (e) => {
            onNoteOff(e.note.number);
          });
        }

        if (WebMidi.inputs.length > 0) {
          connectInput(WebMidi.inputs[0]);
        } else {
          midiLabel.textContent = t("trainer.midiNone");
          midiChip.className = "midi-chip no";
          // Poll for late-appearing devices (Android, Bluetooth MIDI)
          midiPollTimer = setInterval(() => {
            if (WebMidi.inputs.length > 0 && !midiInput) {
              connectInput(WebMidi.inputs[0]);
            }
          }, 2000);
        }

        WebMidi.addListener("connected", () => {
          if (WebMidi.inputs.length > 0 && !midiInput) connectInput(WebMidi.inputs[0]);
        });
        WebMidi.addListener("disconnected", () => {
          if (WebMidi.inputs.length === 0) {
            midiInput = null;
            midiLabel.textContent = t("trainer.midiNone");
            midiChip.className = "midi-chip no";
            // Resume polling
            if (!midiPollTimer) {
              midiPollTimer = setInterval(() => {
                if (WebMidi.inputs.length > 0 && !midiInput) {
                  connectInput(WebMidi.inputs[0]);
                }
              }, 2000);
            }
          }
        });
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.warn("WebMidi.js enable failed, trying native API:", err);
        renderDebug(debugStrip, "MIDI: WebMidi.js failed, trying native...");
        setupMidiNative();
      });
    return;
  }

  setupMidiNative();

  function setupMidiNative() {
    // Fallback: native Web MIDI API (WebMidiBrowser on iPad, etc.)
    if (navigator.requestMIDIAccess) {
      renderDebug(debugStrip, "MIDI: native API fallback...");
      navigator
        .requestMIDIAccess({ sysex: false })
        .then(function (access) {
          var nativeInputs = [];
          var it0 = access.inputs.values();
          for (var o0 = it0.next(); !o0.done; o0 = it0.next()) nativeInputs.push(o0.value);
          renderDebug(
            debugStrip,
            "MIDI native: OK, inputs=" +
              nativeInputs.length +
              " [" +
              nativeInputs
                .map(function (i) {
                  return i.name;
                })
                .join(", ") +
              "]",
          );

          function isVirtualSession(port) {
            return /^Session\s*\d*$/i.test(port.name);
          }

          // Prefer a real hardware device over virtual iOS "Session" ports
          var preferredInput = null;
          for (var i = 0; i < nativeInputs.length; i++) {
            if (!isVirtualSession(nativeInputs[i])) {
              preferredInput = nativeInputs[i];
              break;
            }
          }

          function connectNativeInput(port) {
            midiInput = port;
            midiLabel.textContent = port.name.length > 16 ? port.name.slice(0, 16) + "…" : port.name;
            midiChip.className = "midi-chip ok";
            renderDebug(debugStrip, "MIDI native: connected " + port.name);
            port.onmidimessage = function (event) {
              var data = event.data;
              var cmd = data[0] & 0xf0;
              var note = data[1];
              var velocity = data.length > 2 ? data[2] : 0;
              if (cmd === 0x90 && velocity > 0) {
                onNoteOn(note);
              } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
                onNoteOff(note);
              }
            };
          }

          if (preferredInput) {
            connectNativeInput(preferredInput);
          } else {
            // Only Session ports or no ports — wait for real device via onstatechange
            midiLabel.textContent = t("trainer.midiNone");
            midiChip.className = "midi-chip no";
            renderDebug(debugStrip, "MIDI native: waiting for real device...");
          }

          access.onstatechange = function (event) {
            var port = event.port;
            // Always prefer a real device; upgrade from Session if needed
            if (port.type === "input" && port.state === "connected") {
              if (!isVirtualSession(port)) {
                connectNativeInput(port);
              } else if (!midiInput) {
                // No device at all — connect Session as last resort
                connectNativeInput(port);
              }
            } else if (port.type === "input" && port.state === "disconnected") {
              var remaining = [];
              var it = access.inputs.values();
              for (var o = it.next(); !o.done; o = it.next()) remaining.push(o.value);
              if (remaining.length === 0) {
                midiInput = null;
                midiLabel.textContent = t("trainer.midiNone");
                midiChip.className = "midi-chip no";
              }
            }
          };
        })
        .catch(function (err) {
          midiLabel.textContent = t("trainer.midiErr");
          renderDebug(debugStrip, "Native MIDI err: " + err.message);
          console.error("Native MIDI error:", err);
        });
      return;
    }

    midiLabel.textContent = t("trainer.midiNo");
    renderDebug(debugStrip, "MIDI: no API available");
  }
}
