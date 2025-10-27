// Global state
let isEditMode = false;
let currentEditingTradeNo = null;
const dropdownData = {};

// ======================= DOM READY ======================= //
document.addEventListener("DOMContentLoaded", () => {
    // --- Add Popup Setup ---
    const btnAdd = document.getElementById("btnAdd");
    const popupOverlay = document.querySelector(".popup-overlay");
    const popupContainer = document.querySelector(".popup-container");
    const dateInput = document.getElementById("date");

    if (btnAdd && popupOverlay && popupContainer) {
        btnAdd.addEventListener("click", () => {
            document.body.classList.add("popup-open");
            popupOverlay.classList.add("show");
            popupContainer.classList.add("show");

            const today = new Date().toISOString().split("T")[0];
            if (dateInput) dateInput.value = today;
        });

        popupOverlay.addEventListener("click", handleCancel);
    }

    // --- Edit Button Setup ---
    const btnEdit = document.getElementById("btnEdit");
    if (btnEdit) {
        btnEdit.addEventListener("click", () => {
            isEditMode = !isEditMode;
            const tableRows = document.querySelectorAll(".tabel-trade tbody tr");

            tableRows.forEach(row => {
                row.style.cursor = isEditMode ? "pointer" : "default";
                row.classList.toggle("editable", isEditMode);
            });

            btnEdit.classList.toggle("active", isEditMode);
        });
    }

    // --- Table Row Click for Edit ---
    const tableBody = document.querySelector(".tabel-trade tbody");
    if (tableBody) {
        tableBody.addEventListener("click", async (e) => {
            if (!isEditMode) return;

            const row = e.target.closest("tr");
            if (!row) return;

            // 🎯 AMBIL LANGSUNG DARI DATABASE, BUKAN PARSING HTML!
            const tradeNumber = parseInt(row.querySelector(".no")?.textContent);
            if (!tradeNumber) return;

            console.log("🔍 Loading trade data for #", tradeNumber);
            
            try {
                // Ambil data lengkap dari database
                const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
                const tradeData = dbTrade.find(trade => trade.tradeNumber === tradeNumber);
                
                if (!tradeData) {
                    console.error("❌ Trade data not found in database:", tradeNumber);
                    return;
                }

                console.log("✅ Full trade data from DB:", tradeData);
                console.log("🔗 URLs from DB - Bias:", tradeData.Files?.Bias, "Last:", tradeData.Files?.Last);
                
                openEditPopup(tradeData);
            } catch (error) {
                console.error("❌ Error loading trade data:", error);
            }
        });
    }

    // --- Custom Dropdown Initialization ---
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        const selected = dropdown.querySelector('.dropdown-selected');
        const options = dropdown.querySelector('.dropdown-options');
        const optionElements = dropdown.querySelectorAll('.dropdown-option');
        const dropdownName = dropdown.getAttribute('data-dropdown');

        dropdownData[dropdownName] = '';

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close others
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdown) {
                    d.querySelector('.dropdown-selected')?.classList.remove('active');
                    d.querySelector('.dropdown-options')?.classList.remove('show');
                }
            });
            selected.classList.toggle('active');
            options.classList.toggle('show');
        });

        optionElements.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                const text = option.textContent;

                const span = selected.querySelector('span');
                span.textContent = text;
                span.classList.remove('placeholder');

                optionElements.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                dropdownData[dropdownName] = value;

                selected.classList.remove('active');
                options.classList.remove('show');
            });
        });
    });

    // --- Close dropdowns on outside click ---
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-selected').forEach(sel => sel.classList.remove('active'));
        document.querySelectorAll('.dropdown-options').forEach(opt => opt.classList.remove('show'));
    });
});

// ======================= POPUP CONTROLS ======================= //
function handleCancel() {
    document.body.classList.remove("popup-open");
    document.querySelector(".popup-overlay")?.classList.remove("show");
    document.querySelector(".popup-container")?.classList.remove("show");
}

