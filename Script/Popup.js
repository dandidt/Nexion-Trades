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
    const data = {
        tradeNumber: Date.now(),
        date: Date.now(),
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
        Pos: dropdownData.position || "",
        Margin: 0,
        Result: dropdownData.result || "",
        Pnl: 0,
    };

    // Cek semua field wajib
    const missing = Object.entries(data).filter(([key, val]) => {
        if (typeof val === "object") return false;
        return val === "" || val === null;
    });

    if (missing.length > 0) {
        alert(`⚠️ Beberapa field belum diisi: ${missing.map(([k]) => k).join(", ")}`);
        return;
    }

    console.log("[Add Trade] Data baru:", data);

    try {
        const res = await fetch("/save-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        });

        const text = await res.text();
        console.log("[Save Result]", text);

        handleCancel(); // Tutup popup

        // Refresh data dari file biar tabel update
        const updatedRes = await fetch("/data-trading.json");
        const updatedTrades = await updatedRes.json();
        renderTradingTable(updatedTrades);

        alert("✅ Trade berhasil ditambahkan!");
    } catch (err) {
        console.error("Gagal menambahkan trade:", err);
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
    
    popup.classList.add("show");
    overlay.classList.add("show");

    // Isi form edit dengan data dari baris
    document.querySelector("#editForm #pairs").value = trade.Pairs || "";
    document.querySelector("#editForm #rr").value = trade.RR || "";
    // dan seterusnya sesuai field lain...
}

function handleCancelEdit() {
    document.querySelector(".popup-edit").classList.remove("show");
    document.querySelector(".popup-edit-overlay").classList.remove("show");
}

function handleSaveEdit() {
    // ambil data dari form edit
    // update ke data array utama
    // lalu render ulang tabel
    handleCancelEdit();
}
