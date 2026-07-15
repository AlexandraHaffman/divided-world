# -*- coding: utf-8 -*-
"""Валидатор связей персонажей (поле relations в data/characters/*.json).

Проверяет:
  1. ОШИБКА  — relations имеет неверную форму (не список объектов с to/type);
  2. ОШИБКА  — type не входит в {love, family, ally, enemy};
  3. ОШИБКА  — `to` указывает на несуществующего персонажа (имя должно
               совпадать с полем name его файла с точностью до регистра
               и лишних пробелов);
  4. ОШИБКА  — связь персонажа с самим собой или дубль (то же `to` дважды);
  5. ПРЕДУПРЕЖДЕНИЕ — односторонняя связь: у А есть Б, но у Б нет А
               (иногда так и задумано — например, Дариан не знает
               о существовании Элари, — поэтому это не ошибка);
  6. ЗАМЕТКА — типы связи расходятся (у А love, у Б ally): допустимо
               (безответная любовь), но выводится для самопроверки.

Запуск:  python3 scripts/validate_relations.py
Код возврата 1 — только при ошибках; предупреждения не роняют CI.
"""
import json
import pathlib
import sys

VALID_TYPES = {"love", "family", "ally", "enemy"}
CHAR_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "characters"


def norm(name):
    return " ".join(str(name).split()).casefold()


def main():
    chars = {}
    errors, warnings, notes = [], [], []

    for path in sorted(CHAR_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path.name}: файл не читается как JSON ({exc})")
            continue
        name = data.get("name")
        if not name:
            errors.append(f"{path.name}: нет поля name")
            continue
        if norm(name) in chars:
            errors.append(f"{path.name}: дублирует имя «{name}»")
            continue
        chars[norm(name)] = (name, path.name, data)

    # прямые проверки
    for key, (name, fname, data) in chars.items():
        rels = data.get("relations")
        if rels is None:
            continue
        if not isinstance(rels, list):
            errors.append(f"{fname}: relations должно быть списком")
            continue
        seen = set()
        for i, r in enumerate(rels):
            where = f"{fname}: relations[{i}]"
            if not isinstance(r, dict) or "to" not in r or "type" not in r:
                errors.append(f"{where}: нужен объект с полями to и type")
                continue
            if r["type"] not in VALID_TYPES:
                errors.append(f"{where}: неизвестный type «{r['type']}» "
                              f"(допустимо: {', '.join(sorted(VALID_TYPES))})")
            target = norm(r["to"])
            if target == key:
                errors.append(f"{where}: связь с самим собой")
            elif target in seen:
                errors.append(f"{where}: дубль связи с «{r['to']}»")
            elif target not in chars:
                errors.append(f"{where}: персонаж «{r['to']}» не найден "
                              f"в data/characters")
            seen.add(target)

    # взаимность
    for key, (name, fname, data) in chars.items():
        for r in data.get("relations") or []:
            if not isinstance(r, dict):
                continue
            target = norm(r.get("to", ""))
            if target not in chars or target == key:
                continue
            t_name, t_fname, t_data = chars[target]
            back = next((b for b in t_data.get("relations") or []
                         if isinstance(b, dict) and norm(b.get("to", "")) == key), None)
            if back is None:
                warnings.append(f"односторонняя связь: {name} → {t_name} "
                                f"({r.get('type')}), обратной нет")
            elif back.get("type") != r.get("type"):
                a, b = sorted([name, t_name])
                notes.append(f"типы расходятся: {name} → {t_name} = {r.get('type')}, "
                             f"обратно = {back.get('type')}")

    notes = sorted(set(notes))

    total_rel = sum(len(d.get("relations") or []) for _, _, d in chars.values())
    with_rel = sum(1 for _, _, d in chars.values() if d.get("relations"))
    print(f"Персонажей: {len(chars)}, со связями: {with_rel}, всего связей: {total_rel}")

    for lst, title in ((errors, "ОШИБКИ"), (warnings, "ПРЕДУПРЕЖДЕНИЯ"), (notes, "ЗАМЕТКИ")):
        if lst:
            print(f"\n── {title} ({len(lst)}) " + "─" * 30)
            for line in lst:
                print("  •", line)

    if not errors:
        print("\nОшибок нет ✓")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
