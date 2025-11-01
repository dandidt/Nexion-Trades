// Server Connect
const SUPABASE_FUNCTION_URL =
    "https://cdplqhpzrwfcjpidvdoh.supabase.co/functions/v1/DB-Webhook";
const SUPABASE_AUTH_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcGxxaHB6cndmY2pwaWR2ZG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTI3NDgsImV4cCI6MjA3NzEyODc0OH0.PFBkHjwRsCht-709WcrTtqk1h2OKsR44Omm9PDXu3TU";

// Global state
let isEditMode = false;
let currentEditingTradeNo = null;
const dropdownData = {};

// ======================= POPUP & DROPDOWN SETUP ======================= //
function closeAllPopups() {
    document.querySelector(".popup-add")?.classList.remove("show");
    document.querySelector(".popup-edit")?.classList.remove("show");
    document.querySelector(".popup-caculate")?.classList.remove("show");
    document.querySelector(".popup-overlay")?.classList.remove("show");
    document.body.classList.remove("popup-open");
    document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", () => {
    // === Popup ===
    const popupOverlay = document.querySelector(".popup-overlay");
    const popupAdd = document.querySelector(".popup-add");
    const popupEditTrade = document.getElementById("PopupEditTrade");
    const popupEditTransfer = document.getElementById("PopupEditTranfer");
    const popupCaculate = document.querySelector(".popup-caculate");

    // === Buttons ===
    const btnAdd = document.getElementById("btnAdd");
    const btnEdit = document.getElementById("btnEdit");
    const btnCaculate = document.getElementById("btnCaculate");
    const tableBody = document.querySelector(".tabel-trade tbody");

    // === Helper ===
    function hasAnyPopupOpen() {
        return (
            popupAdd?.classList.contains("show") ||
            popupEditTrade?.classList.contains("show") ||
            popupEditTransfer?.classList.contains("show") ||
            popupCaculate?.classList.contains("show")
        );
    }

    function closePopup(popup) {
        popup?.classList.remove("show");
        if (!hasAnyPopupOpen()) {
            popupOverlay?.classList.remove("show");
            document.body.classList.remove("popup-open");
            document.body.style.overflow = "";
        }
    }

    function closeAllPopups() {
        [popupAdd, popupEditTrade, popupEditTransfer, popupCaculate].forEach(p => p?.classList.remove("show"));
        popupOverlay?.classList.remove("show");
        document.body.classList.remove("popup-open");
        document.body.style.overflow = "";
    }

    // === Buka Add Popup ===
    btnAdd?.addEventListener("click", () => {
        closeAllPopups();
        document.body.classList.add("popup-open");
        document.body.style.overflow = "hidden";
        popupOverlay?.classList.add("show");
        popupAdd?.classList.add("show");

        const dateInput = document.getElementById("date");
        if (dateInput) {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            const h = String(now.getHours()).padStart(2, "0");
            const min = String(now.getMinutes()).padStart(2, "0");
            dateInput.value = `${y}-${m}-${d}T${h}:${min}`;
        }
    });

    // === Buka Calculate Popup ===
    btnCaculate?.addEventListener("click", () => {
        closeAllPopups();
        document.body.classList.add("popup-open");
        document.body.style.overflow = "hidden";
        popupOverlay?.classList.add("show");
        popupCaculate?.classList.add("show");
    });

    // === Toggle Edit Mode ===
    btnEdit?.addEventListener("click", () => {
        isEditMode = !isEditMode;
        document.querySelectorAll(".tabel-trade tbody tr").forEach(row => {
            row.style.cursor = isEditMode ? "pointer" : "default";
            row.classList.toggle("editable", isEditMode);
        });
        btnEdit.classList.toggle("active", isEditMode);
    });

    // === Klik baris → buka popup edit sesuai jenis data ===
    tableBody?.addEventListener("click", async (e) => {
        if (!isEditMode) return;
        const row = e.target.closest("tr");
        if (!row) return;

        const tradeNumber = parseInt(row.querySelector(".no")?.textContent);
        if (!tradeNumber) return;

        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        const tradeData = dbTrade.find(t => t.tradeNumber === tradeNumber);
        if (!tradeData) return;

        if (tradeData.action === "Deposit" || tradeData.action === "Withdraw") {
            openEditTransferPopup(tradeData);
        } else {
            openEditTradePopup(tradeData);
        }
    });

    // === Overlay click → tutup semua ===
    popupOverlay?.addEventListener("click", closeAllPopups);

    // === Tombol Cancel ===
    document.getElementById("closeAdd")?.addEventListener("click", () => closePopup(popupAdd));
    document.getElementById("closeEditTrade")?.addEventListener("click", () => closePopup(popupEditTrade));
    document.getElementById("closeEditTransfer")?.addEventListener("click", () => closePopup(popupEditTransfer));
    document.getElementById("closeCaculate")?.addEventListener("click", () => closePopup(popupCaculate));

    // === Custom Dropdowns ===
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        const selected = dropdown.querySelector('.dropdown-selected');
        const options = dropdown.querySelector('.dropdown-options');
        const optionElements = dropdown.querySelectorAll('.dropdown-option');
        const name = dropdown.getAttribute('data-dropdown');

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-options.show').forEach(o => {
                if (o !== options) o.classList.remove('show');
            });
            options.classList.toggle('show');
        });

        optionElements.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = opt.dataset.value;
                const text = opt.textContent;
                selected.querySelector('span').textContent = text;
                selected.querySelector('span').classList.remove('placeholder');
                optionElements.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                dropdownData[name] = value;
                options.classList.remove('show');
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-options').forEach(o => o.classList.remove('show'));
    });
});

