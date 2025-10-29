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
document.addEventListener("DOMContentLoaded", () => {
    // Popup elements
    const popupOverlay = document.querySelector(".popup-overlay");
    const popupAdd = document.querySelector(".popup-add");
    const popupEdit = document.querySelector(".popup-edit");
    const popupCaculate = document.querySelector(".popup-caculate");

    // Buttons
    const btnAdd = document.getElementById("btnAdd");
    const btnEdit = document.getElementById("btnEdit");
    const btnCaculate = document.getElementById("btnCaculate");
    const tableBody = document.querySelector(".tabel-trade tbody");

    // === Helper: cek apakah ada popup aktif ===
    function hasAnyPopupOpen() {
        return (
            popupAdd?.classList.contains("show") ||
            popupEdit?.classList.contains("show") ||
            popupCaculate?.classList.contains("show")
        );
    }

    // === Tutup popup spesifik ===
    function closePopup(popup) {
        popup?.classList.remove("show");
        if (!hasAnyPopupOpen()) {
            popupOverlay?.classList.remove("show");
            document.body.classList.remove("popup-open");
            document.body.style.overflow = "";
        }
    }

    // === Tutup SEMUA popup ===
    function closeAllPopups() {
        popupAdd?.classList.remove("show");
        popupEdit?.classList.remove("show");
        popupCaculate?.classList.remove("show");
        popupOverlay?.classList.remove("show");
        document.body.classList.remove("popup-open");
        document.body.style.overflow = "";
    }

    // === Buka Add Popup ===
    if (btnAdd) {
        btnAdd.addEventListener("click", () => {
            closeAllPopups();
            document.body.classList.add("popup-open");
            document.body.style.overflow = "hidden";
            popupOverlay?.classList.add("show");
            popupAdd?.classList.add("show");

            const dateInput = document.getElementById("date");
            if (dateInput) {
                dateInput.value = new Date().toISOString().split("T")[0];
            }
        });
    }

    // === Buka Calculate Popup ===
    if (btnCaculate) {
        btnCaculate.addEventListener("click", () => {
            closeAllPopups();
            document.body.classList.add("popup-open");
            document.body.style.overflow = "hidden";
            popupOverlay?.classList.add("show");
            popupCaculate?.classList.add("show");
        });
    }

    // === Edit Mode Toggle ===
    if (btnEdit) {
        btnEdit.addEventListener("click", () => {
            isEditMode = !isEditMode;
            document.querySelectorAll(".tabel-trade tbody tr").forEach(row => {
                row.style.cursor = isEditMode ? "pointer" : "default";
                row.classList.toggle("editable", isEditMode);
            });
            btnEdit.classList.toggle("active", isEditMode);
        });
    }

    // === Klik baris → buka edit ===
    if (tableBody) {
        tableBody.addEventListener("click", async (e) => {
            if (!isEditMode) return;
            const row = e.target.closest("tr");
            if (!row) return;

            const tradeNumberText = row.querySelector(".no")?.textContent;
            const tradeNumber = parseInt(tradeNumberText);
            if (!tradeNumber) return;

            try {
                const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
                const tradeData = dbTrade.find(trade => trade.tradeNumber === tradeNumber);
                if (!tradeData) return;

                closeAllPopups();
                document.body.classList.add("popup-open");
                document.body.style.overflow = "hidden";
                popupOverlay?.classList.add("show");
                popupEdit?.classList.add("show");

                setTimeout(() => fillEditForm(tradeData), 50);
            } catch (err) {
                console.error("❌ Gagal buka edit:", err);
            }
        });
    }

    // === Overlay click → tutup semua ===
    popupOverlay?.addEventListener("click", closeAllPopups);

    // === Tombol Cancel ===
    document.getElementById("closeAdd")?.addEventListener("click", () => closePopup(popupAdd));
    document.getElementById("closeEdit")?.addEventListener("click", () => closePopup(popupEdit));
    document.getElementById("closeCaculate")?.addEventListener("click", () => closePopup(popupCaculate));

    // === Custom Dropdowns ===
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
        const selected = dropdown.querySelector('.dropdown-selected');
        const options = dropdown.querySelector('.dropdown-options');
        const optionElements = dropdown.querySelectorAll('.dropdown-option');
        const name = dropdown.getAttribute('data-dropdown');

        selected.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-dropdown').forEach(d => {
                if (d !== dropdown) {
                    d.querySelector('.dropdown-options')?.classList.remove('show');
                }
            });
            options.classList.toggle('show');
        });

        optionElements.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = opt.getAttribute('data-value');
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
        document.querySelectorAll('.dropdown-options').forEach(opt => opt.classList.remove('show'));
    });
});

