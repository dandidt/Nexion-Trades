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

    // === Buka Add Trade Popup ===
    btnAdd?.addEventListener("click", () => {
        closeAllPopups();
        document.body.classList.add("popup-open");
        document.body.style.overflow = "hidden";
        popupOverlay?.classList.add("show");
        popupAdd?.classList.add("show");

        const dateInput = document.getElementById("dateTransfer");
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

    // === Buka Add Transfer Popup ===
    btnAdd?.addEventListener("click", () => {
        closeAllPopups();
        document.body.classList.add("popup-open");
        document.body.style.overflow = "hidden";
        popupOverlay?.classList.add("show");
        popupAdd?.classList.add("show");

        const dateInput = document.getElementById("dateTrade");
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

    // === popup edit sesuai jenis data ===
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

    // === Overlay click ===
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
            const selectedSpan = selected.querySelector('span');

            selectedSpan.textContent = text;
            selectedSpan.classList.remove('placeholder');
            optionElements.forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            window.dropdownData = window.dropdownData || {};
            window.dropdownData[name] = value;

            options.classList.remove('show');
            console.log("🔹 Dropdown updated:", name, "=", value);
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

// ======================= HELPER FUNCTIONS ======================= //
function getDropdownValue(dropdownName) {
    const dropdown = document.querySelector(`.custom-dropdown[data-dropdown="${dropdownName}"]`);
    if (!dropdown) {
        console.warn(`[getDropdownValue] Dropdown dengan name "${dropdownName}" tidak ditemukan.`);
        return null;
    }
    const selectedOption = dropdown.querySelector('.dropdown-option.selected');
    if (selectedOption) {
        return selectedOption.getAttribute('data-value');
    } else {
        console.warn(`[getDropdownValue] Tidak ada opsi yang dipilih untuk "${dropdownName}".`);
        return null;
    }
}

// ======================= POPUP ADD ======================= //
//  BTN RADIO ADD  //
document.querySelectorAll('.btn-add').forEach((btn, index) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-add').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const formTrade = document.getElementById('addDataTrade');
        const formDW = document.getElementById('addDataTransfer');
        const btnTrade = document.getElementById('addTrade');
        const btnDW = document.getElementById('addTransfer');

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

//  ADD TRADE  //
async function handleAddTrade() {
    const btn = document.getElementById("addTrade");
    btn.classList.add("loading");
    try {
        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        const lastTradeNumber = dbTrade.length > 0
            ? dbTrade[dbTrade.length - 1].tradeNumber
            : 0;
        const dateInputValue = document.getElementById("dateTransfer").value;
        if (!dateInputValue) throw new Error("Tanggal belum diisi!");
        const localDate = new Date(dateInputValue);
        const correctedDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);

        // Ambil nilai dropdown menggunakan fungsi helper baru
        const methodValue = getDropdownValue("method");
        const behaviorValue = getDropdownValue("behavior");
        const psychologyValue = getDropdownValue("psychology");
        const classValue = getDropdownValue("class");
        const positionValue = getDropdownValue("position");
        const entryValue = getDropdownValue("entry");
        const timeframeValue = getDropdownValue("timeframe");

        // ===== Struktur SERVER =====
        const serverData = {
            tradeNumber: lastTradeNumber + 1,
            Date: correctedDate.toISOString(),
            Pairs: document.getElementById("pairs").value.trim(),
            Method: methodValue || "", // Gunakan nilai dari helper
            Confluance: `${entryValue || ""}, ${timeframeValue || ""}`, // Gunakan nilai dari helper
            RR: parseFloat(document.getElementById("rr").value) || 0,
            Behavior: behaviorValue || "", // Gunakan nilai dari helper
            Reason: document.getElementById("reason")?.value.trim() || "",
            Causes: document.getElementById("causes").value.trim() || "",
            Psychology: psychologyValue || "", // Gunakan nilai dari helper
            Class: classValue || "",
            Bias: document.getElementById("bias-url").value.trim() || "",
            Last: document.getElementById("execution-url").value.trim() || "",
            Pos:
                positionValue === "Long"
                    ? "B"
                    : positionValue === "Short"
                    ? "S"
                    : "",
            Margin: parseFloat(document.getElementById("margin").value) || 0,
            Result: getDropdownValue("result") || "",
            Pnl: parseFloat(document.getElementById("pnl").value) || 0,
        };

        // ===== Struktur LOCAL =====
        const localData = {
            tradeNumber: lastTradeNumber + 1,
            date: correctedDate.getTime(),
            Pairs: serverData.Pairs,
            Method: serverData.Method,
            Confluance: {
                Entry: entryValue || "",
                TimeFrame: timeframeValue || "",
            },
            RR: serverData.RR,
            Behavior: serverData.Behavior,
            Causes: serverData.Causes,
            Psychology: serverData.Psychology,
            Class: serverData.Class,
            Files: {
                Bias: serverData.Bias,
                Last: serverData.Last,
            },
            Pos: serverData.Pos,
            Margin: serverData.Margin,
            Result: serverData.Result,
            Pnl: serverData.Pnl,
        };

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

        const missing = requiredFields.filter(([_, val]) => !val || val.trim?.() === "").map(([key]) => key);
        if (missing.length > 0) {
            alert(`⚠️ Field wajib belum diisi: ${missing.join(", ")}`);
            console.log("Fields yang hilang:", missing);
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
                action: "insert",
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

        if (result.status !== "success") throw new Error(result.message || "Gagal simpan ke server");

        console.log("✅ Trade berhasil disimpan ke server.");

        // ===== Simpan ke localStorage =====
        dbTrade.push(localData);
        localStorage.setItem("dbtrade", JSON.stringify(dbTrade));

        // ===== Refresh Cache di ScriptDB.js =====
        refreshDBCache();

        // ===== Update UI Secara Keseluruhan =====
        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        } else {
            console.error("❌ Fungsi updateAllUI tidak ditemukan. Pastikan script.js dimuat.");
        }

        restartSOP();

        window.dispatchEvent(new CustomEvent('tradeDataUpdated'));

        // ===== Reset Form =====
        closeAllPopups();
        document.querySelectorAll("#addDataTrade .custom-dropdown").forEach(drop => {
            const selected = drop.querySelector(".dropdown-selected span");
            if (selected) {
                    const placeholder = selected.getAttribute('data-placeholder') || 'Select option';
                    selected.textContent = placeholder;
                    selected.classList.add("placeholder");
            }
            drop.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
        });
        document.querySelectorAll("#addDataTrade input[type='text'], #addDataTrade input[type='url'], #addDataTrade input[type='number'], #addDataTrade input[type='datetime-local'], #addDataTrade textarea").forEach(input => input.value = "");

    } catch (err) {
        console.error("❌ Gagal menambahkan trade:", err);
        alert(`Gagal menambahkan trade:\n${err.message}`);
    } finally {
        btn.classList.remove("loading");
    }
}

//  ADD TRANSFER  //
async function handleAddTransfer() {
    const btn = document.getElementById("addTransfer");
    btn.classList.add("loading");

    try {
        // === Ambil database lokal ===
        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        const lastTradeNumber = dbTrade.length > 0
            ? dbTrade[dbTrade.length - 1].tradeNumber
            : 0;

        // === Ambil input tanggal ===
        const dateInputValue = document.getElementById("dateTransfer").value;
        if (!dateInputValue) throw new Error("Tanggal belum diisi!");

        const localDate = new Date(dateInputValue);
        const correctedDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);

        // === Ambil dropdown action secara langsung dari elemen ===
        const selectedActionEl = document.querySelector('[data-dropdown="transfer"] .dropdown-selected span');
        const selectedAction = selectedActionEl?.innerText.trim();
        const valueInput = parseFloat(document.getElementById("valueTransfer").value);

        // === Validasi ===
        if (!selectedAction || (selectedAction !== "Deposit" && selectedAction !== "Withdraw")) {
            alert("⚠️ Mohon pilih Action terlebih dahulu (Deposit / Withdraw)!");
            return;
        }
        if (isNaN(valueInput) || valueInput === 0) {
            alert("⚠️ Mohon isi Value dengan benar!");
            return;
        }

        // === Bentuk data untuk server ===
        const serverData = {
            tradeNumber: lastTradeNumber + 1,
            Date: correctedDate.toISOString(),
            Result: selectedAction,
            Pnl: selectedAction === "Withdraw" ? -Math.abs(valueInput) : Math.abs(valueInput)
        };

        // === Bentuk data lokal ===
        const localData = {
            tradeNumber: lastTradeNumber + 1,
            date: correctedDate.getTime(),
            action: selectedAction,
            value: serverData.Pnl
        };

        // === Kirim ke server ===
        const res = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                sheet: "AOT SMC TRADE",
                action: "insert",
                data: serverData,
            }),
        });

        if (!res.ok) throw new Error(`Server HTTP ${res.status}`);

        const result = await res.json();
        if (result.status !== "success") throw new Error(result.message || "Gagal simpan ke server");

        console.log("✅ Transfer berhasil disimpan ke server.");

        // === Simpan ke localStorage ===
        dbTrade.push(localData);
        localStorage.setItem("dbtrade", JSON.stringify(dbTrade));

        // ===== Refresh Cache di ScriptDB.js =====
        refreshDBCache();

        // ===== Update UI Secara Keseluruhan =====
        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        } else {
            console.error("❌ Fungsi updateAllUI tidak ditemukan. Pastikan script.js dimuat.");
        }

        restartSOP();

        window.dispatchEvent(new CustomEvent('tradeDataUpdated'));

        // === Tutup popup dan reset form ===
        closeAllPopups();

        // Reset custom dropdowns
        document.querySelectorAll("#addDataTransfer .custom-dropdown").forEach(drop => {
            const selected = drop.querySelector(".dropdown-selected span");
            selected.textContent = "Select option";
            selected.classList.add("placeholder");
        });


    } catch (err) {
        console.error("❌ Gagal menambahkan transfer:", err);
        alert(`Gagal menambahkan transfer:\n${err.message}`);
    } finally {
        btn.classList.remove("loading");
    }
}

