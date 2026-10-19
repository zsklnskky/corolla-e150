# Одна автономная HTML-страница: открывается двойным кликом, без сервера и без интернета для 3D.
# Нужно: npm i (three + esbuild). Запуск: python build_offline.py [путь_вывода]
import pathlib, subprocess, sys, re
d = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else d / 'dist' / 'Corolla-E150.html'
esb = d / 'node_modules' / '.bin' / ('esbuild.cmd' if sys.platform == 'win32' else 'esbuild')
bundle = subprocess.run([str(esb), 'car3d.js', '--bundle', '--format=iife', '--global-name=Car3DMod', '--minify', '--charset=utf8'], cwd=d, capture_output=True, text=True, encoding='utf-8')
assert bundle.returncode == 0, bundle.stderr
html = (d / 'index.html').read_text('utf-8')
js = lambda n: (d / n).read_text('utf-8').replace('</script', '<\/script')
app = js('app.js').replace("import('./car3d.js')", "Promise.resolve(window.Car3DMod)")
assert 'window.Car3DMod' in app
html = re.sub(r'<script type="importmap">.*?</script>\n?', '', html, flags=re.S)
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + (d / 'style.css').read_text('utf-8') + '</style>')
html = html.replace('<script src="data.js"></script>', '<script>' + js('data.js') + '</script>')
html = html.replace('<script src="deep.js"></script>', '<script>' + js('deep.js') + '</script>')
html = html.replace('<script src="app.js"></script>', '<script>' + bundle.stdout.replace('</script', '<\/script') + '</script>\n<script>' + app + '</script>')
assert 'src="app.js"' not in html and 'href="style.css"' not in html
out.parent.mkdir(parents=True, exist_ok=True); out.write_text(html, 'utf-8')
print(out, round(len(html.encode()) / 1e6, 2), 'MB')
