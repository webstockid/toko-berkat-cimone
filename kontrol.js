/* ==========================================================================
   KONTROL.JS - PUSAT PENGATURAN HALAMAN UTAMA BERKAT ELEKTRONIK
   --------------------------------------------------------------------------
   File ini dibaca oleh index.html. Cukup ubah nilai pada KONTROL_TOKO di
   bawah, simpan, lalu muat ulang halaman. Tidak perlu mengubah index.html.

   Empat kontrol:
   1. tokoFisik      : jam buka & tutup toko fisik + hari libur
   2. layananOnline  : jam buka & tutup layanan online/pengiriman + hari libur
   3. rekening       : 3 nomor rekening / e-wallet tujuan pembayaran
   4. biaya          : biaya layanan, radius, dan ongkos kirim

   Catatan: hari Minggu selalu libur. Isi "hariLibur" untuk menambah libur
   mingguan lain, dan "tanggalLibur" untuk libur pada tanggal tertentu.
   Semua jam memakai WIB (Asia/Jakarta).
   ========================================================================== */
'use strict';

const KONTROL_TOKO = {

	/* ----------------------------------------------------------------------
	   1. TOKO FISIK
	   - buka / tutup : format 24 jam "JJ:MM"
	   - hariLibur    : libur mingguan tambahan selain Minggu.
	                    Pilihan: 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'
	   - tanggalLibur : libur tanggal tertentu, format 'YYYY-MM-DD'
	                    atau rentang 'YYYY-MM-DD..YYYY-MM-DD'
	   ---------------------------------------------------------------------- */
	tokoFisik: {
		buka: '09:00',
		tutup: '17:00',
		hariLibur: ['sabtu'],
		tanggalLibur: ['2026-11-21']
	},
	
	/*
	hariLibur: ['jumat']              // libur setiap Jumat
	hariLibur: ['kamis', 'sabtu']     // libur setiap Kamis dan Sabtu
	tanggalLibur: ['2026-12-25']                          // satu hari
	tanggalLibur: ['2026-12-25', '2027-01-01']            // beberapa tanggal terpisah
	tanggalLibur: ['2026-12-24..2026-12-26']              // rentang 24 sampai 26 Desember
	tanggalLibur: ['2026-12-25', '2027-02-08..2027-02-10'] // campuran
	*/

	/* ----------------------------------------------------------------------
	   2. LAYANAN ONLINE & PENGIRIMAN
	   Pesanan di luar jam ini tetap bisa dibuat (status Pending) dan
	   dikirim pada jam layanan online berikutnya.
	   ---------------------------------------------------------------------- */
	layananOnline: {
		buka: '10:00',
		tutup: '15:00',
		hariLibur: ['sabtu'],
		tanggalLibur: ['2026-11-21']
	},

	/* ----------------------------------------------------------------------
	   3. REKENING TOKO (tepat 3 data)
	   - id       : kode unik (dipakai di sistem)
	   - nama     : nama bank / e-wallet yang tampil ke pembeli
	   - atasNama : nama pemilik rekening
	   - nomor    : nomor rekening / nomor e-wallet
	   ---------------------------------------------------------------------- */
	rekening: [
		{ id: 'GoPay', nama: 'GoPay', atasNama: 'Berkat Elektronik', nomor: '089529305947' },
		{ id: 'DANA', nama: 'DANA', atasNama: 'Berkat Elektronik', nomor: '089529305947' },
		{ id: 'Bank Jago', nama: 'Bank Jago', atasNama: 'Berkat Elektronik', nomor: '12345678' }
	],

	/* ----------------------------------------------------------------------
	   4. BIAYA
	   - biayaLayanan : biaya layanan per pesanan (Rp)
	   - radiusMaksKm : batas jarak pengiriman dari toko (KM)
	   - ongkir       : tarif per wilayah:
	       kmDasar            = jarak tercakup tarif dasar (KM)
	       biayaDasar         = tarif dasar (Rp)
	       kelipatanKm        = setiap tambahan jarak sebesar ini (KM) ...
	       biayaPerKelipatan  = ... ditambah biaya ini (Rp)
	   ---------------------------------------------------------------------- */
	biaya: {
		biayaLayanan: 15000,
		radiusMaksKm: 30,
		ongkir: {
			kota: { kmDasar: 2, biayaDasar: 10000, kelipatanKm: 2, biayaPerKelipatan: 5000 },
			kabupaten: { kmDasar: 8, biayaDasar: 20000, kelipatanKm: 2, biayaPerKelipatan: 6000 }
		}
	}
};


