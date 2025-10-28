// === ScriptTF.js ===
const TF_KEY = "tf";
const TF_API_URL = "https://script.google.com/macros/s/AKfycbymzPAtk7UNA9Mmn9vn3te4ySQgQbm5jjf6esrZsE-BxpDVmnNuzJD9kp3_n1AcCOplfQ/exec?sheet=TF";

let tfPromise = null;

// Load data TF dari cache atau API
async function loadTF() {
    try {
        const cached = localStorage.getItem(TF_KEY);

        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
                console.log("📦 TF cache valid, pakai data lokal");
                return parsed;
            } else {
                console.warn("⚠️ TF cache bukan array, hapus dan ambil ulang:", parsed);
                localStorage.removeItem(TF_KEY);
            }
        }

        console.log("🌐 TF cache kosong / invalid, ambil data dari API...");
        const res = await fetch(TF_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Expected JSON array");

        localStorage.setItem(TF_KEY, JSON.stringify(data));
        console.log("✅ Data TF baru disimpan ke cache");
        return data;

    } catch (err) {
        console.error("❌ loadTF error:", err);
        return [];
    }
}

// Reload TF manual (hapus cache & fetch ulang)
async function reloadTF() {
    try {
        console.log("🔄 Reloading TF...");
        localStorage.removeItem(TF_KEY);

        const res = await fetch(TF_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();
        localStorage.setItem(TF_KEY, JSON.stringify(data));

        console.log("✅ TF berhasil di-reload");
        alert("TF Database berhasil di-refresh!");
        return data;
    } catch (err) {
        console.error("❌ reloadTF error:", err);
        alert("Gagal reload TF database!");
    }
}

// Fungsi global untuk akses data TF
async function getTF() {
    if (!tfPromise) {
        tfPromise = loadTF();
    }
    return await tfPromise;
}

// Auto-load TF saat halaman dibuka
document.addEventListener("DOMContentLoaded", () => {
    tfPromise = loadTF().then(data => {
        window.tfData = data;
        document.dispatchEvent(new CustomEvent("tfLoaded", { detail: data }));
        return data;
    });
});

window.getTF = getTF;
window.reloadTF = reloadTF;
window.loadTF = loadTF;
