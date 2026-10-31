/**
 * BlipTalk Studio — minimal store-only ZIP writer.
 *
 * WAVs are already large and do not compress much, so the archive uses the
 * ZIP "store" method and avoids a compression dependency. Supports the classic
 * 32-bit archive format (no ZIP64); the blip pack is a handful of small files.
 */

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const END_HEADER_SIG = 0x06054b50;
const VERSION_NEEDED = 20;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

/** Standard CRC-32 (the ZIP polynomial). */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error('ZIP entries must be Uint8Array, ArrayBuffer or a typed array.');
}

function dosDateTime(date) {
  const safe = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  let year = safe.getFullYear();
  if (year < 1980) year = 1980;
  if (year > 2107) year = 2107;
  const month = safe.getMonth() + 1;
  const day = safe.getDate();
  const time =
    (safe.getHours() << 11) | (safe.getMinutes() << 5) | Math.floor(safe.getSeconds() / 2);
  const dateBits = ((year - 1980) << 9) | (month << 5) | day;
  return { time, date: dateBits };
}

/**
 * Build a ZIP archive in memory.
 *
 * @param {Array<{name:string, data:Uint8Array|ArrayBuffer}>} files
 * @param {{date?: Date}} [options]
 * @returns {Uint8Array}
 */
export function createZipBytes(files, { date = new Date() } = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('ZIP needs at least one file.');
  }

  const prepared = files.map((file) => {
    if (!file || typeof file.name !== 'string' || file.name.length === 0) {
      throw new Error('Every ZIP entry needs a name.');
    }
    const data = toBytes(file.data);
    if (data.byteLength > MAX_UINT32) {
      throw new Error(`ZIP entry is too large: ${file.name}`);
    }
    return { name: file.name, data, crc: crc32(data), nameBytes: new TextEncoder().encode(file.name) };
  });

  const names = new Set();
  for (const file of prepared) {
    if (names.has(file.name)) throw new Error(`Duplicate ZIP entry name: ${file.name}`);
    if (file.nameBytes.length > MAX_UINT16) throw new Error(`ZIP entry name is too long: ${file.name}`);
    names.add(file.name);
  }

  const { time, date: dateBits } = dosDateTime(date);
  const localSize = prepared.reduce(
    (total, file) => total + 30 + file.nameBytes.length + file.data.length,
    0,
  );
  const centralSize = prepared.reduce(
    (total, file) => total + 46 + file.nameBytes.length,
    0,
  );
  const totalSize = localSize + centralSize + 22;
  if (totalSize > MAX_UINT32) throw new Error('ZIP archive is too large.');

  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);
  const central = [];
  let offset = 0;

  for (const file of prepared) {
    const localOffset = offset;
    view.setUint32(offset, LOCAL_HEADER_SIG, true);
    offset += 4;
    view.setUint16(offset, VERSION_NEEDED, true);
    offset += 2;
    view.setUint16(offset, UTF8_FLAG, true);
    offset += 2;
    view.setUint16(offset, STORE_METHOD, true);
    offset += 2;
    view.setUint16(offset, time, true);
    offset += 2;
    view.setUint16(offset, dateBits, true);
    offset += 2;
    view.setUint32(offset, file.crc, true);
    offset += 4;
    view.setUint32(offset, file.data.length, true);
    offset += 4;
    view.setUint32(offset, file.data.length, true);
    offset += 4;
    view.setUint16(offset, file.nameBytes.length, true);
    offset += 2;
    view.setUint16(offset, 0, true); // extra field length
    offset += 2;
    out.set(file.nameBytes, offset);
    offset += file.nameBytes.length;
    out.set(file.data, offset);
    offset += file.data.length;
    central.push({ ...file, localOffset });
  }

  const centralOffset = offset;
  for (const file of central) {
    view.setUint32(offset, CENTRAL_HEADER_SIG, true);
    offset += 4;
    view.setUint16(offset, VERSION_NEEDED, true); // version made by
    offset += 2;
    view.setUint16(offset, VERSION_NEEDED, true); // version needed
    offset += 2;
    view.setUint16(offset, UTF8_FLAG, true);
    offset += 2;
    view.setUint16(offset, STORE_METHOD, true);
    offset += 2;
    view.setUint16(offset, time, true);
    offset += 2;
    view.setUint16(offset, dateBits, true);
    offset += 2;
    view.setUint32(offset, file.crc, true);
    offset += 4;
    view.setUint32(offset, file.data.length, true);
    offset += 4;
    view.setUint32(offset, file.data.length, true);
    offset += 4;
    view.setUint16(offset, file.nameBytes.length, true);
    offset += 2;
    view.setUint16(offset, 0, true); // extra length
    offset += 2;
    view.setUint16(offset, 0, true); // comment length
    offset += 2;
    view.setUint16(offset, 0, true); // disk number start
    offset += 2;
    view.setUint16(offset, 0, true); // internal attributes
    offset += 2;
    view.setUint32(offset, 0, true); // external attributes
    offset += 4;
    view.setUint32(offset, file.localOffset, true);
    offset += 4;
    out.set(file.nameBytes, offset);
    offset += file.nameBytes.length;
  }

  const centralSizeActual = offset - centralOffset;
  view.setUint32(offset, END_HEADER_SIG, true);
  offset += 4;
  view.setUint16(offset, 0, true); // this disk
  offset += 2;
  view.setUint16(offset, 0, true); // central directory disk
  offset += 2;
  view.setUint16(offset, prepared.length, true);
  offset += 2;
  view.setUint16(offset, prepared.length, true);
  offset += 2;
  view.setUint32(offset, centralSizeActual, true);
  offset += 4;
  view.setUint32(offset, centralOffset, true);
  offset += 4;
  view.setUint16(offset, 0, true); // comment length

  return out;
}

/** Build a downloadable `application/zip` Blob. */
export function createZipBlob(files, options) {
  return new Blob([createZipBytes(files, options)], { type: 'application/zip' });
}