// ======================= POPUP EDIT ======================= //
//  POPUP TRADE  //
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

//  POPUP TRANSFER  //
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
        // ===== Refresh Cache di ScriptDB.js =====
        refreshDBCache();

        // ===== Update UI Secara Keseluruhan =====
        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        } else {
            console.error("❌ Fungsi updateAllUI tidak ditemukan. Pastikan script.js dimuat.");
        }

        restartSOP();

        window.dispatchEvent(new CustomEvent('tradeDataUpdated'));
        
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

        const dbTF = JSON.parse(localStorage.getItem("dbtrade")) || [];
        const index = dbTF.findIndex(t => t.tradeNumber === currentEditingTradeNo);
        if (index === -1) throw new Error("Transfer tidak ditemukan di localStorage");

        const dateInputValue = getVal("edit-date-financial");
        const localDate = new Date(dateInputValue);
        const timezoneOffset = localDate.getTimezoneOffset() * 60000;
        const correctedDate = new Date(localDate.getTime() - timezoneOffset);

        const action = getDropdown("edit-action");
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
        localStorage.setItem("dbtrade", JSON.stringify(dbTF));
        // ===== Refresh Cache di ScriptDB.js =====
        refreshDBCache();

        // ===== Update UI Secara Keseluruhan =====
        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        } else {
            console.error("❌ Fungsi updateAllUI tidak ditemukan. Pastikan script.js dimuat.");
        }

        restartSOP();

        window.dispatchEvent(new CustomEvent('tradeDataUpdated'));

        handleCancelEdit();

    } catch (err) {
        console.error("❌ Error update transfer:", err);
        alert("Gagal menyimpan perubahan transfer.");
    } finally {
        btn.classList.remove("loading");
    }
}

