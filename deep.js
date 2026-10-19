// Глубокие данные по деталям: лампы и крепёж, колёса и тормоза, MMT, форсунки, фильтры, где что находится.
// Источник: data/deep_*.json -> data.js. Функции используют L, esc, lang из app.js (общая глобальная область).
const DL = window.DEEP_LIGHTS, DW = window.DEEP_WHEELS, DD = window.DEEP_DRIVE;
const tx = (ru, en) => lang === 'ru' ? ru : en;
const q = v => v === false ? ` <span class="q" title="${tx('проверь по VIN или на машине', 'check by VIN or on the car')}">?</span>` : '';
const kv = rows => `<dl class="kv2">${rows.filter(r => r[1] != null && r[1] !== '').map(([k, v, ok]) => `<dt>${k}</dt><dd>${v}${q(ok)}</dd>`).join('')}</dl>`;
const tbl = (head, rows) => `<div class="table-wrap"><table class="tbl sm"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? '-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const ol = a => a?.length ? `<ol class="steps-ol">${a.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
const chips = a => a?.length ? `<div class="chips">${a.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : '';
const sec = (title, html, open) => html ? `<details class="dd"${open ? ' open' : ''}><summary>${title}</summary><div class="dd-in">${html}</div></details>` : '';
const pr = r => r ? (Array.isArray(r) ? `${r[0]}-${r[1]} BYN` : esc(r)) : '';
const lv = v => v && typeof v === 'object' && ('ru' in v) ? esc(L(v)) : v && typeof v === 'object' && 'value' in v ? esc(v.value) : esc(v ?? '');

// ---------- лампы и узлы ----------
const LIGHT = Object.fromEntries((DL?.lights || []).map(l => [l.id, l]));
const ASM = Object.fromEntries((DL?.assemblies || []).map(a => [a.id, a]));
function lightCard(l) {
  return `<div class="lc"><div class="lc-h"><b>${esc(L(l))}</b>${q(l.verified)}</div>
    <div class="lc-big"><span class="bulb">${esc(l.bulb)}</span><span class="sock">${tx('цоколь', 'base')} ${esc(l.socket)}</span><span class="w">${esc(l.watts)} ${tx('Вт', 'W')}</span></div>
    ${kv([[tx('Как поменять', 'How to replace'), esc(L(l.access))], [tx('Инструмент', 'Tools'), esc(L(l.tools))], [tx('Время', 'Time'), l.time_min ? l.time_min + ' ' + tx('мин', 'min') : ''], [tx('Пара ламп', 'Pair of bulbs'), pr(l.price_byn)], [tx('Бренды', 'Brands'), esc(l.brands || '')], [tx('Закон', 'Law'), esc(L(l.legal))]])}
    ${l.same_in?.length ? `<p class="mini">${tx('Такая же лампа стоит на', 'Same bulb is used in')}:</p>${chips(l.same_in)}` : ''}
    ${l.note ? `<p class="note">${esc(L(l.note))}</p>` : ''}</div>`;
}
function asmBlock(a) {
  if (!a) return '';
  return (a.part_numbers?.length ? tbl([tx('Что', 'Item'), tx('Номер', 'Part no.')], a.part_numbers.map(p => [esc(L(p)), `<b>${esc(p.no)}</b>`])) : '') +
    (a.maker ? `<p class="mini">${tx('Производитель', 'Maker')}: ${esc(a.maker)}</p>` : '') +
    (a.fasteners?.length ? `<h4>${tx('Крепёж', 'Fasteners')}</h4><ul class="fx">${a.fasteners.map(f => `<li>${esc(L(f))}${f.torque ? ` <i>${esc(f.torque)}</i>` : ''}</li>`).join('')}</ul>` : '') +
    (a.steps ? `<h4>${tx('Как снять', 'Removal')}</h4>${ol(L(a.steps))}` : '') + (a.notes ? `<p class="note">${esc(L(a.notes))}</p>` : '') + q(a.verified);
}
const lightsFor = ids => ids.map(i => LIGHT[i]).filter(Boolean).map(lightCard).join('');

// ---------- колёса и тормоза ----------
function wheelsBlock() {
  if (!DW) return '';
  const r = DW.rim_rules;
  return kv([[tx('Разболтовка', 'Bolt pattern'), esc(r.pcd)], [tx('Центральное отверстие', 'Centre bore'), r.center_bore_mm + ' ' + tx('мм', 'mm')], [tx('Кольца', 'Hub rings'), lv(r.hub_rings)], [tx('Гайки', 'Nuts'), lv(r.fastener)], [tx('Момент затяжки', 'Torque'), r.wheel_nut_torque_nm + ' Н·м'], [tx('Диаметры', 'Diameters'), lv(r.diameter_range)], [tx('Ширина', 'Width'), lv(r.width_range)], [tx('Вылет ET', 'Offset ET'), lv(r.et_range)], [tx('Задевания', 'Rubbing'), lv(r.rubbing_notes)]]) +
    `<h4>${tx('Заводские колёса', 'Factory wheels')}</h4>` + tbl(['R', tx('Диск', 'Rim'), 'ET', tx('Шина', 'Tyre'), tx('Давление', 'Pressure')], DW.oem_wheels.map(w => [w.diameter, esc(w.rim), w.et, esc(w.tyre), w.pressure_bar + ' bar'])) +
    `<h4>${tx('Какие шины можно', 'Allowed tyres')}</h4>` + tbl([tx('Диск', 'Rim'), tx('Шина', 'Tyre'), tx('Диаметр', 'Diameter'), tx('Разница', 'Diff')], DW.tyre_sizes.map(t => [esc(t.rim), `<b>${esc(t.tyre)}</b>`, Math.round(t.diameter_mm) + ' ' + tx('мм', 'mm'), (t.diff_pct > 0 ? '+' : '') + t.diff_pct + '%' + q(t.verified)])) +
    `<h4>${tx('Диски с других машин', 'Wheels from other cars')}</h4>` + tbl([tx('Машина', 'Car'), tx('Размеры', 'Sizes'), tx('Подойдёт?', 'Fits?')], DW.donor_wheels.map(d => [esc(d.model), esc(d.sizes), esc(L(d.fit)) + q(d.verified)])) +
    (DW.spare_wheel ? `<p class="mini">${tx('Запаска', 'Spare')}: ${esc(L(DW.spare_wheel))}</p>` : '') + (DW.winter ? `<p class="note">${esc(L(DW.winter))}</p>` : '');
}
function brakeBlock(axle) {
  if (!DW) return '';
  const b = DW.brakes[axle], d = b.disc;
  const pads = DW.brakes.pads.filter(p => p.axle === axle);
  return kv([[tx('Диск', 'Disc'), `${d.diameter_mm}x${d.thickness_mm} ${tx('мм', 'mm')}, ${esc(L(d.type) || d.type || '')}`, d.verified], [tx('Минимальная толщина', 'Min thickness'), d.min_thickness_mm + ' ' + tx('мм', 'mm')], [tx('Суппорт', 'Caliper'), esc(L(b.caliper)), b.caliper?.verified], [tx('Ручник', 'Handbrake'), b.handbrake ? esc(L(b.handbrake)) : '']]) +
    (b.disc_parts?.length ? tbl([tx('Бренд', 'Brand'), tx('Номер', 'No.'), tx('Цена', 'Price')], b.disc_parts.map(p => [esc(p.brand), `<b>${esc(p.pn)}</b>`, p.price_byn ? p.price_byn + ' BYN' : '-'])) : '') +
    (pads.length ? `<h4>${tx('Колодки', 'Pads')}</h4>` + tbl(['TRW', 'ATE', 'Brembo', 'Bosch', tx('Цена', 'Price')], pads.map(p => [esc(p.trw || ''), esc(p.ate || ''), esc(p.brembo || ''), esc(p.bosch || ''), p.price_byn ? p.price_byn + ' BYN' : '-'])) : '');
}
function brakeUpgrades() {
  if (!DW) return '';
  return DW.brakes.upgrades.map(u => `<div class="lc"><div class="lc-h"><b>${esc(L(u.name))}</b>${q(u.verified)}</div><p>${esc(L(u.parts))}</p>${u.min_wheel ? `<p class="mini">${tx('Минимальный диск', 'Min wheel')}: ${lv(u.min_wheel)}</p>` : ''}${u.prices ? `<p class="mini">${lv(u.prices)}</p>` : ''}</div>`).join('') +
    `<p class="mini">${tx('Тормозная жидкость', 'Brake fluid')}: ${lv(DW.brakes.fluid.spec)}, ${lv(DW.brakes.fluid.volume_l)}</p>`;
}
const torquesTbl = () => DW ? tbl([tx('Что', 'Item'), 'Н·м'], DW.torques.map(t => [esc(L(t.item)), `<b>${t.nm}</b>${q(t.verified)}`])) : '';
const alignTbl = () => DW ? tbl([tx('Параметр', 'Parameter'), tx('Значение', 'Value')], DW.alignment.map(a => [esc(L(a.param)), esc(a.value) + q(a.verified)])) : '';

// ---------- MMT, топливо, фильтры, зажигание ----------
const pnList = a => (Array.isArray(a) ? a : [a]).filter(Boolean).map(p => `<b>${esc(p.pn)}</b> ${esc(L(p))}${q(p.verified)}`).join('<br>');
function mmtBlock(part) {
  const m = DD?.mmt; if (!m) return '';
  if (part === 'clutch') return kv([[tx('Диаметр диска', 'Disc diameter'), lv(m.clutch.disc_diameter_mm), m.clutch.disc_diameter_mm?.verified], [tx('Комплект', 'Kit'), pnList(m.clutch.kit_oem)], [tx('Выжимной', 'Release bearing'), pnList(m.clutch.release_bearing)], [tx('Метизы', 'Hardware'), pnList(m.clutch.seals_hardware)]]);
  if (part === 'clutch_actuator') return kv([[tx('Номер', 'Part no.'), pnList(m.clutch_actuator.pn)], [tx('Устройство', 'Design'), esc(L(m.clutch_actuator.design))], [tx('Где', 'Where'), esc(L(m.clutch_actuator.location))]]);
  if (part === 'shift_actuator') return kv([[tx('Номер', 'Part no.'), pnList(m.shift_actuator.pn)], [tx('Устройство', 'Design'), esc(L(m.shift_actuator.design))], [tx('Где', 'Where'), esc(L(m.shift_actuator.location))]]);
  const g = m.construction.gear_ratios;
  return `<p>${esc(L(m.overview))}</p>` + kv([[tx('Тип', 'Type'), esc(L(m.construction.type))], [tx('Синхронизаторы', 'Synchros'), esc(L(m.construction.synchros))], [tx('Масло', 'Oil'), esc(L(m.oil.type)) + ', ' + lv(m.oil.volume_l)], [tx('Замена масла', 'Oil change'), esc(L(m.oil.interval))], [tx('Пробки', 'Plugs'), esc(L(m.oil.plugs))], [tx('Блок MMT', 'MMT ECU'), pnList(m.ecu.pn) + '<br>' + esc(L(m.ecu.location))]]) +
    `<h4>${tx('Передаточные числа', 'Gear ratios')}</h4>` + tbl(['1', '2', '3', '4', '5', 'R', tx('Главная', 'Final')], [[g['1'], g['2'], g['3'], g['4'], g['5'], g.R, g.final_drive + q(g.verified)]]) +
    `<h4>${tx('Как робот переключает', 'How the robot shifts')}</h4>${ol(L(m.how_it_shifts))}` +
    `<h4>${tx('Датчики', 'Sensors')}</h4>${chips(m.sensors.map(s => L(s)))}` +
    `<h4>${tx('Что ломается', 'What fails')}</h4>` + m.failures.map(f => `<div class="lc"><div class="lc-h"><b>${esc(L(f))}</b>${q(f.verified)}</div><p class="mini">${tx('Признаки', 'Symptoms')}: ${esc(L(f.symptoms))}</p><p class="mini">${tx('Ремонт', 'Fix')}: ${esc(L(f.fix))}</p>${f.cost_byn ? `<p class="price">${lv(f.cost_byn)}</p>` : ''}</div>`).join('') +
    `<h4>${tx('Коды ошибок', 'Fault codes')}</h4>` + tbl([tx('Код', 'Code'), tx('Значение', 'Meaning')], m.dtc.map(d => [`<b>${esc(d.code)}</b>`, esc(L(d))])) +
    `<h4>${tx('Калибровка', 'Calibration')}</h4><p>${esc(L(m.calibration.techstream))}</p><p>${esc(L(m.calibration.manual_without_scanner))}</p>`;
}
function injBlock() {
  const i = DD?.injectors; if (!i) return '';
  return kv([[tx('Номер', 'Part no.'), pnList(i.oem)], [tx('Тип', 'Type'), esc(L(i.bosch_or_denso)), i.bosch_or_denso.verified], [tx('Отверстия', 'Holes'), esc(L(i.holes))], [tx('Производительность', 'Flow'), lv(i.flow_cc_min), i.flow_cc_min.verified], [tx('Сопротивление', 'Resistance'), lv(i.resistance_ohm), i.resistance_ohm.verified], [tx('Разъём', 'Connector'), esc(L(i.connector))], [tx('Кольца', 'O-rings'), esc(L(i.o_rings))], [tx('Какие подходят', 'Interchange'), esc(L(i.interchange)), i.interchange.verified], [tx('Признаки', 'Symptoms'), esc(L(i.symptoms))], [tx('Чистить или менять', 'Clean or replace'), esc(L(i.clean_vs_replace))],
    [tx('Цены', 'Prices'), Object.entries(i.price_byn).filter(([k]) => k !== 'verified').map(([k, v]) => `${k.replace(/_/g, ' ')}: ${esc(v)}`).join('<br>'), i.price_byn.verified]]);
}
function fuelBlock() {
  const f = DD?.fuel; if (!f) return '';
  return kv([[tx('Система', 'System'), esc(L(f.system))], [tx('Давление', 'Pressure'), esc(L(f.pressure)), f.pressure.verified], [tx('Насос', 'Pump'), `<b>${esc(f.pump.pn)}</b> ${esc(L(f.pump))}`, f.pump.verified], [tx('Фильтр', 'Filter'), `<b>${esc(f.filter.pn)}</b> ${esc(L(f.filter))}`, f.filter.verified], [tx('Где', 'Where'), esc(L(f.location))]]);
}
function filterBlock(id) {
  const f = (DD?.filters || []).find(x => x.id === id); if (!f) return '';
  return kv([[tx('Номер Toyota', 'Toyota no.'), `<b>${esc(f.oem)}</b>`, f.verified], [tx('Тип', 'Type'), esc(L(f.type))], [tx('Аналоги', 'Cross-ref'), Object.entries(f.cross).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('<br>')], [tx('Где стоит', 'Location'), esc(L(f.location))], [tx('Как часто', 'Interval'), esc(L(f.interval))], [tx('Цена', 'Price'), f.price_byn ? `${esc(f.price_byn.oem || '')} / ${esc(f.price_byn.aftermarket || '')}` : '']]) +
    `<h4>${tx('Как поменять', 'How to replace')}</h4>${ol(L(f.steps))}<p class="mini">${tx('Такой же фильтр на', 'Same filter fits')}:</p>${chips(f.same_in)}`;
}
function ignBlock(k) {
  const g = DD?.ignition; if (!g) return '';
  if (k === 'coil') return kv([[tx('Номер', 'Part no.'), `<b>${esc(g.coil.oem)}</b> ${esc(L(g.coil))}`, g.coil.verified], [tx('Цена', 'Price'), `${esc(g.coil.price_byn?.oem || '')} / ${esc(g.coil.price_byn?.aftermarket || '')}`]]);
  const s = g.spark_plugs;
  return kv([['Toyota', `<b>${esc(s.oem)}</b>`, s.verified], ['Denso', esc(s.denso)], ['NGK', esc(s.ngk)], [tx('Зазор', 'Gap'), esc(s.gap_mm) + ' ' + tx('мм', 'mm')], [tx('Момент', 'Torque'), esc(s.torque_nm) + ' Н·м'], [tx('Замена', 'Interval'), esc(L(s.interval))], [tx('Цена', 'Price'), `${esc(s.price_byn?.oem_each || '')} / ${esc(s.price_byn?.denso_each || '')}`]]) + (s.note ? `<p class="note">${esc(L(s.note))}</p>` : '');
}
const MISC = Object.fromEntries((DD?.misc_parts || []).map(m => [m.id, m]));
const miscBlock = ids => ids.map(i => MISC[i]).filter(Boolean).map(m => `<div class="lc"><div class="lc-h"><b>${esc(L(m))}</b>${q(m.verified)}</div>${kv([[tx('Номер', 'Part no.'), `<b>${esc(m.oem)}</b>`], [tx('Параметры', 'Spec'), esc(m.spec)], [tx('Цена', 'Price'), esc(m.price_byn)]])}</div>`).join('');
const LOC = Object.fromEntries((DD?.locations || []).map(l => [l.id, l]));
const locBlock = ids => ids.map(i => LOC[i]).filter(Boolean).map(l => `<div class="loc"><b>${esc(L(l))}</b><p>${esc(L(l.desc))}${q(l.verified)}</p></div>`).join('');

// ---------- какие блоки у какой детали ----------
const DEEP = {
  headlight: () => [sec(tx('Лампы в фаре и цоколи', 'Bulbs and bases'), lightsFor(['low_beam', 'low_beam_xenon', 'high_beam', 'front_position', 'front_turn']), true), sec(tx('Номера фар, болты, как снять', 'Part numbers, bolts, removal'), asmBlock(ASM.headlight))],
  tail_light: () => [sec(tx('Лампы и цоколи', 'Bulbs and bases'), lightsFor(['rear_stop_tail', 'rear_turn', 'reverse', 'rear_fog', 'high_mount_stop', 'license_plate']), true), sec(tx('Номера, гайки, как снять', 'Part numbers, nuts, removal'), asmBlock(ASM.tail_light))],
  fog_light: () => [sec(tx('Лампа и цоколь', 'Bulb and base'), lightsFor(['fog_front']), true), sec(tx('Номера и крепёж', 'Part numbers and fasteners'), asmBlock(ASM.fog_light))],
  repeater: () => [sec(tx('Лампа', 'Bulb'), lightsFor(['side_repeater']), true)],
  bumper_front: () => [sec(tx('Крепёж бампера и как снять', 'Bumper fasteners and removal'), asmBlock(ASM.bumper_front), true), sec(tx('Буксировочный крюк', 'Tow hook'), locBlock(['tow_hook_front']))],
  bumper_rear: () => [sec(tx('Буксировочный крюк', 'Tow hook'), locBlock(['tow_hook_rear']))],
  fender_front: () => [sec(tx('Подкрылок: крепёж', 'Wheel liner fasteners'), asmBlock(ASM.wheel_liner))],
  trunk: () => [sec(tx('Подсветка багажника', 'Trunk light'), lightsFor(['trunk_light']))],
  trunk_lid: () => [sec(tx('Как открыть', 'How to open'), locBlock(['trunk_release']))],
  headliner: () => [sec(tx('Плафоны и лампы салона', 'Cabin lights'), lightsFor(['dome_center', 'map_lights', 'vanity']), true)],
  wheel: () => [sec(tx('Подбор дисков и шин', 'Wheel and tyre fitment'), wheelsBlock(), true)],
  tyre: () => [sec(tx('Подбор шин и дисков', 'Tyre and wheel fitment'), wheelsBlock(), true)],
  brake_front: () => [sec(tx('Размеры, колодки, номера', 'Sizes, pads, part numbers'), brakeBlock('front'), true), sec(tx('Какие тормоза поставить больше', 'Bigger brake upgrade'), brakeUpgrades())],
  brake_rear: () => [sec(tx('Размеры, колодки, номера', 'Sizes, pads, part numbers'), brakeBlock('rear'), true)],
  brake_booster: () => [sec(tx('Тормозная жидкость', 'Brake fluid'), miscBlock(['brake_fluid']) + locBlock(['brake_fluid_reservoir']), true)],
  gearbox: () => [sec(tx('Устройство, масло, ошибки', 'Design, oil, codes'), mmtBlock(), true), sec(tx('Где актуаторы', 'Where the actuators are'), locBlock(['mmt_actuators']))],
  clutch: () => [sec(tx('Номера сцепления', 'Clutch part numbers'), mmtBlock('clutch'), true)],
  clutch_actuator: () => [sec(tx('Актуатор сцепления', 'Clutch actuator'), mmtBlock('clutch_actuator'), true)],
  shift_actuator: () => [sec(tx('Актуатор переключения', 'Shift actuator'), mmtBlock('shift_actuator'), true)],
  shifter: () => [sec(tx('Как работает робот', 'How the robot works'), mmtBlock())],
  injector: () => [sec(tx('Форсунки: номера и аналоги', 'Injectors: numbers and interchange'), injBlock(), true)],
  fuel_pump: () => [sec(tx('Насос и фильтр', 'Pump and filter'), fuelBlock(), true), sec(tx('Люк к насосу', 'Pump access hatch'), locBlock(['fuel_pump_hatch']))],
  fuel_tank: () => [sec(tx('Топливная система', 'Fuel system'), fuelBlock())],
  oil_filter: () => [sec(tx('Масляный фильтр', 'Oil filter'), filterBlock('oil'), true), sec(tx('Масло', 'Oil'), miscBlock(['engine_oil', 'sump_washer']))],
  air_filter: () => [sec(tx('Воздушный фильтр', 'Air filter'), filterBlock('air'), true), sec(tx('Где корпус', 'Air box'), locBlock(['air_box']))],
  cabin_filter: () => [sec(tx('Салонный фильтр', 'Cabin filter'), filterBlock('cabin'), true)],
  spark_plug: () => [sec(tx('Свечи: номера, зазор, момент', 'Plugs: numbers, gap, torque'), ignBlock('plugs'), true)],
  ign_coil: () => [sec(tx('Катушка', 'Coil'), ignBlock('coil'), true)],
  belt: () => [sec(tx('Ремень', 'Belt'), miscBlock(['drive_belt']), true)],
  thermostat: () => [sec(tx('Термостат', 'Thermostat'), miscBlock(['thermostat']), true)],
  water_pump: () => [sec(tx('Помпа', 'Water pump'), miscBlock(['water_pump']), true)],
  coolant_tank: () => [sec(tx('Антифриз', 'Coolant'), miscBlock(['coolant']) + locBlock(['coolant_reservoir']), true)],
  oil_pan: () => [sec(tx('Масло и пробка', 'Oil and drain plug'), miscBlock(['engine_oil', 'sump_washer']), true)],
  engine_block: () => [sec(tx('Где номер двигателя, щуп, горловина', 'Engine number, dipstick, filler'), locBlock(['engine_number', 'dipstick', 'oil_filler']), true)],
  battery: () => [sec(tx('Где стоит', 'Location'), locBlock(['battery']), true)],
  fuse_box: () => [sec(tx('Блоки предохранителей', 'Fuse boxes'), locBlock(['engine_fuse_box', 'cabin_fuse_box']), true)],
  ecu: () => [sec(tx('Блоки и разъём диагностики', 'ECUs and OBD port'), locBlock(['ecm', 'mmt_ecu', 'obd']), true)],
  dashboard: () => [sec(tx('Что под панелью', 'Under the dash'), locBlock(['cabin_fuse_box', 'obd', 'hood_release']), true)],
  fuel_door: () => [sec(tx('Как открыть', 'How to open'), locBlock(['fuel_door_release']), true)],
  hood: () => [sec(tx('Как открыть', 'How to open'), locBlock(['hood_release']), true)],
  spare_wheel: () => [sec(tx('Запаска, домкрат, ключ', 'Spare, jack, tools'), locBlock(['spare_jack_tools']), true)],
  floor: () => [sec(tx('Точки под домкрат', 'Jacking points'), locBlock(['jack_front_left', 'jack_front_right', 'jack_rear_left', 'jack_rear_right']) + (DW ? `<p class="note">${esc(L(DW.jacking))}</p>` : ''), true)],
  windshield: () => [sec(tx('Где VIN', 'Where the VIN is'), locBlock(['vin_windshield', 'vin_body']), true)],
  strut_front: () => [sec(tx('Развал-схождение и моменты', 'Alignment and torques'), alignTbl() + torquesTbl())],
  control_arm: () => [sec(tx('Моменты затяжки', 'Torques'), torquesTbl())],
};
window.deepFor = id => (DEEP[id] ? DEEP[id]() : []).join('');

// ---------- страница «Справочник» ----------
window.renderRef = () => {
  const el = document.getElementById('refBody'); if (!el) return;
  const allLights = (DL?.lights || []);
  el.innerHTML = [
    ['wheels', tx('Колёса и шины: что можно поставить', 'Wheels and tyres: what fits'), wheelsBlock()],
    ['brakes', tx('Тормоза: штатные и какие поставить', 'Brakes: stock and upgrades'), `<h4>${tx('Передние', 'Front')}</h4>${brakeBlock('front')}<h4>${tx('Задние', 'Rear')}</h4>${brakeBlock('rear')}<h4>${tx('Апгрейд', 'Upgrade')}</h4>${brakeUpgrades()}`],
    ['bulbs', tx('Все лампы: цоколи и на каких машинах такие же', 'All bulbs: bases and which cars share them'), tbl([tx('Где', 'Where'), tx('Лампа', 'Bulb'), tx('Цоколь', 'Base'), tx('Вт', 'W'), tx('Пара', 'Pair')], allLights.map(l => [esc(L(l)) + q(l.verified), `<b>${esc(l.bulb)}</b>`, esc(l.socket), esc(l.watts), pr(l.price_byn)])) + `<div class="lgrid">${allLights.map(lightCard).join('')}</div>`],
    ['mmt', tx('Коробка MMT: устройство, ошибки, калибровка', 'MMT gearbox: design, codes, calibration'), mmtBlock() + `<h4>${tx('Сцепление', 'Clutch')}</h4>${mmtBlock('clutch')}<h4>${tx('Актуаторы', 'Actuators')}</h4>${mmtBlock('clutch_actuator')}${mmtBlock('shift_actuator')}`],
    ['inj', tx('Форсунки и топливо', 'Injectors and fuel'), injBlock() + fuelBlock()],
    ['filters', tx('Фильтры салона, воздуха и масла', 'Cabin, air and oil filters'), (DD?.filters || []).map(f => `<h4>${esc(L(f))}</h4>${filterBlock(f.id)}`).join('')],
    ['ign', tx('Свечи и катушки', 'Spark plugs and coils'), ignBlock('plugs') + ignBlock('coil')],
    ['misc', tx('Ремень, термостат, помпа, жидкости', 'Belt, thermostat, pump, fluids'), miscBlock(Object.keys(MISC))],
    ['where', tx('Где что находится', 'Where everything is'), `<div class="lgrid">${locBlock(Object.keys(LOC))}</div>`],
    ['torque', tx('Моменты затяжки и развал-схождение', 'Torques and alignment'), torquesTbl() + `<h4>${tx('Развал-схождение', 'Alignment')}</h4>` + alignTbl()],
  ].map(([id, t, h], i) => `<details class="dd big" id="ref-${id}"${i < 2 ? ' open' : ''}><summary>${t}</summary><div class="dd-in">${h}</div></details>`).join('') +
    `<p class="note">${tx('Знак ? значит: данные из одного источника или с форума, сверь по VIN или на машине.', 'A ? means a single source or forum data: check by VIN or on the car.')}</p>`;
};
