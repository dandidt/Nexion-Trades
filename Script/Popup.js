document.addEventListener("DOMContentLoaded", () => {
    const btnAdd = document.getElementById("btnAdd");
    const popupOverlay = document.querySelector(".popup-overlay");
    const popupContainer = document.querySelector(".popup-container");
    const dateInput = document.getElementById("date");

    if (!btnAdd || !popupOverlay || !popupContainer) return;

    // Klik tombol Add
    btnAdd.addEventListener("click", () => {
        document.body.classList.add("popup-open");
        popupOverlay.classList.add("show");
        popupContainer.classList.add("show");

        // Auto set date ke hari ini
        const today = new Date().toISOString().split("T")[0];
        if (dateInput) dateInput.value = today;
    });

    // Klik overlay -> close popup
    popupOverlay.addEventListener("click", () => {
        handleCancel();
    });
});

function handleCancel() {
    document.body.classList.remove("popup-open");
    document.querySelector(".popup-overlay")?.classList.remove("show");
    document.querySelector(".popup-container")?.classList.remove("show");
}

// Custom Dropdown functionality
const dropdownData = {};

document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    const selected = dropdown.querySelector('.dropdown-selected');
    const options = dropdown.querySelector('.dropdown-options');
    const optionElements = dropdown.querySelectorAll('.dropdown-option');
    const dropdownName = dropdown.getAttribute('data-dropdown');
    
    dropdownData[dropdownName] = '';

    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close all other dropdowns
        document.querySelectorAll('.custom-dropdown').forEach(d => {
            if (d !== dropdown) {
                d.querySelector('.dropdown-selected').classList.remove('active');
                d.querySelector('.dropdown-options').classList.remove('show');
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

            // Update selected text
            const span = selected.querySelector('span');
            span.textContent = text;
            span.classList.remove('placeholder');

            // Update selected state
            optionElements.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');

            // Store value
            dropdownData[dropdownName] = value;

            // Close dropdown
            selected.classList.remove('active');
            options.classList.remove('show');
        });
    });
});

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-selected').forEach(selected => {
        selected.classList.remove('active');
    });
    document.querySelectorAll('.dropdown-options').forEach(options => {
        options.classList.remove('show');
    });
});

async function handleAdd() {
    // Ambil semua value dari form
    const data = {
        tradeNumber: Date.now(),
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
        Pos: dropdownData.position || "",
        Margin: 0,
        Result: dropdownData.result || "",
        Pnl: 0,
    };

    // Validasi wajib isi
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

    try {
        const res = await fetch(
            "https://script.google.com/macros/s/AKfycbwg_KAAr3ipqVMvhoKMrIDbp3anIQP5r1jL8nv6yZS4KP_C0lvlCz_ICg8spda0ZSyw/exec",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sheet: "AOT SMC TRADE",
                    data: data,
                }),
            }
        );

        // Pastikan JSON-nya valid
        const result = await res.json().catch(async () => {
            const text = await res.text();
            console.error("⚠️ Unexpected response:", text);
            throw new Error("Response bukan JSON");
        });

        console.log("[Save Result]", result);

        if (result.status !== "success") {
            throw new Error(result.message || "Gagal menyimpan trade");
        }

        handleCancel();

        await reloadDB();
        const updatedData = await getDB();
        renderTradingTable(updatedData);

        alert("✅ Trade berhasil ditambahkan!");
    } catch (err) {
        console.error("❌ Gagal menambahkan trade:", err);
        alert("❌ Gagal menambahkan trade!");
    }
}

// Edit
let isEditMode = false;

document.getElementById("btnEdit").addEventListener("click", () => {
    isEditMode = !isEditMode;
    const tableRows = document.querySelectorAll(".tabel-trade tbody tr");

    tableRows.forEach(row => {
        row.style.cursor = isEditMode ? "pointer" : "default";
        row.classList.toggle("editable", isEditMode);
    });

    const btn = document.getElementById("btnEdit");
    btn.classList.toggle("active", isEditMode);
});

document.querySelector(".tabel-trade tbody").addEventListener("click", (e) => {
    if (!isEditMode) return; 

    const row = e.target.closest("tr");
    if (!row) return;

    const tradeData = {
        No: row.querySelector(".no")?.textContent.trim(),
        Date: row.querySelector(".date")?.textContent.trim(),
        Pairs: row.querySelector(".pairs")?.textContent.trim(),
        Method: row.querySelector(".method")?.textContent.trim(),
        Confluance: row.querySelector(".confluance")?.textContent.trim(),
        RR: row.querySelector("td:nth-child(6) p")?.textContent.trim(),
        Behavior: row.querySelector(".behavior")?.textContent.trim(),
        Psychology: row.querySelector("td:nth-child(9) p")?.textContent.trim(),
        Class: row.querySelector(".class")?.textContent.trim(),
        Pos: row.querySelector("td:nth-child(12) p")?.textContent.trim(),
        Margin: row.querySelector(".margin")?.textContent.trim(),
        Result: row.querySelector("td:nth-child(14) p")?.textContent.trim(),
        PnL: row.querySelector("td:nth-child(15) p")?.textContent.trim(),
    };

    openEditPopup(tradeData);
});
function openEditPopup(trade) {
    const popup = document.querySelector(".popup-edit");
    const overlay = document.querySelector(".popup-edit-overlay");

    if (!popup || !overlay) return;

    document.body.classList.add("popup-open");
    document.body.style.overflow = "hidden";
    popup.classList.add("show");
    overlay.classList.add("show");

    document.querySelector("#editForm #pairs").value = trade.Pairs || "";
    document.querySelector("#editForm #rr").value = trade.RR || "";
}

function handleCancelEdit() {
    const popup = document.querySelector(".popup-edit");
    const overlay = document.querySelector(".popup-edit-overlay");

    document.body.classList.remove("popup-open");
    document.body.style.overflow = ""; 
    popup?.classList.remove("show");
    overlay?.classList.remove("show");
}

document.addEventListener("DOMContentLoaded", () => {
    const btnAdd = document.getElementById("btnAdd");
    const popupOverlay = document.querySelector(".popup-overlay");
    const popupContainer = document.querySelector(".popup-container");

    if (!btnAdd || !popupOverlay || !popupContainer) return;

    // Klik tombol Add
    btnAdd.addEventListener("click", () => {
        document.body.classList.add("popup-open");
        popupOverlay.classList.add("show");
        popupContainer.classList.add("show");
    });

    // Klik overlay -> close popup
    popupOverlay.addEventListener("click", () => {
        handleCancel();
    });
});

function handleCancel() {
    document.body.classList.remove("popup-open");
    document.querySelector(".popup-overlay")?.classList.remove("show");
    document.querySelector(".popup-container")?.classList.remove("show");
}

function handleSaveEdit() {
    // ambil data dari form edit
    // update ke data array utama
    // lalu render ulang tabel
    handleCancelEdit();
}
