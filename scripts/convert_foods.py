"""食品成分表（本表Excel）を src/data/foods.json に変換する。

使い方: python scripts/convert_foods.py <本表.xlsx> <脂肪酸成分表 第1表.xlsx> [出力先]
入力: 文部科学省 日本食品標準成分表 本表（「表全体」シート、成分識別子の行を持つもの）
記号の扱い（SPEC「取り込み方」）:
  "-" や空欄 = 未測定 → null / "Tr" = 微量 → 0 / "(数値)" = 推計値 → 数値 / "(0)" "(Tr)" → 0
"""
import json, re, sys
import openpyxl

# アプリのキー → 本表の成分識別子。飽和脂肪酸(FASAT)は脂肪酸成分表編 第1表から取る。
COLUMNS = {
    "energyKcal": "ENERC_KCAL", "proteinG": "PROT-", "fatG": "FAT-", "carbG": "CHOCDF-",
    "fiberG": "FIB-", "saltG": "NACL_EQ", "calciumMg": "CA", "ironMg": "FE", "magnesiumMg": "MG",
    "potassiumMg": "K", "zincMg": "ZN", "vitaminAUg": "VITA_RAE", "vitaminDUg": "VITD",
    "vitaminB1Mg": "THIA", "vitaminB2Mg": "RIBF", "vitaminCMg": "VITC",
}
KEYS = list(COLUMNS) + ["saturatedFatG"]


def parse(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().strip("()").rstrip("†").strip()  # † は注記の印（3か所）
    if s in ("", "-", "*"):
        return None
    if s == "Tr":
        return 0.0
    return float(s)


def load_fasat(path):
    """食品番号 → 飽和脂肪酸 g/100g。脂肪酸成分表に載っている食品だけ。"""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb["表全体"].iter_rows(values_only=True))
    title = str(rows[0][0] or "").strip()
    head = next(i for i, r in enumerate(rows) if r[3] == "成分識別子")
    col = [str(c).strip() if c else "" for c in rows[head]].index("FASAT")
    assert "g/100" in str(rows[head + 1][col]) and "mg" not in str(rows[head + 1][col])
    return title, {str(r[1]): parse(r[col]) for r in rows[head + 2:] if r[1]}


def main(path, fa_path, out):
    edition, fasat = load_fasat(fa_path)
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows = list(wb["表全体"].iter_rows(values_only=True))
    updated = next((c for c in rows[0] if c), "")
    head = next(i for i, r in enumerate(rows) if r[3] == "成分識別子")
    ident = {str(c).strip(): i for i, c in enumerate(rows[head]) if c}
    remark_col = next(i for r in rows[:head] for i, c in enumerate(r) if c and re.sub(r"\s", "", str(c)) == "備考")
    foods = []
    for r in rows[head + 1:]:
        if not r[1]:
            continue
        name = re.sub(r"[\s　]+", " ", str(r[3])).strip()
        n = [parse(r[ident[COLUMNS[k]]]) if k in COLUMNS else None for k in KEYS]
        sat = fasat.get(str(r[1]))
        if sat is None and n[KEYS.index("fatG")] == 0:
            sat = 0.0  # 脂質が0なら飽和脂肪酸も0
        n[KEYS.index("saturatedFatG")] = sat
        n = [None if x is None else round(x, 3) for x in n]
        food = {"id": str(r[1]), "group": int(r[0]), "name": name, "n": n}
        remark = str(r[remark_col] or "")
        m = re.search(r"別名：\s*([^\n]+)", remark)
        if m:
            food["alias"] = [a.strip() for a in re.split(r"[、,]", m.group(1)) if a.strip()]
        foods.append(food)
    data = {"source": "文部科学省 " + edition, "sourceNote": str(updated),
            "per": "可食部100g当たり", "keys": KEYS, "foods": foods}
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(len(foods), "foods ->", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "src/data/foods.json")
