// aiOS Sheets engine: formulas, CSV, and a dependency-free XLSX reader/writer. MIT.
(function (G) {
  const S = { currency: "$" };
  // ---------- formulas (Excel syntax with {key} placeholders) ----------
  const FN = {
    IF: (c, a, b) => (c ? a : b), AND: (...a) => a.every(Boolean), OR: (...a) => a.some(Boolean),
    ROUND: (v, d = 0) => { const p = 10 ** d; return Math.round((+v || 0) * p) / p; },
    IFERROR: (v, alt) => (typeof v === "number" && !isFinite(v)) || (typeof v === "number" && isNaN(v)) ? alt : v,
    MIN: Math.min, MAX: Math.max, ABS: Math.abs,
  };
  function toJs(f) {
    let out = "", i = 0;
    while (i < f.length) {
      const ch = f[i];
      if (ch === '"') { const j = f.indexOf('"', i + 1); out += JSON.stringify(f.slice(i + 1, j)); i = j + 1; continue; }
      if (ch === "{") { const j = f.indexOf("}", i); out += `R(${JSON.stringify(f.slice(i + 1, j))})`; i = j + 1; continue; }
      if (ch === "<" && f[i + 1] === ">") { out += "!="; i += 2; continue; }
      if (ch === "=" && !"<>!=".includes(f[i - 1] || "") && f[i + 1] !== "=") { out += "=="; i++; continue; }
      if (ch === "&") { out += "+''+"; i++; continue; }
      out += ch; i++;
    }
    return out;
  }
  const cache = {};
  S.compile = f => cache[f] || (cache[f] = new Function("R", ...Object.keys(FN), "return (" + toJs(f) + ");"));
  const numeric = t => ["number", "money", "pct", "num2", "int"].includes(t);
  S.numeric = numeric;
  S.computeRow = (tool, row) => {
    const out = { ...row };
    const types = Object.fromEntries(tool.columns.map(c => [c.key, c.type === "formula" ? (c.fmt || "text") : c.type]));
    const R = k => { const v = out[k]; if (numeric(types[k])) return v === "" || v == null ? 0 : +v; return v == null ? "" : v; };
    for (const c of tool.columns) if (c.type === "formula") {
      try { out[c.key] = S.compile(c.f)(R, ...Object.values(FN)); } catch (e) { out[c.key] = "#ERR"; }
    }
    return out;
  };
  S.kpi = (expr, rows) => { // SUM(col), COUNT(col), AVG(col) with arithmetic
    const js = expr.replace(/(SUM|COUNT|AVG)\((\w+)\)/g, (_, fn, k) => `A(${JSON.stringify(fn)},${JSON.stringify(k)})`);
    const A = (fn, k) => { const v = rows.map(r => r[k]).filter(x => x !== "" && x != null);
      if (fn === "COUNT") return v.length; const s = v.reduce((a, b) => a + (+b || 0), 0); return fn === "SUM" ? s : s / (v.length || 1); };
    try { const r = new Function("A", "return " + js)(A); return isFinite(r) ? r : 0; } catch { return 0; }
  };
  S.fmt = (v, t) => {
    if (v === "" || v == null) return "";
    if (typeof v === "string" && !numeric(t)) return v;
    const n = +v; if (isNaN(n)) return String(v);
    if (t === "pct") return (n * 100).toFixed(1) + "%";
    if (t === "money") return (n < 0 ? "-" : "") + S.currency + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (t === "num2") return n.toFixed(2);
    if (t === "int") return Math.round(n).toLocaleString();
    return typeof v === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v);
  };
  S.parseInput = (s, t) => {
    s = String(s).trim(); if (!numeric(t)) return s; if (s === "") return "";
    let n = parseFloat(s.replace(/[$,\s]/g, "")); if (isNaN(n)) return "";
    if (t === "pct" && (s.endsWith("%") || n > 1)) n = n / 100; return n;
  };
  // ---------- CSV ----------
  S.toCSV = (tool, rows) => {
    const q = v => { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [tool.columns.map(c => q(c.label)).join(",")].concat(rows.map(r => tool.columns.map(c => q(S.csvVal(r[c.key], c.type === "formula" ? (c.fmt || "text") : c.type))).join(","))).join("\n");
  };
  // Round numbers for export by column type (pct stays a fraction, e.g. 0.2599).
  S.csvVal = (v, t) => {
    if (typeof v !== "number" || !isFinite(v)) return v;
    const d = t === "int" ? 0 : t === "pct" ? 4 : (t === "money" || t === "num2") ? 2 : 4;
    return +v.toFixed(d);
  };
  S.tabName = tool => (tool.tab || tool.title.replace(/\s*\(.*?\)\s*/g, " ").trim()).slice(0, 31).replace(/[\\\/?*\[\]:]/g, "-");
  S.parseCSV = text => {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) { const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true; else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch; }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c !== ""));
  };
  S.matrixToRows = (tool, m, lab) => { // header row matched by label (any offer-type variant, with or without " ƒ") or key
    if (!m || !m.length) return [];
    const hdr = m[0].map(h => String(h).replace(/\s*ƒ$/, "").trim().toLowerCase());
    const names = c => [c.key, c.label, ...(c.alt ? Object.values(c.alt) : []), lab ? lab(c) : c.label].map(x => String(x).toLowerCase());
    const idx = tool.columns.map(c => hdr.findIndex(h => names(c).includes(h)));
    return m.slice(1).map(r => { const o = {}; tool.columns.forEach((c, i) => { if (c.type !== "formula" && idx[i] >= 0) o[c.key] = S.parseInput(r[idx[i]] ?? "", c.type); }); return o; });
  };
  // ---------- XLSX (stored zip writer + deflate-raw reader) ----------
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    for (const [name, data] of files) {
      const nb = enc.encode(name), db = typeof data === "string" ? enc.encode(data) : data, crc = crc32(db);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true); h.setUint16(26, nb.length, true);
      parts.push(new Uint8Array(h.buffer), nb, db);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, db.length, true); c.setUint32(24, db.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + db.length;
    }
    const csz = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  const colL = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
  S.colL = colL;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  S.xlFormula = (tool, f, r) => f.replace(/\{(\w+)\}/g, (_, k) => colL(tool.columns.findIndex(c => c.key === k)) + r);
  S.toXLSX = (tool, rows) => {
    const cell = (ref, v) => v === "" || v == null ? "" : typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
    let x = `<row r="1">${tool.columns.map((c, i) => cell(colL(i) + 1, c.label)).join("")}</row>`;
    rows.forEach((r, j) => { const n = j + 2; const cr = S.computeRow(tool, r);
      x += `<row r="${n}">` + tool.columns.map((c, i) => c.type === "formula"
        ? `<c r="${colL(i)}${n}"${typeof cr[c.key] === "string" ? ' t="str"' : ""}><f>${esc(S.xlFormula(tool, c.f, n))}</f><v>${esc(cr[c.key])}</v></c>`
        : cell(colL(i) + n, r[c.key])).join("") + "</row>"; });
    const ws = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${x}</sheetData></worksheet>`;
    const name = esc(S.tabName(tool));
    return zip([
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
      ["xl/worksheets/sheet1.xml", ws]]);
  };
  async function unzip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), files = {};
    let e = buf.byteLength - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true), dec = new TextDecoder();
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = u8.subarray(ds, ds + csize);
      files[name] = method === 0 ? raw : new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    }
    return files;
  }
  // All worksheets: [{name, m}] in workbook order (m = matrix of cell strings).
  S.readXLSXSheets = async buf => {
    const f = await unzip(buf), dec = new TextDecoder(), P = s => new DOMParser().parseFromString(dec.decode(s), "application/xml");
    const ss = f["xl/sharedStrings.xml"] ? [...P(f["xl/sharedStrings.xml"]).getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent).join("")) : [];
    const rels = {};
    if (f["xl/_rels/workbook.xml.rels"]) for (const r of P(f["xl/_rels/workbook.xml.rels"]).getElementsByTagName("Relationship")) rels[r.getAttribute("Id")] = "xl/" + r.getAttribute("Target").replace(/^\/?xl\//, "").replace(/^\//, "");
    let order = [];
    if (f["xl/workbook.xml"]) for (const sh of P(f["xl/workbook.xml"]).getElementsByTagName("sheet")) {
      const rid = sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      if (rels[rid] && f[rels[rid]]) order.push({ name: sh.getAttribute("name"), path: rels[rid] });
    }
    if (!order.length) order = Object.keys(f).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort().map((p, i) => ({ name: "Sheet" + (i + 1), path: p }));
    return order.map(({ name, path }) => {
      const m = [];
      for (const row of P(f[path]).getElementsByTagName("row")) {
        const r = [];
        for (const c of row.getElementsByTagName("c")) {
          const ref = c.getAttribute("r").replace(/\d+/g, ""); let ci = 0; for (const ch of ref) ci = ci * 26 + ch.charCodeAt(0) - 64; ci--;
          const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0]?.textContent ?? "";
          r[ci] = t === "s" ? ss[+v] : t === "inlineStr" ? [...c.getElementsByTagName("t")].map(x => x.textContent).join("") : v;
        }
        m.push(Array.from(r, x => x ?? ""));
      }
      return { name, m };
    });
  };
  // Pick the worksheet that belongs to this tool (by tab name, title or id), else the first one.
  S.pickSheet = (tool, sheets) => {
    const want = [S.tabName(tool), tool.title.slice(0, 31), tool.id].map(x => x.toLowerCase());
    return sheets.find(s => want.includes(String(s.name).toLowerCase())) || sheets[0];
  };
  S.readXLSX = async (buf, tool) => { const sh = await S.readXLSXSheets(buf); return (tool ? S.pickSheet(tool, sh) : sh[0]).m; };
  G.AIOS_SHEETS = S;
})(typeof window !== "undefined" ? window : globalThis);