// ======================= FILL EDIT FORM ======================= //
function fillEditForm(trade) {
    const dateEl = document.getElementById("edit-date");
    if (trade.date && typeof trade.date === 'number') {
        dateEl.value = new Date(trade.date).toISOString().split('T')[0];
    } else if (trade.Date) {
        if (trade.Date.includes("/")) {
            const [day, month, year] = trade.Date.split("/");
            dateEl.value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        } else {
            dateEl.value = trade.Date;
        }
    }

    document.getElementById("edit-pairs").value = trade.Pairs || "";
    document.getElementById("edit-rr").value = trade.RR || "";
    document.getElementById("edit-margin").value = trade.Margin || "";
    document.getElementById("edit-pnl").value = trade.Pnl || "";
    document.getElementById("edit-causes").value = trade.Causes || "";
    document.getElementById("edit-bias-url").value = trade.Files?.Bias || "";
    document.getElementById("edit-execution-url").value = trade.Files?.Last || "";

    setDropdownValue("edit-method", trade.Method, "edit");
    setDropdownValue("edit-behavior", trade.Behavior, "edit");
    setDropdownValue("edit-psychology", trade.Psychology, "edit");
    setDropdownValue("edit-class", trade.Class, "edit");
    const posVal = trade.Pos === "B" ? "Long" : trade.Pos === "S" ? "Short" : "";
    setDropdownValue("edit-position", posVal, "edit");
    setDropdownValue("edit-result", trade.Result, "edit");
    setDropdownValue("edit-timeframe", trade.Confluance?.TimeFrame || "", "edit");
    setDropdownValue("edit-entry", trade.Confluance?.Entry || "", "edit");

    currentEditingTradeNo = trade.tradeNumber;
}

// ======================= DROPDOWN HELPER ======================= //
function setDropdownValue(dropdownName, value, scope = "edit") {
    const container = scope === "edit"
        ? document.querySelector(".popup-edit")
        : document.querySelector(".popup-add");
    if (!container) return;

    const dropdown = container.querySelector(`.custom-dropdown[data-dropdown="${dropdownName}"]`);
    if (!dropdown) return;

    const selectedSpan = dropdown.querySelector(".dropdown-selected span");
    const options = dropdown.querySelectorAll(".dropdown-option");

    options.forEach(opt => opt.classList.remove("selected"));
    if (value) {
        const matched = Array.from(options).find(
            opt => opt.getAttribute("data-value") === value
        );
        if (matched) {
            matched.classList.add("selected");
            selectedSpan.textContent = matched.textContent;
            selectedSpan.classList.remove("placeholder");
        } else {
            selectedSpan.textContent = value;
            selectedSpan.classList.remove("placeholder");
        }
        dropdownData[scope === "edit" ? `edit-${dropdownName}` : dropdownName] = value;
    } else {
        selectedSpan.textContent = selectedSpan.getAttribute("data-placeholder") || "Select";
        selectedSpan.classList.add("placeholder");
        dropdownData[scope === "edit" ? `edit-${dropdownName}` : dropdownName] = "";
    }
}

// ======================= HANDLE CLOSE (untuk tombol Save/Delete) ======================= //
function handleCancel() {
    document.getElementById("closeAdd")?.click();
}
function handleCancelEdit() {
    document.getElementById("closeEdit")?.click();
}

