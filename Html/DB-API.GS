function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify(getTradeData(), null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTradeData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("AOT SMC TRADE");
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange("B4:R" + lastRow);
  const values = range.getValues();

  // Hilangkan baris kosong
  const filtered = values.filter(row => row.join("").trim() !== "");

  const jsonData = filtered.map(row => {
    // === Ambil data dari tiap kolom ===
    const [
      no, date, pairs, method, confluance, rr,
      behavior, reason, causes, psychology, _class,
      bias, last, pos, margin, result, pnl
    ] = row;

    // === Parsing nilai kompleks ===
    const [entry = "", timeFrame = ""] = (confluance || "").split(",").map(v => v.trim());
    const pnlNum = parseFloat(String(pnl).replace(/[^\d.-]/g, "")) || 0;
    const marginNum = parseFloat(String(margin).replace(/[^\d.-]/g, "")) || 0;

    return {
      tradeNumber: Date.now() + Math.floor(Math.random() * 1000), // ID unik
      date: date || "",
      Pairs: pairs || "",
      Method: method || "",
      Confluance: {
        Entry: entry || "",
        TimeFrame: timeFrame || ""
      },
      RR: parseFloat(rr) || 0,
      Behavior: behavior || "",
      Reason: reason || "",
      Causes: causes || "",
      Psychology: psychology || "",
      Class: _class || "",
      Files: {
        Bias: bias || "",
        Last: last || ""
      },
      Pos: pos || "",
      Margin: marginNum,
      Result: result || "",
      Pnl: pnlNum
    };
  });

  return jsonData;
}

// === Fungsi Test Manual di Editor ===
// function testGetData() {
//   const data = getTradeData();
//   Logger.log(JSON.stringify(data, null, 2));
// }