// ======================= FILL EDIT FORM ======================= //
function fillEditFormTrade(trade) {
    document.getElementById("edit-date-trade").value = trade.date ? new Date(trade.date).toISOString().slice(0,16) : "";
    document.getElementById("edit-pairs").value = trade.Pairs || "";
    document.getElementById("edit-rr").value = trade.RR || "";
    document.getElementById("edit-margin").value = trade.Margin || "";
    document.getElementById("edit-pnl").value = trade.Pnl || "";
    document.getElementById("edit-causes").value = trade.Causes || "";
    document.getElementById("edit-bias-url").value = trade.Files?.Bias || "";
    document.getElementById("edit-execution-url").value = trade.Files?.Last || "";

    setDropdownValue("edit-method", trade.Method);
    setDropdownValue("edit-behavior", trade.Behavior);
    setDropdownValue("edit-psychology", trade.Psychology);
    setDropdownValue("edit-class", trade.Class);
    const posVal = trade.Pos === "B" ? "Long" : trade.Pos === "S" ? "Short" : "";
    setDropdownValue("edit-position", posVal);
    setDropdownValue("edit-result", trade.Result);
    setDropdownValue("edit-timeframe", trade.Confluance?.TimeFrame || "");
    setDropdownValue("edit-entry", trade.Confluance?.Entry || "");

    currentEditingTradeNo = trade.tradeNumber;
}

function fillEditFormTransfer(trade) {
    document.getElementById("edit-date-financial").value = trade.date ? new Date(trade.date).toISOString().slice(0,16) : "";
    setDropdownValue("edit-action", trade.action);
    document.getElementById("edit-value").value = trade.value || "";

    currentEditingTradeNo = trade.tradeNumber;
}

// ======================= DROPDOWN ======================= //
function setDropdownValue(dropdownName, value) {
    const dropdown = document.querySelector(`.custom-dropdown[data-dropdown="${dropdownName}"]`);
    if (!dropdown) return;

    const selectedSpan = dropdown.querySelector(".dropdown-selected span");
    const options = dropdown.querySelectorAll(".dropdown-option");

    options.forEach(opt => opt.classList.remove("selected"));

    const matched = Array.from(options).find(opt => opt.dataset.value === value);
    if (matched) {
        matched.classList.add("selected");
        selectedSpan.textContent = matched.textContent;
        selectedSpan.classList.remove("placeholder");
    } else {
        selectedSpan.textContent = selectedSpan.getAttribute("data-placeholder") || "Select";
        selectedSpan.classList.add("placeholder");
    }
}

// ======================= BTN RADIO ADD ======================= //
document.querySelectorAll('.btn-add').forEach((btn, index) => {
    btn.addEventListener('click', () => {
        // Toggle tombol aktif
        document.querySelectorAll('.btn-add').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle section form
        const formTrade = document.getElementById('addForm');
        const formDW = document.getElementById('adddw');
        const btnTrade = document.getElementById('addTrade');
        const btnDW = document.getElementById('adddwdb');

        if (index === 0) {
            formTrade.style.display = 'block';
            formDW.style.display = 'none';
            btnTrade.classList.add('active');
            btnDW.classList.remove('active');
        } else {
            formTrade.style.display = 'none';
            formDW.style.display = 'block';
            btnTrade.classList.remove('active');
            btnDW.classList.add('active');
        }
    });
});

