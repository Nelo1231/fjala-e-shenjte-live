/* Gjeografia e Shenjtë — globi 3D (si Google Earth) dhe Shqipëria 3D me reliev.
   WebGL i pastër, pa librari: punon edhe pa internet (APK). */
(function () {
  "use strict";
  const D2R = Math.PI / 180;
  const live = new Set();

  // ---------------- matematika ----------------
  const M = {
    persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]; },
    look(e, c, u) {
      let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
      let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
      const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
    },
    mul(a, b) { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; },
    proj(m, x, y, z, W, H) {
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (cw <= 0.0001) return null;
      return [(cx / cw + 1) / 2 * W, (1 - cy / cw) / 2 * H, cw];
    },
  };
  const mercX = (lon) => (lon + 180) / 360;
  const mercY = (lat) => { const s = Math.sin(lat * D2R); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };

  // ---------------- WebGL ----------------
  function makeGL(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: false }) ||
               canvas.getContext("experimental-webgl");
    if (!gl) return null;
    gl.getExtension("OES_element_index_uint");
    return gl;
  }
  function program(gl, vs, fs) {
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, a = {};
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < nu; i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); for (let i = 0; i < na; i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
    return { p, u, a };
  }
  function buf(gl, data, target) { const b = gl.createBuffer(); gl.bindBuffer(target || gl.ARRAY_BUFFER, b); gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
  function attr(gl, prg, name, b, size) { const l = prg.a[name]; if (l === undefined || l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); }
  const pot = (n) => (n & (n - 1)) === 0;
  function texFrom(gl, src, unit) {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + (unit || 0)); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
    const w = src.width, h = src.height;
    if (pot(w) && pot(h)) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); }
    else { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const af = gl.getExtension("EXT_texture_filter_anisotropic"); if (af) gl.texParameterf(gl.TEXTURE_2D, af.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(af.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  }
  function loadImg(url) { return new Promise((res, rej) => { const i = new Image(); i.decoding = "async"; i.onload = () => res(i); i.onerror = () => rej(new Error(url)); i.src = url; }); }
  // tekstura me madhësi të sigurt për telefonat (maks. 4096) dhe POT kur kërkohet (mipmaps → më e qartë kur largohesh)
  function fit(img, max, forcePot) {
    let w = img.width, h = img.height; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
    if (forcePot) { w = 1 << Math.round(Math.log2(w)); h = 1 << Math.round(Math.log2(h)); w = Math.min(w, max); h = Math.min(h, max); }
    if (w === img.width && h === img.height) return img;
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); return c;
  }

  // ---------------- gjestet (gisht, dy gishta, mi) ----------------
  function gestures(el, h) {
    const pts = new Map(); let last = null, moved = 0, downT = 0, lastTap = 0;
    const st = () => { const a = [...pts.values()]; if (a.length === 1) return { n: 1, x: a[0].x, y: a[0].y }; const [p, q] = a; return { n: 2, x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, d: Math.hypot(p.x - q.x, p.y - q.y), ang: Math.atan2(q.y - p.y, q.x - p.x) }; };
    el.addEventListener("pointerdown", (e) => { if (e.target.closest(".hm-pin, .hm-ui")) return; el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, alt: e.ctrlKey || e.shiftKey }); last = st(); moved = 0; downT = Date.now(); h.start && h.start(); });
    el.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId); p.x = e.clientX; p.y = e.clientY;
      const s = st(); if (!last || s.n !== last.n) { last = s; return; }
      const dx = s.x - last.x, dy = s.y - last.y; moved += Math.abs(dx) + Math.abs(dy);
      if (s.n === 1) { if (p.b === 2 || p.alt) h.rotate(dx, dy); else h.pan(dx, dy); }
      else { h.zoom(s.d / last.d, s.x, s.y); let da = s.ang - last.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; h.rotate(-da * 180, dy); }
      last = s;
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); last = pts.size ? st() : null;
      if (!pts.size) {
        h.end && h.end();
        if (moved < 8 && Date.now() - downT < 350) { const r = el.getBoundingClientRect(); if (Date.now() - lastTap < 320) { h.dbl && h.dbl(e.clientX - r.left, e.clientY - r.top); lastTap = 0; } else lastTap = Date.now(); }
      }
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("wheel", (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); h.zoom(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  }

  // ---------------- etiketat pa mbivendosje ----------------
  function placeLabels(layer, items, W, H, budget) {
    // items: {el, x, y, pr, w, h, show}; më i rëndësishmi i pari
    items.sort((a, b) => a.pr - b.pr);
    const boxes = []; let n = 0;
    for (const it of items) {
      const vis = it.x > -40 && it.x < W + 40 && it.y > -20 && it.y < H + 20;
      it.el.style.transform = `translate3d(${it.x.toFixed(1)}px,${it.y.toFixed(1)}px,0)`;
      if (!vis) { it.el.hidden = true; continue; }
      it.el.hidden = false;
      const lw = it.lw || 90, lh = 18, bx = [it.x + 8, it.y - lh / 2, it.x + 8 + lw, it.y + lh / 2];
      const free = n < budget && !boxes.some((b) => !(bx[2] < b[0] || bx[0] > b[2] || bx[3] < b[1] || bx[1] > b[3]));
      it.el.classList.toggle("nolbl", !free);
      if (free) { boxes.push(bx); n++; }
    }
  }

  // =====================================================================
  //  GLOBI
  // =====================================================================
  const GLOBE_VS = `attribute vec3 p; attribute vec2 t; uniform mat4 mvp; varying vec2 vt; varying vec3 vn;
    void main(){ vt=t; vn=p; gl_Position=mvp*vec4(p,1.0); }`;
  const GLOBE_FS = `precision mediump float; varying vec2 vt; varying vec3 vn; uniform sampler2D base; uniform sampler2D reg; uniform vec4 rb; uniform float hasReg; uniform float regMix; uniform vec3 eye; uniform vec3 sun;
    void main(){
      vec3 c=texture2D(base,vt).rgb;
      if(hasReg>0.5){ vec2 r=(vt-rb.xy)/(rb.zw-rb.xy);
        if(r.x>0.0&&r.x<1.0&&r.y>0.0&&r.y<1.0){ float e=min(min(r.x,1.0-r.x),min(r.y,1.0-r.y)); c=mix(c,texture2D(reg,r).rgb,smoothstep(0.0,0.04,e)*regMix); } }
      vec3 n=normalize(vn); vec3 v=normalize(eye-n);
      float dif=max(dot(n,normalize(sun)),0.0);
      c*=0.42+0.78*dif;
      float rim=pow(1.0-max(dot(n,v),0.0),3.0);
      c=mix(c,vec3(0.45,0.68,1.0),rim*0.55);
      gl_FragColor=vec4(c,1.0);
    }`;
  const ATM_VS = `attribute vec3 p; uniform mat4 mvp; varying vec3 vn; void main(){ vn=p; gl_Position=mvp*vec4(p*1.07,1.0); }`;
  const ATM_FS = `precision mediump float; varying vec3 vn; uniform vec3 eye;
    void main(){ vec3 n=normalize(vn); vec3 v=normalize(eye); float d=dot(n,v); float a=pow(clamp(0.25-d*1.0+0.15,0.0,1.0),2.2)*2.2; gl_FragColor=vec4(0.35,0.62,1.0,a*0.75); }`;
  const LINE_VS = `attribute vec3 p; uniform mat4 mvp; void main(){ gl_Position=mvp*vec4(p,1.0); }`;
  const LINE_FS = `precision mediump float; uniform vec4 col; void main(){ gl_FragColor=col; }`;

  function sph(lat, lon, r) { const a = lat * D2R, b = lon * D2R; return [r * Math.cos(a) * Math.sin(b), r * Math.sin(a), r * Math.cos(a) * Math.cos(b)]; }

  function globe(el, opt) {
    el.classList.add("hm-host");
    el.innerHTML = `<canvas class="hm-stars"></canvas><canvas class="hm-gl"></canvas><div class="hm-pins"></div><div class="hm-load">Po hapet globi…</div>`;
    const cv = el.querySelector(".hm-gl"), pinsEl = el.querySelector(".hm-pins");
    const gl = makeGL(cv);
    if (!gl) { el.querySelector(".hm-load").textContent = "Pajisja nuk e mbështet WebGL."; return { destroy() {} }; }
    const G = { lat: opt.lat ?? 38, lon: opt.lon ?? 25, dist: opt.dist ?? 2.6, vlat: 0, vlon: 0, spin: true, dirty: true, anim: null, alive: true };
    // sfera
    const SEG = 128, RING = 64, P = [], T = [], I = [];
    for (let j = 0; j <= RING; j++) { const lat = 90 - j * 180 / RING; for (let i = 0; i <= SEG; i++) { const lon = -180 + i * 360 / SEG; P.push(...sph(lat, lon, 1)); T.push(i / SEG, j / RING); } }
    for (let j = 0; j < RING; j++) for (let i = 0; i < SEG; i++) { const a = j * (SEG + 1) + i, b = a + SEG + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const bP = buf(gl, new Float32Array(P)), bT = buf(gl, new Float32Array(T)), bI = buf(gl, new Uint32Array(I), gl.ELEMENT_ARRAY_BUFFER);
    const pg = program(gl, GLOBE_VS, GLOBE_FS), pa = program(gl, ATM_VS, ATM_FS), pl = program(gl, LINE_VS, LINE_FS);
    // kufijtë
    const lines = [], gold = [];
    for (const r of (opt.borders || [])) for (let k = 0; k + 3 < r.length; k += 2) lines.push(...sph(r[k + 1], r[k], 1.0008), ...sph(r[k + 3], r[k + 2], 1.0008));
    for (const r of (opt.goldBorder || [])) for (let k = 0; k + 3 < r.length; k += 2) gold.push(...sph(r[k + 1], r[k], 1.0012), ...sph(r[k + 3], r[k + 2], 1.0012));
    const bL = lines.length ? buf(gl, new Float32Array(lines)) : null, bG = gold.length ? buf(gl, new Float32Array(gold)) : null;
    let texBase = null, texReg = null;
    const reg = opt.region;
    Promise.all([loadImg(opt.base).then((im) => { texBase = texFrom(gl, fit(im, 4096, true), 0); }),
                 reg ? loadImg(opt.regionImg).then((im) => { texReg = texFrom(gl, fit(im, 4096, false), 1); }).catch(() => {}) : null])
      .then(() => { el.querySelector(".hm-load")?.remove(); G.dirty = true; })
      .catch(() => { el.querySelector(".hm-load").textContent = "Imazhi i globit mungon."; });
    // yjet
    const stars = () => { const c = el.querySelector(".hm-stars"), w = c.width = el.clientWidth, h = c.height = el.clientHeight, x = c.getContext("2d"); x.fillStyle = "#03060f"; x.fillRect(0, 0, w, h); let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < (w * h) / 900; i++) { x.globalAlpha = 0.25 + rnd() * 0.75; x.fillStyle = "#fff"; x.fillRect(rnd() * w, rnd() * h, rnd() < 0.08 ? 1.6 : 0.9, rnd() < 0.08 ? 1.6 : 0.9); } };
    // pikat
    let pins = [];
    function setPins(list) {
      pinsEl.innerHTML = ""; pins = list.map((p) => {
        const d = document.createElement("button"); d.type = "button"; d.className = "hm-pin" + (p.hot ? " hot" : "") + (p.al ? " al" : "");
        d.innerHTML = `<i></i><span><b>${p.label}</b></span>`;
        d.addEventListener("click", (e) => { e.stopPropagation(); opt.onPick && opt.onPick(p); });
        pinsEl.appendChild(d);
        return { p, el: d, pos: sph(p.lat, p.lon, 1.002), pr: p.hot ? 0 : p.pr ?? 5, lw: 0 };
      });
      requestAnimationFrame(() => pins.forEach((q) => { q.lw = q.el.querySelector("span").offsetWidth || 90; }));
      G.dirty = true;
    }
    function resize() { const r = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(el.clientWidth * r); cv.height = Math.round(el.clientHeight * r); stars(); G.dirty = true; }
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    let mvp = null, eye = [0, 0, 3];
    function frame() {
      if (!G.alive) return;
      if (G.anim) { const a = G.anim, t = Math.min(1, (performance.now() - a.t0) / a.ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; let dl = a.lon1 - a.lon0; if (dl > 180) dl -= 360; if (dl < -180) dl += 360; G.lat = a.lat0 + (a.lat1 - a.lat0) * e; G.lon = a.lon0 + dl * e; G.dist = a.d0 + (a.d1 - a.d0) * e - Math.sin(Math.PI * e) * (a.hop || 0); if (t >= 1) G.anim = null; G.dirty = true; }
      else if (G.spin) { G.lon += 0.03; G.dirty = true; }
      else if (Math.abs(G.vlat) + Math.abs(G.vlon) > 0.002) { G.lat += G.vlat; G.lon += G.vlon; G.vlat *= 0.92; G.vlon *= 0.92; G.dirty = true; }
      if (G.dirty && texBase) { G.dirty = false; draw(); }
      requestAnimationFrame(frame);
    }
    function draw() {
      G.lat = Math.max(-80, Math.min(80, G.lat)); G.lon = ((G.lon + 540) % 360) - 180; G.dist = Math.max(1.035, Math.min(5, G.dist));
      const W = cv.width, H = cv.height; gl.viewport(0, 0, W, H);
      eye = sph(G.lat, G.lon, G.dist);
      mvp = M.mul(M.persp(40 * D2R, W / H, 0.01, 20), M.look(eye, [0, 0, 0], [0, 1, 0]));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND);
      gl.useProgram(pg.p); attr(gl, pg, "p", bP, 3); attr(gl, pg, "t", bT, 2);
      gl.uniformMatrix4fv(pg.u.mvp, false, mvp); gl.uniform3fv(pg.u.eye, eye);
      const sunv = sph(G.lat + 18, G.lon - 25, 1); gl.uniform3fv(pg.u.sun, sunv);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texBase); gl.uniform1i(pg.u.base, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texReg || texBase); gl.uniform1i(pg.u.reg, 1);
      gl.uniform1f(pg.u.hasReg, texReg && reg ? 1 : 0); gl.uniform1f(pg.u.regMix, Math.max(0, Math.min(1, (2.5 - G.dist) / 0.7)));
      if (reg) gl.uniform4f(pg.u.rb, (reg.lon0 + 180) / 360, (90 - reg.lat1) / 180, (reg.lon1 + 180) / 360, (90 - reg.lat0) / 180);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bI); gl.drawElements(gl.TRIANGLES, I.length, gl.UNSIGNED_INT, 0);
      // kufijtë
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pl.p); gl.uniformMatrix4fv(pl.u.mvp, false, mvp);
      if (bL && G.dist < 3.2) { attr(gl, pl, "p", bL, 3); gl.uniform4f(pl.u.col, 1, 1, 1, Math.min(0.38, (3.2 - G.dist) * 0.3)); gl.drawArrays(gl.LINES, 0, lines.length / 3); }
      if (bG) { attr(gl, pl, "p", bG, 3); gl.uniform4f(pl.u.col, 0.95, 0.78, 0.38, 0.95); gl.drawArrays(gl.LINES, 0, gold.length / 3); }
      // atmosfera
      gl.cullFace(gl.FRONT); gl.depthMask(false); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(pa.p); attr(gl, pa, "p", bP, 3); gl.uniformMatrix4fv(pa.u.mvp, false, mvp); gl.uniform3fv(pa.u.eye, eye);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bI); gl.drawElements(gl.TRIANGLES, I.length, gl.UNSIGNED_INT, 0);
      gl.depthMask(true); gl.cullFace(gl.BACK);
      // pikat (HTML)
      const r = Math.min(2, window.devicePixelRatio || 1), Wc = W / r, Hc = H / r, ed = Math.hypot(...eye);
      const items = [];
      for (const q of pins) {
        const vis = (q.pos[0] * eye[0] + q.pos[1] * eye[1] + q.pos[2] * eye[2]) / ed > 1.0 / ed + 0.02;
        const s = vis && M.proj(mvp, q.pos[0], q.pos[1], q.pos[2], Wc, Hc);
        if (!s) { q.el.hidden = true; continue; }
        items.push({ el: q.el, x: s[0], y: s[1], pr: q.pr, lw: q.lw });
      }
      placeLabels(pinsEl, items, Wc, Hc, G.dist < 1.6 ? 60 : 26);
    }
    const stopSpin = () => { G.spin = false; G.anim = null; };
    gestures(el, {
      start: stopSpin,
      pan(dx, dy) { const k = (G.dist - 1) * 0.11; G.lon -= dx * k; G.lat += dy * k; G.vlon = -dx * k * 0.6; G.vlat = dy * k * 0.6; G.dirty = true; },
      rotate() { /* globi: dy gishta = vetëm zmadhim */ },
      zoom(f) { G.dist = 1 + (G.dist - 1) / f; G.dirty = true; },
      dbl() { G.anim = { t0: performance.now(), ms: 600, lat0: G.lat, lon0: G.lon, lat1: G.lat, lon1: G.lon, d0: G.dist, d1: 1 + (G.dist - 1) * 0.45 }; },
    });
    requestAnimationFrame(frame);
    const api = {
      setPins,
      flyTo(lat, lon, dist) { G.spin = false; G.anim = { t0: performance.now(), ms: 1600, lat0: G.lat, lon0: G.lon, lat1: lat, lon1: lon, d0: G.dist, d1: dist ?? 1.35, hop: Math.max(0, 0.6 - Math.abs(G.dist - (dist ?? 1.35)) * 0.3) }; },
      destroy() { G.alive = false; ro.disconnect(); const lose = gl.getExtension("WEBGL_lose_context"); lose && lose.loseContext(); live.delete(api); },
    };
    live.add(api);
    return api;
  }

  // =====================================================================
  //  SHQIPËRIA 3D
  // =====================================================================
  // lartësitë vijnë si atribut (WebGL1 jo gjithmonë lejon teksturë në vertex shader)
  const T_VS2 = `attribute vec2 g; attribute float hgt; uniform mat4 mvp; uniform vec2 km; uniform float ex; varying vec2 vt; varying float vh;
    void main(){ vt=g; vh=hgt; gl_Position=mvp*vec4((g.x-0.5)*km.x, hgt/1000.0*ex, (g.y-0.5)*km.y, 1.0); }`;
  const T_FS = `precision mediump float; varying vec2 vt; varying float vh; uniform sampler2D sat; uniform sampler2D nm; uniform float hasSat; uniform vec3 sun; uniform sampler2D det; uniform vec4 detB; uniform float hasDet;
    vec3 ramp(float h){ if(h<1.0) return vec3(0.08,0.22,0.38);
      vec3 a=vec3(0.36,0.47,0.27), b=vec3(0.55,0.53,0.36), c=vec3(0.52,0.42,0.33), d=vec3(0.93,0.93,0.95);
      return h<600.0?mix(a,b,h/600.0):h<1600.0?mix(b,c,(h-600.0)/1000.0):mix(c,d,clamp((h-1600.0)/900.0,0.0,1.0)); }
    void main(){
      vec4 nn=texture2D(nm,vt); vec3 n=normalize(nn.rgb*2.0-1.0); float mask=nn.a;
      vec3 c= hasSat>0.5 ? texture2D(sat,vt).rgb : ramp(vh);
      if(hasDet>0.5){ vec2 dt=(vt-detB.xy)/(detB.zw-detB.xy); vec2 e2=min(dt,1.0-dt); float w=smoothstep(0.0,0.06,min(e2.x,e2.y)); if(w>0.0) c=mix(c,texture2D(det,dt).rgb,w); }
      float sh=0.58+0.62*max(dot(n,normalize(sun)),0.0);
      c*=sh;
      float out1=1.0-smoothstep(0.35,0.65,mask);
      c=mix(c, mix(c,vec3(dot(c,vec3(0.3,0.59,0.11))),0.55)*0.62, out1*step(1.0,vh+0.5));
      float edge=1.0-smoothstep(0.0,0.16,abs(mask-0.5));
      c=mix(c,vec3(1.0,0.82,0.42),edge*0.9);
      vec2 f=min(vt,1.0-vt); float fade=smoothstep(0.0,0.05,min(f.x,f.y*1.9));
      gl_FragColor=vec4(c,fade);
    }`;
  const DOT_VS = `attribute vec3 p; attribute float rk; uniform mat4 mvp; uniform float maxr; uniform float dpr; varying float vr;
    void main(){ vr=rk; gl_Position=mvp*vec4(p,1.0); gl_PointSize = rk>maxr ? 0.0 : (rk<1.5?7.5:rk<2.5?6.0:rk<3.5?5.0:3.6)*dpr; }`;
  const DOT_FS = `precision mediump float; varying float vr;
    void main(){ vec2 d=gl_PointCoord-0.5; float r=length(d); if(r>0.5) discard; vec3 c = r>0.32 ? vec3(0.08,0.06,0.04) : (vr<1.5?vec3(1.0,0.86,0.5):vec3(1.0)); gl_FragColor=vec4(c,1.0); }`;

  const MOD_VS = `attribute vec3 p; attribute vec3 n; attribute vec3 col; uniform mat4 mvp; uniform vec3 at; uniform float sc; varying vec3 vn; varying vec3 vc;
    void main(){ vn=n; vc=col; gl_Position=mvp*vec4(at+p*sc,1.0); }`;
  const MOD_FS = `precision mediump float; varying vec3 vn; varying vec3 vc; uniform vec3 sun;
    void main(){ float l=0.45+0.6*max(dot(normalize(vn),normalize(sun)),0.0); gl_FragColor=vec4(vc*l,1.0); }`;

  // Maketa e stilizuar e një kishe orthodhokse (njësi ≈ 10 m). Akse: x = lindje, y = lart, z = jug.
  // Stili: 0 = pa kambanore, 1 = kambanore mbi hyrje, 2 = dy kambanore, "t" = kambanore më vete (Tiranë)
  function churchModel(style) {
    const P = [], N = [], Cc = [];
    const WALL = [0.96, 0.93, 0.86], ROOF = [0.62, 0.27, 0.2], GOLD = [0.98, 0.78, 0.3], BLUE = [0.33, 0.47, 0.72], DARK = [0.35, 0.3, 0.27];
    const tri = (a, b, c, col) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; let nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0]; const l = Math.hypot(nx, ny, nz) || 1; for (const q of [a, b, c]) { P.push(...q); N.push(nx / l, ny / l, nz / l); Cc.push(...col); } };
    const quad = (a, b, c, d, col) => { tri(a, b, c, col); tri(a, c, d, col); };
    const box = (x0, y0, z0, x1, y1, z1, col) => {
      const v = (x, y, z) => [x, y, z];
      quad(v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1), col); quad(v(x1, y0, z0), v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0), col);
      quad(v(x1, y0, z1), v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), col); quad(v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0), col);
      quad(v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0), v(x0, y1, z0), col);
    };
    const gable = (x0, x1, y, w, h, col) => { // çati me dy ujëra përgjatë x
      quad([x0, y, w], [x1, y, w], [x1, y + h, 0], [x0, y + h, 0], col); quad([x1, y, -w], [x0, y, -w], [x0, y + h, 0], [x1, y + h, 0], col);
      tri([x0, y, -w], [x0, y, w], [x0, y + h, 0], WALL); tri([x1, y, w], [x1, y, -w], [x1, y + h, 0], WALL);
    };
    const cyl = (cx, cz, r, y0, y1, col, seg = 16) => { for (let i = 0; i < seg; i++) { const a = i / seg * 2 * Math.PI, b = (i + 1) / seg * 2 * Math.PI; quad([cx + r * Math.sin(a), y0, cz + r * Math.cos(a)], [cx + r * Math.sin(b), y0, cz + r * Math.cos(b)], [cx + r * Math.sin(b), y1, cz + r * Math.cos(b)], [cx + r * Math.sin(a), y1, cz + r * Math.cos(a)], col); } };
    const dome = (cx, cy, cz, r, col, seg = 16, onion = false) => {
      const ring = (t) => { const ph = t * Math.PI / 2; let rr = r * Math.cos(ph), yy = r * Math.sin(ph); if (onion) { rr *= 1 + 0.35 * Math.sin(t * Math.PI); yy *= 1.5; } return [rr, cy + yy]; };
      for (let k = 0; k < 6; k++) { const [r0, y0] = ring(k / 6), [r1, y1] = ring((k + 1) / 6);
        for (let i = 0; i < seg; i++) { const a = i / seg * 2 * Math.PI, b = (i + 1) / seg * 2 * Math.PI;
          quad([cx + r0 * Math.sin(a), y0, cz + r0 * Math.cos(a)], [cx + r0 * Math.sin(b), y0, cz + r0 * Math.cos(b)], [cx + r1 * Math.sin(b), y1, cz + r1 * Math.cos(b)], [cx + r1 * Math.sin(a), y1, cz + r1 * Math.cos(a)], col); } }
    };
    const cross = (cx, cy, cz, h) => { const t = h * 0.09; box(cx - t, cy, cz - t, cx + t, cy + h, cz + t, GOLD); box(cx - t, cy + h * 0.58, cz - h * 0.3, cx + t, cy + h * 0.72, cz + h * 0.3, GOLD); };
    const big = style === "t" || style === 2;
    const L = big ? 2.6 : 2.0, Wd = big ? 1.5 : 1.15, Hh = big ? 1.6 : 1.25;
    // naosi + krahët e kryqit
    box(-L, 0, -Wd, L, Hh, Wd, WALL); gable(-L, L, Hh, Wd, 0.55, ROOF);
    box(-Wd * 0.9, 0, -Wd * 1.7, Wd * 0.9, Hh, Wd * 1.7, WALL);
    // absida në lindje
    cyl(L, 0, Wd * 0.75, 0, Hh * 0.85, WALL, 10); dome(L, Hh * 0.85, 0, Wd * 0.75, ROOF, 10);
    // tamburi + kupola qendrore
    const dy = Hh + 0.45; cyl(0, 0, 0.85, Hh, dy + 0.9, WALL); dome(0, dy + 0.9, 0, 0.92, style === "t" ? GOLD : style === 2 ? BLUE : ROOF, 18, false);
    cross(0, dy + 1.8, 0, 0.9);
    if (big) { for (const [x, z] of [[-1.3, -0.9], [-1.3, 0.9], [1.3, -0.9], [1.3, 0.9]]) { cyl(x, z, 0.36, Hh, Hh + 0.55, WALL, 10); dome(x, Hh + 0.55, z, 0.38, style === "t" ? GOLD : BLUE, 10); cross(x, Hh + 0.92, z, 0.45); } }
    const tower = (x, z, w, h, cap) => { box(x - w, 0, z - w, x + w, h, z + w, WALL); box(x - w * 1.02, h * 0.72, z - w * 1.02, x + w * 1.02, h * 0.86, z + w * 1.02, DARK); dome(x, h, z, w * 1.05, cap, 12, true); cross(x, h + w * 1.6, z, 0.6); };
    if (style === 1) tower(-L - 0.5, 0, 0.55, Hh + 1.9, ROOF);
    if (style === 2) { tower(-L - 0.3, -Wd + 0.4, 0.5, Hh + 2.1, BLUE); tower(-L - 0.3, Wd - 0.4, 0.5, Hh + 2.1, BLUE); }
    if (style === "t") { // kambanorja e lartë cilindrike pranë katedrales
      const x = -L - 2.2, z = 2.4; cyl(x, z, 0.55, 0, 4.6, WALL, 14); cyl(x, z, 0.58, 3.4, 3.9, DARK, 14); dome(x, 4.6, z, 0.6, GOLD, 12); cross(x, 5.2, z, 0.7);
    }
    // bazamenti
    box(-L - 1.2, -0.25, -Wd * 2, L + 1.3, 0.02, Wd * 2, [0.78, 0.74, 0.66]);
    return { p: new Float32Array(P), n: new Float32Array(N), c: new Float32Array(Cc), count: P.length / 3 };
  }

  async function albania(el, opt) {
    el.classList.add("hm-host", "hm-al");
    el.innerHTML = `<canvas class="hm-gl"></canvas><div class="hm-pins"></div><div class="hm-load">Po ngrihen malet…</div>`;
    const cv = el.querySelector(".hm-gl"), pinsEl = el.querySelector(".hm-pins");
    const gl = makeGL(cv);
    if (!gl) { el.querySelector(".hm-load").textContent = "Pajisja nuk e mbështet WebGL."; return { destroy() {} }; }
    const A = opt.al;
    const x0 = mercX(A.lon0), x1 = mercX(A.lon1), y0 = mercY(A.lat1), y1 = mercY(A.lat0);
    const uv = (lat, lon) => [(mercX(lon) - x0) / (x1 - x0), (mercY(lat) - y0) / (y1 - y0)];
    const KMW = (A.lon1 - A.lon0) * 111.32 * Math.cos(41.15 * D2R), KMH = KMW * A.h / A.w;
    const EX = 2.2;
    // lartësitë
    const rim = await loadImg(opt.relief);
    const c2 = document.createElement("canvas"); c2.width = A.w; c2.height = A.h; const x2 = c2.getContext("2d", { willReadFrequently: true }); x2.drawImage(rim, 0, 0);
    const px = x2.getImageData(0, 0, A.w, A.h).data;
    const HT = new Float32Array(A.w * A.h), MK = new Float32Array(A.w * A.h);
    for (let i = 0; i < A.w * A.h; i++) { HT[i] = px[i * 4] * 256 + px[i * 4 + 1]; MK[i] = px[i * 4 + 2] / 255; }
    const hAt = (u, v) => { const x = Math.max(0, Math.min(A.w - 1.001, u * (A.w - 1))), y = Math.max(0, Math.min(A.h - 1.001, v * (A.h - 1))); const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, k = j * A.w + i; return (HT[k] * (1 - fx) + HT[k + 1] * fx) * (1 - fy) + (HT[k + A.w] * (1 - fx) + HT[k + A.w + 1] * fx) * fy; };
    // harta e normaleve (rezolucion i plotë) + maska në alfa
    const nmC = document.createElement("canvas"); nmC.width = A.w; nmC.height = A.h; const nx = nmC.getContext("2d"); const nd = nx.createImageData(A.w, A.h);
    const sx = KMW * 1000 / A.w, sz = KMH * 1000 / A.h;
    for (let j = 0; j < A.h; j++) for (let i = 0; i < A.w; i++) {
      const L = HT[j * A.w + Math.max(0, i - 1)], R = HT[j * A.w + Math.min(A.w - 1, i + 1)], U = HT[Math.max(0, j - 1) * A.w + i], Dn = HT[Math.min(A.h - 1, j + 1) * A.w + i];
      let a = -(R - L) * EX / (2 * sx), b = 1, c = -(Dn - U) * EX / (2 * sz); const l = Math.hypot(a, b, c); a /= l; b /= l; c /= l;
      const k = (j * A.w + i) * 4; nd.data[k] = (a * 0.5 + 0.5) * 255; nd.data[k + 1] = (b * 0.5 + 0.5) * 255; nd.data[k + 2] = (c * 0.5 + 0.5) * 255; nd.data[k + 3] = MK[j * A.w + i] * 255;
    }
    nx.putImageData(nd, 0, 0);
    // rrjeta
    const step = A.w * A.h > 160000 ? 2 : 1, GW = Math.floor((A.w - 1) / step) + 1, GH = Math.floor((A.h - 1) / step) + 1;
    const Gv = new Float32Array(GW * GH * 2), Hv = new Float32Array(GW * GH), Iv = new Uint32Array((GW - 1) * (GH - 1) * 6);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const k = j * GW + i, xi = Math.min(A.w - 1, i * step), yj = Math.min(A.h - 1, j * step); Gv[k * 2] = xi / (A.w - 1); Gv[k * 2 + 1] = yj / (A.h - 1); Hv[k] = HT[yj * A.w + xi]; }
    let q = 0; for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) { const a = j * GW + i, b = a + GW; Iv[q++] = a; Iv[q++] = b; Iv[q++] = a + 1; Iv[q++] = b; Iv[q++] = b + 1; Iv[q++] = a + 1; }
    const bG = buf(gl, Gv), bH = buf(gl, Hv), bI = buf(gl, Iv, gl.ELEMENT_ARRAY_BUFFER);
    const pt = program(gl, T_VS2, T_FS), pd = program(gl, DOT_VS, DOT_FS);
    const texN = texFrom(gl, nmC, 1);
    // RGBA për normalet+maskën
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texN); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nmC);
    let texS = null;
    loadImg(opt.sat).then((im) => { texS = texFrom(gl, fit(im, 4096, false), 0); C.dirty = true; }).catch(() => {});
    // vendbanimet si pika në GPU
    const towns = A.towns || [];
    const TP = new Float32Array(towns.length * 3), TR = new Float32Array(towns.length), TPOS = [];
    towns.forEach((t, i) => { const [u, v] = uv(t[1], t[2]); const h = hAt(u, v); const X = (u - 0.5) * KMW, Y = h / 1000 * EX + 0.25, Z = (v - 0.5) * KMH; TP.set([X, Y, Z], i * 3); TR[i] = t[3]; TPOS.push([X, Y, Z]); });
    const bTP = buf(gl, TP), bTR = buf(gl, TR);
    // maketet e katedraleve
    const pm = program(gl, MOD_VS, MOD_FS), models = {};
    const cathedrals = (opt.cathedrals || []).map((c) => { const [u, v] = uv(c.lat, c.lon); const st = c.m; if (!models[st]) { const g = churchModel(st); models[st] = { p: buf(gl, g.p), n: buf(gl, g.n), c: buf(gl, g.c), count: g.count }; } return Object.assign({}, c, { X: (u - 0.5) * KMW, Y: hAt(u, v) / 1000 * EX, Z: (v - 0.5) * KMH, kind: "cathedral" }); });
    const churches = (opt.churches || []).map((c) => { const [u, v] = uv(c.lat, c.lon); return Object.assign({}, c, { X: (u - 0.5) * KMW, Y: hAt(u, v) / 1000 * EX + 0.02, Z: (v - 0.5) * KMH, kind: "church" }); });
    // pllakat e gjalla Sentinel-2 cloudless (EOX, CC-BY 4.0) kur afrohesh — vetëm me internet
    const DET = { tex: null, key: "", busy: false, b: [0, 0, 1, 1], t: 0 };
    const tileUrl = opt.detailUrl || "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg";
    function wantDetail() {
      if (!opt.detail || C.d > 45 || DET.busy || !navigator.onLine) return;
      const u = C.tx / KMW + 0.5, v = C.tz / KMH + 0.5, mx = x0 + u * (x1 - x0), my = y0 + v * (y1 - y0);
      const z = Math.max(11, Math.min(15, Math.round(Math.log2(30000 / (C.d * 0.7))))), n = 1 << z, G = 4;
      const tx0 = Math.floor(mx * n - G / 2 + 0.5), ty0 = Math.floor(my * n - G / 2 + 0.5), key = z + "/" + tx0 + "/" + ty0;
      if (key === DET.key) return;
      DET.busy = true;
      const cvs = document.createElement("canvas"); cvs.width = cvs.height = 256 * G; const cx = cvs.getContext("2d"); let ok = 0;
      const jobs = [];
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) jobs.push(new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => { cx.drawImage(im, i * 256, j * 256); ok++; res(); }; im.onerror = () => res(); im.src = tileUrl.replace("{z}", z).replace("{x}", tx0 + i).replace("{y}", ty0 + j); }));
      Promise.all(jobs).then(() => {
        DET.busy = false; if (!C.alive) return;
        if (ok < G * G) { DET.key = key; return; }
        try {
          const t = DET.tex || gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cvs); gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          DET.tex = t; DET.key = key;
          DET.b = [(tx0 / n - x0) / (x1 - x0), (ty0 / n - y0) / (y1 - y0), ((tx0 + G) / n - x0) / (x1 - x0), ((ty0 + G) / n - y0) / (y1 - y0)];
          C.dirty = true;
        } catch (e) { DET.key = key; /* CORS / pa leje: mbetet imazhi bazë */ }
      });
    }
    // kamera
    const C = { tx: 0, tz: 25, d: 430, yaw: 0, pitch: 48, dirty: true, alive: true, anim: null };
    let mvp = null;
    // etiketat
    const sacred = (opt.sacred || []).map((p) => { const [u, v] = uv(p.lat, p.lon); return Object.assign({}, p, { X: (u - 0.5) * KMW, Y: hAt(u, v) / 1000 * EX + 0.3, Z: (v - 0.5) * KMH }); });
    const pool = [];
    const lbl = (i) => { if (!pool[i]) { const d = document.createElement("div"); d.className = "hm-pin town"; d.innerHTML = "<span><b></b></span>"; pinsEl.appendChild(d); pool[i] = d; } return pool[i]; };
    const sacredEls = sacred.map((p) => {
      const d = document.createElement("button"); d.type = "button"; d.className = "hm-pin al" + (p.hot ? " hot" : "");
      d.innerHTML = `<i></i><span><b>${p.label}</b></span>`;
      d.addEventListener("click", (e) => { e.stopPropagation(); opt.onPick && opt.onPick(p); }); pinsEl.appendChild(d); return d;
    });
    const mkChurch = (c, cls) => { const d = document.createElement("button"); d.type = "button"; d.className = "hm-pin " + cls; d.innerHTML = `<i></i><span><b>${c.n}</b></span>`; d.addEventListener("click", (e) => { e.stopPropagation(); opt.onPick && opt.onPick(c); }); pinsEl.appendChild(d); return d; };
    const cathEls = cathedrals.map((c) => mkChurch(c, "cath")), chEls = churches.map((c) => mkChurch(c, "church"));
    let hi = null;   // vendbanimi i kërkuar
    function resize() { const r = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(el.clientWidth * r); cv.height = Math.round(el.clientHeight * r); C.dirty = true; }
    const ro = new ResizeObserver(resize); ro.observe(el); resize();
    el.querySelector(".hm-load")?.remove();
    function eyeOf() { const p = C.pitch * D2R, y = C.yaw * D2R; return [C.tx + C.d * Math.cos(p) * Math.sin(y), C.d * Math.sin(p), C.tz + C.d * Math.cos(p) * Math.cos(y)]; }
    function draw() {
      C.pitch = Math.max(18, Math.min(89, C.pitch)); C.d = Math.max(0.9, Math.min(700, C.d));
      C.tx = Math.max(-KMW / 2, Math.min(KMW / 2, C.tx)); C.tz = Math.max(-KMH / 2, Math.min(KMH / 2, C.tz));
      const W = cv.width, H = cv.height, r = Math.min(2, window.devicePixelRatio || 1); gl.viewport(0, 0, W, H);
      const e = eyeOf(), ty = Math.max(0, hAt(C.tx / KMW + 0.5, C.tz / KMH + 0.5) / 1000 * EX);
      mvp = M.mul(M.persp(45 * D2R, W / H, Math.max(0.02, C.d * 0.012), Math.min(C.d * 6 + 800, C.d * 60 + 90)), M.look([e[0], e[1] + ty, e[2]], [C.tx, ty, C.tz], [0, 1, 0]));
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pt.p); attr(gl, pt, "g", bG, 2);
      const lh = pt.a.hgt; gl.bindBuffer(gl.ARRAY_BUFFER, bH); gl.enableVertexAttribArray(lh); gl.vertexAttribPointer(lh, 1, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(pt.u.mvp, false, mvp); gl.uniform2f(pt.u.km, KMW, KMH); gl.uniform1f(pt.u.ex, EX);
      gl.uniform3f(pt.u.sun, -0.55, 0.75, -0.35); gl.uniform1f(pt.u.hasSat, texS ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texS || texN); gl.uniform1i(pt.u.sat, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texN); gl.uniform1i(pt.u.nm, 1);
      const useDet = DET.tex && C.d < 60; gl.uniform1f(pt.u.hasDet, useDet ? 1 : 0); gl.uniform4f(pt.u.detB, DET.b[0], DET.b[1], DET.b[2], DET.b[3]);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, DET.tex || texN); gl.uniform1i(pt.u.det, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bI); gl.drawElements(gl.TRIANGLES, Iv.length, gl.UNSIGNED_INT, 0);
      gl.disableVertexAttribArray(lh);
      // pikat e vendbanimeve
      const maxr = C.d < 70 ? 5 : C.d < 150 ? 4 : C.d < 300 ? 3 : 2;
      gl.useProgram(pd.p); attr(gl, pd, "p", bTP, 3);
      const lr = pd.a.rk; gl.bindBuffer(gl.ARRAY_BUFFER, bTR); gl.enableVertexAttribArray(lr); gl.vertexAttribPointer(lr, 1, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(pd.u.mvp, false, mvp); gl.uniform1f(pd.u.maxr, maxr); gl.uniform1f(pd.u.dpr, r);
      gl.drawArrays(gl.POINTS, 0, towns.length); gl.disableVertexAttribArray(lr);
      // maketet 3D (shkalla rritet kur largohesh që të duken; nga afër ≈ përmasa reale)
      const msc = Math.max(0.022, Math.min(0.5, C.d * 0.011)), showM = C.d < 220;
      if (showM && cathedrals.length) {
        gl.useProgram(pm.p); gl.uniformMatrix4fv(pm.u.mvp, false, mvp); gl.uniform3f(pm.u.sun, -0.55, 0.75, -0.35); gl.uniform1f(pm.u.sc, msc);
        for (const c of cathedrals) { const g = models[c.m]; attr(gl, pm, "p", g.p, 3); attr(gl, pm, "n", g.n, 3); attr(gl, pm, "col", g.c, 3); gl.uniform3f(pm.u.at, c.X, c.Y, c.Z); gl.drawArrays(gl.TRIANGLES, 0, g.count); }
        for (const k of ["p", "n", "col"]) pm.a[k] >= 0 && gl.disableVertexAttribArray(pm.a[k]);
      }
      // etiketat
      const Wc = W / r, Hc = H / r, items = [];
      sacred.forEach((p, i) => { const s = M.proj(mvp, p.X, p.Y, p.Z, Wc, Hc); if (!s) { sacredEls[i].hidden = true; return; } items.push({ el: sacredEls[i], x: s[0], y: s[1], pr: p.hot ? -2 : -1, lw: 120 }); });
      cathedrals.forEach((c, i) => { const s = showM && M.proj(mvp, c.X, c.Y + msc * 7.5, c.Z, Wc, Hc); if (!s) { cathEls[i].hidden = true; return; } items.push({ el: cathEls[i], x: s[0], y: s[1], pr: -1.5, lw: c.n.length * 6.4 + 20 }); });
      churches.forEach((c, i) => { const s = C.d < 40 && M.proj(mvp, c.X, c.Y, c.Z, Wc, Hc); if (!s) { chEls[i].hidden = true; return; } items.push({ el: chEls[i], x: s[0], y: s[1], pr: 0.5, lw: c.n.length * 6.2 + 18 }); });
      let n = 0;
      for (let i = 0; i < towns.length && n < 260; i++) {
        const t = towns[i]; if (t[3] > maxr && i !== hi) continue;
        const P = TPOS[i], s = M.proj(mvp, P[0], P[1], P[2], Wc, Hc); if (!s || s[0] < -30 || s[0] > Wc + 30 || s[1] < -10 || s[1] > Hc + 10) continue;
        const d = lbl(n++); d.firstChild.firstChild.textContent = t[0]; d.classList.toggle("hi", i === hi);
        items.push({ el: d, x: s[0], y: s[1], pr: i === hi ? -3 : t[3] + s[2] / 2000, lw: t[0].length * 6.6 + 6 });
      }
      for (let i = n; i < pool.length; i++) pool[i].hidden = true;
      placeLabels(pinsEl, items, Wc, Hc, C.d < 70 ? 70 : 40);
    }
    function frame() {
      if (!C.alive) return;
      if (C.anim) { const a = C.anim, t = Math.min(1, (performance.now() - a.t0) / a.ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; for (const k of ["tx", "tz", "d", "pitch"]) C[k] = a.f[k] + (a.to[k] - a.f[k]) * e; if (t >= 1) C.anim = null; C.dirty = true; }
      if (C.dirty) { C.dirty = false; draw(); DET.t = performance.now(); }
      else if (DET.t && performance.now() - DET.t > 350) { DET.t = 0; wantDetail(); }
      requestAnimationFrame(frame);
    }
    gestures(el, {
      start() { C.anim = null; },
      pan(dx, dy) { const k = C.d / el.clientHeight * 1.1, y = C.yaw * D2R; C.tx -= (dx * Math.cos(y) + dy * Math.sin(y) / Math.max(0.35, Math.sin(C.pitch * D2R))) * k; C.tz -= (-dx * Math.sin(y) + dy * Math.cos(y) / Math.max(0.35, Math.sin(C.pitch * D2R))) * k; C.dirty = true; },
      rotate(dx, dy) { C.yaw -= dx * 0.35; C.pitch += dy * 0.3; C.dirty = true; },
      zoom(f) { C.d /= f; C.dirty = true; },
      dbl() { C.anim = { t0: performance.now(), ms: 500, f: { ...C }, to: { tx: C.tx, tz: C.tz, d: C.d * 0.45, pitch: C.pitch } }; },
    });
    requestAnimationFrame(frame);
    const api = {
      flyTo(lat, lon, d) { const [u, v] = uv(lat, lon); C.anim = { t0: performance.now(), ms: 1200, f: { ...C }, to: { tx: (u - 0.5) * KMW, tz: (v - 0.5) * KMH, d: d ?? 38, pitch: d != null && d < 6 ? 42 : 38 } }; },
      find(name) { const k = towns.findIndex((t) => t[0] === name); if (k < 0) return; hi = k; api.flyTo(towns[k][1], towns[k][2], towns[k][3] <= 2 ? 60 : 28); },
      reset() { hi = null; C.anim = { t0: performance.now(), ms: 900, f: { ...C }, to: { tx: 0, tz: 25, d: 430, pitch: 48 } }; C.yaw = 0; },
      towns, cathedrals, churches,
      destroy() { C.alive = false; ro.disconnect(); const lose = gl.getExtension("WEBGL_lose_context"); lose && lose.loseContext(); live.delete(api); },
    };
    live.add(api);
    return api;
  }

  window.FSHarta = { globe, albania, stopAll() { [...live].forEach((a) => a.destroy()); } };
})();
