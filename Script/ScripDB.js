// === ScriptDB.js ===
const DB_KEY = "dbtrade";
const DB_API_URL = "https://script.google.com/macros/s/AKfycbzrBEiM8ivwZLtDhQRDhVFmOAyesBsUvwnSVWPlV5_VwWM8x2cJ4Uk2zX_Me8Nz1zdRJg/exec";

// Promise global untuk sinkronisasi load pertama
let dbPromise = null;

// --- Fungsi utama: load data dari cache atau API ---
async function loadDB() {
    try {
        const cached = localStorage.getItem(DB_KEY);

        if (cached) {
        console.log("📦 Cache ditemukan, pakai data lokal");
        return JSON.parse(cached);
        }

        console.log("🌐 Cache kosong, ambil data dari API...");
        const res = await fetch(DB_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();
        localStorage.setItem(DB_KEY, JSON.stringify(data));

        console.log("✅ Data baru disimpan ke cache");
        return data;
    } catch (err) {
        console.error("❌ loadDB error:", err);
        return null;
    }
}

// --- Fungsi reload manual (hapus cache & fetch ulang) ---
async function reloadDB() {
    try {
        console.log("🔄 Reloading DB...");
        localStorage.removeItem(DB_KEY);

        const res = await fetch(DB_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();
        localStorage.setItem(DB_KEY, JSON.stringify(data));

        console.log("✅ DB berhasil di-reload");
        alert("Database berhasil di-refresh!");
        return data;
    } catch (err) {
        console.error("❌ reloadDB error:", err);
        alert("Gagal reload database!");
    }
}

// --- Fungsi global untuk dapat data cache, tapi nunggu kalau belum siap ---
async function getDB() {
    if (!dbPromise) {
        dbPromise = loadDB();
    }
    return await dbPromise;
}

// --- Auto-load saat pertama kali halaman dibuka ---
document.addEventListener("DOMContentLoaded", () => {
    dbPromise = loadDB().then(data => {
        window.dbtradeData = data;
        document.dispatchEvent(new CustomEvent("dbLoaded", { detail: data }));
        return data;
    });
});

window.getDB = getDB;
window.reloadDB = reloadDB;
window.loadDB = loadDB;
