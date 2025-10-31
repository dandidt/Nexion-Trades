// === ScriptDB.js ===
const DB_KEY = "dbtrade";
const DB_API_URL = "https://script.google.com/macros/s/AKfycbxxgX7NiAnXpWlvzmPngqp6PO40--YQIQj2rMnmuuPUcD-vK9pQTP3EzMFxehufTLQd/exec?sheet=AOT SMC TRADE";

// Promise global untuk sinkronisasi load pertama
let dbPromise = null;

// --- Fungsi utama: load data dari cache atau API ---
async function loadDB() {
    try {
        const cached = localStorage.getItem(DB_KEY);

        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
                return parsed;
            } else {
                localStorage.removeItem(DB_KEY);
            }
        }

        console.log("🌐 Cache kosong / invalid, ambil data dari API...");
        const res = await fetch(DB_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();

        if (!Array.isArray(data)) {
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
    const btn = document.getElementById('btn-reload');
    
    try {
        console.log("🔄 Reloading DB...");
        
        btn.classList.add('loading');
        
        localStorage.removeItem(DB_KEY);

        const res = await fetch(DB_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();
        localStorage.setItem(DB_KEY, JSON.stringify(data));

        console.log("✅ DB berhasil di-reload");
        
        setTimeout(() => {
            location.reload();
        }, 500);
        
        return data;
    } catch (err) {
        console.error("❌ reloadDB error:", err);
        
        btn.classList.remove('loading');
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
