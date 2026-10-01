/* PerceptX pixel scenes \u2014 the animated "screens" on the home page.
   Two custom elements, each in its own shadow root so the page's template
   re-renders never touch them:
     <px-deploy>    On-prem / Cloud switch with a deployment diagram
     <px-verticals> Quality / Safety / Operations tabs, each with an agent demo per industry
   Every scene is drawn on a 160x90 canvas and scaled up with
   image-rendering: pixelated. Labels inside the scene use a 3x5 pixel font;
   captions around it are plain HTML. */
(function () {
  "use strict";

  var W = 160, H = 90;
  var C = {
    bg: "#14110d", wall: "#1b1712", wallLine: "#221d17", floor: "#241e17", floorLine: "#2f281f",
    grid: "#2a241c", dark: "#0d0b09", steel: "#4a4136", steel2: "#6b5f50", light: "#9a8e7c",
    bone: "#f4f1ec", glow: "#f0c48a", amber: "#e2a862", bronze: "#8a6a44", red: "#ef5a3c",
    green: "#9ccc8a", box: "#b98a55", box2: "#8f683f", boxTop: "#d4a56d", skin: "#d9ae88",
    hair: "#3a2a1c", pants: "#3b3c46", vest: "#e8913a", hatch: "#4a3519"
  };

  /* 3x5 pixel font: five rows of three bits per glyph. */
  var FONT = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
    E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
    I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
    M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
    Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
    Y: "101101010010010", Z: "111001010100111", "0": "111101101101111", "1": "010110010010111",
    "2": "110001010100111", "3": "110001010001110", "4": "101101111001001", "5": "111100110001110",
    "6": "011100111101111", "7": "111001010010010", "8": "111101111101111", "9": "111101111001110",
    "%": "101001010100101", ":": "000010000010000", ".": "000000000000010", "-": "000000111000000",
    "/": "001001010100100", ">": "100010001010100", " ": "000000000000000"
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function blink(t, hz) { return Math.floor(t * hz * 2) % 2 === 0; }
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function textW(s) { return s.length * 4 - 1; }
  function text(c, x, y, s, col) {
    c.fillStyle = col;
    s = String(s).toUpperCase();
    for (var i = 0; i < s.length; i++) {
      var g = FONT[s[i]] || FONT[" "];
      for (var b = 0; b < 15; b++) if (g[b] === "1") c.fillRect(Math.round(x) + i * 4 + (b % 3), Math.round(y) + Math.floor(b / 3), 1, 1);
    }
  }
  function chip(c, x, y, s, bg, fg) {
    var w = textW(s) + 4;
    x = clamp(x, 1, W - w - 1);
    R(c, x, y, w, 7, bg); text(c, x + 2, y + 1, s, fg);
  }
  function outline(c, x, y, w, h, col) { R(c, x, y, w, 1, col); R(c, x, y + h - 1, w, 1, col); R(c, x, y, 1, h, col); R(c, x + w - 1, y, 1, h, col); }
  function corners(c, x, y, w, h, col) {
    R(c, x, y, 3, 1, col); R(c, x, y, 1, 3, col); R(c, x + w - 3, y, 3, 1, col); R(c, x + w - 1, y, 1, 3, col);
    R(c, x, y + h - 1, 3, 1, col); R(c, x, y + h - 3, 1, 3, col); R(c, x + w - 3, y + h - 1, 3, 1, col); R(c, x + w - 1, y + h - 3, 1, 3, col);
  }
  function detect(c, x, y, w, h, col, label, solid) {
    if (solid) outline(c, x, y, w, h, col); else corners(c, x, y, w, h, col);
    if (label) chip(c, x, y > 9 ? y - 8 : y + h + 1, label, col, C.dark);
  }
  function plen(p) { var l = 0; for (var i = 1; i < p.length; i++) l += Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]); return l; }
  function along(p, d) {
    for (var i = 1; i < p.length; i++) {
      var dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1], l = Math.abs(dx) + Math.abs(dy);
      if (d <= l) return [p[i - 1][0] + Math.sign(dx) * d, p[i - 1][1] + Math.sign(dy) * d];
      d -= l;
    }
    return p[p.length - 1];
  }
  function dotted(c, pts, upto, col) {
    var total = Math.min(plen(pts), upto == null ? 1e9 : upto);
    for (var s = 0; s < total; s++) if (Math.floor(s / 2) % 2 === 0) { var q = along(pts, s); R(c, q[0], q[1], 1, 1, col); }
  }

  /* Shared set pieces */
  function backdrop(c, floorY) {
    R(c, 0, 0, W, floorY, C.wall);
    for (var x = 0; x < W; x += 20) R(c, x, 0, 1, floorY, C.wallLine);
    R(c, 0, floorY, W, H - floorY, C.floor);
    R(c, 0, floorY, W, 1, C.floorLine);
  }
  function hud(c, t, cam) {
    text(c, 3, 3, cam, C.light);
    if (blink(t, 1)) R(c, W - 23, 3, 3, 3, C.red);
    text(c, W - 18, 3, "LIVE", C.light);
  }
  function belt(c, off) {
    R(c, 24, 57, 134, 5, C.steel); R(c, 24, 56, 134, 1, C.steel2);
    for (var x = 24 - (off % 6); x < 158; x += 6) if (x >= 24) R(c, x, 58, 3, 1, C.dark);
    [40, 90, 140].forEach(function (lx) { R(c, lx, 62, 2, 12, C.steel); R(c, lx - 1, 74, 4, 1, C.steel2); });
  }
  function carton(c, x, y) {
    R(c, x, y, 11, 9, C.box); R(c, x, y, 11, 1, C.boxTop); R(c, x + 5, y, 1, 9, C.box2);
  }
  /* Inspection station: parts pass under an overhead camera; every fourth one is bad. */
  var ITEMS = {
    cap: function (c, x, bad) {
      R(c, x, 46, 7, 10, C.bone); R(c, x, 50, 7, 3, C.amber);
      if (bad) R(c, x + 5, 47, 2, 2, "#b8b0a4"); else R(c, x + 1, 44, 5, 2, C.steel2);
      return [x - 2, 42, 11, 15];
    },
    plate: function (c, x, bad) {
      R(c, x, 49, 14, 6, C.steel2); R(c, x, 49, 14, 1, C.light); R(c, x + 2, 52, 1, 1, C.dark); R(c, x + 11, 52, 1, 1, C.dark);
      R(c, x + 4, 51, 6, 1, C.amber);
      if (bad) [[6, 49], [7, 50], [6, 51], [8, 52], [7, 53], [8, 54]].forEach(function (q) { R(c, x + q[0], q[1], 1, 1, C.dark); });
      return [x - 2, 46, 18, 11];
    },
    panel: function (c, x, bad) {
      R(c, x, 46, 14, 10, C.amber); R(c, x, 46, 14, 1, C.glow); R(c, x, 55, 14, 1, C.bronze);
      if (bad) { R(c, x + 4, 49, 5, 4, C.steel2); R(c, x + 5, 48, 3, 1, C.steel2); }
      return [x - 2, 43, 18, 15];
    },
    carton: function (c, x, bad) {
      if (!bad) carton(c, x + 1, 47);
      else { R(c, x + 1, 50, 11, 6, C.box); R(c, x + 3, 49, 4, 1, C.box); R(c, x + 8, 48, 3, 2, C.boxTop); R(c, x + 4, 52, 4, 1, C.dark); R(c, x + 6, 50, 1, 6, C.box2); }
      return [x - 1, 43, 15, 14];
    }
  };
  function inspect(c, t, o) {
    var kind = o.kind || "cap", off = t * 16, alert = false, sp = kind === "cap" ? 18 : 22, n = 8, span = n * sp;
    backdrop(c, 60); belt(c, off);
    R(c, 101, 2, 2, 4, C.steel); R(c, 96, 6, 12, 7, C.steel2); R(c, 101, 13, 3, 2, C.light);
    for (var y = 16; y < 44; y += 2) { var hw = (y - 15) * 0.4; R(c, 102 - hw, y, 1, 1, "#3a3022"); R(c, 102 + hw, y, 1, 1, "#3a3022"); }
    dotted(c, [[86, 40], [118, 40], [118, 59], [86, 59], [86, 40]], null, C.bronze);
    for (var i = 0; i < n; i++) {
      var x = 24 + ((i * sp + off) % span) - 12;
      if (x < 24 || x > 144) continue;
      var bad = i % 4 === 2, b = ITEMS[kind](c, x, bad), cx = b[0] + b[2] / 2;
      if (cx >= 92 && cx <= 112) {
        if (bad) { detect(c, b[0], b[1], b[2], b[3], C.red, o.label || "NO CAP", true); alert = true; }
        else corners(c, b[0], b[1], b[2], b[3], C.green);
      }
    }
    text(c, 3, H - 8, "UNIT " + (3100 + Math.floor(off / sp)), C.light);
    hud(c, t, o.cam || "CAM-07");
    return { alert: alert };
  }

  function pallet(c, x, y) {
    R(c, x, y, 13, 2, "#9c7244"); R(c, x + 1, y + 2, 2, 2, "#6b4e30"); R(c, x + 10, y + 2, 2, 2, "#6b4e30");
    R(c, x + 1, y - 9, 11, 9, C.box); R(c, x + 1, y - 9, 11, 1, C.boxTop); R(c, x + 6, y - 9, 1, 9, C.box2);
  }
  function forklift(c, x, forkY) {
    R(c, x - 3, 65, 3, 7, C.steel);
    R(c, x, 64, 18, 8, C.amber); R(c, x, 64, 18, 1, C.glow);
    R(c, x + 3, 52, 1, 12, C.steel2); R(c, x + 13, 52, 1, 12, C.steel2); R(c, x + 2, 51, 13, 1, C.steel2);
    R(c, x + 7, 54, 3, 1, C.glow); R(c, x + 7, 55, 3, 3, C.skin); R(c, x + 6, 58, 5, 6, C.vest);
    R(c, x + 1, 72, 5, 4, C.dark); R(c, x + 12, 72, 5, 4, C.dark); R(c, x + 3, 73, 1, 1, C.steel2); R(c, x + 14, 73, 1, 1, C.steel2);
    R(c, x + 18, 48, 2, 28, C.steel); R(c, x + 20, forkY, 12, 1, C.steel2);
  }
  function worker(c, x, t, hat) {
    if (hat) R(c, x + 1, 62, 5, 2, C.glow); else R(c, x + 2, 63, 3, 1, C.hair);
    R(c, x + 2, 64, 3, 3, C.skin);
    R(c, x + 1, 67, 5, 6, C.vest); R(c, x + 1, 70, 5, 1, C.bone);
    R(c, x, 67, 1, 5, C.vest); R(c, x + 6, 67, 1, 5, C.vest);
    var s = Math.floor(t * 6) % 2;
    R(c, x + 1 + s, 73, 2, 7, C.pants); R(c, x + 4 - s, 73, 2, 7, C.pants);
    R(c, x + 1 + s, 79, 2, 1, C.dark); R(c, x + 4 - s, 79, 2, 1, C.dark);
  }

  /* Scenes: draw(c, t, opts) -> state. Each loops over its own length L. */
  var SCENES = {
    conveyor: {
      L: 7,
      draw: function (c, t, o) {
        o = o || {};
        var T = t % 7, stopAt = o.stopAt != null ? o.stopAt : null;
        var stopped = stopAt !== null && T >= stopAt, off = (stopped ? stopAt : T) * 14;
        backdrop(c, 60);
        R(c, 2, 26, 22, 34, C.steel); R(c, 2, 26, 22, 2, C.steel2); R(c, 6, 31, 14, 9, C.dark); R(c, 8, 33, 10, 5, "#1f2a26");
        R(c, 28, 30, 1, 26, C.steel2);
        R(c, 26, 20, 5, 3, stopped ? "#2d3a2a" : C.green); R(c, 26, 23, 5, 3, "#4a3a22"); R(c, 26, 26, 5, 3, stopped && blink(T, 2) ? C.red : "#3a2320");
        belt(c, off);
        for (var i = 0; i < 6; i++) { var x = 24 + ((i * 26 + off) % 156) - 12; if (x >= 24 && x <= 146) carton(c, x, 47); }
        var el = stopped ? T - stopAt : 0, alert = stopped && el > 0.4, secs = Math.min(99, 60 + Math.floor(el * 6));
        if (alert) { if (el > 1.2 || blink(el, 3)) detect(c, 22, 43, 136, 20, C.red, (o.stopLabel || "STOPPED") + " " + secs + "S", true); }
        else detect(c, 22, 43, 136, 20, C.glow, o.label || "CONVEYOR 3", false);
        hud(c, t, o.cam || "CAM-03");
        return { alert: alert, secs: secs };
      }
    },

    defect: { L: 9, draw: function (c, t, o) { return inspect(c, t, o || {}); } },

    spill: {
      L: 8,
      draw: function (c, t) {
        var T = t % 8;
        backdrop(c, 60);
        R(c, 14, 16, 34, 44, C.steel); R(c, 14, 16, 34, 2, C.steel2); R(c, 19, 22, 24, 10, C.dark);
        for (var n = 0; n < 4; n++) R(c, 20 + n * 6, 38, 2, 4, C.steel2);
        R(c, 48, 50, 110, 4, C.steel); R(c, 48, 49, 110, 1, C.steel2);
        for (var b = 0; b < 6; b++) { var bx = 54 + ((b * 18 + T * 10) % 104); if (bx < 150) { R(c, bx, 42, 6, 7, "#7a9aa6"); R(c, bx + 2, 40, 2, 2, C.steel2); } }
        var grow = clamp((T - 1) / 3.5, 0, 1), rx = 4 + grow * 18, ry = 1 + grow * 4, cx = 70, cy = 76;
        for (var yy = -ry; yy <= ry; yy++) { var hw = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))); R(c, cx - hw, cy + yy, hw * 2, 1, "#56707c"); }
        R(c, cx - rx * 0.4, cy - ry * 0.5, rx * 0.5, 1, "#8fb0bd");
        var dy = (T * 30) % 26; R(c, 44, 50 + dy * 0.9, 1, 2, "#8fb0bd");
        var alert = grow > 0.45;
        detect(c, cx - 26, 66, 52, 18, alert ? C.red : C.glow, alert ? "SPILL" : "FLOOR", alert);
        hud(c, t, "CAM-11");
        return { alert: alert };
      }
    },

    leak: {
      L: 7,
      draw: function (c, t) {
        var T = t % 7;
        backdrop(c, 70);
        R(c, 0, 28, W, 6, C.steel); R(c, 0, 28, W, 1, C.steel2);
        [30, 98, 140].forEach(function (x) { R(c, x, 26, 4, 10, C.steel2); });
        R(c, 52, 40, 34, 30, C.steel); R(c, 52, 40, 34, 2, C.steel2); R(c, 58, 46, 14, 10, C.dark); R(c, 86, 50, 10, 14, C.steel2);
        R(c, 98, 36, 4, 6, C.steel2); R(c, 96, 36, 8, 2, C.amber);
        var on = T > 1.2;
        if (on) for (var k = 0; k < 4; k++) {
          var age = (T * 0.7 + k * 0.25) % 1, py = 30 - age * 24, px = 100 + Math.sin(k * 2 + T * 2) * 4, sz = 2 + age * 6;
          c.globalAlpha = 0.85 * (1 - age);
          for (var yy = -sz; yy <= sz; yy++) for (var xx = -sz; xx <= sz; xx++)
            if (xx * xx + yy * yy <= sz * sz && ((xx + yy + k) & 1) === 0) R(c, px + xx, py + yy, 1, 1, "#e6ddd0");
          c.globalAlpha = 1;
        }
        var dy = (T * 24) % 30; if (on) R(c, 101, 42 + dy, 1, 2, "#8fb0bd");
        if (on) R(c, 96, 72, 10, 1, "#56707c");
        var alert = T > 2;
        detect(c, 90, 12, 22, 60, alert ? C.red : C.glow, alert ? "STEAM" : "PUMP 3", alert);
        hud(c, t, "CAM-44");
        return { alert: alert };
      }
    },

    inventory: {
      L: 8,
      draw: function (c, t, o) {
        o = o || {};
        var T = t % 8;
        backdrop(c, 74);
        R(c, 18, 10, 3, 64, C.bronze); R(c, 142, 10, 3, 64, C.bronze);
        R(c, 18, 38, 127, 2, C.amber); R(c, 18, 66, 127, 2, C.amber);
        text(c, 23, 69, "RACK B", C.light);
        var levels = [[0.95, 0.6, 0.75, null], [0.5, 0.85, 0.7, 0.95]];
        var f = o.fixed ? 0.7 : T < 1 ? 0.85 : T < 6 ? 0.85 - 0.72 * ((T - 1) / 5) : 0.13;
        for (var s = 0; s < 2; s++) for (var i = 0; i < 4; i++) {
          var bx = 24 + i * 29, by = s === 0 ? 21 : 49, h = 17, lv = levels[s][i] == null ? f : levels[s][i];
          R(c, bx, by, 24, h, "#2a231b");
          var rows = Math.round(lv * 4);
          for (var r = 0; r < rows; r++) for (var k = 0; k < 5; k++) R(c, bx + 2 + k * 4, by + h - 5 - (r + 1) * 3, 3, 3, r % 2 ? C.box : C.box2);
          R(c, bx, by + h - 5, 24, 5, "#3a3024"); R(c, bx + 9, by + h - 4, 6, 3, C.bone);
        }
        var pct = Math.round(f * 100), alert = !o.noDetect && f < 0.25;
        if (!o.noDetect) detect(c, 109, 19, 28, 21, alert ? C.red : C.glow, "B4 " + pct + "%", alert);
        hud(c, t, "CAM-12");
        return { alert: alert, pct: pct };
      }
    },

    aisle: {
      L: 9,
      draw: function (c, t) {
        var T = t % 9;
        backdrop(c, 56);
        for (var x = 4; x < W; x += 38) {
          R(c, x, 8, 2, 48, C.bronze); R(c, x + 30, 8, 2, 48, C.bronze);
          [22, 38].forEach(function (y) { R(c, x, y, 32, 1, C.amber); R(c, x + 4, y - 7, 9, 7, C.box2); R(c, x + 16, y - 6, 8, 6, C.box); });
        }
        for (var lx = 0; lx < W; lx += 8) R(c, lx, 84, 4, 1, C.amber);
        var fx, forkY = 62, carrying = true;
        if (T < 2.2) fx = -30 + (T / 2.2) * 88;
        else if (T < 2.8) { fx = 58; forkY = 62 + ((T - 2.2) / 0.6) * 12; }
        else if (T < 4.6) { fx = 58 - ((T - 2.8) / 1.8) * 100; forkY = 74; carrying = false; }
        else { fx = -80; carrying = false; }
        if (!carrying && T >= 2.8) pallet(c, 77, 72);
        forklift(c, fx, forkY);
        if (carrying) pallet(c, fx + 19, forkY - 2);
        var alert = T >= 4.6, mins = 5 + Math.floor((T - 4.6) * 1.2);
        if (alert) detect(c, 74, 60, 19, 18, C.red, "AISLE BLOCKED " + mins + "M", true);
        else if (T >= 2.8) detect(c, 74, 60, 19, 18, C.glow, "PALLET", false);
        hud(c, t, "CAM-21");
        return { alert: alert };
      }
    },

    ppe: {
      L: 8,
      draw: function (c, t, o) {
        o = o || {};
        var T = t % 8, alert = false, zone = !!o.zone;
        backdrop(c, 58);
        for (var y = 58; y < H; y++) for (var x = 92; x < W; x++) if (((x + y) >> 2) % 2 === 0) R(c, x, y, 1, 1, C.hatch);
        R(c, 92, 58, 1, 32, C.amber);
        var sign = zone ? "SUBSTATION" : "WELD CELL";
        R(c, 102, 14, textW(sign) + 6, 9, C.amber); text(c, 105, 16, sign, C.dark);
        if (zone) {
          R(c, 122, 28, 26, 30, C.steel); R(c, 122, 28, 26, 2, C.steel2);
          for (var f = 0; f < 5; f++) R(c, 126 + f * 4, 34, 1, 18, C.steel2);
          R(c, 131, 22, 2, 6, C.steel2); R(c, 139, 22, 2, 6, C.steel2);
          for (var fx = 94; fx < W; fx += 7) R(c, fx, 40, 1, 18, C.light);
          [43, 49, 55].forEach(function (wy) { for (var wx = 94; wx < W; wx += 2) R(c, wx, wy, 1, 1, C.steel2); });
        } else {
          R(c, 128, 30, 20, 28, C.steel); R(c, 132, 34, 12, 8, C.dark);
          if (blink(T, 6)) { R(c, 126, 50, 1, 1, C.glow); R(c, 125, 49, 1, 1, C.bone); }
        }
        var k = zone ? 0 : T < 4 ? 0 : 1, x = zone ? Math.min(112, -8 + T * 26) : -8 + (T - k * 4) * 32, hat = zone || k === 0;
        worker(c, x, x >= 112 ? 0 : T, hat);
        if (x + 3 >= 92) {
          if (zone) { detect(c, x - 2, 59, 11, 23, C.red, "PERSON IN ZONE", true); alert = true; }
          else if (hat) detect(c, x - 2, 59, 11, 23, C.green, "HARD HAT OK", false);
          else { detect(c, x - 2, 59, 11, 23, C.red, "NO HARD HAT", true); alert = true; }
        }
        hud(c, t, o.cam || "CAM-05");
        return { alert: alert };
      }
    },

  };

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Drives one canvas: runs only while visible, reports each frame. */
  function Player(canvas, onFrame) {
    var ctx = canvas.getContext("2d"), self = this, last = 0, running = false, visible = false, raf = 0;
    ctx.imageSmoothingEnabled = false;
    this.t = 0;
    this.scene = null; this.opts = null;
    this.set = function (name, opts) { self.scene = SCENES[name]; self.opts = opts || {}; self.t = 0; self.draw(); };
    this.draw = function () {
      if (!self.scene) return;
      var t = reduce ? self.scene.L - 0.4 : self.t;
      var st = self.scene.draw(ctx, t, self.opts) || {};
      onFrame(st, t, self.scene.L);
    };
    function loop(now) {
      if (!running) return;
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now; self.t += dt; self.draw();
      raf = requestAnimationFrame(loop);
    }
    function sync() {
      var go = visible && !reduce && !document.hidden;
      if (go && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
      if (!go && running) { running = false; cancelAnimationFrame(raf); }
    }
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; sync(); }, { threshold: 0.15 }).observe(canvas);
    document.addEventListener("visibilitychange", sync);
  }

  var BASE_CSS = [
    ":host { display: block; color: var(--color-text); font-family: var(--font-body); }",
    "* { box-sizing: border-box; }",
    ".screen { background: #14110d; border-radius: 14px; padding: 10px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--glow) 30%, transparent), 0 0 44px -6px color-mix(in srgb, var(--glow) 45%, transparent), var(--shadow-lg); }",
    "canvas { display: block; width: 100%; aspect-ratio: 16 / 9; image-rendering: pixelated; border-radius: 7px; background: #14110d; }",
    ".cap { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding: 11px 6px 3px; font: 12.5px/1.45 'Geist Mono', ui-monospace, Menlo, monospace; color: #cfc5b6; min-height: 32px; }",
    ".cap .l { color: #8f8577; letter-spacing: 0.06em; text-transform: uppercase; flex: none; }",
    ".cap .r { text-align: right; min-width: 0; }",
    ".cap .r.alert { color: #ff8a70; }",
    ".caret::after { content: ''; display: inline-block; width: 7px; height: 13px; margin-left: 2px; vertical-align: -2px; background: var(--glow); animation: b 1s steps(1) infinite; }",
    "@keyframes b { 50% { opacity: 0; } }",
    "button { font: inherit; color: inherit; }",
    "button:focus-visible { outline: 2px solid var(--color-accent-800); outline-offset: 2px; }"
  ].join("\n");

  /* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 <px-verticals> \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  var INDUSTRIES = [
    { name: "Manufacturing", scope: "Machining, fabrication, electronics and assembly", agents: [
      { lens: "Quality", text: "Cracks and weld defects", scene: "defect", opts: { kind: "plate", label: "CRACK", cam: "CAM-09" }, cam: "CAM-09 \u00b7 Weld line",
        prompt: "Pull any bracket with a visible crack along the weld and log it for QA.", alert: "Crack on bracket 2,208. Pulled and logged." },
      { lens: "Safety", text: "PPE at the weld cell", scene: "ppe", cam: "CAM-05 \u00b7 Weld cell",
        prompt: "Notify safety when anyone enters the weld cell without a hard hat.", alert: "Person in the weld cell without a hard hat." },
      { lens: "Operations", text: "Line stoppages", scene: "conveyor", opts: { stopAt: 2.5 }, cam: "CAM-03 \u00b7 Line 3",
        prompt: "Tell the line lead if conveyor 3 stops moving for more than 60 seconds.", alert: "Conveyor 3 stopped for 74 s. Clip attached." } ] },
    { name: "Food & packaging", scope: "Filling, bottling, packing and CPG lines", agents: [
      { lens: "Quality", text: "Missing caps and bad seals", scene: "defect", opts: { kind: "cap", label: "NO CAP" }, cam: "CAM-07 \u00b7 Capper",
        prompt: "Log every container that leaves the capper without a cap, with a photo for QA.", alert: "Missing cap on unit 3,114. Photo saved to the QA record." },
      { lens: "Safety", text: "Spills and wet floors", scene: "spill", cam: "CAM-11 \u00b7 Filler 2",
        prompt: "Alert sanitation when liquid pools on the floor near filler 2.", alert: "Spill near filler 2. Sanitation notified." },
      { lens: "Operations", text: "Jams at the packer", scene: "conveyor", opts: { stopAt: 2.5, label: "PACKER 1", stopLabel: "JAM", cam: "CAM-15" }, cam: "CAM-15 \u00b7 Packer 1",
        prompt: "Tell the shift lead when cases stop leaving packer 1 for more than a minute.", alert: "Packer 1 outfeed stopped for 74 s." } ] },
    { name: "Warehousing & logistics", scope: "Distribution centers, cross-docks and yards", agents: [
      { lens: "Quality", text: "Crushed or torn cartons", scene: "defect", opts: { kind: "carton", label: "CRUSHED", cam: "CAM-14" }, cam: "CAM-14 \u00b7 Inbound",
        prompt: "Flag any inbound carton that arrives crushed or torn, and photo it for the claim.", alert: "Crushed carton on pallet 118. Photo saved for the claim." },
      { lens: "Safety", text: "Blocked aisles", scene: "aisle", cam: "CAM-21 \u00b7 Aisle 2",
        prompt: "Alert the shift lead when a pallet is left in the main aisle for more than 5 minutes.", alert: "Pallet blocking aisle 2 for 6 min." },
      { lens: "Operations", text: "Low inventory", scene: "inventory", cam: "CAM-12 \u00b7 Rack B",
        prompt: "Flag any bin on rack B that drops below a quarter full, and open a reorder request.", alert: "Rack B, bin 4 at 18%. Reorder request opened." } ] },
    { name: "Heavy industry & energy", scope: "Metals, chemicals, utilities and remote sites", agents: [
      { lens: "Quality", text: "Bare or uneven coating", scene: "defect", opts: { kind: "panel", label: "BARE PATCH", cam: "CAM-31" }, cam: "CAM-31 \u00b7 Paint line",
        prompt: "Flag any panel that leaves the paint booth with bare or uneven coating.", alert: "Bare patch on panel 552." },
      { lens: "Safety", text: "Restricted zones", scene: "ppe", opts: { zone: true, cam: "CAM-40" }, cam: "CAM-40 \u00b7 Substation",
        prompt: "Alert the control room when anyone steps inside the substation fence.", alert: "Person inside the substation fence." },
      { lens: "Operations", text: "Leaks and steam", scene: "leak", cam: "CAM-44 \u00b7 Pump house",
        prompt: "Tell maintenance when you see steam or dripping around pump 3.", alert: "Steam at pump 3. Maintenance notified." } ] }
  ];

  /* The card is organised by question; each question lists one agent per industry. */
  var LENSES = [
    { lens: "Quality", q: "Is it right?", lead: "Catch defects at the station, before they reach the customer." },
    { lens: "Safety", q: "Is it safe?", lead: "See the risk or the near-miss before it becomes an incident." },
    { lens: "Operations", q: "Is it moving?", lead: "Know what has stopped, stalled or run low, as it happens." }
  ].map(function (l) {
    l.agents = INDUSTRIES.map(function (d) {
      var a = d.agents.filter(function (x) { return x.lens === l.lens; })[0];
      return Object.assign({ industry: d.name }, a);
    });
    return l;
  });

  class PxVerticals extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      var root = this.attachShadow({ mode: "open" });
      root.innerHTML = "<style>" + BASE_CSS + [
        ".card { border-radius: 16px; background: var(--color-surface); box-shadow: var(--shadow-md); overflow: hidden; }",
        ".tabs { display: flex; gap: 4px; overflow-x: auto; padding: 8px 10px 0; border-bottom: 1px solid var(--color-divider); scrollbar-width: none; }",
        ".tabs::-webkit-scrollbar { display: none; }",
        ".tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 0; }",
        ".tab { all: unset; box-sizing: border-box; cursor: pointer; display: grid; gap: 6px; padding: 20px 26px 18px; color: color-mix(in srgb, var(--color-text) 50%, transparent); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color 0.2s, border-color 0.2s, background 0.2s; }",
        ".tab + .tab { border-left: 1px solid var(--color-divider); }",
        ".tl { font: 500 10.5px/1 'Geist Mono', ui-monospace, Menlo, monospace; letter-spacing: 0.12em; text-transform: uppercase; }",
        ".tq { font-family: var(--font-heading); font-weight: 700; font-size: 22px; letter-spacing: -0.02em; white-space: nowrap; }",
        ".tab[aria-selected='true'] .tl { color: var(--color-accent-800); }",
        ".tab:hover { color: var(--color-text); }",
        ".tab:focus-visible { outline: 2px solid var(--color-accent-800); outline-offset: -2px; }",
        ".tab[aria-selected='true'] { color: var(--color-text); border-bottom-color: var(--color-accent-800); background: color-mix(in srgb, var(--glow) 10%, transparent); }",
        ".body { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 36px; padding: 30px 30px 32px; align-items: start; }",
        ".demo { max-width: 460px; width: 100%; justify-self: end; }",
        ".lead { font-size: 15.5px; line-height: 1.5; color: color-mix(in srgb, var(--color-text) 72%, transparent); margin: 2px 0 18px; max-width: 40ch; }",
        ".rows { display: grid; gap: 8px; }",
        ".row { all: unset; box-sizing: border-box; position: relative; cursor: pointer; display: grid; gap: 4px; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--color-divider); transition: background 0.25s, border-color 0.25s; }",
        ".row:hover { border-color: color-mix(in srgb, var(--color-text) 30%, transparent); }",
        ".row:focus-visible { outline: 2px solid var(--color-accent-800); outline-offset: 2px; }",
        ".row[aria-selected='true'] { background: color-mix(in srgb, var(--glow) 18%, transparent); border-color: color-mix(in srgb, var(--glow) 80%, transparent); }",
        ".ind { font-family: var(--font-heading); font-weight: 700; font-size: 17px; letter-spacing: -0.015em; }",
        ".agent { font-size: 14.5px; color: color-mix(in srgb, var(--color-text) 70%, transparent); }",
        ".bar { position: absolute; left: 18px; right: 18px; bottom: 0; height: 2px; }",
        ".bar i { display: block; height: 100%; width: 0; background: var(--color-accent-800); }",
        ".under { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; margin-top: 16px; }",
        ".prompt { font: 14px/1.55 'Geist Mono', ui-monospace, Menlo, monospace; padding: 12px 14px; border-radius: 10px; background: var(--color-bg); border: 1px solid var(--color-divider); min-height: 50px; }",
        ".prompt b { font-weight: 500; color: var(--color-accent-800); margin-right: 8px; }",
        ".alertbox { display: flex; gap: 10px; align-items: flex-start; padding: 11px 14px; border-radius: 10px; font-size: 14px; line-height: 1.45; border: 1px solid var(--color-divider); color: color-mix(in srgb, var(--color-text) 50%, transparent); transition: background 0.3s, color 0.3s, border-color 0.3s; }",
        ".alertbox i { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex: none; background: color-mix(in srgb, var(--color-text) 25%, transparent); transition: background 0.3s, box-shadow 0.3s; }",
        ".alertbox.on { color: var(--color-text); border-color: color-mix(in srgb, #ef5a3c 45%, transparent); background: color-mix(in srgb, #ef5a3c 7%, transparent); }",
        ".alertbox.on i { background: #ef5a3c; box-shadow: 0 0 0 4px color-mix(in srgb, #ef5a3c 22%, transparent); }",
        "@media (max-width: 900px) { .body { grid-template-columns: minmax(0, 1fr); padding: 18px 16px 22px; gap: 14px; } .demo { max-width: none; justify-self: stretch; } .tab { padding: 14px 12px; } .tq { font-size: 16px; } }",
        /* Phones: industries become a swipeable chip strip so the scene sits right under whatever was tapped. */
        "@media (max-width: 620px) { .tab { padding: 12px 10px; gap: 5px; } .tq { font-size: 14.5px; }" +
          " .lead { font-size: 14.5px; margin: 0 0 12px; }" +
          " .rows { position: relative; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 0 16px 2px; scroll-padding: 0 16px; }" +
          " .rows::-webkit-scrollbar { display: none; }" +
          " .row { flex: none; padding: 9px 14px 10px; border-radius: 999px; } .ind { font-size: 14px; white-space: nowrap; } .agent { display: none; } .bar { left: 14px; right: 14px; }" +
          " .under { margin-top: 12px; } }"
      ].join("\n") + "</style>" +
        '<div class="card"><div class="tabs" role="tablist" aria-label="Questions"></div>' +
        '<div class="body"><div><div class="lead"></div><div class="rows" role="tablist" aria-label="Industries"></div></div>' +
        '<div class="demo"><div class="screen"><canvas width="160" height="90" role="img"></canvas><div class="cap"><span class="l"></span><span class="r"></span></div></div>' +
        '<div class="under"><div class="prompt"><b>Prompt</b><span class="typed"></span></div><div class="alertbox"><i></i><span class="alert"></span></div></div></div></div></div>';

      var q = function (sel) { return root.querySelector(sel); };
      var tabs = q(".tabs"), rowsEl = q(".rows"), canvas = q("canvas");
      var li = 0, ag = 0, holdUntil = 0, tabBtns = [], rowBtns = [], rowBars = [], lastKey = "";
      LENSES.forEach(function (l, i) {
        var b = document.createElement("button");
        b.className = "tab"; b.type = "button"; b.setAttribute("role", "tab"); b.id = "px-lens-" + i;
        b.innerHTML = '<span class="tl"></span><span class="tq"></span>';
        b.querySelector(".tl").textContent = l.lens; b.querySelector(".tq").textContent = l.q;
        b.addEventListener("click", function () { holdUntil = performance.now() + 20000; pickLens(i); });
        tabs.appendChild(b); tabBtns.push(b);
      });
      tabs.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault(); holdUntil = performance.now() + 20000;
        pickLens((li + d + LENSES.length) % LENSES.length); tabBtns[li].focus();
      });
      var player = new Player(canvas, function (st, t, L) {
        var a = LENSES[li].agents[ag], typed = reduce ? 1 : clamp(t / 1.8, 0, 1);
        var txt = a.prompt.slice(0, Math.round(a.prompt.length * typed)), key = txt + "|" + !!st.alert;
        rowBars[ag].style.width = reduce ? "100%" : Math.min(100, (t / L) * 100) + "%";
        if (!reduce && t >= L && performance.now() > holdUntil) { pickAgent((ag + 1) % rowBtns.length); return; }
        if (key === lastKey) return;
        lastKey = key;
        var el = q(".typed"); el.textContent = txt; el.className = "typed" + (typed < 1 ? " caret" : "");
        q(".alertbox").classList.toggle("on", !!st.alert);
        var r = q(".cap .r"); r.textContent = st.alert ? "Alert sent" : "Watching"; r.className = "r" + (st.alert ? " alert" : "");
      });
      function pickAgent(j) {
        ag = j; lastKey = "";
        var a = LENSES[li].agents[j];
        rowBtns.forEach(function (b, k) { b.setAttribute("aria-selected", String(k === j)); b.tabIndex = k === j ? 0 : -1; rowBars[k].style.width = "0"; });
        if (rowsEl.scrollWidth > rowsEl.clientWidth) rowsEl.scrollTo({ left: rowBtns[j].offsetLeft - 16, behavior: reduce ? "auto" : "smooth" });
        canvas.setAttribute("aria-label", a.industry + ", " + a.text + ": example scene");
        q(".cap .l").textContent = a.cam;
        q(".alert").textContent = a.alert;
        player.set(a.scene, a.opts);
      }
      function pickLens(i) {
        li = i;
        var l = LENSES[i];
        tabBtns.forEach(function (b, k) { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
        q(".lead").textContent = l.lead;
        rowsEl.innerHTML = ""; rowBtns = []; rowBars = [];
        l.agents.forEach(function (a, j) {
          var b = document.createElement("button");
          b.className = "row"; b.type = "button"; b.setAttribute("role", "tab");
          b.innerHTML = '<span class="ind"></span><span class="agent"></span><span class="bar"><i></i></span>';
          b.querySelector(".ind").textContent = a.industry;
          b.querySelector(".agent").textContent = a.text;
          b.addEventListener("click", function () { holdUntil = performance.now() + 20000; pickAgent(j); });
          rowsEl.appendChild(b); rowBtns.push(b); rowBars.push(b.querySelector(".bar i"));
        });
        pickAgent(0);
      }
      rowsEl.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault(); holdUntil = performance.now() + 20000;
        pickAgent((ag + d + rowBtns.length) % rowBtns.length); rowBtns[ag].focus();
      });
      pickLens(0);
    }
  }



  /* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 <px-deploy> \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
  /* On-prem / Cloud switch over a simple diagram of where video and inference run. */
  var CAM_ICON = function (x, y) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect x="0" y="-9" width="26" height="18" rx="3" class="node"/><path d="M26 -4l9 -5v18l-9 -5z" class="node"/><circle cx="7" cy="0" r="2" class="dot"/></g>';
  };
  var SYSTEMS = function () {
    return ['MES', 'ERP', 'Team alerts'].map(function (t, i) {
      var y = 95 + i * 50;
      return '<rect x="470" y="' + (y - 16) + '" width="120" height="32" rx="8" class="node"/><text x="530" y="' + (y + 5) + '" class="lbl">' + t + '</text>';
    }).join("");
  };
  var DEPLOY_MODES = {
    onprem: {
      label: "On-prem",
      note: "Video, inference and actions all stay inside your site. Nothing has to leave your network.",
      svg: function () {
        return '<rect x="8" y="22" width="604" height="226" rx="16" class="site"/>' +
          '<text x="28" y="46" class="tag">YOUR SITE \u00b7 YOUR NETWORK</text>' +
          CAM_ICON(40, 95) + CAM_ICON(40, 145) + CAM_ICON(40, 195) +
          '<path d="M80 95 H140 V145 H206 M80 145 H206 M80 195 H140 V145" class="flow"/>' +
          '<rect x="206" y="104" width="190" height="82" rx="12" class="core"/>' +
          '<text x="301" y="138" class="core-t">PerceptX edge</text><text x="301" y="160" class="core-s">VLM \u00b7 on site</text>' +
          '<path d="M396 145 H440 V95 H470 M440 145 H470 M440 145 V195 H470" class="flow"/>' +
          SYSTEMS();
      }
    },
    cloud: {
      label: "Cloud",
      note: "Cameras stream over a secure link to PerceptX cloud. There's less to run on site.",
      svg: function () {
        return '<rect x="8" y="22" width="190" height="226" rx="16" class="site"/>' +
          '<text x="28" y="46" class="tag">YOUR SITE</text>' +
          CAM_ICON(40, 95) + CAM_ICON(40, 145) + CAM_ICON(40, 195) +
          '<path d="M80 95 H130 V145 H250 M80 145 H130 M80 195 H130 V145" class="flow"/>' +
          '<g transform="translate(224 145)" aria-hidden="true"><rect x="-11" y="-11" width="22" height="22" rx="6" class="node"/><rect x="-5" y="-2" width="10" height="7" rx="1.5" class="dot"/><path d="M-3 -2 v-2.5 a3 3 0 0 1 6 0 v2.5" class="lock"/></g>' +
          '<rect x="250" y="104" width="170" height="82" rx="41" class="core"/>' +
          '<text x="335" y="138" class="core-t">PerceptX cloud</text><text x="335" y="160" class="core-s">VLM \u00b7 managed</text>' +
          '<path d="M420 145 H440 V95 H470 M440 145 H470 M440 145 V195 H470" class="flow"/>' +
          SYSTEMS();
      }
    }
  };

  class PxDeploy extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      var root = this.attachShadow({ mode: "open" });
      root.innerHTML = "<style>" + [
        ":host { display: block; color: var(--color-text); font-family: var(--font-body); }",
        ".seg { display: inline-flex; padding: 4px; gap: 4px; border-radius: 999px; background: color-mix(in srgb, var(--color-text) 6%, transparent); border: 1px solid var(--color-divider); margin-bottom: 22px; }",
        ".seg button { all: unset; cursor: pointer; padding: 7px 16px; border-radius: 999px; font-size: 13px; font-weight: 500; color: color-mix(in srgb, var(--color-text) 60%, transparent); transition: background 0.2s, color 0.2s; }",
        ".seg button:focus-visible { outline: 2px solid var(--color-accent-800); outline-offset: 2px; }",
        ".seg button[aria-pressed='true'] { background: color-mix(in srgb, var(--color-text) 14%, transparent); color: var(--color-text); }",
        "svg { display: block; width: 100%; height: auto; overflow: visible; }",
        ".site { fill: none; stroke: color-mix(in srgb, var(--color-text) 22%, transparent); stroke-width: 1; stroke-dasharray: 5 6; }",
        ".tag { font: 500 11px 'Geist Mono', ui-monospace, Menlo, monospace; letter-spacing: 0.12em; fill: color-mix(in srgb, var(--color-text) 50%, transparent); }",
        ".lock { fill: none; stroke: var(--glow); stroke-width: 1.4; }",
        ".node { fill: none; stroke: color-mix(in srgb, var(--color-text) 22%, transparent); stroke-width: 1; }",
        ".dot { fill: var(--glow); }",
        ".flow { fill: none; stroke: color-mix(in srgb, var(--color-text) 28%, transparent); stroke-width: 1.2; stroke-dasharray: 2 5; stroke-linecap: round; }",
        ".core { fill: color-mix(in srgb, var(--glow) 6%, transparent); stroke: color-mix(in srgb, var(--glow) 55%, transparent); stroke-width: 1; }",
        ".core-t { font: 600 16px var(--font-heading); text-anchor: middle; fill: var(--color-text); }",
        ".core-s { font: 500 11px 'Geist Mono', ui-monospace, Menlo, monospace; letter-spacing: 0.06em; text-anchor: middle; fill: var(--color-accent-800); }",
        ".lbl { font: 500 13px var(--font-body); text-anchor: middle; fill: var(--color-text); }",
        ".note { margin: 18px 0 0; font-size: 14px; line-height: 1.55; color: color-mix(in srgb, var(--color-text) 72%, transparent); min-height: 3em; }"
      ].join("\n") + "</style>" +
        '<div class="seg" role="group" aria-label="Deployment option"></div>' +
        '<svg viewBox="0 0 620 262" role="img"></svg><p class="note"></p>';
      var seg = root.querySelector(".seg"), svg = root.querySelector("svg"), note = root.querySelector(".note"), btns = [];
      Object.keys(DEPLOY_MODES).forEach(function (k) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = DEPLOY_MODES[k].label; b.id = "px-deploy-" + k;
        b.addEventListener("click", function () { pick(k); });
        seg.appendChild(b); btns.push([k, b]);
      });
      function pick(k) {
        var m = DEPLOY_MODES[k];
        btns.forEach(function (p) { p[1].setAttribute("aria-pressed", String(p[0] === k)); });
        svg.innerHTML = m.svg();
        svg.setAttribute("aria-label", m.label + " deployment: " + m.note);
        note.textContent = m.note;
      }
      pick("onprem");
    }
  }

  if (!customElements.get("px-verticals")) customElements.define("px-verticals", PxVerticals);
  if (!customElements.get("px-deploy")) customElements.define("px-deploy", PxDeploy);
})();