//  CANCLE EDIT  //
function handleCancelEdit() {
    try {
        currentEditingTradeNo = null;

        const popupEditTrade = document.getElementById("PopupEditTrade");
        const popupEditTransfer = document.getElementById("PopupEditTranfer");
        const overlay = document.querySelector(".popup-overlay");

        [popupEditTrade, popupEditTransfer].forEach(p => p?.classList.remove("show"));
        overlay?.classList.remove("show");

        document.body.classList.remove("popup-open");
        document.body.style.overflow = "";

        document.querySelectorAll(".btn-main.loading, .btn-delete.loading").forEach(b => b.classList.remove("loading"));

        [popupEditTrade, popupEditTransfer].forEach(popup => {
            if (!popup) return;
            popup.querySelectorAll('.custom-dropdown').forEach(dd => {
                const span = dd.querySelector('.dropdown-selected span');
                const placeholder = span?.getAttribute('data-placeholder') || 'Select';
                if (span) {
                    span.textContent = placeholder;
                    span.classList.add('placeholder');
                }
                dd.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('selected'));
            });
            popup.querySelectorAll('input[type="text"], input[type="url"], input[type="number"], input[type="datetime-local"], textarea').forEach(inp => {
                inp.value = "";
            });
        });

        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        if (typeof renderTradingTable === "function") {
            renderTradingTable(dbTrade);
        }

        console.log("[UI] Edit popup closed & state reset");
    } catch (err) {
        console.error("handleCancelEdit error:", err);
    }
}

