import * as XLSX from 'xlsx';

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/%/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function colIndex(headers, tests) {
  return headers.findIndex((h) => tests.some((t) => t(norm(h))));
}

export function parseRABExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawData.length < 2) {
    throw new Error('The Excel file is empty or does not match the expected template.');
  }

  let headerIndex = -1;
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i] || [];
    if (
      row.some((cell) => {
        const h = norm(cell);
        return h.includes('pekerjaan') || h.includes('nama') || h.includes('bobot') || h === 'kode';
      })
    ) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) headerIndex = 0;

  const headers = (rawData[headerIndex] || []).map((h) => String(h || '').trim());
  const rows = rawData.slice(headerIndex + 1);

  const iKode = colIndex(headers, [(h) => h.includes('kode')]);
  const iNama = colIndex(headers, [(h) => h.includes('pekerjaan') || h.includes('nama')]);
  const iSatuan = colIndex(headers, [(h) => h === 'satuan' || h.includes('unit')]);
  const iVolume = colIndex(headers, [(h) => h.includes('volume') || h.includes('kuantitas')]);
  const iHargaSatuan = colIndex(headers, [(h) => h.includes('harga satuan') || h.includes('harga unit')]);
  const iTotalHarga = colIndex(headers, [(h) => h.includes('jumlah harga') || h.includes('total harga')]);
  const iBobot = colIndex(headers, [(h) => h.includes('bobot') || h === 'persen' || h.includes('bobot persen')]);
  const iEstMulai = colIndex(headers, [(h) => h.includes('estimasi') && h.includes('mulai')]);
  const iEstDurasi = colIndex(headers, [(h) => h.includes('estimasi') && h.includes('durasi')]);
  const weekCols = headers
    .map((h, idx) => ({ idx, n: norm(h) }))
    .filter(({ n }) => n.startsWith('minggu'))
    .sort((a, b) => {
      const na = parseInt(a.n.replace(/\D/g, ''), 10) || 0;
      const nb = parseInt(b.n.replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });

  const items = [];

  rows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    const nama = String(row[iNama >= 0 ? iNama : 1] || '').trim();
    if (!nama || nama.toLowerCase().includes('total')) return;

    const kode = String(row[iKode >= 0 ? iKode : 0] || `${idx + 1}`).trim();
    let bobot = iBobot >= 0 ? parseFloat(row[iBobot]) : NaN;
    const satuan = String(row[iSatuan >= 0 ? iSatuan : -1] || '').trim() || '%';
    const volume = iVolume >= 0 ? parseFloat(row[iVolume]) || 0 : (Number.isFinite(bobot) ? bobot : 0);
    const hargaSatuan = iHargaSatuan >= 0 ? parseFloat(row[iHargaSatuan]) || 0 : 0;
    const totalHarga = iTotalHarga >= 0
      ? parseFloat(row[iTotalHarga]) || 0
      : Number((volume * hargaSatuan).toFixed(2));

    const estMulai = iEstMulai >= 0 ? parseInt(row[iEstMulai], 10) : NaN;
    const estDurasi = iEstDurasi >= 0 ? parseInt(row[iEstDurasi], 10) : NaN;

    const jadwalMingguan = [];
    let weekSum = 0;
    const maxWeek = weekCols.length ? Math.max(...weekCols.map((w) => parseInt(w.n.replace(/\D/g, ''), 10) || 1)) : 0;
    for (let w = 1; w <= maxWeek; w++) {
      const col = weekCols.find((c) => (parseInt(c.n.replace(/\D/g, ''), 10) || 0) === w);
      const val = col ? parseFloat(row[col.idx]) || 0 : 0;
      jadwalMingguan.push(val);
      weekSum += val;
    }

    if ((!Number.isFinite(bobot) || bobot <= 0) && weekSum > 0) {
      bobot = Number(weekSum.toFixed(2));
    }

    items.push({
      kode_pekerjaan: kode,
      nama_pekerjaan: nama,
      satuan,
      volume,
      harga_satuan: hargaSatuan,
      total_harga: totalHarga,
      bobot_persen: Number.isFinite(bobot) && bobot > 0 ? Number(Number(bobot).toFixed(2)) : 0,
      estimasi_mulai: Number.isFinite(estMulai) && estMulai >= 1 ? estMulai : null,
      estimasi_durasi: Number.isFinite(estDurasi) && estDurasi >= 1 ? estDurasi : null,
      jadwal_mingguan: jadwalMingguan,
    });
  });

  const explicitBobot = items.reduce((sum, item) => sum + item.bobot_persen, 0);
  const missingBobot = items.filter((item) => item.bobot_persen <= 0);
  const missingTotalHarga = missingBobot.reduce((sum, item) => sum + item.total_harga, 0);
  if (missingBobot.length && missingTotalHarga > 0) {
    const remainingBobot = Math.max(0, 100 - explicitBobot);
    missingBobot.forEach((item) => {
      item.bobot_persen = Number(((item.total_harga / missingTotalHarga) * remainingBobot).toFixed(2));
    });
  }

  // Kolom minggu boleh dikosongkan: bobot disebar merata mengikuti estimasi mulai dan durasi.
  items.forEach((item) => {
    const weekSum = item.jadwal_mingguan.reduce((sum, val) => sum + val, 0);
    if (weekSum > 0 || !item.estimasi_mulai || !item.estimasi_durasi || item.bobot_persen <= 0) return;

    const durasi = item.estimasi_durasi;
    const perWeek = Number((item.bobot_persen / durasi).toFixed(2));
    let sisa = Number(item.bobot_persen);

    for (let i = 0; i < durasi; i++) {
      const weekIndex = item.estimasi_mulai - 1 + i;
      const val = i === durasi - 1 ? Number(sisa.toFixed(2)) : perWeek;
      while (item.jadwal_mingguan.length < weekIndex + 1) item.jadwal_mingguan.push(0);
      item.jadwal_mingguan[weekIndex] = val;
      sisa = Number((sisa - val).toFixed(2));
    }
  });

  const totalBobot = items.reduce((sum, item) => sum + Number(item.bobot_persen || 0), 0);

  return {
    total_anggaran: totalBobot,
    total_bobot: totalBobot,
    items_count: items.length,
    items,
  };
}