/* ==========================================================================
   KONTROLER: validasi pengaturan & perhitungan jadwal buka/tutup.
   Bagian ini tidak perlu diubah.
   ========================================================================== */
const KontrolToko = (() => {
	const WIB_OFFSET_MS = 7 * 3600000;
	const MENIT_PER_HARI = 24 * 60;

	const NAMA_HARI = [
		{ penuh: 'Minggu', singkat: 'Min', kunci: 'minggu' },
		{ penuh: 'Senin', singkat: 'Sen', kunci: 'senin' },
		{ penuh: 'Selasa', singkat: 'Sel', kunci: 'selasa' },
		{ penuh: 'Rabu', singkat: 'Rab', kunci: 'rabu' },
		{ penuh: 'Kamis', singkat: 'Kam', kunci: 'kamis' },
		{ penuh: 'Jumat', singkat: 'Jum', kunci: 'jumat' },
		{ penuh: 'Sabtu', singkat: 'Sab', kunci: 'sabtu' }
	];

	/* Nilai cadangan bila isi KONTROL_TOKO salah atau kosong */
	const BAWAAN = {
		tokoFisik: { buka: '09:00', tutup: '17:00' },
		layananOnline: { buka: '10:00', tutup: '15:00' },
		rekening: [
			{ id: 'GoPay', nama: 'GoPay', atasNama: 'Berkat Elektronik', nomor: '089529305947' },
			{ id: 'DANA', nama: 'DANA', atasNama: 'Berkat Elektronik', nomor: '089529305947' },
			{ id: 'Bank Jago', nama: 'Bank Jago', atasNama: 'Berkat Elektronik', nomor: '12345678' }
		],
		biaya: {
			biayaLayanan: 15000,
			radiusMaksKm: 30,
			ongkir: {
				kota: { kmDasar: 2, biayaDasar: 10000, kelipatanKm: 2, biayaPerKelipatan: 5000 },
				kabupaten: { kmDasar: 8, biayaDasar: 20000, kelipatanKm: 2, biayaPerKelipatan: 6000 }
			}
		}
	};

	const peringatan = [];
	let hasil = null;

	const catat = (pesan) => {
		peringatan.push(pesan);
		console.warn(`[kontrol.js] ${pesan}`);
	};

	/* ---------- Utilitas ---------- */
	const jamKeMenit = (teks) => {
		const cocok = /^(\d{1,2}):(\d{2})$/.exec(String(teks || '').trim());
		if (!cocok) return null;
		const jam = Number(cocok[1]);
		const menit = Number(cocok[2]);
		return (jam <= 23 && menit <= 59) ? (jam * 60) + menit : null;
	};

	const menitKeLabel = (menit) => {
		const jam = String(Math.floor(menit / 60)).padStart(2, '0');
		const sisa = String(menit % 60).padStart(2, '0');
		return `${jam}.${sisa}`;
	};

	const angkaTidakNegatif = (nilai, cadangan, label) => {
		const angka = Number(nilai);
		if (Number.isFinite(angka) && angka >= 0) return Math.round(angka);
		catat(`${label} tidak valid ("${nilai}"), memakai ${cadangan}.`);
		return cadangan;
	};

	const angkaPositif = (nilai, cadangan, label) => {
		const angka = Number(nilai);
		if (Number.isFinite(angka) && angka > 0) return angka;
		catat(`${label} harus lebih dari 0 ("${nilai}"), memakai ${cadangan}.`);
		return cadangan;
	};

	const tanggalValid = (teks) => /^\d{4}-\d{2}-\d{2}$/.test(teks) && !Number.isNaN(Date.parse(teks));

	/* ---------- Normalisasi jadwal (toko fisik / layanan online) ---------- */
	const normalisasiJadwal = (kunci, input = {}) => {
		const bawaan = BAWAAN[kunci];
		let bukaMenit = jamKeMenit(input.buka);
		let tutupMenit = jamKeMenit(input.tutup);

		if (bukaMenit === null || tutupMenit === null || tutupMenit <= bukaMenit) {
			catat(`Jam ${kunci} tidak valid (buka "${input.buka}", tutup "${input.tutup}"). Pastikan format JJ:MM dan jam tutup setelah jam buka. Memakai ${bawaan.buka}–${bawaan.tutup}.`);
			bukaMenit = jamKeMenit(bawaan.buka);
			tutupMenit = jamKeMenit(bawaan.tutup);
		}

		const hariLibur = new Set([0]);
		(Array.isArray(input.hariLibur) ? input.hariLibur : []).forEach((hari) => {
			const index = NAMA_HARI.findIndex(item => item.kunci === String(hari).trim().toLowerCase());
			if (index === -1) catat(`Hari libur "${hari}" pada ${kunci} tidak dikenal (gunakan: senin ... sabtu).`);
			else hariLibur.add(index);
		});

		const tanggalLibur = [];
		(Array.isArray(input.tanggalLibur) ? input.tanggalLibur : []).forEach((entri) => {
			const [dari, sampai = dari] = String(entri).split('..').map(bagian => bagian.trim());
			if (tanggalValid(dari) && tanggalValid(sampai) && dari <= sampai) tanggalLibur.push({ dari, sampai });
			else catat(`Tanggal libur "${entri}" pada ${kunci} tidak valid (format YYYY-MM-DD atau YYYY-MM-DD..YYYY-MM-DD).`);
		});

		return {
			buka: menitKeLabel(bukaMenit).replace('.', ':'),
			tutup: menitKeLabel(tutupMenit).replace('.', ':'),
			bukaMenit,
			tutupMenit,
			hariLibur: Array.from(hariLibur).sort(),
			tanggalLibur
		};
	};

	/* ---------- Normalisasi rekening (tepat 3 data) ---------- */
	const normalisasiRekening = (input) => {
		const daftar = Array.isArray(input) ? input.slice(0, 3) : [];
		if (!Array.isArray(input) || input.length !== 3) {
			catat(`Jumlah rekening harus tepat 3 (ditemukan ${Array.isArray(input) ? input.length : 0}). Data kosong diisi nilai bawaan.`);
		}
		return BAWAAN.rekening.map((bawaan, i) => {
			const item = daftar[i] || {};
			const nama = String(item.nama || '').trim();
			const nomor = String(item.nomor || '').trim();
			if (!nama || !/^[0-9][0-9 .-]{3,30}$/.test(nomor)) {
				if (daftar[i]) catat(`Rekening ke-${i + 1} tidak lengkap atau nomor tidak valid, memakai nilai bawaan.`);
				return { ...bawaan };
			}
			return {
				id: String(item.id || nama).trim(),
				nama,
				atasNama: String(item.atasNama || bawaan.atasNama).trim(),
				nomor
			};
		});
	};

	/* ---------- Normalisasi biaya ---------- */
	const normalisasiTarif = (input = {}, bawaan, label) => ({
		kmDasar: angkaPositif(input.kmDasar, bawaan.kmDasar, `${label}.kmDasar`),
		biayaDasar: angkaTidakNegatif(input.biayaDasar, bawaan.biayaDasar, `${label}.biayaDasar`),
		kelipatanKm: angkaPositif(input.kelipatanKm, bawaan.kelipatanKm, `${label}.kelipatanKm`),
		biayaPerKelipatan: angkaTidakNegatif(input.biayaPerKelipatan, bawaan.biayaPerKelipatan, `${label}.biayaPerKelipatan`)
	});

	const normalisasiBiaya = (input = {}) => ({
		biayaLayanan: angkaTidakNegatif(input.biayaLayanan, BAWAAN.biaya.biayaLayanan, 'biaya.biayaLayanan'),
		radiusMaksKm: angkaPositif(input.radiusMaksKm, BAWAAN.biaya.radiusMaksKm, 'biaya.radiusMaksKm'),
		ongkir: {
			kota: normalisasiTarif(input.ongkir?.kota, BAWAAN.biaya.ongkir.kota, 'ongkir.kota'),
			kabupaten: normalisasiTarif(input.ongkir?.kabupaten, BAWAAN.biaya.ongkir.kabupaten, 'ongkir.kabupaten')
		}
	});

	/* ---------- API: ambil seluruh pengaturan yang sudah tervalidasi ---------- */
	const ambil = () => {
		if (hasil) return hasil;
		const sumber = (typeof KONTROL_TOKO !== 'undefined' && KONTROL_TOKO) || {};
		hasil = {
			tokoFisik: normalisasiJadwal('tokoFisik', sumber.tokoFisik),
			layananOnline: normalisasiJadwal('layananOnline', sumber.layananOnline),
			rekening: normalisasiRekening(sumber.rekening),
			biaya: normalisasiBiaya(sumber.biaya)
		};
		return hasil;
	};

	/* ---------- API: jadwal ---------- */
	/* Tanggal WIB "YYYY-MM-DD" dari timestamp yang sudah digeser ke WIB */
	const tanggalDariWib = (wibMs) => new Date(wibMs).toISOString().slice(0, 10);

	/* Apakah tanggal/hari pada wibMs adalah hari buka (bukan libur mingguan/tanggal) */
	const hariBukaWib = (jadwal, wibMs) => {
		if (jadwal.hariLibur.includes(new Date(wibMs).getUTCDay())) return false;
		const tanggal = tanggalDariWib(wibMs);
		return !jadwal.tanggalLibur.some(rentang => tanggal >= rentang.dari && tanggal <= rentang.sampai);
	};

	const sedangLibur = (kunci, ms = Date.now()) => !hariBukaWib(ambil()[kunci], ms + WIB_OFFSET_MS);

	const statusBuka = (kunci, ms = Date.now()) => {
		const jadwal = ambil()[kunci];
		const wibMs = ms + WIB_OFFSET_MS;
		if (!hariBukaWib(jadwal, wibMs)) return false;
		const menit = (Math.floor(wibMs / 60000) % MENIT_PER_HARI + MENIT_PER_HARI) % MENIT_PER_HARI;
		return menit >= jadwal.bukaMenit && menit < jadwal.tutupMenit;
	};

	/* Timestamp (ms) awal jam buka berikutnya. Jika sedang buka, kembalikan waktu saat ini. */
	const awalBukaBerikutnya = (kunci, dariMs = Date.now()) => {
		if (statusBuka(kunci, dariMs)) return dariMs;
		const jadwal = ambil()[kunci];
		const wibHariIni = Math.floor((dariMs + WIB_OFFSET_MS) / 86400000) * 86400000;

		for (let i = 0; i < 400; i++) {
			const hariWib = wibHariIni + (i * 86400000);
			const kandidatMs = hariWib + (jadwal.bukaMenit * 60000) - WIB_OFFSET_MS;
			if (kandidatMs > dariMs && hariBukaWib(jadwal, hariWib)) return kandidatMs;
		}
		return dariMs; /* tidak ada hari buka sama sekali */
	};

	/* ---------- API: label tampilan ---------- */
	const labelJam = (kunci) => {
		const jadwal = ambil()[kunci];
		return `${menitKeLabel(jadwal.bukaMenit)}–${menitKeLabel(jadwal.tutupMenit)}`;
	};

	/* Contoh: "Senin–Sabtu", "Senin–Kamis, Sabtu" */
	const labelHari = (kunci, singkat = false) => {
		const jadwal = ambil()[kunci];
		const nama = index => NAMA_HARI[index][singkat ? 'singkat' : 'penuh'];
		const hariBuka = [1, 2, 3, 4, 5, 6].filter(index => !jadwal.hariLibur.includes(index));
		if (hariBuka.length === 0) return 'Tidak ada hari buka';

		const rentang = [];
		let awal = hariBuka[0];
		hariBuka.forEach((hari, i) => {
			const berikutnya = hariBuka[i + 1];
			if (berikutnya === hari + 1) return;
			if (hari === awal) rentang.push(nama(hari));
			else if (hari - awal === 1) rentang.push(`${nama(awal)}, ${nama(hari)}`);
			else rentang.push(`${nama(awal)}–${nama(hari)}`);
			awal = berikutnya;
		});
		return rentang.join(', ');
	};

	/* Contoh: "Minggu, Jumat" */
	const labelLibur = (kunci) => ambil()[kunci].hariLibur.map(index => NAMA_HARI[index].penuh).join(', ');

	return {
		ambil,
		statusBuka,
		sedangLibur,
		awalBukaBerikutnya,
		labelJam,
		labelHari,
		labelLibur,
		getPeringatan: () => peringatan.slice()
	};
})();

window.KONTROL_TOKO = KONTROL_TOKO;
window.KontrolToko = KontrolToko;