// ======================= ADD TRADE ======================= //
async function handleAdd() {
    const btn = document.getElementById("addTrade");
    btn.classList.add("loading");

    const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];

    const lastTradeNumber = dbTrade.length > 0 
        ? dbTrade[dbTrade.length - 1].tradeNumber 
        : 0;

    // ===== Struktur untuk dikirim ke SERVER (flat) =====
    const serverData = {
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

    // ===== Struktur untuk LOCAL CACHE (nested) =====
    const localData = {
        tradeNumber: lastTradeNumber + 1,
        date: Date.parse(document.getElementById("date").value) || Date.now(),
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

// ======================= EDIT TRADE ======================= //
function openEditPopup(trade) {
    closeAllPopups(); // pastikan popup lain tertutup

    const popupEdit = document.querySelector(".popup-edit");
    const overlay = document.querySelector(".popup-overlay");

    if (!popupEdit || !overlay) return;

    document.body.classList.add("popup-open");
    document.body.style.overflow = "hidden";
    overlay.classList.add("show");
    popupEdit.classList.add("show");

    // Isi data (sama seperti sebelumnya)
    setTimeout(() => {
        const dateEl = document.getElementById("edit-date");
        if (trade.date && typeof trade.date === 'number') {
            dateEl.value = new Date(trade.date).toISOString().split('T')[0];
        } else if (trade.Date) {
            if (trade.Date.includes("/")) {
                const [day, month, year] = trade.Date.split("/");
                dateEl.value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            } else {
                dateEl.value = trade.Date;
            }
        }

        document.getElementById("edit-pairs").value = trade.Pairs || "";
        document.getElementById("edit-rr").value = trade.RR || "";
        document.getElementById("edit-margin").value = trade.Margin || "";
        document.getElementById("edit-pnl").value = trade.Pnl || "";
        document.getElementById("edit-causes").value = trade.Causes || "";
        document.getElementById("edit-bias-url").value = trade.Files?.Bias || "";
        document.getElementById("edit-execution-url").value = trade.Files?.Last || "";

        setDropdownValue("edit-method", trade.Method, "edit");
        setDropdownValue("edit-behavior", trade.Behavior, "edit");
        setDropdownValue("edit-psychology", trade.Psychology, "edit");
        setDropdownValue("edit-class", trade.Class, "edit");
        
        const positionValue = trade.Pos === "B" ? "Long" : trade.Pos === "S" ? "Short" : "";
        setDropdownValue("edit-position", positionValue, "edit");
        
        setDropdownValue("edit-result", trade.Result, "edit");
        setDropdownValue("edit-timeframe", trade.Confluance?.TimeFrame || "", "edit");
        setDropdownValue("edit-entry", trade.Confluance?.Entry || "", "edit");
    }, 50);
}

// ======================= EDIT TRADE ======================= //
async function handleSaveEdit() {
    const btn = document.getElementById("updateTrade");
    btn.classList.add("loading");

    // helper buat ambil dropdown edit
    const getEditDropdownValue = (dropdownName) => {
        const dropdown = document.querySelector(
            `.popup-edit .custom-dropdown[data-dropdown="${dropdownName}"]`
        );
        if (!dropdown) return "";
        const selectedOption = dropdown.querySelector(".dropdown-option.selected");
        return selectedOption?.getAttribute("data-value") || "";
    };

    // ======================= STRUKTUR SERVER (flat) ======================= //
    const serverData = {
        tradeNumber: currentEditingTradeNo,
        Date: document.getElementById("edit-date").value || "",
        Pairs: document.getElementById("edit-pairs").value.trim(),
        Method: getEditDropdownValue("edit-method"),
        Confluance: `${getEditDropdownValue("edit-entry")}, ${getEditDropdownValue("edit-timeframe")}`,
        RR: parseFloat(document.getElementById("edit-rr").value) || 0,
        Behavior: getEditDropdownValue("edit-behavior"),
        Causes: document.getElementById("edit-causes").value.trim() || "",
        Psychology: getEditDropdownValue("edit-psychology"),
        Class: getEditDropdownValue("edit-class"),
        Bias: document.getElementById("edit-bias-url").value.trim() || "",
        Last: document.getElementById("edit-execution-url").value.trim() || "",
        Pos:
            getEditDropdownValue("edit-position") === "Long"
                ? "B"
                : getEditDropdownValue("edit-position") === "Short"
                ? "S"
                : "",
        Margin: parseFloat(document.getElementById("edit-margin").value) || 0,
        Result: getEditDropdownValue("edit-result"),
        Pnl: parseFloat(document.getElementById("edit-pnl").value) || 0,
    };

    // ======================= STRUKTUR LOCAL (nested) ======================= //
    const localData = {
        tradeNumber: currentEditingTradeNo,
        date: Date.parse(document.getElementById("edit-date").value) || Date.now(),
        Pairs: document.getElementById("edit-pairs").value.trim(),
        Method: getEditDropdownValue("edit-method"),
        Confluance: {
            Entry: getEditDropdownValue("edit-entry"),
            TimeFrame: getEditDropdownValue("edit-timeframe"),
        },
        RR: parseFloat(document.getElementById("edit-rr").value) || 0,
        Behavior: getEditDropdownValue("edit-behavior"),
        Causes: document.getElementById("edit-causes").value.trim() || "",
        Psychology: getEditDropdownValue("edit-psychology"),
        Class: getEditDropdownValue("edit-class"),
        Files: {
            Bias: document.getElementById("edit-bias-url").value.trim() || "",
            Last: document.getElementById("edit-execution-url").value.trim() || "",
        },
        Pos:
            getEditDropdownValue("edit-position") === "Long"
                ? "B"
                : getEditDropdownValue("edit-position") === "Short"
                ? "S"
                : "",
        Margin: parseFloat(document.getElementById("edit-margin").value) || 0,
        Result: getEditDropdownValue("edit-result"),
        Pnl: parseFloat(document.getElementById("edit-pnl").value) || 0,
    };

    // ======================= VALIDASI ======================= //
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
        alert(`⚠️ Field wajib belum diisi: ${missing.join(", ")}`);
        btn.classList.remove("loading");
        return;
    }

    // ======================= UPDATE KE SUPABASE ======================= //
    try {
        const res = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
                sheet: "AOT SMC TRADE",
                action: "update",
                tradeNumber: currentEditingTradeNo,
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

        console.log("✅ Data sukses diupdate di server");

        // ======================= UPDATE LOCAL CACHE ======================= //
        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];
        const index = dbTrade.findIndex((t) => t.tradeNumber === currentEditingTradeNo);
        if (index !== -1) {
            dbTrade[index] = localData;
            localStorage.setItem("dbtrade", JSON.stringify(dbTrade));
            renderTradingTable(dbTrade);
        }

        console.log("📦 Local cache updated:", localData);

        // ======================= TUTUP POPUP ======================= //
        handleCancelEdit();
        console.log("[UI] Popup edit closed");

        // optional: feedback
        console.log(`✅ Trade #${currentEditingTradeNo} berhasil diupdate`);

    } catch (err) {
        console.error("❌ Gagal update trade:", err);
    } finally {
        btn.classList.remove("loading");
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
        // === DELETE KE SERVER === //
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

        // === HAPUS DARI LOCAL CACHE === //
        const dbTrade = JSON.parse(localStorage.getItem("dbtrade")) || [];

        // Filter keluar trade yang dihapus
        let newDb = dbTrade.filter(t => t.tradeNumber !== currentEditingTradeNo);

        // Re-number semua trade di bawah nomor yang dihapus
        newDb = newDb.map(trade => {
            if (trade.tradeNumber > currentEditingTradeNo) {
                return { ...trade, tradeNumber: trade.tradeNumber - 1 };
            }
            return trade;
        });

        // Simpan ulang ke localStorage
        localStorage.setItem("dbtrade", JSON.stringify(newDb));

        console.log("📦 Local cache updated dan tradeNumber dirapikan ulang");

        // === RENDER ULANG TABLE === //
        renderTradingTable(newDb);

        // === TUTUP POPUP === //
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