// ======================= ADD TRADE ======================= //
async function handleAdd() {
    const btn = document.getElementById("addTrade");
    btn.classList.add("loading");

    const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];

    const lastTradeNumber = dbTrade.length > 0 
        ? dbTrade[dbTrade.length - 1].tradeNumber 
        : 0;
        
    const dateInputValue = document.getElementById("date").value;
    let localDate = new Date(dateInputValue);
    const timezoneOffset = localDate.getTimezoneOffset() * 60000;
    const correctedDate = new Date(localDate.getTime() - timezoneOffset);

    // ===== Struktur SERVER =====
    const serverData = {
        tradeNumber: lastTradeNumber + 1,
        Date: correctedDate.toISOString(),
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

    // ===== Struktur LOCAL =====
    const localData = {
        tradeNumber: lastTradeNumber + 1,
        date: correctedDate.getTime(),
        Pairs: document.getElementById("pairs").value.trim(),
        Method: dropdownData.method || "",
        Confluance: {
            Entry: dropdownData.entry || "",
            TimeFrame: dropdownData.timeframe || "",
        },
        RR: parseFloat(document.getElementById("rr").value) || 0,
        Behavior: dropdownData.behavior || "",
        Causes: document.getElementById("causes").value.trim() || "",
        Psychology: dropdownData.psychology || "",
        Class: dropdownData.class || "",
        Files: {
            Bias: document.getElementById("bias-url").value.trim() || "",
            Last: document.getElementById("execution-url").value.trim() || "",
        },
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

    // ===== Validasi =====
    const requiredFields = [
        ["Pairs", localData.Pairs],
        ["Method", localData.Method],
        ["Behavior", localData.Behavior],
        ["Psychology", localData.Psychology],
        ["Class", localData.Class],
        ["Position", localData.Pos],
        ["Entry", localData.Confluance.Entry],
        ["TimeFrame", localData.Confluance.TimeFrame],
    ];

    const missing = requiredFields
        .filter(([_, val]) => !val || val.trim?.() === "")
        .map(([key]) => key);

    if (missing.length > 0) {
        console.warn(`⚠️ Field wajib belum diisi: ${missing.join(", ")}`);
        btn.classList.remove("loading");
        return;
    }

    // ===== Kirim ke server =====
    try {
        const res = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                sheet: "AOT SMC TRADE",
                data: serverData,
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("❌ Edge Function Error:", res.status, text);
            throw new Error(`Edge Function HTTP ${res.status}`);
        }

        const result = await res.json().catch(async () => {
            const text = await res.text();
            console.warn("⚠️ Response bukan JSON:", text);
            return { status: "error", raw: text };
        });

        if (result.status !== "success") throw new Error(result.message);

        console.log("✅ Data sukses dikirim ke server");

        // ===== Tambahkan ke local cache =====
        dbTrade.push(localData);
        localStorage.setItem("dbtrade", JSON.stringify(dbTrade));
        renderTradingTable(dbTrade);
        console.log("📦 Data baru ditambahkan ke local cache:", localData);

        // ===== Tutup popup =====
        handleCancel();
        console.log("[UI] Popup closed after add");
        
    } catch (err) {
        console.error("❌ Gagal menambahkan trade:", err);
    } finally {
        btn.classList.remove("loading");
    }
}

// ======================= OPEN EDIT POPUPS ======================= //
function openEditTradePopup(trade) {
    closeAllPopups();

    const popup = document.getElementById("PopupEditTrade");
    const overlay = document.querySelector(".popup-overlay");

    overlay.classList.add("show");
    popup.classList.add("show");
    document.body.classList.add("popup-open");
    document.body.style.overflow = "hidden";

    setTimeout(() => fillEditFormTrade(trade), 50);
}

function openEditTransferPopup(trade) {
    closeAllPopups();

    const popup = document.getElementById("PopupEditTranfer");
    const overlay = document.querySelector(".popup-overlay");

    overlay.classList.add("show");
    popup.classList.add("show");
    document.body.classList.add("popup-open");
    document.body.style.overflow = "hidden";

    setTimeout(() => fillEditFormTransfer(trade), 50);
}