//  FUNGSI POPUP CONFIRMASI DELETE //
function showConfirmPopup(message) {
    return new Promise((resolve) => {
        const popup = document.getElementById("confirmPopup");
        const msg = document.getElementById("confirmMessage");
        const yes = document.getElementById("confirmYes");
        const no = document.getElementById("confirmNo");

        msg.textContent = message;

        popup.style.zIndex = "99999";

        popup.classList.remove("hidden");

        popup.offsetHeight;

        const cleanup = (result) => {
            popup.style.animation = "fadeOut 0.2s ease-out";

            setTimeout(() => {
                popup.classList.add("hidden");
                popup.style.animation = "";
                yes.removeEventListener("click", onYes);
                no.removeEventListener("click", onNo);
                document.removeEventListener("keydown", onEscKey);
                resolve(result);
            }, 200);
        };

        const onYes = (e) => {
            e.stopPropagation();
            cleanup(true);
        };

        const onNo = (e) => {
            e.stopPropagation();
            cleanup(false);
        };

        const onEscKey = (e) => {
            if (e.key === "Escape") {
                cleanup(false);
            }
        };

        yes.addEventListener("click", onYes);
        no.addEventListener("click", onNo);
        document.addEventListener("keydown", onEscKey);
    });
}

//  DELETE TRADE  //
async function handleDeleteTrade() {
    const btn = document.getElementById("deleteTrade");
    btn.classList.add("loading");

    if (!currentEditingTradeNo) {
        alert("⚠️ Tidak ada trade yang dipilih untuk dihapus!");
        btn.classList.remove("loading");
        return;
    }

    const confirmDelete = await showConfirmPopup(`Delete Trade #${currentEditingTradeNo}?`);
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

        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        let newDb = dbTrade.filter(t => t.tradeNumber !== currentEditingTradeNo);

        newDb = newDb.map(trade => {
            if (trade.tradeNumber > currentEditingTradeNo) {
                return { ...trade, tradeNumber: trade.tradeNumber - 1 };
            }
            return trade;
        });

        localStorage.setItem("dbtrade", JSON.stringify(newDb));

        // ===== Refresh Cache di ScriptDB.js =====
        refreshDBCache();

        // ===== Update UI Secara Keseluruhan =====
        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        } else {
            console.error("❌ Fungsi updateAllUI tidak ditemukan. Pastikan script.js dimuat.");
        }

        restartSOP();

        handleCancelEdit();

    } catch (err) {
        console.error("❌ Gagal menghapus trade:", err);
    } finally {
        btn.classList.remove("loading");
    }
}

//  DELETE TRANSFER  //
async function handleDeleteTransfer() {
    const btn = document.getElementById("deleteTransfer");
    btn.classList.add("loading");

    if (!currentEditingTradeNo) {
        alert("⚠️ Tidak ada transfer yang dipilih untuk dihapus!");
        btn.classList.remove("loading");
        return;
    }

    const confirmDelete = await showConfirmPopup(`Delete Transfer #${currentEditingTradeNo}?`);
    if (!confirmDelete) {
        btn.classList.remove("loading");
        return;
    }

    try {
        // ===== Hapus di server =====
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

        // ===== Hapus di local cache (tf) =====
        const dbTF = JSON.parse(localStorage.getItem("dbtrade")) || [];
        const newDb = dbTF.filter(t => t.tradeNumber !== currentEditingTradeNo);
        localStorage.setItem("dbtrade", JSON.stringify(newDb));

        // ===== Refresh Cache di ScriptDB.js =====
        refreshDBCache();

        // ===== Update UI Secara Keseluruhan =====
        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        } else {
            console.error("❌ Fungsi updateAllUI tidak ditemukan. Pastikan script.js dimuat.");
        }

        restartSOP();

        handleCancelEdit();
    } catch (err) {
        console.error("❌ Gagal menghapus transfer:", err);
    } finally {
        btn.classList.remove("loading");
    }
}

