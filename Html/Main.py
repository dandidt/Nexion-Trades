import csv
import json
from datetime import datetime

def parse_date(date_str):
    """Ubah format tanggal ke timestamp (ms)"""
    try:
        dt = datetime.strptime(date_str.strip(), "%d-%m-%y")
        return int(dt.timestamp() * 1000)
    except Exception:
        return None

def parse_float(value):
    """Ubah string (termasuk dengan koma sebagai desimal) jadi float"""
    if not value or value.strip() == "":
        return None
    try:
        return float(value.replace(",", "."))
    except Exception:
        return None

def parse_money(value):
    """Parse nilai uang dalam format Eropa: $1.016,66 atau $16,88"""
    if not value or value.strip() == "":
        return None
    try:
        clean = value.replace("$", "").strip()
        # Handle format Eropa: titik sebagai ribuan, koma sebagai desimal
        if "," in clean and "." in clean:
            # Pastikan koma adalah desimal (biasanya hanya 1 koma di akhir)
            if clean.count(",") == 1 and clean.rfind(",") > clean.rfind("."):
                clean = clean.replace(".", "").replace(",", ".")
            else:
                # Format tidak jelas → hapus koma (fallback)
                clean = clean.replace(",", "")
        elif "," in clean:
            # Hanya koma → asumsi desimal
            clean = clean.replace(",", ".")
        # Jika hanya titik (format US), biarkan
        return float(clean)
    except Exception:
        return None

def convert_csv_to_json(csv_file, json_file):
    result = []

    with open(csv_file, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Pastikan kolom 'No' ada dan tidak kosong
            if "No" not in row or not row["No"].strip():
                continue

            # Split Confluance jadi Entry & TimeFrame
            confluance_parts = [p.strip() for p in row.get("Confluance", "").split(",")] if row.get("Confluance") else []
            entry = confluance_parts[0] if len(confluance_parts) > 0 else None
            timeframe = confluance_parts[1] if len(confluance_parts) > 1 else None

            # Parse Result dan PnL
            result_value = row.get("Result", "").strip() or None
            pnl_value = parse_money(row.get("PnL", ""))

            # Build JSON structure
            item = {
                "tradeNumber": int(row["No"]) if row["No"].isdigit() else None,
                "date": parse_date(row.get("Date", "")),
                "Pairs": row.get("Pairs") or None,
                "Method": row.get("Method") or None,
                "Confluance": {
                    "Entry": entry,
                    "TimeFrame": timeframe
                },
                "RR": parse_float(row.get("RR", "")),
                "Behavior": row.get("Behavior") or None,
                "Causes": row.get("Causes") or None,
                "Psychology": row.get("Psychology") or None,
                "Class": row.get("Class") or None,
                "Files": {
                    "Bias": row.get("Bias") or None,
                    "Last": row.get("Last") or None
                },
                "Pos": row.get("Pos") or None,
                "Margin": parse_money(row.get("Margin", "")),
                "Result": result_value,
                "Pnl": pnl_value
            }

            result.append(item)

    # Tulis hasil JSON
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=4)

    print(f"✅ Data trading berhasil dikonversi ke '{json_file}'")


# Jalankan konversi
if __name__ == "__main__":
    convert_csv_to_json("data.csv", "data-trading.json")