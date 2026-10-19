# Собирает data.js из data/*.json (цены и тех. данные). Запуск: python build.py
import json, pathlib
d = pathlib.Path(__file__).parent
out = "".join(f"window.{n.upper()}={json.dumps(json.loads((d/'data'/f'{n}.json').read_text('utf-8')),ensure_ascii=False)};\n" for n in ("prices", "specs"))
assert "—" not in out, "длинное тире в данных"
(d/"data.js").write_text(out.replace("—", "-"), "utf-8")
print("data.js", len(out))
