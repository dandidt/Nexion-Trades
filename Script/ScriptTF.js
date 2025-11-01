// === ScriptTF.js ===
const TF_KEY = "tf";
// const TF_API_URL = "https://script.google.com/macros/s/AKfycbxxgX7NiAnXpWlvzmPngqp6PO40--YQIQj2rMnmuuPUcD-vK9pQTP3EzMFxehufTLQd/exec?sheet=TF";
const TF_API_URL = "https://script.google.com/macros/s/AKfycbymzPAtk7UNA9Mmn9vn3te4ySQgQbm5jjf6esrZsE-BxpDVmnNuzJD9kp3_n1AcCOplfQ/exec?sheet=TF";

let tfPromise = null;

// --- Load data TF dari cache atau API ---
async function loadTF() {
    try {
        const cached = localStorage.getItem(TF_KEY);

        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
                return parsed;
            } else {
                localStorage.removeItem(TF_KEY);
            }
        }

        console.log("🌐 TF API...");
        const res = await fetch(TF_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Expected JSON array");

        localStorage.setItem(TF_KEY, JSON.stringify(data));
        console.log("✅ Data TF New Save");
        return data;

    } catch (err) {
        console.error("❌ loadTF error:", err);
        return [];
    }
}

// --- Reload TF manual (hapus cache & fetch ulang) ---
async function reloadTF() {
    const btn = document.getElementById('btn-reloadTF');
    try {
        console.log("🔄 Reloading TF...");
        btn?.classList.add('loading');

        localStorage.removeItem(TF_KEY);

        const res = await fetch(TF_API_URL);
        if (!res.ok) throw new Error(`Fetch gagal (${res.status})`);

        const data = await res.json();
        localStorage.setItem(TF_KEY, JSON.stringify(data));

        console.log("✅ TF berhasil di-reload");

        // biarkan tombol loading sampai reload
        setTimeout(() => {
            location.reload();
        }, 500);

        return data;
    } catch (err) {
        console.error("❌ reloadTF error:", err);
        btn?.classList.remove('loading');
        alert("Gagal reload TF database!");
    }
}

// --- Fungsi global untuk akses data TF ---
async function getTF() {
    if (!tfPromise) {
        tfPromise = loadTF();
    }
    return await tfPromise;
}

// --- Auto-load TF saat halaman dibuka ---
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
