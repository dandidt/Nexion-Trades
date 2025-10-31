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

// ======================= AUTO CALC SYSTEM (v2.1 - LEVERAGE FEE FIX) ======================= //
document.getElementById("btnAuto")?.addEventListener("click", () => {
  try {
    const dbtrade = JSON.parse(localStorage.getItem("dbtrade") || "[]");
    const tf = JSON.parse(localStorage.getItem("tf") || "[]");
    const setting = JSON.parse(localStorage.getItem("setting") || "{}");
    const calc = JSON.parse(localStorage.getItem("calculate") || "{}"); // ⚡ leverage & stopLoss data

    const rrInput = document.getElementById("edit-rr");
    const rr = parseFloat(rrInput?.value || "1.5");

    // === Ambil data dasar ===
    const risk = parseFloat(setting.risk) || 0;         // contoh: 5 (%)
    const feePercent = parseFloat(setting.fee) || 0; // 0.02
    const fee = feePercent / 100;                // contoh: 0.0004 (0.04%)
    const leverage = parseFloat(calc.leverage) || 1;    // contoh: 75x
    const riskFactor = parseFloat(setting.riskFactor) || 1;

    console.log("🧩 RAW:", { dbtradeCount: dbtrade.length, tf, setting, calc, rr, riskFactor });

    // === Hitung total PNL ===
    const totalPNL = dbtrade.reduce((sum, item) => {
      const pnl = parseFloat(item.Pnl ?? item.pnl ?? 0);
      return sum + (isNaN(pnl) ? 0 : pnl);
    }, 0);

    // === Total Deposit tanpa withdraw ===
    const totalDeposit = tf.reduce((sum, item) => {
      const depo = parseFloat(item.Deposit ?? item.deposit ?? 0);
      return sum + (isNaN(depo) ? 0 : depo);
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


// ======================= POPUP SHARE SETUP ======================= //
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

// ====================================
// KONFIGURASI
// ====================================
const TEMPLATE_PATH = 'Asset/template.png';

// === FORMATTER ===
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

// ====================================
// PARSE DATA DARI LOCALSTORAGE
// ====================================

// Ambil data trade
const rawDbTradeShare = localStorage.getItem('dbtrade');
const tradesShare = rawDbTradeShare ? JSON.parse(rawDbTradeShare) : [];

// Ambil data deposit & withdraw
const rawTfShare = localStorage.getItem('tf');
let tfDataShare = { Deposit: 0, Withdraw: 0 };

if (rawTfShare) {
    try {
        const parsedTf = JSON.parse(rawTfShare);
        if (Array.isArray(parsedTf) && parsedTf.length > 0) tfDataShare = parsedTf[0];
        else if (parsedTf && typeof parsedTf === 'object') tfDataShare = parsedTf;
    } catch (e) {
        console.error('❌ Gagal parse tf:', e);
    }
}

const depositShare = typeof tfDataShare.Deposit === 'number'
    ? tfDataShare.Deposit
    : parseFloat(tfDataShare.Deposit) || 0;

const withdrawShare = typeof tfDataShare.Withdraw === 'number'
    ? tfDataShare.Withdraw
    : parseFloat(tfDataShare.Withdraw) || 0;

// ====================================
// FILTER WAKTU UNTUK DASHBOARD SHARE
// ====================================
let selectedRange = '24H';

function filterTradesByRange(trades, range) {
    if (range === 'ALL') return trades;
    const now = Date.now();
    let cutoff = 0;

    if (range === '30D') cutoff = now - 30 * 24 * 60 * 60 * 1000;
    else if (range === '1W') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (range === '24H') cutoff = now - 24 * 60 * 60 * 1000;

    return trades.filter(t => {
        const tDate = typeof t.date === 'string' ? new Date(t.date).getTime() : t.date;
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

// Tombol filter event
document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.share-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRange = btn.textContent;
        updateDashboardShare();
    });
});

// ====================================
// UPDATE DASHBOARD SHARE
// ====================================
const TEXT_CONTENT = {
    text1: '',
    text2: '',
    text3: '',
    text4: '',
    text5: '',
    text6: ''
};

function updateDashboardShare() {
    const filteredTrades = filterTradesByRange(tradesShare, selectedRange);

    const executedTradesShare = filteredTrades.filter(t =>
        (t.Result === 'Profit' || t.Result === 'Loss') &&
        typeof t.Pnl === 'number'
    );

    const totalPnLShare = executedTradesShare.reduce((sum, t) => sum + t.Pnl, 0);
    const roiPercentShare = depositShare !== 0 ? (totalPnLShare / depositShare) * 100 : 0;

    const text1Share = (totalPnLShare > 0 ? '+' : '') + formatUSDShare(totalPnLShare);
    const text2Share = formatPersenShare(roiPercentShare);
    const text3Share = formatUSDShare(depositShare);
    const text4Share = formatUSDShare(withdrawShare);
    const text5Share = executedTradesShare.length.toString();
    const text6Share = getTitleByRange(selectedRange);

    TEXT_CONTENT.text1 = text1Share;
    TEXT_CONTENT.text2 = text2Share;
    TEXT_CONTENT.text3 = text3Share;
    TEXT_CONTENT.text4 = text4Share;
    TEXT_CONTENT.text5 = text5Share;
    TEXT_CONTENT.text6 = text6Share;

    drawCanvasShare();
}

updateDashboardShare();

// ====================================
// POSISI TEKS
// ====================================
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

// === STYLE TEKS ===
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

// ====================================
// LOAD TEMPLATE IMAGE
// ====================================
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

// ====================================
// DRAW FUNGSI
// ====================================
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

// ====================================
// COPY & DOWNLOAD
// ====================================
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

// Placeholder awal
canvasShare.width = 800;
canvasShare.height = 600;
ctxShare.fillStyle = '#f0f0f0';
ctxShare.fillRect(0, 0, canvasShare.width, canvasShare.height);
ctxShare.fillStyle = '#999';
ctxShare.font = '20px Roboto';
ctxShare.textAlign = 'center';
ctxShare.fillText('Loading template.png...', canvasShare.width / 2, canvasShare.height / 2);