// ======================= EDIT TRADE & TF ======================= //
//  EDIT TRADE  //
async function handleSaveEditTrade() {
    const btn = document.getElementById("updateTrade");
    btn.classList.add("loading");

    try {
        const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
        const getDropdown = (name) => document
            .querySelector(`.popup-edit .custom-dropdown[data-dropdown="${name}"] .dropdown-option.selected`)
            ?.getAttribute("data-value") || "";

        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        const index = dbTrade.findIndex(t => t.tradeNumber === currentEditingTradeNo);
        if (index === -1) throw new Error("Trade tidak ditemukan di localStorage");

        // Ambil dan koreksi tanggal
        const dateInputValue = getVal("edit-date-trade");
        const localDate = new Date(dateInputValue);
        const timezoneOffset = localDate.getTimezoneOffset() * 60000;
        const correctedDate = new Date(localDate.getTime() - timezoneOffset);

        // ===== Struktur SERVER =====
        const serverData = {
            tradeNumber: currentEditingTradeNo,
            Date: correctedDate.toISOString(),
            Pairs: getVal("edit-pairs"),
            Method: getDropdown("edit-method"),
            Confluance: `${getDropdown("edit-entry")}, ${getDropdown("edit-timeframe")}`,
            RR: parseFloat(getVal("edit-rr")) || 0,
            Behavior: getDropdown("edit-behavior"),
            Reason: getVal("edit-causes"),
            Causes: getVal("edit-causes"),
            Psychology: getDropdown("edit-psychology"),
            Class: getDropdown("edit-class"),
            Bias: getVal("edit-bias-url"),
            Last: getVal("edit-execution-url"),
            Pos:
                getDropdown("edit-position") === "Long"
                    ? "B"
                    : getDropdown("edit-position") === "Short"
                    ? "S"
                    : "",
            Margin: parseFloat(getVal("edit-margin")) || 0,
            Result: getDropdown("edit-result"),
            Pnl: parseFloat(getVal("edit-pnl")) || 0,
        };

        // ===== Struktur LOCAL =====
        const localData = {
            tradeNumber: currentEditingTradeNo,
            date: correctedDate.getTime(),
            Pairs: getVal("edit-pairs"),
            Method: getDropdown("edit-method"),
            Confluance: {
                Entry: getDropdown("edit-entry"),
                TimeFrame: getDropdown("edit-timeframe"),
            },
            RR: parseFloat(getVal("edit-rr")) || 0,
            Behavior: getDropdown("edit-behavior"),
            Causes: getVal("edit-causes"),
            Psychology: getDropdown("edit-psychology"),
            Class: getDropdown("edit-class"),
            Files: {
                Bias: getVal("edit-bias-url"),
                Last: getVal("edit-execution-url"),
            },
            Pos:
                getDropdown("edit-position") === "Long"
                    ? "B"
                    : getDropdown("edit-position") === "Short"
                    ? "S"
                    : "",
            Margin: parseFloat(getVal("edit-margin")) || 0,
            Result: getDropdown("edit-result"),
            Pnl: parseFloat(getVal("edit-pnl")) || 0,
        };

        // ===== Validasi wajib =====
        const requiredFields = [
            ["Pairs", localData.Pairs],
            ["Method", localData.Method],
            ["Behavior", localData.Behavior],
            ["Psychology", localData.Psychology],
            ["Class", localData.Class],
            ["Position", localData.Pos],
            ["Entry", localData.Confluance.Entry],
            ["TimeFrame", localData.Confluance.TimeFrame],
            ["Result", localData.Result],
        ];

        const missing = requiredFields
            .filter(([_, val]) => !val || val.trim?.() === "")
            .map(([key]) => key);

        if (missing.length > 0) {
            alert(`⚠️ Field wajib belum diisi:\n${missing.join(", ")}`);
            btn.classList.remove("loading");
            return;
        }

        // ===== Kirim ke server =====
        const res = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                sheet: "AOT SMC TRADE",
                data: serverData,
                action: "update",
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("❌ Edge Function Error:", res.status, text);
            throw new Error(`Edge Function HTTP ${res.status}`);
        }

        const result = await res.json().catch(async () => {
            const text = await res.text();
            console.warn("⚠️ Response bukan JSON:", text);
            return { status: "error", raw: text };
        });

        if (result.status !== "success") throw new Error(result.message);

        // ===== Update local cache =====
        dbTrade[index] = localData;
        localStorage.setItem("dbtrade", JSON.stringify(dbTrade));
        renderTradingTable(dbTrade);
        handleCancelEdit();

    } catch (err) {
        console.error("❌ Error update trade:", err);
    } finally {
        btn.classList.remove("loading");
    }
}

//  EDIT TRANSFER  //
async function handleSaveEditTransfer() {
    const btn = document.getElementById("updateTransfer");
    btn.classList.add("loading");

    try {
        const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
        const getDropdown = (name) =>
            document
                .querySelector(`.popup-edit .custom-dropdown[data-dropdown="${name}"] .dropdown-option.selected`)
                ?.getAttribute("data-value") || "";

        const dbTF = JSON.parse(localStorage.getItem("tf")) || [];
        const index = dbTF.findIndex(t => t.tradeNumber === currentEditingTradeNo);
        if (index === -1) throw new Error("Transfer tidak ditemukan di localStorage");

        // Ambil & koreksi tanggal
        const dateInputValue = getVal("edit-date-financial");
        const localDate = new Date(dateInputValue);
        const timezoneOffset = localDate.getTimezoneOffset() * 60000;
        const correctedDate = new Date(localDate.getTime() - timezoneOffset);

        const action = getDropdown("edit-action"); // Deposit / Withdraw
        let value = parseFloat(getVal("edit-value")) || 0;
        if (action === "Withdraw") value = -Math.abs(value);

        if (!action || value === 0) {
            alert("⚠️ Pilih action dan isi amount yang valid");
            btn.classList.remove("loading");
            return;
        }

        // ===== Struktur SERVER (format trade) =====
        const serverData = {
            tradeNumber: currentEditingTradeNo,
            Date: correctedDate.toISOString(),
            Pairs: "",
            Method: "",
            Confluance: "",
            RR: 0,
            Behavior: "",
            Reason: "",
            Causes: "",
            Psychology: "",
            Class: "",
            Bias: "",
            Last: "",
            Pos: "",
            Margin: 0,
            Result: action,
            Pnl: value
        };

        // ===== Struktur LOCAL (ringkas) =====
        const localData = {
            tradeNumber: currentEditingTradeNo,
            date: correctedDate.getTime(),
            action,
            value
        };

        // ===== Kirim ke server =====
        const res = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                sheet: "AOT SMC TRADE",
                data: serverData,
                action: "update",
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("❌ Edge Function Error:", res.status, text);
            throw new Error(`Edge Function HTTP ${res.status}`);
        }

        const result = await res.json().catch(async () => {
            const text = await res.text();
            console.warn("⚠️ Response bukan JSON:", text);
            return { status: "error", raw: text };
        });

        if (result.status !== "success") throw new Error(result.message);

        // ===== Update local cache =====
        dbTF[index] = localData;
        localStorage.setItem("tf", JSON.stringify(dbTF));
        renderTradingTable(dbTF);
        handleCancelEdit();

        console.log(`✅ ${action} #${currentEditingTradeNo} updated & synced`);

    } catch (err) {
        console.error("❌ Error update transfer:", err);
        alert("Gagal menyimpan perubahan transfer.");
    } finally {
        btn.classList.remove("loading");
    }
}


