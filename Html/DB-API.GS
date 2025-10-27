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

// === Tambahkan header CORS ===
function withCors(response) {
  return response.setHeader
    ? response
        .setHeader("Access-Control-Allow-Origin", "*")
        .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .setHeader("Access-Control-Allow-Headers", "Content-Type")
    : response;
}

// === Handle GET ===
function doGet(e) {
  try {
    const sheetName = e.parameter.sheet || "AOT SMC TRADE";
    const data = getSheetData(sheetName);
    return jsonResponse({ status: "success", data });
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

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet)
      return jsonResponse({ status: "error", message: "Sheet tidak ditemukan" });

    const mapping = SHEET_MAPPINGS[sheetName];
    if (!mapping)
      return jsonResponse({ status: "error", message: "Mapping sheet tidak dibuat" });

    if (sheetName === "TF") {
      sheet.getRange("B4").setValue(data.Deposit || 0);
      sheet.getRange("C4").setValue(data.Withdraw || 0);
    } else if (sheetName === "AOT SMC TRADE") {
      const lastRow = sheet.getLastRow();
      const values = sheet.getRange(4, 2, lastRow - 3, mapping.length).getValues();

      let tradeNumber =
        data.tradeNumber || Date.now() + Math.floor(Math.random() * 1000);
      data.tradeNumber = tradeNumber;

      let existingRowIndex = values.findIndex((r) => r[0] == tradeNumber);
      if (existingRowIndex >= 0) {
        for (let i = 0; i < mapping.length; i++) {
          sheet.getRange(existingRowIndex + 4, i + 2).setValue(data[mapping[i]] || "");
        }
      } else {
        const newRow = mapping.map((col) =>
          data[col] !== undefined ? data[col] : ""
        );
        sheet.appendRow(newRow);
      }
    }

    return jsonResponse({ status: "success", tradeNumber: data.tradeNumber });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}

// === Handle OPTIONS (CORS preflight) ===
function doOptions(e) {
  return jsonResponse({ status: "ok" });
}

// === Ambil data sheet ===
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  sheetName = sheetName.trim();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  // === khusus TF (karena cuma pakai sel B4 & C4)
  if (sheetName === "TF") {
    const deposit = sheet.getRange("B4").getValue();
    const withdraw = sheet.getRange("C4").getValue();
    return { Deposit: deposit, Withdraw: withdraw };
  }

  // === normal process untuk sheet trading ===
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return [];

  const range = sheet.getRange(
    "B4:" + sheet.getRange(lastRow, sheet.getLastColumn()).getA1Notation()
  );
  const values = range
    .getValues()
    .filter((row) => row[2] && String(row[2]).trim() !== "");

  const mapping = SHEET_MAPPINGS[sheetName];
  if (!mapping) return values;

  return values.map((row) => {
    const obj = {};
    for (let i = 0; i < mapping.length; i++) obj[mapping[i]] = row[i];
    return obj;
  });
}

