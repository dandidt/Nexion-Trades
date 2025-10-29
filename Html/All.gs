// === CONFIG: Mapping tiap sheet ke kolom masing-masing ===
const SHEET_MAPPINGS = {
  "AOT SMC TRADE": [
    "tradeNumber", "Date", "Pairs", "Method", "Confluance", "RR",
    "Behavior", "Reason", "Causes", "Psychology", "Class",
    "Bias", "Last", "Pos", "Margin", "Result", "Pnl"
  ],
  "TF": ["Deposit", "Withdraw"]
};

// === Helper: JSON response dengan CORS ===
function jsonResponse(obj) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// === Handle GET ===
function doGet(e) {
  try {
    const sheetName = e.parameter.sheet || "AOT SMC TRADE";
    const data = getSheetData(sheetName);

    // --- ubah sini ---
    // jika data adalah object tunggal, bungkus jadi array
    const result = Array.isArray(data) ? data : [data];

    return jsonResponse(result); // langsung return array
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// === Handle POST ===
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const sheetName = params.sheet;
    const data = params.data;
    const action = params.action || "save"; // default = save (add/update)

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet)
      return jsonResponse({ status: "error", message: "Sheet tidak ditemukan" });

    const mapping = SHEET_MAPPINGS[sheetName];
    if (!mapping)
      return jsonResponse({ status: "error", message: "Mapping sheet tidak dibuat" });

    // === Khusus TF ===
    if (sheetName === "TF") {
      sheet.getRange("B4").setValue(data.Deposit || 0);
      sheet.getRange("C4").setValue(data.Withdraw || 0);
      return jsonResponse({ status: "success", message: "TF updated" });
    }

    // === Khusus AOT SMC TRADE ===
    const colB = sheet.getRange("B4:B" + sheet.getLastRow()).getValues().flat();
    const lastFilledRow = colB.reduce((last, val, i) => {
      if (val && String(val).trim() !== "") last = i + 4;
      return last;
    }, 3);

    const values =
      lastFilledRow > 3
        ? sheet.getRange(4, 2, lastFilledRow - 3, mapping.length).getValues()
        : [];

    const tradeNumber = data.tradeNumber;
    const existingRowIndex = values.findIndex((r) => r[0] == tradeNumber);

    // === ACTION: DELETE ===
    if (action === "delete") {
      if (existingRowIndex < 0)
        return jsonResponse({ status: "error", message: "Trade tidak ditemukan" });

      const rowToDelete = existingRowIndex + 4;
      sheet.deleteRow(rowToDelete);

      // 🔄 Setelah delete → rapikan nomor urut tradeNumber di kolom B
      renumberTrades(sheet);

      return jsonResponse({
        status: "success",
        message: `Trade ${tradeNumber} deleted dan nomor dirapikan ulang`
      });
    }

    // === ACTION: SAVE (add/update) ===
    let finalTradeNumber =
      tradeNumber || Date.now() + Math.floor(Math.random() * 1000);
    data.tradeNumber = finalTradeNumber;

    if (data.Date) data.Date = new Date(data.Date);

    if (existingRowIndex >= 0) {
      // UPDATE
      const updatedRow = mapping.map((col) => data[col] || "");
      sheet
        .getRange(existingRowIndex + 4, 2, 1, mapping.length)
        .setValues([updatedRow]);
    } else {
      // ADD
      const insertRow = lastFilledRow + 1;
      const newRow = mapping.map((col) =>
        data[col] !== undefined ? data[col] : ""
      );
      sheet.getRange(insertRow, 2, 1, mapping.length).setValues([newRow]);
    }

    return jsonResponse({ status: "success", tradeNumber: data.tradeNumber });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// === TEST MANUAL (optional)
// function testRenumber() {
//   const ss = SpreadsheetApp.getActiveSpreadsheet();
//   const sheet = ss.getSheetByName("AOT SMC TRADE");
//   renumberTrades(sheet);
// }

// === RAPIHIN NOMOR URUT TRADE ===
function renumberTrades(sheet) {
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.getSheetByName("AOT SMC TRADE");
  }

  const startRow = 4; // mulai dari B4
  const column = 2;   // kolom B
  const maxRows = 9996;

  const range = sheet.getRange(startRow, column, maxRows, 1);
  const values = range.getValues();

  // Ambil hanya baris yang ada isinya
  const nonEmptyRows = values.filter(r => r[0] !== "" && r[0] !== null);

  if (nonEmptyRows.length === 0) {
    Logger.log("📭 Tidak ada data trade untuk dirapikan");
    return;
  }

  // Buat nomor urut baru
  const newNumbers = nonEmptyRows.map((_, i) => [i + 1]);
  const updateRange = sheet.getRange(startRow, column, newNumbers.length, 1);
  updateRange.setValues(newNumbers);

  Logger.log(`✅ Nomor trade diupdate ulang: total ${newNumbers.length} baris`);
}

// === Handle OPTIONS (CORS preflight) ===
function doOptions(e) {
  return ContentService.createTextOutput()
    // WAJIB: Izinkan SEMUA origin
    .setHeader("Access-Control-Allow-Origin", "*") 
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");

  // return jsonResponse({ status: "ok" });
}

// === Ambil data sheet ===
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  sheetName = sheetName.trim();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  // === khusus TF
  if (sheetName === "TF") {
    const deposit = sheet.getRange("B4").getValue();
    const withdraw = sheet.getRange("C4").getValue();
    return [{ Deposit: deposit, Withdraw: withdraw }];
  }

  // === normal untuk AOT SMC TRADE
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];

  const mapping = SHEET_MAPPINGS[sheetName];
  const range = sheet.getRange(
    "B4:" + sheet.getRange(lastRow, mapping.length + 1).getA1Notation()
  );
  const values = range.getValues().filter((row) => row[2] && String(row[2]).trim() !== "");

  return values.map((row) => {
    const obj = {};
    for (let i = 0; i < mapping.length; i++) {
      obj[mapping[i]] = row[i];
    }

    // === parsing Confluance ===
    let entry = "";
    let tf = "";
    if (obj.Confluance) {
      const parts = String(obj.Confluance).split(",");
      entry = parts[0] ? parts[0].trim() : "";
      tf = parts[1] ? parts[1].trim() : "";
    }

    return {
      tradeNumber: obj.tradeNumber,
      date: new Date(obj.Date).getTime(),
      Pairs: obj.Pairs,
      Method: obj.Method,
      Confluance: {
        Entry: entry,
        TimeFrame: tf
      },
      RR: parseFloat(obj.RR) || 0,
      Behavior: obj.Behavior,
      Causes: obj.Causes,
      Psychology: obj.Psychology,
      Class: obj.Class,
      Files: {
        Bias: obj.Bias,
        Last: obj.Last
      },
      Pos: obj.Pos,
      Margin: parseFloat(obj.Margin) || 0,
      Result: obj.Result,
      Pnl: parseFloat(obj.Pnl) || 0
    };
  });
}