'use strict';
/* Reads a firm's colours from their own site (stylesheets, inline styles, theme-color) so the concept
   looks like them. Pure functions, no network. Returns hex colours that are safe to put in CSS. */

function expandHex(h) {
  h = h.replace('#', '').toLowerCase();
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(function (c) { return c + c; }).join('');
  return h.length >= 6 ? h.slice(0, 6) : null;
}
function toRgb(hex) {
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}
function toHex(rgb) {
  function p(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
  return '#' + p(rgb.r) + p(rgb.g) + p(rgb.b);
}
function hsl(rgb) {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: h, s: s, l: l };
}
function luminance(rgb) {
  function c(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  return 0.2126 * c(rgb.r) + 0.7152 * c(rgb.g) + 0.0722 * c(rgb.b);
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function mix(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}
function hueDistance(a, b) { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

const DEFAULT = { primary: '#1f3a5f', accent: '#c8562a', found: false };

function extractBrand(cssTexts, homeHtml) {
  const text = (cssTexts || []).map(function (c) { return c.text || ''; }).join('\n') + '\n' + String(homeHtml || '');
  const counts = Object.create(null);
  function add(hex, weight) {
    const h = expandHex(hex);
    if (!h) return;
    counts[h] = (counts[h] || 0) + weight;
  }
  let m;
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g;
  while ((m = hexRe.exec(text))) { if ([3, 4, 6, 8].indexOf(m[1].length) !== -1) add(m[1], 1); }
  const rgbRe = /rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/g;
  while ((m = rgbRe.exec(text))) { add(toHex({ r: +m[1], g: +m[2], b: +m[3] }).slice(1), 1); }
  // the page's own statement of its colour counts for a lot
  const theme = String(homeHtml || '').match(/<meta[^>]+name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,6})["']/i) ||
    String(homeHtml || '').match(/<meta[^>]+content=["'](#[0-9a-fA-F]{3,6})["'][^>]*name=["']theme-color["']/i);
  if (theme) add(theme[1], 25);
  // named custom properties (--primary, --brand, --accent) count for a lot too
  const varRe = /--(?:[a-z-]*?)(primary|brand|accent|main|theme|color-1)[a-z0-9-]*\s*:\s*(#[0-9a-fA-F]{3,8})/gi;
  while ((m = varRe.exec(text))) add(m[2], 12);

  const list = Object.keys(counts).map(function (h) {
    const rgb = toRgb(h), c = hsl(rgb);
    return { hex: h, rgb: rgb, hsl: c, n: counts[h], lum: luminance(rgb) };
  }).filter(function (c) {
    return c.hsl.s >= 0.22 && c.hsl.l >= 0.12 && c.hsl.l <= 0.78; // skip greys, near white and near black
  });
  if (!list.length) return Object.assign({}, DEFAULT, derive(DEFAULT.primary, DEFAULT.accent));

  // most used colour that is clearly a colour, weighted a little toward stronger colours
  list.sort(function (a, b) { return (b.n * (0.6 + b.hsl.s)) - (a.n * (0.6 + a.hsl.s)); });
  const primary = list[0];
  const second = list.find(function (c) { return c !== primary && hueDistance(c.hsl.h, primary.hsl.h) > 35; });
  const accentHex = second ? '#' + second.hex : null;
  return Object.assign({ found: true }, derive('#' + primary.hex, accentHex));
}

function derive(primaryHex, accentHex) {
  const p = toRgb(expandHex(primaryHex));
  let a = accentHex ? toRgb(expandHex(accentHex)) : null;
  if (!a) { // no second colour on their site: a lighter, warmer shift of the first
    const h = hsl(p);
    const k = h.l > 0.5 ? 0.35 : 0.45;
    a = mix(p, { r: 255, g: 255, b: 255 }, k);
  }
  const white = { r: 255, g: 255, b: 255 };
  const ink = { r: 17, g: 24, b: 39 };
  const dark = mix(p, { r: 8, g: 10, b: 16 }, 0.82);
  const soft = mix(p, white, 0.92);
  const onPrimary = contrast(p, white) >= contrast(p, ink) ? white : ink;
  const onAccent = contrast(a, white) >= contrast(a, ink) ? white : ink;
  // a version of the primary that is readable as text on a white page
  let text = p, guard = 0;
  while (contrast(text, white) < 4.5 && guard++ < 20) text = mix(text, { r: 0, g: 0, b: 0 }, 0.12);
  return {
    primary: toHex(p), accent: toHex(a), dark: toHex(dark), soft: toHex(soft), ink: toHex(ink),
    onPrimary: toHex(onPrimary), onAccent: toHex(onAccent), text: toHex(text)
  };
}

module.exports = { extractBrand, derive, contrast, toRgb };
