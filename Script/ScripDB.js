// === ScriptDB.js ===
const DB_KEY = "dbtrade";
const DB_API_URL = "https://script.google.com/macros/s/AKfycbwg_KAAr3ipqVMvhoKMrIDbp3anIQP5r1jL8nv6yZS4KP_C0lvlCz_ICg8spda0ZSyw/exec?sheet=AOT SMC TRADE";

// Promise global untuk sinkronisasi load pertama
let dbPromise = null;

// --- Fungsi utama: load data dari cache atau API ---
async function loadDB() {
    try {
        const cached = localStorage.getItem(DB_KEY);

        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
                console.log("📦 Cache valid, pakai data lokal");
                return parsed;
            } else {
                console.warn("⚠️ Cache bukan array, hapus dan ambil ulang:", parsed);
                localStorage.removeItem(DB_KEY);
            }
        }

        console.log("🌐 Cache kosong / invalid, ambil data dari API...");
        const res = await fetch(DB_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error("❌ Data API bukan array:", data);
            throw new Error("Expected JSON array");
        }

        localStorage.setItem(DB_KEY, JSON.stringify(data));
        console.log("✅ Data baru disimpan ke cache");
        return data;

    } catch (err) {
        console.error("❌ loadDB error:", err);
        return [];
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