function handleCancelEdit() {
    document.body.classList.remove("popup-open");
    document.body.style.overflow = "";
    document.querySelector(".popup-edit")?.classList.remove("show");
    document.querySelector(".popup-edit-overlay")?.classList.remove("show");
}

// ======================= DROPDOWN HELPER (CLEAN FIX) ======================= //
function setDropdownValue(dropdownName, value, scope = "edit") {
    const container =
        scope === "edit"
            ? document.querySelector(".popup-edit")
            : document.querySelector(".popup-container");

    if (!container) {
        console.error("❌ Container not found for dropdown:", dropdownName);
        return;
    }

    const dropdown = container.querySelector(`.custom-dropdown[data-dropdown="${dropdownName}"]`);
    if (!dropdown) {
        console.error("❌ Dropdown not found:", dropdownName);
        return;
    }

    const selectedSpan = dropdown.querySelector(".dropdown-selected span");
    const optionElements = dropdown.querySelectorAll(".dropdown-option");

    optionElements.forEach(opt => opt.classList.remove("selected"));

    if (value && value.trim() !== "") {
        const matched = Array.from(optionElements).find(
            opt => opt.getAttribute("data-value")?.toLowerCase() === value.toLowerCase()
        );

        if (matched) {
            matched.classList.add("selected");
            selectedSpan.textContent = matched.textContent.trim();
            selectedSpan.classList.remove("placeholder");
        } else {
            selectedSpan.textContent = value;
            selectedSpan.classList.remove("placeholder");
        }

        const dataKey = scope === "edit" ? `edit-${dropdownName}` : dropdownName;
        dropdownData[dataKey] = value;
    } else {
        selectedSpan.textContent = selectedSpan.getAttribute('data-placeholder') || "Select";
        selectedSpan.classList.add("placeholder");
        
        const dataKey = scope === "edit" ? `edit-${dropdownName}` : dropdownName;
        dropdownData[dataKey] = "";
        console.log(`🔄 Dropdown ${dropdownName} reset`);
    }
}