// ======================= AUTO CALC  ======================= //
document.getElementById("btnAuto")?.addEventListener("click", () => {
    try {
            window.dropdownData = window.dropdownData || {};
            const resultValue = window.dropdownData["edit-result"];

            if (!resultValue || !["Profit", "Loss"].includes(resultValue)) {
                return;
            }

            const dbtrade = JSON.parse(localStorage.getItem("dbtrade") || "[]");
            const setting = JSON.parse(localStorage.getItem("setting") || "{}");
            const calc = JSON.parse(localStorage.getItem("calculate") || "{}");

            const rrInput = document.getElementById("edit-rr");
            const rr = parseFloat(rrInput?.value || "0");

            const risk = parseFloat(setting.risk) || 0;
            const feePercent = parseFloat(setting.fee) || 0;
            const fee = feePercent / 100;
            const leverage = parseFloat(calc.leverage) || 1;
            const riskFactor = parseFloat(setting.riskFactor) || 1;

            // === Hitung total balance ===
            const totalPNL = dbtrade.reduce((sum, item) => sum + (parseFloat(item.Pnl ?? item.pnl ?? 0) || 0), 0);
            const totalDeposit = dbtrade.reduce((sum, item) => item.action?.toLowerCase() === "deposit" ? sum + (parseFloat(item.value ?? 0) || 0) : sum, 0);
            const finalBalance = totalPNL + totalDeposit;
            const margin = finalBalance * (risk / 100) * riskFactor;
            const positionSize = margin * leverage;
            const feeValue = positionSize * fee * 2;

            let pnlFinal = 0;
            let rrUsed = rr;

            if (resultValue === "Profit") {
            if (isNaN(rr) || rr <= 0) {
                return;
            }
            pnlFinal = margin * rrUsed - feeValue;
            } else if (resultValue === "Loss") {
                // Hitungan loss → rugi sesuai margin + fee
                rrUsed = -1;
                pnlFinal = -(margin + feeValue);
            }

            // === Update ke input ===
            document.getElementById("edit-margin").value = margin.toFixed(2);
            document.getElementById("edit-pnl").value = pnlFinal.toFixed(2);
            document.getElementById("edit-rr").value = rrUsed.toFixed(2);

        } catch (err) {
            console.error("❌ Auto calc error:", err);
        }
});

// ======================= Popup SOP  ======================= //
document.addEventListener("DOMContentLoaded", () => {
    const popupOverlay = document.querySelector(".popup-overlay");
    const popupSop = document.querySelector(".popup-sop");
    const btnSopTrading = document.getElementById("sopTrading");

    function closePopupSop() {
        popupSop?.classList.remove("show");
        popupOverlay?.classList.remove("show");
        document.body.classList.remove("popup-open");
        document.body.style.overflow = "";
    }

    function openPopupSop() {
        closePopupSop(); 
        
        document.body.classList.add("popup-open");
        document.body.style.overflow = "hidden";
        popupOverlay?.classList.add("show");
        popupSop?.classList.add("show");
    }

    if (btnSopTrading) {
        btnSopTrading.addEventListener("click", openPopupSop);
    }

    popupOverlay?.addEventListener("click", closePopupSop);
    document.getElementById("closeSop")?.addEventListener("click", closePopupSop);
});

function loadSOP() {
    const saved = localStorage.getItem('sop');
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        maxWin: 2,
        maxLoss: 2,
        maxEntry: 3,
        maxDD: 10
    };
}

function saveSOP(sop) {
    localStorage.setItem('sop', JSON.stringify(sop));
}

let sopRules = loadSOP();

function getTodayTrades(db) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    return db.filter(t => t.date >= start.getTime() && t.date < end.getTime());
}

