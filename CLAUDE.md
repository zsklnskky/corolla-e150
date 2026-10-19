# corolla-e150

Статический сайт без сборщика: index.html + style.css + app.js + deep.js + car3d.js (Three.js 0.169 по importmap с jsdelivr) + data.js (генерится `python build.py` из data/*.json).
Выложен на GitHub Pages: репо zsklnskky/corolla-e150, ветка main, корень. Деплой = commit + push.
Правила: RU и EN в каждом тексте (`<t-ru>/<t-en>` в разметке, `{ru,en}` в данных), без длинных тире, суммы в BYN.
Новая деталь: меш через box/cyl/tube в `buildInternals()` car3d.js с id + строка в `RAW` в app.js; глубокие данные - в `DEEP` в deep.js.
Координаты car3d: x мм от переднего бампера, y мм влево, z мм от земли. Ловушки: PointsMaterial рисует квадраты (раздуваются bloom), вырожденные треугольники дают NaN-нормали (safeNormals), квадратные лампы окружения отражаются в лаке квадратом - окружение своё, полосами.