// ======================= ADD TRADE ======================= //
async function handleAdd() {
    const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];

    const lastTradeNumber = dbTrade.length > 0 
    ? dbTrade[dbTrade.length - 1].tradeNumber 
    : 0;

    const data = {
    tradeNumber: lastTradeNumber + 1,
    Date: document.getElementById("date").value || "",
    Pairs: document.getElementById("pairs").value.trim(),
    Method: dropdownData.method || "",
    Confluance: `${dropdownData.entry || ""}, ${dropdownData.timeframe || ""}`,
    RR: parseFloat(document.getElementById("rr").value) || 0,
    Behavior: dropdownData.behavior || "",
    Reason: document.getElementById("reason")?.value.trim() || "",
    Causes: document.getElementById("causes").value.trim() || "",
    Psychology: dropdownData.psychology || "",
    Class: dropdownData.class || "",
    Bias: document.getElementById("bias-url").value.trim() || "",
    Last: document.getElementById("execution-url").value.trim() || "",

    Pos:
        dropdownData.position === "Long"
        ? "B"
        : dropdownData.position === "Short"
        ? "S"
        : "",

    Margin: parseFloat(document.getElementById("margin").value) || 0,
    Result: dropdownData.result || "",
    Pnl: parseFloat(document.getElementById("pnl").value) || 0,
    };

    const requiredFields = [
        ["Pairs", data.Pairs],
        ["Method", data.Method],
        ["Behavior", data.Behavior],
        ["Psychology", data.Psychology],
        ["Class", data.Class],
        ["Position", data.Pos],
        ["Entry", dropdownData.entry],
        ["TimeFrame", dropdownData.timeframe],
    ];

    const missing = requiredFields
        .filter(([_, val]) => !val || val.trim?.() === "")
        .map(([key]) => key);

    if (missing.length > 0) {
        alert(`⚠️ Field wajib belum diisi: ${missing.join(", ")}`);
        return;
    }

    console.log("[Add Trade] Data baru:", data);

    // === CONFIG: Supabase Edge Function ===
    const SUPABASE_FUNCTION_URL =
        "https://cdplqhpzrwfcjpidvdoh.supabase.co/functions/v1/DB-Webhook";
    const SUPABASE_AUTH_TOKEN =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcGxxaHB6cndmY2pwaWR2ZG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTI3NDgsImV4cCI6MjA3NzEyODc0OH0.PFBkHjwRsCht-709WcrTtqk1h2OKsR44Omm9PDXu3TU";

    // === FUNGSI PENGIRIMAN KE SUPABASE ===
    async function sendTradeToSupabase(data) {
        try {
        console.log("📤 Mengirim data ke Edge Function:", data);

        const res = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
            sheet: "AOT SMC TRADE",
            data: data,
            }),
        });

        // === Cek HTTP status dulu ===
        if (!res.ok) {
            const text = await res.text();
            console.error("❌ Edge Function Error:", res.status, text);
            throw new Error(`Edge Function HTTP ${res.status}`);
        }

        // === Parse JSON dengan fallback ===
        let result;
        try {
            result = await res.json();
        } catch {
            const text = await res.text();
            console.warn("⚠️ Response bukan JSON, fallback text:", text);
            result = { status: "error", message: "Invalid JSON", raw: text };
        }

        console.log("📦 Response dari Edge Function:", result);

        if (result.status !== "success") {
            throw new Error(result.message || "Gagal menyimpan trade");
        }

        // === Jika sukses ===
        handleCancel();
        await reloadDB();
        const updatedData = await getDB();
        renderTradingTable(updatedData);

        alert(`✅ Trade berhasil ditambahkan! #${result.tradeNumber}`);
        } catch (err) {
        console.error("❌ Gagal menambahkan trade:", err);
        alert("❌ Gagal menambahkan trade! Periksa koneksi atau server log.");
        }
    }

    // === PENTING: PANGGIL FUNGSI-NYA DI SINI ===
    await sendTradeToSupabase(data);
}

// ======================= EDIT TRADE ======================= //
function openEditPopup(trade) {
    currentEditingTradeNo = trade.tradeNumber;

    const popup = document.querySelector(".popup-edit");
    const overlay = document.querySelector(".popup-edit-overlay");
    if (!popup || !overlay) return;

    document.body.classList.add("popup-open");
    document.body.style.overflow = "hidden";
    popup.classList.add("show");
    overlay.classList.add("show");

    setTimeout(() => {
        
        // Format tanggal dari timestamp (jika dari DB)
        const dateEl = document.getElementById("edit-date");
        if (trade.date && typeof trade.date === 'number') {
            // Convert timestamp to YYYY-MM-DD
            const dateObj = new Date(trade.date);
            dateEl.value = dateObj.toISOString().split('T')[0];
        } else if (trade.Date) {
            // Format existing date (DD/MM/YYYY to YYYY-MM-DD)
            if (trade.Date.includes("/")) {
                const [day, month, year] = trade.Date.split("/");
                dateEl.value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            } else {
                dateEl.value = trade.Date;
            }
        }

        // Basic fields - PAKAI DATA DARI DB, BUKAN PARSING!
        document.getElementById("edit-pairs").value = trade.Pairs || "";
        document.getElementById("edit-rr").value = trade.RR || "";
        document.getElementById("edit-margin").value = trade.Margin || "";
        document.getElementById("edit-pnl").value = trade.Pnl || "";
        document.getElementById("edit-causes").value = trade.Causes || "";
        
        // 🎯 URLS LANGSUNG DARI DB - PASTI ADA!
        document.getElementById("edit-bias-url").value = trade.Files?.Bias || "";
        document.getElementById("edit-execution-url").value = trade.Files?.Last || "";

        // Dropdowns
        setDropdownValue("edit-method", trade.Method, "edit");
        setDropdownValue("edit-behavior", trade.Behavior, "edit");
        setDropdownValue("edit-psychology", trade.Psychology, "edit");
        setDropdownValue("edit-class", trade.Class, "edit");
        
        // Position mapping
        const positionValue = trade.Pos === "B" ? "Long" : trade.Pos === "S" ? "Short" : "";
        setDropdownValue("edit-position", positionValue, "edit");
        
        setDropdownValue("edit-result", trade.Result, "edit");
        setDropdownValue("edit-timeframe", trade.Confluance?.TimeFrame || "", "edit");
        setDropdownValue("edit-entry", trade.Confluance?.Entry || "", "edit");
    }, 50);
}

