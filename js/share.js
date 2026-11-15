/* Krijuesi i imazheve dhe videove për Post / Story (Instagram, WhatsApp, Messenger, Facebook…).
   Gjithçka vizatohet në <canvas>, pa shërbime të jashtme. */
(function () {
  "use strict";

  const FORMATS = {
    post:   { w: 1080, h: 1350, label: "post" },
    square: { w: 1080, h: 1080, label: "katror" },
    story:  { w: 1080, h: 1920, label: "story" },
  };

  /* ---------- Sfondet ---------- */
  function noise(ctx, w, h, alpha) {
    const n = document.createElement("canvas");
    n.width = n.height = 256;
    const c = n.getContext("2d");
    const img = c.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255 * alpha;
    }
    c.putImageData(img, 0, 0);
    ctx.fillStyle = ctx.createPattern(n, "repeat");
    ctx.fillRect(0, 0, w, h);
  }

  function frame(ctx, w, h, color, inset) {
    const m = inset || 46;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(m + 14, m + 14, w - 2 * m - 28, h - 2 * m - 28);
    // romb në qoshe
    ctx.fillStyle = color;
    for (const [x, y] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) {
      ctx.beginPath();
      ctx.moveTo(x, y - 12); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 12); ctx.lineTo(x - 12, y); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Kryqi me tri gjethe dhe IC XC (js/cross.js), si imazh SVG në ngjyrën e kërkuar
  const crossCache = {};
  function crossImg(color) {
    if (!crossCache[color] && window.crossSVG) {
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(window.crossSVG(color, "c" + Object.keys(crossCache).length));
      crossCache[color] = img;
    }
    return crossCache[color];
  }
  function cross(ctx, cx, cy, s, color) {
    const img = crossImg(color);
    if (!img || !img.complete || !img.naturalWidth) return;
    const h = s * 1.55, w = h * 348 / 448;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }

  function ornamentLine(ctx, cx, y, width, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - width / 2, y); ctx.lineTo(cx - 18, y); ctx.moveTo(cx + 18, y); ctx.lineTo(cx + width / 2, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, y - 9); ctx.lineTo(cx + 9, y); ctx.lineTo(cx, y + 9); ctx.lineTo(cx - 9, y); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  const BACKGROUNDS = [
    {
      id: "purpur", name: "Purpur dhe ar", ink: "#f8ead0", accent: "#e2bd62", sub: "#e9d3a8",
      paint(ctx, w, h) {
        const g = ctx.createRadialGradient(w / 2, h * 0.3, 40, w / 2, h * 0.45, Math.max(w, h) * 0.85);
        g.addColorStop(0, "#9b2222"); g.addColorStop(0.5, "#5c0f10"); g.addColorStop(1, "#1f0505");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        noise(ctx, w, h, 0.05);
        frame(ctx, w, h, "rgba(226,189,98,.85)");
      },
    },
    {
      id: "ari", name: "Ar ikone", ink: "#3a1606", accent: "#7a1616", sub: "#5a2a10",
      paint(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#f3d98b"); g.addColorStop(0.35, "#c99a3a"); g.addColorStop(0.6, "#ecc970"); g.addColorStop(1, "#a87a22");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // shkëlqim si fletë ari
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = i % 2 ? "#fff3c4" : "#8a5d12";
          const s = 120 + Math.random() * 220;
          ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
        }
        ctx.globalAlpha = 1;
        noise(ctx, w, h, 0.06);
        frame(ctx, w, h, "rgba(122,22,22,.85)");
      },
    },
    {
      id: "pergamene", name: "Pergamenë", ink: "#2b1a10", accent: "#8a1a1a", sub: "#6b4a30",
      paint(ctx, w, h) {
        const g = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.75);
        g.addColorStop(0, "#fbf3e1"); g.addColorStop(0.7, "#efdfbd"); g.addColorStop(1, "#c9ad7c");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        noise(ctx, w, h, 0.07);
        frame(ctx, w, h, "rgba(138,26,26,.75)");
      },
    },
    {
      id: "nata", name: "Nata e yjeve", ink: "#f4ecd8", accent: "#e2bd62", sub: "#c9bfa6",
      paint(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "#0b1430"); g.addColorStop(0.6, "#14244f"); g.addColorStop(1, "#2a1a3c");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) {
          ctx.fillStyle = `rgba(255,${230 + Math.random() * 25},${180 + Math.random() * 60},${Math.random() * 0.8})`;
          const r = Math.random() * 2.4;
          ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2); ctx.fill();
        }
        frame(ctx, w, h, "rgba(226,189,98,.7)");
      },
    },
    {
      id: "mermer", name: "Mermer", ink: "#2a2420", accent: "#7a1616", sub: "#6a5d52",
      paint(ctx, w, h) {
        ctx.fillStyle = "#f2efea"; ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.16; ctx.strokeStyle = "#8f8478";
        for (let i = 0; i < 14; i++) {
          ctx.lineWidth = 1 + Math.random() * 3;
          ctx.beginPath();
          let x = Math.random() * w, y = 0;
          ctx.moveTo(x, y);
          while (y < h) { x += (Math.random() - 0.5) * 120; y += 60 + Math.random() * 80; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        frame(ctx, w, h, "rgba(181,138,46,.9)");
      },
    },
  ];

  /* ---------- Teksti ---------- */
  function wrap(ctx, text, maxW) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function fitText(ctx, text, maxW, maxH, family, startSize) {
    let size = startSize;
    let lines;
    for (; size > 26; size -= 2) {
      ctx.font = `${size}px ${family}`;
      lines = wrap(ctx, text, maxW);
      if (lines.length * size * 1.38 <= maxH) break;
    }
    return { size, lines };
  }

  /* Vizatimi kryesor. t = 0..1 për animacionin e videos (1 = imazh statik) */
  function render(canvas, item, opts, t) {
    const fmt = FORMATS[opts.format];
    const w = fmt.w, h = fmt.h;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext("2d");
    const bg = opts.background;
    const time = t == null ? 1 : t;

    // sfondi (i ruajtur në cache, me zmadhim të ngadaltë për videon)
    const cache = bgCache(bg, w, h, opts.photo);
    ctx.save();
    const zoom = 1 + 0.06 * time;
    ctx.translate(w / 2, h / 2); ctx.scale(zoom, zoom); ctx.translate(-w / 2, -h / 2);
    ctx.drawImage(cache, 0, 0);
    ctx.restore();

    const ink = opts.photo ? "#fffaf0" : bg.ink;
    const accent = opts.photo ? "#f1cc72" : bg.accent;
    const sub = opts.photo ? "#f0e2c4" : bg.sub;
    const fam = '"EB Garamond", "Palatino Linotype", Georgia, serif';
    const famCap = '"Cinzel", "EB Garamond", Georgia, serif';

    const pad = 130;
    const topY = opts.format === "story" ? 330 : 190;
    const bottomY = h - (opts.format === "story" ? 360 : 200);

    // kryqi
    const a0 = ease(clamp(time * 3));
    ctx.globalAlpha = a0;
    cross(ctx, w / 2, topY - 40, 92, accent);
    ctx.globalAlpha = 1;

    // teksti
    const quote = "“" + item.text + "”";
    const area = bottomY - topY - 160;
    const { size, lines } = fitText(ctx, quote, w - pad * 2, area, fam, opts.format === "story" ? 74 : 66);
    ctx.font = `${size}px ${fam}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lh = size * 1.38;
    const blockH = lines.length * lh;
    let y = topY + 40 + (area - blockH) / 2 + lh / 2;
    lines.forEach((ln, i) => {
      const appear = clamp((time - 0.12 - (i / lines.length) * 0.5) * 4);
      ctx.globalAlpha = ease(appear);
      ctx.fillStyle = ink;
      if (opts.photo) { ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 18; }
      ctx.fillText(ln, w / 2, y + (1 - ease(appear)) * 18);
      ctx.shadowBlur = 0;
      y += lh;
    });

    // referenca
    const aRef = ease(clamp((time - 0.65) * 4));
    ctx.globalAlpha = aRef;
    ornamentLine(ctx, w / 2, y + 30, 260, accent);
    ctx.font = `600 ${Math.round(size * 0.62)}px ${famCap}`;
    ctx.fillStyle = accent;
    ctx.fillText(item.ref.toUpperCase(), w / 2, y + 30 + size * 0.95);
    if (item.source) {
      ctx.font = `italic ${Math.round(size * 0.48)}px ${fam}`;
      ctx.fillStyle = sub;
      ctx.fillText(item.source, w / 2, y + 30 + size * 1.65);
    }

    // shenja e aplikacionit
    ctx.globalAlpha = 0.85 * a0;
    ctx.font = `500 30px ${famCap}`;
    ctx.fillStyle = sub;
    ctx.fillText("FJALA E SHENJTË", w / 2, h - (opts.format === "story" ? 200 : 100));
    ctx.globalAlpha = 1;
  }

  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => 1 - Math.pow(1 - v, 3);

  let _cacheKey = "", _cacheCanvas = null;
  function bgCache(bg, w, h, photo) {
    const key = bg.id + w + "x" + h + (photo ? photo.src : "");
    if (key === _cacheKey && _cacheCanvas) return _cacheCanvas;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (photo) {
      const s = Math.max(w / photo.width, h / photo.height);
      const pw = photo.width * s, ph = photo.height * s;
      ctx.drawImage(photo, (w - pw) / 2, (h - ph) / 2, pw, ph);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(10,4,2,.45)"); g.addColorStop(0.5, "rgba(10,4,2,.62)"); g.addColorStop(1, "rgba(10,4,2,.75)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      frame(ctx, w, h, "rgba(241,204,114,.8)");
    } else {
      bg.paint(ctx, w, h);
    }
    _cacheKey = key; _cacheCanvas = c;
    return c;
  }

  /* ---------- Ison bizantin (Web Audio): nota e mbajtur e korit ---------- */
  function makeIson(actx, dest, seconds) {
    const master = actx.createGain();
    master.gain.setValueAtTime(0, actx.currentTime);
    master.gain.linearRampToValueAtTime(0.32, actx.currentTime + 1.5);
    master.gain.setValueAtTime(0.32, actx.currentTime + seconds - 1.8);
    master.gain.linearRampToValueAtTime(0, actx.currentTime + seconds);
    const filter = actx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.7;
    master.connect(filter); filter.connect(dest);
    const base = 110; // Pa (Re) në oktavën e ulët — ison mashkullor
    const voices = [
      [base, 0.5, "sawtooth"], [base * 1.003, 0.35, "sawtooth"], [base * 0.997, 0.35, "triangle"],
      [base * 2, 0.12, "sine"], [base * 1.5, 0.05, "sine"],
    ];
    const oscs = voices.map(([f, g, type]) => {
      const o = actx.createOscillator(); const gn = actx.createGain();
      o.type = type; o.frequency.value = f; gn.gain.value = g;
      const lfo = actx.createOscillator(); const lg = actx.createGain();
      lfo.frequency.value = 0.15 + Math.random() * 0.2; lg.gain.value = 0.6;
      lfo.connect(lg); lg.connect(o.detune); lfo.start();
      o.connect(gn); gn.connect(master); o.start();
      return [o, lfo];
    });
    return () => oscs.forEach(([o, l]) => { try { o.stop(); l.stop(); } catch (e) { /* */ } });
  }

  /* ---------- Regjistrimi i videos ---------- */
  function pickMime() {
    const list = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    if (!window.MediaRecorder) return null;
    return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
  }

  async function recordVideo(canvas, item, opts, onProgress) {
    const mime = pickMime();
    if (mime === null) throw new Error("Ky shfletues nuk mund të regjistrojë video.");
    const seconds = 10;
    const stream = canvas.captureStream(30);
    let stopIson = null, actx = null;
    if (opts.ison) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      await actx.resume();
      const dest = actx.createMediaStreamDestination();
      stopIson = makeIson(actx, dest, seconds);
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((res) => (rec.onstop = res));
    rec.start(250);
    const start = performance.now();
    await new Promise((resolve) => {
      function tick(now) {
        const p = (now - start) / (seconds * 1000);
        render(canvas, item, opts, Math.min(1, p / 0.6));
        onProgress && onProgress(Math.min(1, p));
        if (p < 1) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
    rec.stop();
    await done;
    stopIson && stopIson();
    actx && actx.close();
    const type = (rec.mimeType || mime || "video/webm").split(";")[0];
    return new Blob(chunks, { type });
  }

  function canvasBlob(canvas) {
    return new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.93));
  }

  // Në aplikacionin Android (APK) shpërndarja dhe ruajtja bëhen nga Android-i
  const android = window.FSAndroid;
  function toBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function shareBlob(blob, item, filenameBase) {
    const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("webm") ? "webm" : "jpg";
    const text = `“${item.text}”\n— ${item.ref}`;
    if (android) {
      android.shareFile(await toBase64(blob), blob.type, `${filenameBase}.${ext}`, text);
      return "shared";
    }
    const file = new File([blob], `${filenameBase}.${ext}`, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: item.ref, text });
      return "shared";
    }
    download(blob, file.name);
    return "downloaded";
  }

  function download(blob, name) {
    if (android) { toBase64(blob).then((b) => android.saveFile(b, blob.type, name)); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  // ngarko kryqet paraprakisht, që të jenë gati në imazhin e parë
  BACKGROUNDS.forEach((b) => crossImg(b.accent));
  ["#f1cc72", "#7a1c16", "#f3dfb0"].forEach(crossImg);

  window.Share = { FORMATS, BACKGROUNDS, render, recordVideo, canvasBlob, shareBlob, download, pickMime, cross };
})();
