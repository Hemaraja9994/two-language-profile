/* ASLP App Kit: shared helpers (v1). Every app carries its own copy of this file.
   In plain words: saving to the device, translations, downloads, the online/offline
   pill, small pop-up messages and offline support. Apps call KIT.start() once. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0, 10); }; // local date

/* Device storage that never crashes; falls back to memory if the browser blocks it */
const store = (() => { const mem = {}; let ok = true;
  try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); } catch (e) { ok = false; }
  return { ok,
    get(k, d){ try { const v = ok ? localStorage.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v){ const s = JSON.stringify(v); try { ok ? localStorage.setItem(k, s) : (mem[k] = s); } catch (e) { mem[k] = s; } } };
})();

/* Translations */
const LANG_NAMES = {en:"English", kn:"ಕನ್ನಡ", te:"తెలుగు", hi:"हिन्दी"};
const KIT_STR = {
  en:{ netOnline:"Online", netOffline:"Offline – still working", builtBy:"Built by", language:"Language", reviewNote:"Translations are drafts and are being reviewed by native speakers." },
  kn:{ netOnline:"ಆನ್‌ಲೈನ್", netOffline:"ಆಫ್‌ಲೈನ್ – ಕೆಲಸ ಮುಂದುವರಿದಿದೆ", builtBy:"ರಚನೆ", language:"ಭಾಷೆ", reviewNote:"ಅನುವಾದಗಳು ಕರಡು ರೂಪದಲ್ಲಿವೆ; ಸ್ಥಳೀಯ ಭಾಷಿಕರು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದಾರೆ." },
  te:{ netOnline:"ఆన్‌లైన్", netOffline:"ఆఫ్‌లైన్ – పని కొనసాగుతోంది", builtBy:"రూపకల్పన", language:"భాష", reviewNote:"అనువాదాలు చిత్తు ప్రతులు; స్థానిక భాషా నిపుణులు సమీక్షిస్తున్నారు." },
  hi:{ netOnline:"ऑनलाइन", netOffline:"ऑफ़लाइन – काम जारी है", builtBy:"निर्माता", language:"भाषा", reviewNote:"अनुवाद मसौदा हैं; मूल भाषी इनकी समीक्षा कर रहे हैं।" }
};
let LANG = "en", I18N = {en:{}};
function t(k, vars){
  let s = I18N[LANG]?.[k] ?? KIT_STR[LANG]?.[k] ?? I18N.en?.[k] ?? KIT_STR.en[k] ?? k;
  if (vars && typeof s === "string") for (const v in vars) s = s.split("{" + v + "}").join(vars[v]);
  return s;
}
const pick = o => (o && (o[LANG] ?? o.en)) ?? "";
const locale = () => LANG === "en" ? "en-IN" : LANG + "-IN";
const fmtDate = (d, opts) => d ? new Date(d).toLocaleDateString(locale(), opts || {day:"numeric", month:"short", year:"numeric"}) : "–";

/* Messages and downloads */
function toast(msg){ const el = $("#toast"); if (!el) return; el.textContent = msg; el.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 2400); }
function saveFile(content, filename, type){
  const blob = content instanceof Blob ? content : new Blob([content], {type});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function downloadCSV(rows, filename){ // BOM so Excel shows Kannada, Telugu and Hindi correctly
  saveFile("﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n"), filename, "text/csv;charset=utf-8");
}
const downloadJSON = (obj, filename) => saveFile(JSON.stringify(obj, null, 2), filename, "application/json");
const readFileText = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });

/* Print only the #printArea section (filled by the app just before printing) */
function printArea(html){
  $("#printArea").innerHTML = html; document.body.classList.add("print-area");
  const done = () => { document.body.classList.remove("print-area"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done); window.print();
}

/* Small line chart (SVG). series: [{label, color, points:[{x:Date|number, y:number}]}] */
function lineChart(series, {height = 220, yLabel = "", yMin, yMax, invert = false} = {}){
  const W = 640, H = height, L = 44, R = 12, T = 12, B = 28;
  const pts = series.flatMap(s => s.points);
  if (!pts.length) return "";
  const xs = pts.map(p => +p.x), ys = pts.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1){ x0 -= 1; x1 += 1; }
  let y0 = yMin ?? Math.min(...ys), y1 = yMax ?? Math.max(...ys); if (y0 === y1){ y0 -= 1; y1 += 1; }
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - R);
  const Y = y => invert ? T + (y - y0) / (y1 - y0) * (H - T - B) : H - B - (y - y0) / (y1 - y0) * (H - T - B);
  const ticks = 4; let g = "";
  for (let i = 0; i <= ticks; i++){ const v = y0 + (y1 - y0) * i / ticks, y = Y(v);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width=".7"/><text x="${L - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${Math.round(v * 10) / 10}</text>`; }
  const isDate = pts[0].x instanceof Date;
  [x0, x1].forEach((x, i) => { g += `<text x="${X(x)}" y="${H - 8}" text-anchor="${i ? "end" : "start"}" font-size="11" fill="var(--muted)">${isDate ? esc(fmtDate(x, {day:"numeric", month:"short"})) : x}</text>`; });
  const lines = series.map(s => { const sp = s.points.slice().sort((a, b) => a.x - b.x);
    return `<path d="${sp.map((p, i) => (i ? "L" : "M") + X(+p.x) + " " + Y(p.y)).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2"/>` +
      sp.map(p => `<circle cx="${X(+p.x)}" cy="${Y(p.y)}" r="3.5" fill="var(--surface)" stroke="${s.color}" stroke-width="2"/>`).join(""); }).join("");
  const legend = series.length > 1 ? `<div class="small-text" style="display:flex;gap:14px;flex-wrap:wrap">${series.map(s => `<span><span style="display:inline-block;width:12px;height:3px;background:${s.color};vertical-align:middle;margin-right:5px"></span>${esc(s.label)}</span>`).join("")}</div>` : "";
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${esc(yLabel)}">${g}${lines}${yLabel ? `<text x="4" y="12" font-size="11" fill="var(--muted)">${esc(yLabel)}</text>` : ""}</svg>${legend}`;
}

/* Start an app: language menu, translated labels, online pill, credit line, offline support */
const KIT = {
  author: "Hemaraja Nayaka S",
  affiliation: "Department of Audiology & Speech-Language Pathology, Yenepoya Medical College Hospital, Mangaluru",
  start({ i18n, render, version = "0.1.0" }){
    I18N = i18n; const langs = Object.keys(i18n);
    const nav2 = (navigator.language || "en").slice(0, 2);
    LANG = store.get("aslp-kit-lang", null);
    if (!langs.includes(LANG)) LANG = langs.includes(nav2) ? nav2 : "en";
    const sel = $("#lang");
    if (sel){
      if (langs.length < 2){ sel.hidden = true; const lb = $('label[for="lang"]'); if (lb) lb.hidden = true; }
      else { sel.innerHTML = langs.map(l => `<option value="${l}">${LANG_NAMES[l]}</option>`).join("");
        sel.addEventListener("change", e => { LANG = e.target.value; store.set("aslp-kit-lang", LANG); KIT.apply(); }); }
    }
    const net = () => { const n = $("#net"); if (!n) return; const on = navigator.onLine; n.dataset.state = on ? "online" : "offline"; n.textContent = on ? t("netOnline") : t("netOffline"); };
    KIT.apply = () => {
      document.documentElement.lang = LANG;
      $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
      $$("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
      if (sel && !sel.hidden) sel.value = LANG;
      const c = $("#credit"); if (c) c.textContent = `${t("builtBy")}: ${KIT.author}, ${KIT.affiliation}. v${version}`;
      net(); render();
    };
    window.addEventListener("online", net); window.addEventListener("offline", net);
    KIT.apply();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http"))
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
};
