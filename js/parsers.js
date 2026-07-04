// ── CSV Parser ────────────────────────────────────────────────
function csvRowToArr(line) {
  const res = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { res.push(cur); cur = ''; }
    else cur += c;
  }
  res.push(cur);
  return res;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = csvRowToArr(lines[0]);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = csvRowToArr(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] || '').trim(); });
    out.push(obj);
  }
  return out;
}

// ── XLSX Parser ───────────────────────────────────────────────
// Pure JS: parses ZIP structure, decompresses with DecompressionStream,
// and parses XML with DOMParser. No external libraries required.
async function parseXLSX(buf) {
  const bytes = new Uint8Array(buf);
  const view  = new DataView(buf);

  // Locate End of Central Directory record
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Archivo XLSX inválido (no es un ZIP)');

  const cdCount  = view.getUint16(eocd + 8,  true);
  const cdOffset = view.getUint32(eocd + 16, true);

  // Parse Central Directory to locate each file entry
  const entries = {};
  let pos = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method     = view.getUint16(pos + 10, true);
    const compSize   = view.getUint32(pos + 20, true);
    const nameLen    = view.getUint16(pos + 28, true);
    const extraLen   = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOff   = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));

    const lNameLen  = view.getUint16(localOff + 26, true);
    const lExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;

    entries[name] = { method, data: bytes.subarray(dataStart, dataStart + compSize) };
    pos += 46 + nameLen + extraLen + commentLen;
  }

  async function inflate(entry) {
    if (entry.method === 0) return new TextDecoder().decode(entry.data);
    const ds = new DecompressionStream('deflate-raw');
    const wr = ds.writable.getWriter();
    const rd = ds.readable.getReader();
    wr.write(entry.data); wr.close();
    const chunks = [];
    for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); }
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0; for (const c of chunks) { out.set(c, off); off += c.length; }
    return new TextDecoder().decode(out);
  }

  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

  // Shared strings table
  const sharedStrings = [];
  const ssEntry = entries['xl/sharedStrings.xml'] || entries['sharedStrings.xml'];
  if (ssEntry) {
    const xml = await inflate(ssEntry);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    for (const si of doc.getElementsByTagNameNS(NS, 'si')) {
      const ts = si.getElementsByTagNameNS(NS, 't');
      sharedStrings.push(Array.from(ts).map(t => t.textContent).join(''));
    }
  }

  // First worksheet
  const sheetEntry = entries['xl/worksheets/sheet1.xml'] || entries['worksheets/sheet1.xml'];
  if (!sheetEntry) throw new Error('No se encontró la hoja en el XLSX');

  const sheetXml = await inflate(sheetEntry);
  const sheet    = new DOMParser().parseFromString(sheetXml, 'text/xml');

  const rawRows = [];
  for (const row of sheet.getElementsByTagNameNS(NS, 'row')) {
    const obj = {};
    for (const cell of row.getElementsByTagNameNS(NS, 'c')) {
      const ref  = cell.getAttribute('r') || '';
      const type = cell.getAttribute('t') || 'n';
      const col  = ref.replace(/\d/g, '');
      const vEl  = cell.getElementsByTagNameNS(NS, 'v')[0];
      if (!vEl) continue;
      let val = vEl.textContent;
      if (type === 's') val = sharedStrings[parseInt(val)] ?? '';
      obj[col] = val;
    }
    rawRows.push(obj);
  }
  if (rawRows.length < 2) return [];

  const headerRow = rawRows[0];
  const colKeys   = Object.keys(headerRow);
  return rawRows.slice(1).map(row => {
    const out = {};
    for (const col of colKeys) {
      if (headerRow[col]) out[headerRow[col]] = row[col] ?? '';
    }
    return out;
  }).filter(r => Object.values(r).some(v => v));
}