// ======================= CANCEL / CLOSE EDIT POPUP (GLOBAL) ======================= //
function handleCancelEdit() {
    try {
        // reset current editing pointer
        currentEditingTradeNo = null;

        // popups (sesuaikan id dengan HTML kamu)
        const popupEditTrade = document.getElementById("PopupEditTrade");
        const popupEditTransfer = document.getElementById("PopupEditTranfer"); // note: 'Tranfer' sesuai html lama
        const overlay = document.querySelector(".popup-overlay");

        // hide popups & overlay
        [popupEditTrade, popupEditTransfer].forEach(p => p?.classList.remove("show"));
        overlay?.classList.remove("show");

        // reset body state
        document.body.classList.remove("popup-open");
        document.body.style.overflow = "";

        // remove any loading states on buttons
        document.querySelectorAll(".btn-main.loading, .btn-delete.loading").forEach(b => b.classList.remove("loading"));

        // reset dropdown visual state inside both popups (set placeholder)
        [popupEditTrade, popupEditTransfer].forEach(popup => {
            if (!popup) return;
            popup.querySelectorAll('.custom-dropdown').forEach(dd => {
                const span = dd.querySelector('.dropdown-selected span');
                // ambil placeholder bila ada (atau default "Select")
                const placeholder = span?.getAttribute('data-placeholder') || 'Select';
                if (span) {
                    span.textContent = placeholder;
                    span.classList.add('placeholder');
                }
                dd.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
            });
            // optional: clear input fields inside popup supaya tidak muncul data lama
            popup.querySelectorAll('input[type="text"], input[type="url"], input[type="number"], input[type="datetime-local"], textarea').forEach(inp => {
                // jangan clear semua kalau mau pertahankan nilai — ubah sesuai preferensi
                inp.value = "";
            });
        });

        // re-render table if db exists (opsional, aman)
        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        if (typeof renderTradingTable === "function") {
            renderTradingTable(dbTrade);
        }

        console.log("[UI] Edit popup closed & state reset");
    } catch (err) {
        console.error("handleCancelEdit error:", err);
    }
}

// ======================= DELETE TRADE ======================= //
async function handleDeleteTrade() {
    const btn = document.getElementById("deleteTrade");
    btn.classList.add("loading");

    if (!currentEditingTradeNo) {
        alert("⚠️ Tidak ada trade yang dipilih untuk dihapus!");
        btn.classList.remove("loading");
        return;
    }

    const confirmDelete = confirm(`🗑️ Hapus trade #${currentEditingTradeNo}?`);
    if (!confirmDelete) {
        btn.classList.remove("loading");
        return;
    }

    try {
        const res = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                sheet: "AOT SMC TRADE",
                action: "delete",
                data: { tradeNumber: currentEditingTradeNo },
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error("❌ Edge Function Error:", res.status, text);
            throw new Error(`Edge Function HTTP ${res.status}`);
        }

        const result = await res.json().catch(async () => {
            const text = await res.text();
            console.warn("⚠️ Response bukan JSON:", text);
            return { status: "error", raw: text };
        });

        if (result.status !== "success") throw new Error(result.message);

        console.log(`✅ Trade #${currentEditingTradeNo} berhasil dihapus dari server`);

        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        let newDb = dbTrade.filter(t => t.tradeNumber !== currentEditingTradeNo);

        newDb = newDb.map(trade => {
            if (trade.tradeNumber > currentEditingTradeNo) {
                return { ...trade, tradeNumber: trade.tradeNumber - 1 };
            }
            return trade;
        });

        localStorage.setItem("dbtrade", JSON.stringify(newDb));

        console.log("📦 Local cache updated dan tradeNumber dirapikan ulang");

        renderTradingTable(newDb);

        handleCancelEdit();
        console.log("[UI] Popup edit closed setelah delete");

        alert(`✅ Trade #${currentEditingTradeNo} berhasil dihapus & nomor di-update`);

    } catch (err) {
        console.error("❌ Gagal menghapus trade:", err);
        alert("Gagal menghapus trade. Cek console untuk detail.");
    } finally {
        btn.classList.remove("loading");
    }
}