function getTodaySOPData() {
    const raw = localStorage.getItem('dbtrade');
    if (!raw) return { wins: 0, losses: 0, entries: 0, drawdown: 0 };

    const db = JSON.parse(raw);
    const todayTrades = getTodayTrades(db);

    const deposits = db.filter(t => t.action === "Deposit");
    const lastDeposit = deposits.length ? deposits[deposits.length - 1].value : 0;
    let balance = lastDeposit;

    let wins = 0, losses = 0, entries = 0;
    let drawdown = 0;

    for (const t of todayTrades) {
        if (!t.Result || typeof t.Pnl !== 'number') continue;
        entries++;

        const beforeTrade = balance;
        balance += t.Pnl;

        if (t.Result === "Profit") wins++;
        else if (t.Result === "Loss") {
            losses++;
            const ddPercent = (Math.abs(t.Pnl) / beforeTrade) * 100;
            drawdown = ddPercent;
        }
    }

    return { 
        wins, 
        losses, 
        entries, 
        drawdown: Number(drawdown.toFixed(2))
    };
}

const todaySop = getTodaySOPData();
const tradingDataSop = { ...todaySop };
console.log('Trading SOP Hari Ini:', tradingDataSop);

function updateUI() {
    const { wins, losses, entries, drawdown } = tradingDataSop;
    const { maxWin, maxLoss, maxEntry, maxDD } = sopRules;
    
    // Update display rules
    document.getElementById('maxWinDisplay').textContent = `${maxWin}x`;
    document.getElementById('maxLossDisplay').textContent = `${maxLoss}x`;
    document.getElementById('maxEntryDisplay').textContent = `${maxEntry}x`;
    document.getElementById('maxDDDisplay').textContent = `${maxDD}%`;
    
    // Update counts
    document.getElementById('winCount').textContent = `${wins}/${maxWin}`;
    document.getElementById('lossCount').textContent = `${losses}/${maxLoss}`;
    document.getElementById('entryCount').textContent = `${entries}/${maxEntry}`;
    document.getElementById('ddCount').textContent = `${drawdown}%`;
    
    // Update progress bars
    const winBar = document.getElementById('winBar');
    const lossBar = document.getElementById('lossBar');
    const entryBar = document.getElementById('entryBar');
    const ddBar = document.getElementById('ddBar');
    
    winBar.style.width = `${(wins/maxWin)*100}%`;
    lossBar.style.width = `${(losses/maxLoss)*100}%`;
    entryBar.style.width = `${(entries/maxEntry)*100}%`;
    ddBar.style.width = `${(drawdown/maxDD)*100}%`;
    
    // Set colors
    if (wins >= maxWin) winBar.className = 'progress-fill-sop danger';
    else if (wins >= maxWin - 1) winBar.className = 'progress-fill-sop warning';
    else winBar.className = 'progress-fill-sop';
    
    if (losses >= maxLoss) lossBar.className = 'progress-fill-sop danger';
    else if (losses >= maxLoss - 1) lossBar.className = 'progress-fill-sop warning';
    else lossBar.className = 'progress-fill-sop';
    
    if (entries >= maxEntry) entryBar.className = 'progress-fill-sop danger';
    else if (entries >= maxEntry - 1) entryBar.className = 'progress-fill-sop warning';
    else entryBar.className = 'progress-fill-sop';
    
    if (drawdown >= maxDD) ddBar.className = 'progress-fill-sop danger';
    else if (drawdown >= maxDD * 0.7) ddBar.className = 'progress-fill-sop warning';
    else ddBar.className = 'progress-fill-sop';
    
    // Update info cards
    const statusEntry = document.getElementById('statusEntry');
    const statusTrading = document.getElementById('statusTrading');
    const statusWin = document.getElementById('statusWin');
    const statusLoss = document.getElementById('statusLoss');
    
    const canTrade = wins < maxWin && losses < maxLoss && entries < maxEntry && drawdown < maxDD;
    const canEntry = entries < maxEntry && canTrade;
    
    // Entry status
    if (!canEntry) {
        statusEntry.className = 'info-card danger';
        statusEntry.querySelector('.info-value').textContent = 'BLOCKED';
        statusEntry.querySelector('.info-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M480-96q-79 0-149-30t-122.5-82.5Q156-261 126-331T96-480q0-80 30-149.5t82.5-122Q261-804 331-834t149-30q80 0 149.5 30t122 82.5Q804-699 834-629.5T864-480q0 79-30 149t-82.5 122.5Q699-156 629.5-126T480-96Zm0-72q55 0 104-18t89-50L236-673q-32 40-50 89t-18 104q0 130 91 221t221 91Zm244-119q32-40 50-89t18-104q0-130-91-221t-221-91q-55 0-104 18t-89 50l437 437ZM480-480Z"/></svg>';
    } else if (entries >= maxEntry - 1) {
        statusEntry.className = 'info-card warning';
        statusEntry.querySelector('.info-value').textContent = 'LAST ENTRY';
        statusEntry.querySelector('.info-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M336-144v-72h288v72H336Zm0-144-48-449q-2-32 19-55.5t53-23.5h240q32 0 53 23.5t19 55.5l-48 449H336Zm65-72h158l41-384H360l41 384Zm-7-384h-34 240-206Z"/></svg>';
    } else {
        statusEntry.className = 'info-card active';
        statusEntry.querySelector('.info-value').textContent = 'ALLOWED';
        statusEntry.querySelector('.info-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M480.28-96Q401-96 331-126t-122.5-82.5Q156-261 126-330.96t-30-149.5Q96-560 126-629.5q30-69.5 82.5-122T330.96-834q69.96-30 149.5-30t149.04 30q69.5 30 122 82.5T834-629.28q30 69.73 30 149Q864-401 834-331t-82.5 122.5Q699-156 629.28-126q-69.73 30-149 30Zm-.28-72q130 0 221-91t91-221q0-130-91-221t-221-91q-130 0-221 91t-91 221q0 130 91 221t221 91Zm0-72q-100 0-170-70t-70-170q0-100 70-170t170-70q100 0 170 70t70 170q0 100-70 170t-170 70Zm0-72q70 0 119-49t49-119q0-70-49-119t-119-49q-70 0-119 49t-49 119q0 70 49 119t119 49Zm-.21-96Q450-408 429-429.21t-21-51Q408-510 429.21-531t51-21Q510-552 531-530.79t21 51Q552-450 530.79-429t-51 21Z"/></svg>';
    }
    
    // Trading status
    if (!canTrade) {
        statusTrading.className = 'info-card danger';
        statusTrading.querySelector('.info-value').textContent = 'STOPPED';
        statusTrading.querySelector('.info-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M288-444h384v-72H288v72ZM480.28-96Q401-96 331-126t-122.5-82.5Q156-261 126-330.96t-30-149.5Q96-560 126-629.5q30-69.5 82.5-122T330.96-834q69.96-30 149.5-30t149.04 30q69.5 30 122 82.5T834-629.28q30 69.73 30 149Q864-401 834-331t-82.5 122.5Q699-156 629.28-126q-69.73 30-149 30Zm-.28-72q130 0 221-91t91-221q0-130-91-221t-221-91q-130 0-221 91t-91 221q0 130 91 221t221 91Zm0-312Z"/></svg>';
    } else if (wins >= maxWin - 1 || losses >= maxLoss - 1 || entries >= maxEntry - 1) {
        statusTrading.className = 'info-card warning';
        statusTrading.querySelector('.info-value').textContent = 'CAUTION';
        statusTrading.querySelector('.info-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M341-144 144-342v-277l197-197h278l197 197v278L618-144H341Zm32-179 107-106 107 106 50-50-106-107 106-107-50-50-107 106-107-106-50 50 106 107-106 107 50 50Zm-2 107h218l155-155v-218L588-744H371L216-589v218l155 155Zm109-264Z"/></svg>';
    } else {
        statusTrading.className = 'info-card active';
        statusTrading.querySelector('.info-value').textContent = 'ACTIVE';
        statusTrading.querySelector('.info-icon').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M444-144v-80q-51-11-87.5-46T305-357l74-30q8 36 40.5 64.5T487-294q39 0 64-20t25-52q0-30-22.5-50T474-456q-78-28-114-61.5T324-604q0-50 32.5-86t87.5-47v-79h72v79q72 12 96.5 55t25.5 45l-70 29q-8-26-32-43t-53-17q-35 0-58 18t-23 44q0 26 25 44.5t93 41.5q70 23 102 60t32 94q0 57-37 96t-101 49v77h-72Z"/></svg>';
    }
    
    // Win status
    const winsLeft = maxWin - wins;
    if (winsLeft <= 0) {
        statusWin.className = 'info-card danger';
        statusWin.querySelector('.info-value').textContent = 'MAX REACHED';
    } else if (winsLeft === 1) {
        statusWin.className = 'info-card warning';
        statusWin.querySelector('.info-value').textContent = '1 LEFT';
    } else {
        statusWin.className = 'info-card active';
        statusWin.querySelector('.info-value').textContent = `${winsLeft} LEFT`;
    }
    
    // Loss status
    const lossesLeft = maxLoss - losses;
    if (lossesLeft <= 0) {
        statusLoss.className = 'info-card danger';
        statusLoss.querySelector('.info-value').textContent = 'MAX REACHED';
    } else if (lossesLeft === 1) {
        statusLoss.className = 'info-card warning';
        statusLoss.querySelector('.info-value').textContent = '1 LEFT';
    } else {
        statusLoss.className = 'info-card active';
        statusLoss.querySelector('.info-value').textContent = `${lossesLeft} LEFT`;
    }
    
    // Main alert
    const mainAlert = document.getElementById('mainAlert');
    const alertText = document.getElementById('alertText');
    
    if (!canTrade) {
        mainAlert.className = 'alert danger';
        alertText.textContent = 'STOP TRADING - Daily limit reached';
    } else if (!canEntry) {
        mainAlert.className = 'alert danger';
        alertText.textContent = 'ENTRY NOT ALLOWED - Max entry reached';
    } else if (wins >= maxWin - 1 || losses >= maxLoss - 1 || entries >= maxEntry - 1) {
        mainAlert.className = 'alert warning';
        alertText.textContent = 'CAUTION - Approaching the daily limit';
    } else {
        mainAlert.className = 'alert';
        alertText.textContent = 'Trading can be done';
    }
}

document.querySelectorAll('.editable').forEach(el => {
    el.addEventListener('click', function() {
        const ruleName = this.getAttribute('data-rule');
        const currentValue = sopRules[ruleName];
        const label = this.parentElement.querySelector('.rule-label').textContent;
        
        const newValue = prompt(`Edit ${label}\nMasukkan nilai baru:`, currentValue);
        
        if (newValue !== null && !isNaN(newValue) && newValue > 0) {
            sopRules[ruleName] = parseInt(newValue);
            saveSOP(sopRules);
            updateUI();
        }
    });
});

updateUI();

function restartSOP() {
    // 1. Reload rules dan data
    sopRules = loadSOP();

    // 2. Hitung ulang data trading hari ini
    const todaySop = getTodaySOPData();

    // 3. Update objek utama
    Object.assign(tradingDataSop, todaySop);

    // 4. Render ulang UI
    updateUI();

    console.log('🔄 SOP UI Restarted:', tradingDataSop);
}

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
    
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    
    let formatted;
    if (abs >= 1e9) formatted = `${(abs / 1e9).toFixed(2)}B`;
    else if (abs >= 1e6) formatted = `${(abs / 1e6).toFixed(2)}M`;
    else if (abs >= 1e3) formatted = `${(abs / 1e3).toFixed(2)}K`;
    else formatted = `${abs.toFixed(2)}`;
    
    return `${sign}$${formatted}`;
}

function formatPersenShare(pct) {
    if (isNaN(pct)) pct = 0;
    
    const absPct = Math.abs(pct);
    let str = absPct.toFixed(2).replace('.', ',');
    const parts = str.split(',');
    let integerPart = parts[0];
    const decimalPart = parts[1] || '00';
    
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    const sign = pct >= 0 ? '+' : '-';
    return `${sign}${integerPart},${decimalPart}%`;
}

const tradesShare = JSON.parse(localStorage.getItem('dbtrade') || '[]');

let selectedRange = '24H';

function filterByRange(data, range) {
    if (range === 'ALL') return data;

    const now = Date.now();
    let cutoff = 0;

    if (range === '24H') {
        cutoff = now - 24 * 60 * 60 * 1000;
    } else if (range === '1W') {
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
    } else if (range === '30D') {
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
    }

    return data.filter(item => {
        const tDate = typeof item.date === 'string' 
            ? new Date(item.date).getTime() 
            : item.date;
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

    // === Hitung ROI  ===
    const roiPercent = totalDeposit !== 0 ? (totalPnL / totalDeposit) * 100 : 0;

    // === Siapkan text ===
    const text1 = (totalPnL > 0 ? '+' : '') + formatUSDShare(totalPnL); // PnL
    const text2 = formatPersenShare(roiPercent); // ROI %
    const text3 = formatUSDShare(totalDeposit);  // Deposit
    const text4 = formatUSDShare(Math.abs(totalWithdraw)); // Withdraw
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
