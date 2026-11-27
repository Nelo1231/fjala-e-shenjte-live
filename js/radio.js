/* Radio Ngjallja — radioja e Kishës, drejtpërdrejt (live).
   Kur nis radioja, muzika bizantine ndalet; kur e mbyll radion, muzika rinis vetë. */
(function () {
  "use strict";

  const STREAM = "https://radio.ngjallja.org/radio_ngjallja";
  let audio = null, playing = false, loading = false, retries = 0;
  const listeners = [];

  function ensure() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("playing", () => { playing = true; loading = false; retries = 0; emit(); });
    audio.addEventListener("waiting", () => { loading = true; emit(); });
    audio.addEventListener("error", () => {
      if (!playing && !loading) return;
      // rrjeti u ndërpre: provo sërish disa herë, pastaj kthehu te muzika
      if (retries++ < 3) setTimeout(() => { if (playing || loading) { audio.src = STREAM + "?t=" + Date.now(); audio.play().catch(() => {}); } }, 2000 * retries);
      else stop();
    });
    return audio;
  }

  function play() {
    const a = ensure();
    if (window.AudioDuck) AudioDuck.take("radio"); else if (window.Music) Music.suspend();
    loading = true; playing = true; retries = 0;
    a.src = STREAM + "?t=" + Date.now();       // gjithmonë transmetimi i çastit
    a.play().catch(() => { loading = false; playing = false; emit(); if (window.AudioDuck) AudioDuck.release("radio"); else if (window.Music) Music.resume(); });
    if ("mediaSession" in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: "Radio Ngjallja", artist: "Live", album: "Kisha Orthodhokse Autoqefale e Shqipërisë" });
    }
    emit();
  }

  // silent = true kur e ndal vetë muzika (mos e rinis dy herë)
  function stop(silent) {
    if (audio) { audio.pause(); audio.removeAttribute("src"); try { audio.load(); } catch (e) { /* */ } }
    const was = playing || loading;
    playing = false; loading = false;
    emit();
    if (window.AudioDuck) { if (silent) AudioDuck.drop("radio"); else if (was) AudioDuck.release("radio"); }
    else if (was && !silent && window.Music) Music.resume();
  }

  function toggle() { (playing || loading) ? stop() : play(); }

  function emit() {
    const pill = document.getElementById("radioPill");
    if (pill) {
      pill.hidden = !(playing || loading);
      const t = pill.querySelector(".rp-state");
      if (t) t.textContent = loading && !audio.currentTime ? "Po lidhet…" : "LIVE";
    }
    document.getElementById("musicDisc")?.classList.toggle("radio", playing || loading);
    listeners.forEach((fn) => fn({ playing, loading }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const pill = document.getElementById("radioPill");
    if (pill) pill.addEventListener("click", () => stop());
  });

  window.Radio = {
    play, stop, toggle, STREAM,
    onChange(fn) { listeners.push(fn); },
    get playing() { return playing || loading; },
  };
})();