// ======================= AUTO CALC  ======================= //
document.getElementById("btnAuto")?.addEventListener("click", () => {
  try {
    const dbtrade = JSON.parse(localStorage.getItem("dbtrade") || "[]");
    const setting = JSON.parse(localStorage.getItem("setting") || "{}");
    const calc = JSON.parse(localStorage.getItem("calculate") || "{}"); // ⚡ leverage & stopLoss data

    const rrInput = document.getElementById("edit-rr");
    const rr = parseFloat(rrInput?.value || "1.5");

    // === Ambil data dasar ===
    const risk = parseFloat(setting.risk) || 0;          // contoh: 5 (%)
    const feePercent = parseFloat(setting.fee) || 0;     // contoh: 0.02 (%)
    const fee = feePercent / 100;                        // ke desimal
    const leverage = parseFloat(calc.leverage) || 1;     // contoh: 75x
    const riskFactor = parseFloat(setting.riskFactor) || 1;

    console.log("🧩 RAW:", { dbtradeCount: dbtrade.length, setting, calc, rr, riskFactor });

    // === Hitung total PNL ===
    const totalPNL = dbtrade.reduce((sum, item) => {
      const pnl = parseFloat(item.Pnl ?? item.pnl ?? 0);
      return sum + (isNaN(pnl) ? 0 : pnl);
    }, 0);

    // === Total Deposit langsung dari dbtrade (bukan tf) ===
    const totalDeposit = dbtrade.reduce((sum, item) => {
      if (item.action && item.action.toLowerCase() === "deposit") {
        const depo = parseFloat(item.value ?? 0);
        return sum + (isNaN(depo) ? 0 : depo);
      }
      return sum;
    }, 0);

    // === Balance final ===
    const finalBalance = totalPNL + totalDeposit;

    // === Margin ===
    const margin = finalBalance * (risk / 100) * riskFactor;

    // === Position size & fee ===
    const positionSize = margin * leverage;
    const feeValue = positionSize * fee * 2; // open + close

    // === PnL ===
    const pnlRaw = margin * rr;
    const pnlFinal = pnlRaw - feeValue;

    // === Update popup ===
    document.getElementById("edit-margin").value = margin.toFixed(2);
    document.getElementById("edit-pnl").value = pnlFinal.toFixed(2);

    console.log("📊 AUTO INTERMEDIATE:", {
      totalPNL,
      totalDeposit,
      finalBalance,
      risk,
      leverage,
      fee,
      margin,
      positionSize,
      feeValue,
      rr,
      pnlRaw,
      pnlFinal,
    });

    console.log("✅ AUTO RESULT:", {
      totalPNL,
      totalDeposit,
      finalBalance,
      margin,
      rr,
      pnlFinal,
    });

  } catch (err) {
    console.error("❌ Auto calc error:", err);
    alert("Gagal menghitung data auto, cek console.");
  }
});

// ======================= POPUP SHARE ======================= //
document.addEventListener("DOMContentLoaded", () => {
    const popupOverlay = document.querySelector(".popup-overlay");
    const popupShare = document.querySelector(".popup-share");
    const btnShare = document.getElementById("btnShare");

    function hasAnyPopupOpen() {
        return popupShare?.classList.contains("show");
    }

    function closePopup(popup) {
        popup?.classList.remove("show");
        if (!hasAnyPopupOpen()) {
            popupOverlay?.classList.remove("show");
            document.body.classList.remove("popup-open");
            document.body.style.overflow = "";
        }
    }

    function closeAllPopups() {
        popupShare?.classList.remove("show");
        popupOverlay?.classList.remove("show");
        document.body.classList.remove("popup-open");
        document.body.style.overflow = "";
    }

    if (btnShare) {
        btnShare.addEventListener("click", () => {
            closeAllPopups();
            document.body.classList.add("popup-open");
            document.body.style.overflow = "hidden";
            popupOverlay?.classList.add("show");
            popupShare?.classList.add("show");
        });
    }

    popupOverlay?.addEventListener("click", closeAllPopups);
    document.getElementById("closeShare")?.addEventListener("click", () => closePopup(popupShare));
});

const canvasShare = document.getElementById('canvasShare');
const ctxShare = canvasShare.getContext('2d');
let templateImage = null;

function formatUSDShare(num) {
    if (num === null || num === undefined || isNaN(num)) return '$0.00';
    const abs = Math.abs(num);
    if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
}