async function handleSaveEdit() {
    const data = {
        tradeNumber: currentEditingTradeNo,
        Date: document.getElementById("edit-date").value || "",
        Pairs: document.getElementById("edit-pairs").value.trim(),
        Method: dropdownData["edit-method"] || "",
        Confluance: `${dropdownData["edit-entry"] || ""}, ${dropdownData["edit-timeframe"] || ""}`,
        RR: parseFloat(cleanCurrency(document.getElementById("edit-rr").value)) || 0,
        Behavior: dropdownData["edit-behavior"] || "",
        Causes: document.getElementById("edit-causes")?.value.trim() || "",
        Psychology: dropdownData["edit-psychology"] || "",
        Class: dropdownData["edit-class"] || "",
        Bias: document.getElementById("edit-bias-url").value.trim() || "",
        Last: document.getElementById("edit-execution-url").value.trim() || "",
        // 👇 PERBAIKI POSITION - convert Long/Short back to B/S
        Pos: dropdownData["edit-position"] === "Long" ? "B" : 
             dropdownData["edit-position"] === "Short" ? "S" : "",
        Margin: parseFloat(cleanCurrency(document.getElementById("edit-margin").value)) || 0,
        Result: dropdownData["edit-result"] || "",
        Pnl: parseFloat(cleanCurrency(document.getElementById("edit-pnl").value)) || 0,
    };

    const requiredFields = [
        ["Pairs", data.Pairs],
        ["Method", data.Method],
        ["Behavior", data.Behavior],
        ["Psychology", data.Psychology],
        ["Class", data.Class],
        ["Position", data.Pos],
        ["Entry", dropdownData.entry],
        ["TimeFrame", dropdownData.timeframe],
    ];

    const missing = requiredFields
        .filter(([_, val]) => !val || val.trim?.() === "")
        .map(([key]) => key);

    if (missing.length > 0) {
        alert(`⚠️ Field wajib belum diisi: ${missing.join(", ")}`);
        return;
    }

    try {
        const res = await fetch(
            "https://script.google.com/macros/s/AKfycbwg_KAAr3ipqVMvhoKMrIDbp3anIQP5r1jL8nv6yZS4KP_C0lvlCz_ICg8spda0ZSyw/exec",
            {
                method: "POST",
                body: JSON.stringify({
                    sheet: "AOT SMC TRADE",
                    action: "update",
                    tradeNumber: currentEditingTradeNo,
                    data: data,
                }),
                headers: {"Content-Type": "text/plain"},
                mode: "no-cors"
            }
        );

        const result = await res.json().catch(async () => {
            const text = await res.text();
            console.error("⚠️ Response error:", text);
            throw new Error("Respon tidak valid");
        });

        if (result.status !== "success") {
            throw new Error(result.message || "Gagal memperbarui trade");
        }

        handleCancelEdit();
        await reloadDB();
        const updatedData = await getDB();
        renderTradingTable(updatedData);
        alert("✅ Trade berhasil diperbarui!");
    } catch (err) {
        console.error("❌ Gagal update trade:", err);
        alert("❌ Gagal memperbarui trade!");
    }
}