function formatPersenShare(pct) {
    if (isNaN(pct)) pct = 0;
    const sign = pct >= 0 ? '+' : '';
    const absPct = Math.abs(pct);
    let str = absPct.toFixed(2).replace(/\./g, ',');
    const parts = str.split(',');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${sign}${integerPart},${decimalPart}%`;
}

const tradesShare = JSON.parse(localStorage.getItem('dbtrade') || '[]');

let selectedRange = '24H';

function filterByRange(data, range) {
    if (range === 'ALL') return data;
    const now = Date.now();
    let cutoff = 0;

    if (range === '30D') cutoff = now - 30 * 24 * 60 * 60 * 1000;
    else if (range === '1W') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (range === '24H') cutoff = now - 24 * 60 * 60 * 1000;

    return data.filter(item => {
        const tDate = typeof item.date === 'string' ? new Date(item.date).getTime() : item.date;
        return tDate && tDate >= cutoff;
    });
}

function getTitleByRange(range) {
    switch (range) {
        case '30D': return '30D Realized';
        case '1W': return '1W Realized';
        case '24H': return '24H Realized';
        default: return 'ALL-Time Realized';
    }
}

document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.share-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRange = btn.textContent;
        updateDashboardShare();
    });
});

const TEXT_CONTENT = {
    text1: '',
    text2: '',
    text3: '',
    text4: '',
    text5: '',
    text6: ''
};

function updateDashboardShare() {
    // === Filter data sesuai range waktu ===
    const filteredTrades = filterByRange(tradesShare, selectedRange);

    // === Pisahkan Deposit, Withdraw, dan Trade ===
    const depositData = filteredTrades.filter(t => t.action?.toLowerCase() === 'deposit');
    const withdrawData = filteredTrades.filter(t => t.action?.toLowerCase() === 'withdraw');
    const executedTrades = filteredTrades.filter(
        t => (t.Result === 'Profit' || t.Result === 'Loss') && typeof t.Pnl === 'number'
    );

    // === Hitung total ===
    const totalDeposit = depositData.reduce((sum, t) => sum + (parseFloat(t.value) || 0), 0);
    const totalWithdraw = withdrawData.reduce((sum, t) => sum + (parseFloat(t.value) || 0), 0);
    const totalPnL = executedTrades.reduce((sum, t) => sum + (parseFloat(t.Pnl) || 0), 0);

    // === Hitung ROI (berdasarkan total deposit aktif) ===
    const roiPercent = totalDeposit !== 0 ? (totalPnL / totalDeposit) * 100 : 0;

    // === Siapkan text ===
    const text1 = (totalPnL > 0 ? '+' : '') + formatUSDShare(totalPnL); // PnL
    const text2 = formatPersenShare(roiPercent); // ROI %
    const text3 = formatUSDShare(totalDeposit);  // Deposit
    const text4 = formatUSDShare(totalWithdraw); // Withdraw
    const text5 = executedTrades.length.toString(); // Total trades
    const text6 = getTitleByRange(selectedRange);  // Range title

    // === Simpan untuk canvas ===
    TEXT_CONTENT.text1 = text1;
    TEXT_CONTENT.text2 = text2;
    TEXT_CONTENT.text3 = text3;
    TEXT_CONTENT.text4 = text4;
    TEXT_CONTENT.text5 = text5;
    TEXT_CONTENT.text6 = text6;

    drawCanvasShare();

    console.log("📊 SHARE DASHBOARD:", {
        range: selectedRange,
        totalDeposit,
        totalWithdraw,
        totalPnL,
        roiPercent,
        count: executedTrades.length
    });
}

updateDashboardShare();

const TEXT_POSITIONS = {
    text1: [205, 428],
    text2: [790, 550],
    text3: [790, 640],
    text4: [790, 730],
    text5: [790, 820],
    text6: [190, 230]
};

const FONT_SIZE = 50;
const LINE_HEIGHT = 30;
const TEXT_COLOR = '#ffffff';

const STYLE_TEXT1 = {
    font: `900 170px Roboto`,
    gradient: ['#ffffff', '#63cdc6'],
    letterSpacing: 4.5,
    align: 'left'
};

const STYLE_TEXT2 = {
    font: `800 ${FONT_SIZE}px Roboto`,
    color: '#29e1c7',
    letterSpacing: 2,
    align: 'right'
};

const STYLE_DEFAULT = {
    font: `800 ${FONT_SIZE}px Roboto`,
    color: TEXT_COLOR,
    letterSpacing: 2,
    align: 'right'
};

const STYLE_TEXT6 = {
    font: `800 60px Roboto`,
    color: '#fff',
    letterSpacing: -1,
    align: 'left'
};

const TEMPLATE_PATH = 'Asset/template.png';

function loadTemplate() {
    const img = new Image();
    img.onload = function() {
        templateImage = img;
        canvasShare.width = img.width;
        canvasShare.height = img.height;
        drawCanvasShare();
    };

    img.onerror = function() {
        canvasShare.width = 800;
        canvasShare.height = 600;
        ctxShare.fillStyle = '#ff0000';
        ctxShare.font = '20px Roboto';
        ctxShare.textAlign = 'center';
        ctxShare.fillText('Error: template.png tidak ditemukan!', canvasShare.width / 2, canvasShare.height / 2);
        ctxShare.fillText('Pastikan file template.png ada di folder Asset/', canvasShare.width / 2, canvasShare.height / 2 + 30);
    };
    img.src = TEMPLATE_PATH;
}

loadTemplate();

function drawTextWithLetterSpacing(ctx, text, x, y, letterSpacing = 0, style) {
    ctx.font = style.font;
    ctx.textAlign = 'left';

    let fillStyle = style.color || '#fff';
    if (style.gradient) {
        const fontSizeMatch = style.font.match(/(\d+)px/);
        const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 50;
        const textHeight = fontSize;

        const gradient = ctx.createLinearGradient(x, y - textHeight, x, y);
        style.gradient.forEach((c, i, arr) => gradient.addColorStop(i / (arr.length - 1), c));
        fillStyle = gradient;
    }
    ctx.fillStyle = fillStyle;

    const charWidths = Array.from(text).map(ch => ctx.measureText(ch).width);
    const totalWidth = charWidths.reduce((sum, w) => sum + w, 0) + letterSpacing * (text.length - 1);
    let currentX = x;
    if (style.align === 'center') currentX -= totalWidth / 2;
    else if (style.align === 'right') currentX -= totalWidth;

    for (let i = 0; i < text.length; i++) {
        ctx.fillText(text[i], currentX, y);
        currentX += charWidths[i] + letterSpacing;
    }
}

function drawCanvasShare() {
    if (!templateImage) return;

    ctxShare.clearRect(0, 0, canvasShare.width, canvasShare.height);
    ctxShare.drawImage(templateImage, 0, 0);

    // === TEXT 1 ===
    const text1 = TEXT_CONTENT.text1;
    const [origX, origY] = TEXT_POSITIONS.text1;
    if (text1) {
        const style = STYLE_TEXT1;
        ctxShare.font = style.font;
        const letterSpacing = style.letterSpacing || 0;

        const charWidths = Array.from(text1).map(ch => ctxShare.measureText(ch).width);
        const totalTextWidth = charWidths.reduce((sum, w) => sum + w, 0) + letterSpacing * (text1.length - 1);

        const fontSizeMatch = style.font.match(/(\d+)px/);
        const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 170;
        const metrics = ctxShare.measureText('M');
        const textAscent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
        const textDescent = metrics.fontBoundingBoxDescent || fontSize * 0.2;
        const textHeight = textAscent + textDescent;

        const paddingX = 40, paddingY = 10, borderRadius = 50;
        const boxWidth = totalTextWidth + 2 * paddingX;
        const boxHeight = textHeight + 2 * paddingY;
        const boxX = origX - paddingX;
        const boxY = origY - textAscent - paddingY;

        ctxShare.fillStyle = 'rgba(0, 144, 163, 0.1)';
        ctxShare.beginPath();
        if (ctxShare.roundRect) ctxShare.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
        else ctxShare.rect(boxX, boxY, boxWidth, boxHeight);
        ctxShare.fill();

        ctxShare.strokeStyle = 'rgba(0, 144, 163, 0.25)';
        ctxShare.lineWidth = 1;
        ctxShare.stroke();

        const textDrawY = boxY + paddingY + textAscent;
        drawTextWithLetterSpacing(ctxShare, text1, boxX + paddingX, textDrawY, letterSpacing, style);
    }

    // === TEXT 2–6 ===
    for (let i = 2; i <= 6; i++) {
        const text = TEXT_CONTENT[`text${i}`];
        const [x, y] = TEXT_POSITIONS[`text${i}`];
        if (!text) continue;

        let style = STYLE_DEFAULT;
        if (i === 2) style = STYLE_TEXT2;
        else if (i === 6) style = STYLE_TEXT6;

        const lines = text.split('\n');
        lines.forEach((line, idx) => {
            const yPos = y + idx * LINE_HEIGHT;
            drawTextWithLetterSpacing(ctxShare, line, x, yPos, style.letterSpacing, style);
        });
    }
}

async function copyImage() {
    try {
        const blob = await new Promise(resolve => canvasShare.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (err) {
        console.error('❌ Gagal copy image:', err);
    }
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'Nexion Trade.png';
    link.href = canvasShare.toDataURL('image/png');
    link.click();
}

canvasShare.width = 800;
canvasShare.height = 600;
ctxShare.fillStyle = '#f0f0f0';
ctxShare.fillRect(0, 0, canvasShare.width, canvasShare.height);
ctxShare.fillStyle = '#999';
ctxShare.font = '20px Roboto';
ctxShare.textAlign = 'center';
ctxShare.fillText('Loading template.png...', canvasShare.width / 2, canvasShare.height / 2);
