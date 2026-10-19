// Corolla E150 - интерактивный разбор. Данные: data.js (PRICES, SPECS), детали ниже.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch {} } };
let lang = store.get('lang') || 'ru';
const L = o => o == null ? '' : typeof o === 'string' ? o : (o[lang] ?? o.ru ?? '');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- системы ----------
const SYS = {
  body: { c: '#E8EAF2', ru: 'Кузов', en: 'Body' },
  light: { c: '#FFE45C', ru: 'Свет', en: 'Lights' },
  engine: { c: '#FF9F43', ru: 'Двигатель', en: 'Engine' },
  cool: { c: '#3EDBF7', ru: 'Охлаждение и климат', en: 'Cooling & A/C' },
  elec: { c: '#FFD43B', ru: 'Электрика', en: 'Electrics' },
  trans: { c: '#B98CFF', ru: 'Коробка MMT', en: 'MMT gearbox' },
  brake: { c: '#FF6FB5', ru: 'Тормоза', en: 'Brakes' },
  chassis: { c: '#A6EE5C', ru: 'Подвеска и руль', en: 'Suspension & steering' },
  fuel: { c: '#6B95FF', ru: 'Топливо и выхлоп', en: 'Fuel & exhaust' },
  interior: { c: '#FFC59E', ru: 'Салон', en: 'Cabin' },
};

// ---------- детали: id, система, ключи цен, имя ru/en, что делает ru/en ----------
const RAW = [
['bumper_front','body',['front_bumper'],'Передний бампер','Front bumper','Пластиковая «маска» спереди. Принимает мелкие удары, за ней стоит металлический усилитель. Продаётся в грунте и красится в цвет кузова.','Plastic front cover. It takes light knocks; a steel beam sits behind it. Sold primed and painted to match.'],
['hood','body',['hood'],'Капот','Hood','Крышка над моторным отсеком. Открывается рычагом под рулём слева, потом надо нажать защёлку под передней кромкой.','Lid over the engine bay. Pull the lever under the dash on the left, then press the catch under the front edge.'],
['fender_front','body',['front_fender'],'Переднее крыло','Front fender','Боковая панель над передним колесом. Держится на болтах, меняется без сварки.','Side panel above the front wheel. Bolted on, replaced without welding.'],
['door_front','body',['used_door'],'Передняя дверь','Front door','Внутри стеклоподъёмник, замок, динамик и брус защиты от бокового удара. Б/у дверь в цвет часто дешевле покраски своей.','Inside: window regulator, lock, speaker and a side-impact bar. A used door in your colour is often cheaper than repainting.'],
['door_rear','body',['used_door'],'Задняя дверь','Rear door','Устроена как передняя, но с детским замком на торце: включается ключом или ногтем.','Built like the front one, plus a child lock on the edge.'],
['quarter','body',[],'Заднее крыло','Rear quarter panel','Приварено к кузову и не снимается. Ремонт только рихтовкой и покраской, поэтому удар сюда самый дорогой.','Welded to the body, not removable. Only panel beating and paint, so damage here costs the most.'],
['trunk_lid','body',[],'Крышка багажника','Trunk lid','Открывается кнопкой на крышке, с ключа или рычагом на полу у водительского сиденья.','Opens with the button on the lid, the key fob or the lever on the floor by the driver seat.'],
['bumper_rear','body',[],'Задний бампер','Rear bumper','Пластиковый, внутри иногда датчики парковки и катафоты. Ищи б/у в цвет на разборках.','Plastic; may carry parking sensors and reflectors. Look for a used one in your colour.'],
['roof','body',[],'Крыша','Roof','Стальная панель. На многих комплектациях без люка. Багажник ставится на штатные места в проёмах дверей.','Steel panel. Roof bars mount at the door openings.'],
['windshield','body',['windshield'],'Лобовое стекло','Windshield','Вклеено в проём и добавляет кузову жёсткости. Мелкий скол лучше сразу залить полимером, пока не пошла трещина.','Bonded in, it adds body stiffness. Fill a small chip early before it cracks.'],
['side_glass','body',[],'Боковые стёкла','Side windows','Опускаются электростеклоподъёмниками. Само стекло ломается редко, чаще изнашивается механизм.','Electric windows. The glass rarely breaks; the regulator wears out first.'],
['rear_glass','body',[],'Заднее стекло','Rear window','С нитями обогрева, кнопка на панели климата.','Heated; button on the climate panel.'],
['door_handle','body',[],'Ручка двери','Door handle','Наружная ручка в цвет кузова. На ключах smart-entry в ручке есть кнопка.','Body-coloured handle; smart-entry cars have a button on it.'],
['fuel_door','body',[],'Лючок бензобака','Fuel door','Открывается рычагом на полу слева от водителя. Заливать АИ-95, бак 55 литров.','Opened by a floor lever left of the driver. Use 95 octane; 55 L tank.'],
['mirror','body',['side_mirror'],'Боковое зеркало','Side mirror','С электрорегулировкой, на многих версиях с подогревом и складыванием. Стекло зеркала продаётся отдельно и стоит в разы дешевле.','Power-adjusted, often heated and folding. The mirror glass alone is sold separately and is much cheaper.'],
['headlight','light',['headlight','used_headlight'],'Фара','Headlight','Внутри ближний (HB4), дальний (HB3) и габарит. Все цоколи во вкладке «Салон и свет».','Holds low beam (HB4), high beam (HB3) and parking light. All sockets are on the Cabin & lights page.'],
['repeater','light',[],'Повторитель поворота','Side repeater','Мигает вместе с поворотником, чтобы тебя видели сбоку.','Blinks with the indicator so you are visible from the side.'],
['fog_light','light',['led_fogs'],'Противотуманная фара','Fog light','Лампа H11. Включается кольцом на левом подрулевом рычаге при включённых габаритах.','H11 bulb. Switched by the ring on the left stalk with parking lights on.'],
['tail_light','light',['tail_light'],'Задний фонарь','Tail light','Габарит и стоп (W21/5W), поворот, задний ход и противотуманка. Лампы меняются из багажника.','Tail and brake (W21/5W), indicator, reverse and rear fog. Bulbs are changed from inside the trunk.'],
['wiper','body',['wipers'],'Дворники','Wipers','Щётки менять раз в год, лучше осенью. Если полосят и скрипят - пора.','Replace blades yearly, ideally in autumn, or when they streak or squeak.'],
['wheel','chassis',['alloy_wheel','wheel_cover'],'Колёсный диск','Wheel','R15 или R16, разболтовка 5x114.3, центр 60.1, гайки M12x1.5 под ключ 21.','R15 or R16, 5x114.3, 60.1 bore, M12x1.5 nuts, 21 mm wrench.'],
['tyre','chassis',['tyre'],'Шина','Tyre','Штатно 205/55 R16 или 195/65 R15, давление 2.2 бар. В Беларуси зимняя резина обязательна с 1 декабря по 1 марта.','Stock 205/55 R16 or 195/65 R15 at 2.2 bar. Winter tyres are mandatory in Belarus from 1 Dec to 1 Mar.'],
['headliner','interior',[],'Потолок','Headliner','Тканевая обивка потолка. Если провис или в пятнах, перетягивается отдельно от сидений.','Fabric headliner. Retrimmed separately if it sags or stains.'],
['dashboard','interior',[],'Передняя панель','Dashboard','Приборы, климат, магнитола и бардачок. Под панелью прячутся мотор электроусилителя руля и блоки управления.','Gauges, climate, radio and glovebox. Behind it sit the steering motor and control units.'],
['steering_wheel','interior',[],'Руль','Steering wheel','В центре подушка безопасности. Обод можно перешить в кожу или алькантару.','Airbag in the centre. The rim can be retrimmed in leather or alcantara.'],
['shifter','trans',[],'Селектор робота','MMT selector','Положения R, N, E и M. E - коробка всё делает сама, M - переключаешь толчками «+» и «-». Положения P нет: на стоянке ставь N и ручник.','R, N, E and M. E shifts by itself, M lets you shift with + and -. There is no P: park in N with the handbrake on.'],
['seat_front','interior',['seat_covers','reupholstery'],'Переднее сиденье','Front seat','В боковине спинки подушка безопасности. При перетяжке мастер должен оставить разрывной шов в этом месте.','Side airbag in the backrest bolster. A retrim must keep the tear seam there.'],
['seat_rear','interior',['seat_covers','reupholstery'],'Заднее сиденье','Rear seat','Спинка складывается для длинных вещей из багажника.','Backrest folds for long loads.'],
['pedals','interior',[],'Педали','Pedals','Всего две: газ и тормоз. Педали сцепления нет, её работу делает робот.','Only two: throttle and brake. The robot replaces the clutch pedal.'],
['cabin_filter','cool',['cabin_filter'],'Салонный фильтр','Cabin filter','Чистит воздух, который дует в салон. Стоит за бардачком, меняется руками за 5 минут.','Cleans the air blown into the cabin. Behind the glovebox, a 5-minute DIY job.'],
['ecu','elec',[],'Блок управления двигателем','Engine ECU','Компьютер двигателя: считает, сколько бензина впрыснуть и когда дать искру. Ошибки читаются сканером через разъём OBD под рулём.','Engine computer: decides fuel and spark timing. Read codes via the OBD port under the dash.'],
['trunk','interior',['trunk_mat'],'Багажник','Trunk','450 литров. Спинка заднего сиденья складывается.','450 litres; the rear backrest folds.'],
['spare_wheel','chassis',[],'Запасное колесо','Spare wheel','Лежит под полом багажника вместе с домкратом и ключом.','Under the trunk floor with the jack and wrench.'],
['condenser','cool',[],'Радиатор кондиционера','A/C condenser','Стоит перед основным радиатором и охлаждает фреон. Бьётся камнями, течь видно по масляным пятнам.','Sits in front of the radiator and cools the refrigerant. Stones can hole it.'],
['radiator','cool',['radiator'],'Радиатор','Radiator','Охлаждает антифриз потоком встречного воздуха. Раз в пару лет его стоит промыть снаружи от тополиного пуха и грязи.','Cools the coolant with oncoming air. Wash debris out of it every couple of years.'],
['fan','cool',['cooling_fan'],'Вентилятор','Cooling fan','Включается, когда антифриз горячий или работает кондиционер. Если не крутится в пробке - мотор перегреется.','Runs when the coolant is hot or the A/C is on. If it stops in traffic, the engine overheats.'],
['coolant_tank','cool',[],'Расширительный бачок','Coolant reservoir','Полупрозрачный бачок с метками FULL и LOW. Уровень смотри на холодном моторе, доливай только розовый Toyota SLLC.','Translucent tank with FULL and LOW. Check cold, top up only with pink Toyota SLLC.'],
['water_pump','cool',['water_pump'],'Помпа','Water pump','Гоняет антифриз по кругу. Слабое место 1ZR: начинает подтекать и шуметь. Признаки - розовые потёки справа на моторе и падение уровня в бачке.','Circulates coolant. A weak spot on the 1ZR: leaks and noise. Look for pink stains and a falling level.'],
['thermostat','cool',['thermostat'],'Термостат','Thermostat','Клапан: пока мотор холодный, не пускает антифриз в радиатор, чтобы мотор быстрее прогрелся. Если печка зимой еле тёплая - часто он.','Keeps coolant out of the radiator until the engine warms up. A lukewarm heater in winter often means it is stuck.'],
['ac_compressor','cool',['ac_compressor'],'Компрессор кондиционера','A/C compressor','Крутится от ремня и сжимает фреон. Включай кондиционер хотя бы раз в месяц и зимой, чтобы не пересыхали уплотнения.','Belt-driven, compresses refrigerant. Run the A/C monthly, even in winter, to keep seals alive.'],
['engine_block','engine',['used_engine'],'Блок цилиндров','Engine block','Алюминиевый блок с четырьмя цилиндрами, внутри поршни и коленвал. Здесь бензин превращается в движение, анимация во вкладке «Двигатель».','Aluminium block with four cylinders, pistons and crankshaft. Petrol turns into motion here; see the Engine page.'],
['oil_pan','engine',['engine_oil'],'Масляный поддон','Oil pan','Внизу мотора, в нём лежит масло. На дне сливная пробка, при каждой замене ставят новую шайбу.','Holds the oil. The drain plug is at the bottom; fit a new washer at each change.'],
['valve_cover','engine',[],'Головка блока и клапанная крышка','Cylinder head & valve cover','Сверху мотора: два распредвала, 16 клапанов и муфты VVT-i. Под крышкой прокладка, которая с годами потеет маслом.','Two camshafts, 16 valves and the VVT-i gears. The cover gasket sweats oil with age.'],
['ign_coil','elec',['ignition_coil'],'Катушка зажигания','Ignition coil','Своя на каждый цилиндр. Делает из 12 вольт десятки тысяч для искры. Если одна умерла, мотор троит и мигает Check Engine.','One per cylinder, turning 12 V into tens of thousands for the spark. A dead one makes the engine shake and flashes Check Engine.'],
['spark_plug','elec',['spark_plugs'],'Свечи зажигания','Spark plugs','Дают искру, которая поджигает смесь. Иридиевые ходят около 90 тысяч км.','Make the spark that lights the mixture. Iridium plugs last about 90k km.'],
['timing_chain','engine',['timing_chain_kit'],'Цепь ГРМ','Timing chain','Связывает коленвал и распредвалы, чтобы клапаны открывались вовремя. Ремня здесь нет. Треск 1-2 секунды на холодном пуске - повод проверить натяжение.','Links crankshaft and camshafts so valves open on time. A 1-2 second rattle on cold start means check the tensioner.'],
['vvti','engine',['vvt_gear'],'Муфта VVT-i','VVT-i gear','Поворачивает распредвал маслом под давлением, сдвигая моменты открытия клапанов. Любит чистое масло.','Rotates the camshaft with oil pressure to shift valve timing. Needs clean oil.'],
['alternator','elec',['alternator'],'Генератор','Alternator','Крутится от ремня и заряжает аккумулятор на ходу. Если значок батарейки горит при работающем моторе - проверь его.','Belt-driven, charges the battery. A battery light with the engine running means check it.'],
['belt','engine',['drive_belt'],'Приводной ремень','Drive belt','Один ремень крутит генератор, помпу и компрессор кондиционера. Свист на холодную - признак износа.','One belt drives the alternator, water pump and A/C. Squealing when cold means it is worn.'],
['oil_filter','engine',['oil_filter','engine_oil'],'Масляный фильтр','Oil filter','Меняется вместе с маслом. Масла с фильтром входит около 4.2 литра, 5W-30.','Changed with the oil; about 4.2 L of 5W-30 with the filter.'],
['injector','fuel',['injector'],'Форсунки','Injectors','Четыре штуки, распыляют бензин во впускной коллектор перед клапанами. Компьютер решает, сколько миллисекунд им быть открытыми.','Four of them spray fuel into the intake ports. The ECU decides how many milliseconds they stay open.'],
['intake','engine',[],'Впускной коллектор','Intake manifold','Пластиковые трубы, по которым воздух идёт к каждому цилиндру.','Plastic runners that bring air to each cylinder.'],
['throttle','engine',['throttle_body'],'Дроссельная заслонка','Throttle body','Электронная: педаль газа не тянет трос, а сообщает компьютеру, насколько открыть заслонку. Грязная даёт плавающие холостые, обычно хватает чистки.','Electronic: the pedal tells the computer how far to open it. A dirty one makes the idle hunt; cleaning usually fixes it.'],
['air_filter','engine',['air_filter'],'Воздушный фильтр','Air filter','Чистит воздух перед мотором. Корпус на защёлках, замена за 5 минут.','Cleans intake air. The box has clips, a 5-minute job.'],
['engine_mount','engine',['engine_mounts'],'Опоры двигателя','Engine mounts','Резиновые подушки, на которых висит мотор. Изношенные дают вибрацию на холостых и удар при трогании.','Rubber mounts the engine hangs on. Worn ones cause idle vibration and a knock when pulling away.'],
['gearbox','trans',['used_mmt','gearbox_oil'],'Коробка MMT (C50A)','MMT gearbox (C50A)','Обычная механика на 5 передач, которой управляют два электромотора. Подробно с анимацией во вкладке «Робот MMT».','A regular 5-speed manual run by two electric motors. See the MMT page for an animation.'],
['clutch','trans',['mmt_clutch_kit'],'Сцепление','Clutch','Сухой диск между маховиком и коробкой. В пробках изнашивается быстрее, бывает уже к 50-60 тысячам км. После замены робот обязательно калибруют.','Dry disc between flywheel and gearbox. Wears fast in traffic; calibration is required after replacement.'],
['clutch_actuator','trans',['mmt_clutch_actuator','mmt_adaptation'],'Актуатор сцепления','Clutch actuator','Электромотор с червяком, который выжимает сцепление вместо ноги. Главная слабость MMT: рывки, пробуксовка, ошибка P0810.','Electric motor with a worm gear that works the clutch. The main MMT weak point: jerks, slip, code P0810.'],
['shift_actuator','trans',['mmt_shift_actuator'],'Актуатор переключения','Shift actuator','Два мотора: один выбирает ряд, другой включает передачу. Работают как рука на рычаге.','Two motors: one picks the gate, one engages the gear, like a hand on the lever.'],
['starter','elec',['starter'],'Стартер','Starter','Электромотор, который раскручивает двигатель при запуске. Щелчок без прокрутки - чаще аккумулятор или клеммы.','Spins the engine to start it. A click with no crank is usually the battery or terminals.'],
['cv_joint','trans',['cv_joint_outer'],'Привод и ШРУС','Drive shaft & CV joint','ШРУС - шарнир, который передаёт вращение на колесо, даже когда оно повёрнуто. Хруст при резком повороте - наружный ШРУС. Следи за целостью пыльника.','A joint that turns the wheel even while it is steered. Clicking in tight turns means the outer joint; keep the boot intact.'],
['battery','elec',['battery'],'Аккумулятор','Battery','60 А·ч. После отключения робот MMT надо заново обучить, иначе возможны рывки.','60 Ah. After disconnecting it, the MMT must relearn, or it may jerk.'],
['fuse_box','elec',[],'Блок предохранителей','Fuse box','В моторном отсеке у аккумулятора, второй под панелью слева. Схема на крышке.','In the engine bay by the battery, another under the dash. Map on the lid.'],
['horn','elec',[],'Звуковой сигнал','Horn','За решёткой бампера. Можно поставить более громкий «улитковый».','Behind the bumper grille. Louder snail horns are a cheap swap.'],
['o2_sensor','elec',['o2_sensor'],'Лямбда-зонд','Oxygen sensor','Нюхает выхлоп и говорит компьютеру, богатая смесь или бедная. Их два: до и после катализатора.','Sniffs exhaust and tells the ECU if the mixture is rich or lean. Two of them, before and after the catalyst.'],
['brake_booster','brake',['brake_fluid'],'Усилитель тормозов','Brake booster','Большая круглая «банка» у перегородки: помогает ноге давить на тормоз разрежением. Сверху бачок тормозной жидкости, менять её раз в 2 года.','The big round can at the firewall uses vacuum to help your foot. The brake fluid tank sits on top; change fluid every 2 years.'],
['abs','brake',[],'Блок ABS','ABS unit','Не даёт колёсам заблокироваться при резком торможении, чтобы машина оставалась управляемой.','Stops the wheels locking in hard braking so you can still steer.'],
['brake_front','brake',['front_pads','front_discs'],'Передние тормоза','Front brakes','Вентилируемый диск около 275 мм и суппорт с колодками. Колодки обычно ходят 30-40 тысяч км, диски через две замены колодок.','Vented disc about 275 mm with a caliper. Pads last 30-40k km, discs every second pad change.'],
['brake_rear','brake',['rear_brakes'],'Задние тормоза','Rear brakes','Дисковые. Через них же работает ручник.','Disc brakes; the handbrake works through them.'],
['catalyst','fuel',['catalyst'],'Катализатор','Catalytic converter','Дожигает вредные газы. Внутри соты с драгметаллами, поэтому дорогой и его воруют.','Cleans exhaust gases. Its honeycomb holds precious metals, hence the price.'],
['exhaust_pipe','fuel',[],'Выхлопная труба','Exhaust pipe','Ведёт газы от мотора назад под днищем.','Carries gases back under the floor.'],
['resonator','fuel',[],'Резонатор','Resonator','Средняя банка глушителя, гасит гул.','Middle silencer that kills drone.'],
['muffler','fuel',['muffler'],'Глушитель','Muffler','Задняя банка, делает выхлоп тихим. Гниёт изнутри от конденсата при коротких поездках.','Rear silencer. Short trips rot it from the inside with condensation.'],
['fuel_tank','fuel',[],'Бензобак','Fuel tank','55 литров, стоит под задним сиденьем. Полного бака хватает примерно на 650-850 км.','55 litres under the rear seat; roughly 650-850 km per tank.'],
['fuel_pump','fuel',['fuel_pump','fuel_filter'],'Бензонасос','Fuel pump','Электрический, живёт внутри бака вместе с фильтром. Не катайся на последних литрах: бензин охлаждает насос.','Electric, inside the tank with the filter. Do not run on fumes; fuel cools the pump.'],
['strut_front','chassis',['front_shocks','front_springs'],'Передняя стойка','Front strut','Амортизатор с пружиной (McPherson). Пружина держит машину, амортизатор гасит раскачку. Меняют парой.','Shock absorber with coil spring. The spring holds the car up, the shock stops bouncing. Replace in pairs.'],
['control_arm','chassis',['lower_arm'],'Нижний рычаг','Lower control arm','Держит колесо снизу. Изнашиваются сайлентблоки: стук и увод при торможении.','Holds the wheel at the bottom. Worn bushes cause knocks and pull under braking.'],
['stab_link','chassis',['stab_link'],'Стойка стабилизатора','Stabilizer link','Самая частая причина стука спереди на кочках. Дешёвая и меняется за полчаса.','The most common cause of front knocks over bumps. Cheap and quick to swap.'],
['ball_joint','chassis',['ball_joint'],'Шаровая опора','Ball joint','Шарнир, на котором поворачивается колесо. Люфт опасен, проверяй на каждом ТО.','The pivot the wheel steers on. Play is dangerous; check at every service.'],
['steering_rack','chassis',['steering_eps'],'Рулевая рейка','Steering rack','Превращает поворот руля в движение колёс влево-вправо.','Turns steering wheel rotation into side-to-side wheel movement.'],
['tie_rod','chassis',['tie_rod_end'],'Рулевой наконечник','Tie rod end','Соединяет рейку с колесом. Люфт даёт стук в руль и неровный износ шин.','Links the rack to the wheel. Play causes knocks and uneven tyre wear.'],
['eps','chassis',['steering_eps'],'Электроусилитель руля','Electric power steering','Мотор на рулевой колонке под панелью помогает крутить руль. Гидравлики и жидкости нет. Иногда стучит карданчик колонки.','A motor on the column under the dash helps you steer. No fluid. The column joint can knock.'],
['rear_beam','chassis',[],'Задняя балка','Rear torsion beam','Полузависимая подвеска: колёса связаны упругой балкой. Почти вечная, меняются только сайлентблоки.','Semi-independent: the rear wheels share a twisting beam. Nearly eternal; only bushes wear.'],
['shock_rear','chassis',['rear_shocks'],'Задние амортизаторы и пружины','Rear shocks & springs','Пружина и амортизатор стоят отдельно. Подтекание и раскачка на волнах - пора менять.','Spring and shock are separate here. Leaks or wallowing mean replace.'],
['floor','body',[],'Днище','Underbody','Пол кузова, усилители и защита снизу. Снизу видно выхлопную трубу, бак, заднюю балку и подрамник. Защиту картера стоит поставить, если ездишь по грунтовкам.','Floor pan, rails and undertrays. From below you see the exhaust, fuel tank, rear beam and subframe. Fit a sump guard if you drive on gravel.'],
['hub_bearing','chassis',['front_hub_bearing'],'Подшипник ступицы','Wheel bearing','Гул, который растёт со скоростью и меняется в поворотах, - почти наверняка он.','A hum that grows with speed and changes in turns is almost surely this.'],
];
const PR = Object.fromEntries([...PRICES.parts, ...PRICES.upgrades].map(p => [p.id, p]));
const P = {};
for (const [id, sys, keys, ru, en, wru, wen] of RAW) P[id] = { id, sys, name: { ru, en }, what: { ru: wru, en: wen }, prices: keys.map(k => PR[k]).filter(Boolean) };
const fmt = r => r ? (r[0] === r[1] ? r[0] : r[0] + '-' + r[1]) + ' BYN' : '';
const minPrice = p => { const v = p.prices.flatMap(x => [x.new_byn?.[0], x.used_byn?.[0]]).filter(n => n != null); return v.length ? Math.min(...v) : null };
const kufar = q => 'https://auto.kufar.by/listings?cat=2040&query=' + encodeURIComponent(q + ' corolla 150');

const D = Object.fromEntries(SPECS.dimensions.map(d => [d.key, d]));
const MM = () => lang === 'ru' ? 'мм' : 'mm';
const num = k => parseInt(D[k]?.value) || 0;

// ---------- язык ----------
const T = {
  from: { ru: 'от', en: 'from' }, tap: { ru: 'нажми - подробно', en: 'tap for details' }, newp: { ru: 'Новая', en: 'New' }, used: { ru: 'Б/у', en: 'Used' },
  where: { ru: 'Где купить в Беларуси', en: 'Where to buy in Belarus' }, est: { ru: 'оценка рынка', en: 'market estimate' }, real: { ru: 'цена из магазина', en: 'shop price' },
  oem: { ru: 'Номер Toyota', en: 'Toyota part no.' }, brands: { ru: 'Аналоги', en: 'Alternatives' }, noprice: { ru: 'Цену смотри по объявлениям: зависит от цвета и состояния.', en: 'Check listings: price depends on colour and condition.' },
  all: { ru: 'Всё', en: 'All' }, search: { ru: 'Найти деталь', en: 'Find a part' }, part: { ru: 'Деталь', en: 'Part' }, price: { ru: 'Цена', en: 'Price' },
  rate: { ru: 'Курс НБРБ на ', en: 'NBRB rate on ' }, menu: { ru: 'Меню', en: 'Menu' }, close: { ru: 'Закрыть', en: 'Close' }, show: { ru: 'Показать на машине', en: 'Show on the car' },
  item: { ru: 'Что', en: 'Item' }, when: { ru: 'Когда', en: 'When' }, work: { ru: 'Работа', en: 'Job' }, bulb: { ru: 'Лампа', en: 'Bulb' }, place: { ru: 'Где', en: 'Where' }, watt: { ru: 'Вт', en: 'W' },
  check: { ru: 'проверь на своей машине', en: 'check on your car' }, why: { ru: 'Зачем', en: 'Why' }, paint: { ru: 'Цвет кузова', en: 'Body colour' },
};
function setLang(l) {
  lang = l; store.set('lang', l); document.documentElement.lang = l;
  $('#langBtn').textContent = l === 'ru' ? 'EN' : 'RU';
  $('#partSearch').placeholder = L(T.search);
  renderAll();
}

// ---------- фон: размытые шары ----------
(function orbs() {
  const c = $('#orbs'), x = c.getContext('2d'); let w, h;
  const cols = ['#7B5CFF', '#FF7AC6', '#3EDBF7', '#FF9F43', '#6B95FF'];
  const balls = cols.map((col, i) => ({ col, a: Math.random() * 6.28, s: .00012 + i * .00004, r: .28 + (i % 3) * .08, ox: Math.random(), oy: Math.random() }));
  const size = () => { w = c.width = innerWidth * .5; h = c.height = innerHeight * .5 }; size(); addEventListener('resize', size);
  function draw(t) {
    x.clearRect(0, 0, w, h);
    for (const b of balls) {
      const px = (b.ox + Math.sin(t * b.s + b.a) * .25) * w, py = (b.oy + Math.cos(t * b.s * 1.3 + b.a) * .22) * h, r = b.r * Math.max(w, h);
      const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, b.col + '55'); g.addColorStop(1, b.col + '00');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    if (!RM) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

// ---------- роутер с View Transitions ----------
const PAGES = ['car', 'drive', 'engine', 'mmt', 'salon', 'size', 'mods', 'ref', 'service'];
let page = null, clickPt = [innerWidth / 2, 80];
addEventListener('pointerdown', e => clickPt = [e.clientX, e.clientY], true);
function go(p) {
  if (!PAGES.includes(p)) p = 'car';
  if (p === page) return;
  const swap = () => {
    $$('.page').forEach(s => s.classList.toggle('on', s.dataset.page === p));
    $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.go === p));
    page = p; moveBlob(); closeDrawer(); document.body.dataset.page = p;
    document.body.classList.remove('menu'); $('#menuBtn').setAttribute('aria-expanded', 'false');
    scrollTo(0, 0); onPage(p); place3d(p);
  };
  if (!document.startViewTransition || RM || !page) return swap();
  document.documentElement.style.setProperty('--cx', clickPt[0] + 'px');
  document.documentElement.style.setProperty('--cy', clickPt[1] + 'px');
  document.startViewTransition(swap);
}
function moveBlob() {
  const a = $('#nav a.on'), b = $('.nav-blob'); if (!a || !b) return;
  b.style.width = a.offsetWidth + 'px'; b.style.transform = `translateX(${a.offsetLeft}px)`;
}
addEventListener('hashchange', () => go(location.hash.slice(2)));
addEventListener('resize', moveBlob);
$('#menuBtn').onclick = () => { const on = document.body.classList.toggle('menu'); $('#menuBtn').setAttribute('aria-expanded', on) };
$('#langBtn').onclick = () => setLang(lang === 'ru' ? 'en' : 'ru');

// ---------- всплывашка ----------
const tip = $('#tip');
function showTip(e, html) { tip.innerHTML = html; tip.classList.add('on'); placeTip(e) }
function placeTip(e) {
  const r = tip.getBoundingClientRect(); let x = e.clientX + 18, y = e.clientY + 18;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.transform = `translate(${x}px,${y}px)`;
}
const hideTip = () => tip.classList.remove('on');
const partTip = p => { const m = minPrice(p); return `<i style="--c:${SYS[p.sys].c}"></i><b>${esc(L(p.name))}</b>${m != null ? `<span>${L(T.from)} ${m} BYN</span>` : ''}<small>${L(T.tap)}</small>` };

// ---------- панель детали ----------
const drawer = $('#drawer');
function priceBlock(x) {
  const links = (x.where || []).map(w => `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.name)}</a>`).join('');
  return `<div class="pr">
    <div class="pr-h"><b>${esc(L(x))}</b><span class="badge ${x.estimate ? '' : 'ok'}">${L(x.estimate ? T.est : T.real)}</span></div>
    <div class="pr-row">${x.new_byn ? `<div><small>${L(T.newp)}</small><strong>${fmt(x.new_byn)}</strong></div>` : ''}${x.used_byn ? `<div><small>${L(T.used)}</small><strong>${fmt(x.used_byn)}</strong></div>` : ''}</div>
    ${x.oem && x.oem !== '-' ? `<p class="kv"><small>${L(T.oem)}</small>${esc(x.oem)}</p>` : ''}
    ${x.brands && x.brands !== '-' ? `<p class="kv"><small>${L(T.brands)}</small>${esc(x.brands)}</p>` : ''}
    ${x.note_ru ? `<p class="note">${esc(lang === 'ru' ? x.note_ru : x.note_en)}</p>` : ''}
    ${links ? `<div class="links">${links}</div>` : ''}
  </div>`;
}
function openDrawer(id) {
  const p = P[id]; if (!p) return;
  const s = SYS[p.sys];
  $('#drawerBody').innerHTML = `<span class="chip" style="--c:${s.c}">${L(s)}</span>
    <h2>${esc(L(p.name))}</h2><p class="what">${esc(L(p.what))}</p>
    ${window.deepFor ? window.deepFor(id) : ''}
    <h3>${L(T.where)}</h3>
    ${p.prices.length ? p.prices.map(priceBlock).join('') : `<p class="note">${L(T.noprice)}</p><div class="links"><a href="${kufar(p.name.ru)}" target="_blank" rel="noopener">kufar.by</a><a href="https://baraholka.onliner.by/search.php?q=${encodeURIComponent(p.name.ru + ' corolla 150')}" target="_blank" rel="noopener">baraholka.onliner.by</a></div>`}`;
  drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); drawer.dataset.id = id;
  $('#drawerX').focus({ preventScroll: true });
}
function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); car3d?.clear() }
$('#drawerX').onclick = closeDrawer;
addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeSheet() } });

// ---------- машина: 3D-сцена (car3d.js) ----------
let car3d = null, carIds = null;
const sysHex = s => SYS[s] ? parseInt(SYS[s].c.slice(1), 16) : 0xffffff;
function onState(st) {
  $$('#dock [data-act]').forEach(b => b.setAttribute('aria-pressed', !!st[b.dataset.act]));
  if ((st.sys || '') !== ($('#legend .on')?.dataset.sys || '')) renderLegend();
}
import('./car3d.js').then(m => {
  car3d = m.init($('#c3d'), {
    sysOf: id => P[id]?.sys, sysColor: sysHex, onState: st => { onState(st); syncVp() },
    dims: { length: num('length') + ' ' + MM(), width: num('width') + ' ' + MM(), height: num('height') + ' ' + MM(), wheelbase: num('wheelbase') + ' ' + MM(), clearance: num('ground_clearance') + ' ' + MM(), mirrors: (D.width_mirrors?.value || '') },
    onHover: (id, e) => { if (id && P[id] && e) showTip(e, partTip(P[id])); else hideTip(); if (id) $('#hint').classList.add('gone') },
    onPick: id => id && P[id] ? openDrawer(id) : closeDrawer(),
  });
  carIds = car3d.ids(); for (const id of carIds) if (!P[id]) console.warn('нет данных', id);
  car3d.setPaint(store.get('paint') || PAINTS[0][0]); renderLegend();
  $('#loader').classList.add('done'); place3d(page);
}).catch(err => { console.error(err); $('#loader').innerHTML = `<span>${lang === 'ru' ? 'Браузер не смог запустить 3D (WebGL). Остальные вкладки работают.' : 'Your browser could not start 3D (WebGL). Other pages work.'}</span>` });
function focusPart(id) { car3d?.focus(id); openDrawer(id) }
const VP_PAGES = { car: 'car', drive: 'drive', engine: 'engine', mmt: 'mmt', salon: 'salon', size: 'size' };
function place3d(p) {
  if (!car3d) return; const k = VP_PAGES[p]; if (!k) return;
  car3d.mount(k === 'car' ? $('#c3d') : $(`[data-vp="${k}"]`)); car3d.preset(k); syncVp();
}
function syncVp() { const st = car3d?.state() || {}; $$('[data-vact]').forEach(b => { if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', !!(b.dataset.vact === 'go' ? st.drive : b.dataset.vact === 'domeT' ? st.dome : st[b.dataset.vact])) }) }
const FLOW_IDS = { 1: ['fuel_tank'], 2: ['fuel_pump'], 3: ['injector'], 4: ['engine_block', 'spark_plug', 'ign_coil'], 5: ['engine_block', 'oil_pan'], 6: ['clutch'], 7: ['clutch', 'clutch_actuator'], 8: ['gearbox', 'shift_actuator'], 9: ['gearbox'], 10: ['cv_joint'], 11: ['wheel', 'tyre'] };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-vact]'); if (!b || !car3d) return;
  const a = b.dataset.vact, st = car3d.state();
  if (a === 'go') car3d.drive(!st.drive);
  if (a === 'xray') car3d.setXray(!st.xray);
  if (a === 'explode') car3d.explode(!st.explode);
  if (a === 'chase') car3d.camTo([5.6, 1.7, 4.4], [-.4, .6, 0]);
  if (a === 'sidecam') car3d.camTo([0, 1.1, 7.6], [0, .6, 0]);
  if (a === 'topcam') car3d.camTo([.6, 9, 3], [0, .4, 0]);
  if (['driver', 'passenger', 'rear'].includes(a)) car3d.seat(a);
  if (a === 'domeT') car3d.dome(!st.dome);
  if (a === 'outside') { car3d.preset('car'); car3d.camTo([-4.6, 1.5, 4.9], [0, .55, 0]) }
  if (['q', 'side', 'front', 'top'].includes(a)) car3d.view(a);
  syncVp();
});
$('#c3d').addEventListener('pointerdown', () => $('#hint').classList.add('gone'), { once: true });
$('#dock').onclick = e => {
  const b = e.target.closest('button'); if (!b || !car3d || b.id === 'listBtn') return;
  const st = car3d.state();
  if (b.dataset.act === 'xray') car3d.setXray(!st.xray);
  if (b.dataset.act === 'explode') car3d.explode(!st.explode);
  if (b.dataset.act === 'drive') car3d.drive(!st.drive);
  if (b.dataset.view) { car3d.view(b.dataset.view); closeDrawer() }
};
function renderLegend() {
  const cnt = {}; for (const id in P) if (!carIds || carIds.has(id)) cnt[P[id].sys] = (cnt[P[id].sys] || 0) + 1;
  const cur = car3d?.state().sys || '';
  $('#legend').innerHTML = `<button class="rl ${!cur ? 'on' : ''}" data-sys=""><i style="--c:#fff"></i><span>${L(T.all)}</span></button>` +
    Object.entries(SYS).filter(([k]) => cnt[k]).map(([k, s]) => `<button class="rl ${cur === k ? 'on' : ''}" data-sys="${k}" style="--c:${s.c}"><i></i><span>${L(s)}</span><b>${cnt[k]}</b></button>`).join('');
}
$('#legend').onclick = e => { const b = e.target.closest('[data-sys]'); if (b && car3d) { car3d.setSystem(b.dataset.sys); renderLegend() } };
const PAINTS = [['#0b0c0f', 'Black 202'], ['#EEF0EE', 'Super White 040'], ['#B9BDC4', 'Silver Metallic 1F7'], ['#5D6168', 'Grey Metallic 1G3'], ['#2C3D63', 'Dark Blue Mica 8T5'], ['#8A1F2A', 'Barcelona Red 3R3']];
function renderPaints() {
  const cur = store.get('paint') || PAINTS[0][0];
  $('#stage').style.setProperty('--paint', cur); car3d?.setPaint(cur);
  $('#paints').innerHTML = PAINTS.map(([c, n]) => `<button class="sw ${c === cur ? 'on' : ''}" style="--sw:${c}" data-c="${c}" title="${n}" aria-label="${n}"></button>`).join('');
}
$('#paints').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { store.set('paint', b.dataset.c); renderPaints() } };

// список всех деталей
const sheet = $('#sheet');
function openSheet() {
  const groups = {}; for (const id in P) if (!carIds || carIds.has(id)) (groups[P[id].sys] ||= []).push(P[id]);
  $('#sheetBody').innerHTML = Object.entries(groups).map(([k, arr]) => `<h3 style="--c:${SYS[k].c}"><i></i>${L(SYS[k])}</h3><div class="plist">${arr.map(p => `<button data-id="${p.id}">${esc(L(p.name))}${minPrice(p) != null ? `<small>${L(T.from)} ${minPrice(p)}</small>` : ''}</button>`).join('')}</div>`).join('');
  sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
}
function closeSheet() { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true') }
$('#listBtn').onclick = openSheet; $('#sheetX').onclick = closeSheet;
sheet.onclick = e => { if (e.target === sheet) return closeSheet(); const b = e.target.closest('[data-id]'); if (b) { closeSheet(); go('car'); setTimeout(() => focusPart(b.dataset.id), 60) } };

// ---------- вид сверху (для «Как едет» и «Салон») ----------
function topCar(extra) {
  return `<defs><linearGradient id="tpG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".16"/><stop offset=".5" stop-color="#ffffff" stop-opacity=".05"/><stop offset="1" stop-color="#ffffff" stop-opacity=".16"/></linearGradient></defs>
  <g class="top-body">
    <path d="M552,124 L560,104 C562,98 590,98 594,104 L600,124 Z M552,636 L560,656 C562,662 590,662 594,656 L600,636 Z" class="tb-mirror"/>
    <path d="M140,250 C140,168 172,128 262,122 L1360,122 C1440,126 1478,170 1482,250 L1482,510 C1478,590 1440,634 1360,638 L262,638 C172,632 140,592 140,510 Z" fill="url(#tpG)"/>
    <path d="M548,168 C600,156 660,150 712,148 L712,612 C660,610 600,604 548,592 Z" class="tb-glass"/>
    <path d="M1050,150 C1120,152 1190,160 1240,172 L1240,588 C1190,600 1120,608 1050,610 Z" class="tb-glass"/>
    <path d="M712,148 L1050,150 L1050,610 L712,612 Z" class="tb-roof"/>
    <g class="tb-wheels"><rect x="310" y="128" width="190" height="56" rx="20"/><rect x="310" y="576" width="190" height="56" rx="20"/><rect x="1090" y="128" width="190" height="56" rx="20"/><rect x="1090" y="576" width="190" height="56" rx="20"/></g>
    <path d="M150,200 C160,160 200,140 268,136 L262,196 Z M150,560 C160,600 200,620 268,624 L262,564 Z" class="tb-lamp"/>
    <path d="M1440,160 C1466,172 1478,200 1480,236 L1452,236 Z M1440,600 C1466,588 1478,560 1480,524 L1452,524 Z" class="tb-tail"/>
  </g>${extra}`;
}

// «Как едет»: схема силового потока по шагам SPECS.drive_flow
const FLOW_EL = [
  `<path class="fl" data-s="1" d="M920,230 L1080,230 C1092,230 1096,240 1096,252 L1096,516 C1096,528 1088,534 1076,534 L920,534 C908,534 904,526 904,514 L904,250 C904,238 910,230 920,230Z"/>`,
  `<g class="fl" data-s="2"><rect x="960" y="360" width="30" height="60" rx="8"/><path class="flow" d="M960,380 C800,380 700,300 560,300 L330,300" fill="none"/></g>`,
  `<g class="fl" data-s="3"><rect x="192" y="220" width="16" height="200" rx="6"/><path d="M208,250 h18 M208,300 h18 M208,350 h18 M208,400 h18"/></g>`,
  `<g class="fl" data-s="4"><rect x="226" y="214" width="112" height="212" rx="16"/><circle cx="282" cy="245" r="17"/><circle cx="282" cy="295" r="17"/><circle cx="282" cy="345" r="17"/><circle cx="282" cy="395" r="17"/></g>`,
  `<path class="fl" data-s="5" d="M300,222 L300,440" stroke-width="10"/>`,
  `<ellipse class="fl" data-s="6" cx="300" cy="452" rx="38" ry="12"/>`,
  `<rect class="fl" data-s="7" x="262" y="466" width="76" height="12" rx="5"/>`,
  `<path class="fl" data-s="8" d="M236,484 L344,484 C356,484 360,492 360,504 L356,540 C354,550 346,556 334,556 L246,556 C234,556 228,548 228,536 L228,494 C228,488 230,484 236,484Z"/>`,
  `<circle class="fl" data-s="9" cx="352" cy="520" r="20"/>`,
  `<g class="fl" data-s="10"><path class="flow" d="M352,520 L405,604 M352,520 C370,420 390,260 405,156" fill="none" stroke-width="7"/><circle cx="392" cy="584" r="9"/><circle cx="400" cy="178" r="9"/></g>`,
  `<g class="fl" data-s="11"><rect x="310" y="128" width="190" height="56" rx="20"/><rect x="310" y="576" width="190" height="56" rx="20"/></g>`,
];
const FLOW_EXTRA = `<g class="fl-static"><rect x="150" y="190" width="18" height="380" rx="6"/><path d="M338,300 C500,360 700,400 1300,420 L1450,500" fill="none" stroke-width="7" stroke-dasharray="2 10"/><rect x="1300" y="470" width="150" height="56" rx="22"/><path d="M1185,170 L1185,590" stroke-width="12"/></g>`;
let flowStep = 0, flowTimer = 0;
function renderDrive() {
  if ($('#topSvg')) $('#topSvg').innerHTML = topCar(FLOW_EXTRA + FLOW_EL.join(''));
  $('#steps').innerHTML = SPECS.drive_flow.map(s => `<button class="step" data-s="${s.step}"><b>${s.step}</b><span>${esc(L(s))}</span></button>`).join('');
  setFlow(flowStep);
}
function setFlow(n) {
  flowStep = n; flow3d(n);
  $$('#topSvg .fl').forEach(e => { const s = +e.dataset.s; e.classList.toggle('on', n ? s === n : true); e.classList.toggle('done', n && s < n) });
  $$('#steps .step').forEach(b => b.classList.toggle('on', +b.dataset.s === n));
}
$('#steps').onclick = e => { const b = e.target.closest('.step'); if (b) { clearInterval(flowTimer); setFlow(+b.dataset.s === flowStep ? 0 : +b.dataset.s) } };
function flow3d(n) { if (!car3d) return; n ? car3d.flow(FLOW_IDS[n]) : car3d.clearFlow(); syncVp() }
$('#flowPlay').onclick = () => { clearInterval(flowTimer); setFlow(1); flowTimer = setInterval(() => { if (flowStep >= 11) { clearInterval(flowTimer); return setTimeout(() => setFlow(0), 1600) } setFlow(flowStep + 1) }, 1700) };

// ---------- двигатель: анимация цилиндра ----------
const STROKES = [
  { c: '#6B95FF', ru: 'Впуск', en: 'Intake', d: { ru: 'Поршень идёт вниз, впускной клапан открыт. В цилиндр затягивается воздух с капельками бензина от форсунки.', en: 'The piston moves down with the intake valve open, pulling in air mixed with fuel from the injector.' } },
  { c: '#B98CFF', ru: 'Сжатие', en: 'Compression', d: { ru: 'Оба клапана закрыты, поршень идёт вверх и сжимает смесь в 10 раз. Сжатая смесь горит сильнее.', en: 'Both valves shut, the piston rises and squeezes the mix about 10 times. Compressed mix burns harder.' } },
  { c: '#FF9F43', ru: 'Рабочий ход', en: 'Power', d: { ru: 'Свеча даёт искру, смесь вспыхивает, газы с огромной силой толкают поршень вниз. Только этот такт крутит машину.', en: 'The plug sparks, the mix ignites, and the gas shoves the piston down. Only this stroke drives the car.' } },
  { c: '#9AA0B4', ru: 'Выпуск', en: 'Exhaust', d: { ru: 'Выпускной клапан открыт, поршень идёт вверх и выталкивает сгоревшие газы в выхлопную трубу.', en: 'The exhaust valve opens and the rising piston pushes burnt gas out to the exhaust.' } },
];
let crank = 0, rpmK = .12, cylRun = false, lastT = 0;
const cyl = $('#cylSvg');
cyl.innerHTML = `<defs><linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#6d7284"/><stop offset=".5" stop-color="#d9dce6"/><stop offset="1" stop-color="#6d7284"/></linearGradient></defs>
  <rect x="104" y="96" width="16" height="270" rx="4" fill="#3a3550"/><rect x="280" y="96" width="16" height="270" rx="4" fill="#3a3550"/>
  <path d="M96,96 L150,40 L250,40 L304,96 Z" fill="#3a3550"/>
  <path id="intakePort" d="M40,30 L150,30 L162,70" fill="none" stroke="#6B95FF" stroke-width="18" stroke-linecap="round" opacity=".5"/>
  <path id="exhPort" d="M238,70 L250,30 L360,30" fill="none" stroke="#9AA0B4" stroke-width="18" stroke-linecap="round" opacity=".5"/>
  <rect id="gas" x="120" y="96" width="160" height="80" fill="#6B95FF" opacity=".45"/>
  <g id="vIn"><path d="M158,10 L158,72" stroke="#cfd3df" stroke-width="5"/><path d="M140,72 L176,72 L170,80 L146,80Z" fill="#cfd3df"/></g>
  <g id="vEx"><path d="M242,10 L242,72" stroke="#cfd3df" stroke-width="5"/><path d="M224,72 L260,72 L254,80 L230,80Z" fill="#cfd3df"/></g>
  <g id="plug"><rect x="194" y="6" width="12" height="40" rx="3" fill="#f4f4f4"/><circle id="spark" cx="200" cy="56" r="14" fill="#FFE45C" opacity="0"/></g>
  <circle cx="200" cy="420" r="66" fill="#2a2640" stroke="#4a4466" stroke-width="3"/>
  <path id="rod" stroke="url(#metal)" stroke-width="16" stroke-linecap="round"/>
  <g id="piston"><rect x="122" y="0" width="156" height="62" rx="8" fill="url(#metal)"/><path d="M122,12 h156 M122,22 h156" stroke="#4a4f60" stroke-width="2"/><circle cx="200" cy="40" r="9" fill="#4a4f60"/></g>
  <circle id="pin" r="11" fill="#FF9F43"/><circle cx="200" cy="420" r="9" fill="#cfd3df"/>
  <text id="phase" x="200" y="510" text-anchor="middle" class="cyl-label"></text>`;
const R = 52, LEN = 168, CY = 420;
function drawCyl(a) {
  const th = a % (Math.PI * 4), ph = Math.floor(th / Math.PI) % 4, u = (th % Math.PI) / Math.PI;
  const px = 200 + R * Math.sin(th), py = CY - R * Math.cos(th), pinY = py - Math.sqrt(LEN * LEN - (R * Math.sin(th)) ** 2), top = pinY - 40;
  $('#piston', cyl).setAttribute('transform', `translate(0,${top})`);
  $('#rod', cyl).setAttribute('d', `M200,${pinY} L${px},${py}`);
  $('#pin', cyl).setAttribute('cx', px); $('#pin', cyl).setAttribute('cy', py);
  const gas = $('#gas', cyl); gas.setAttribute('height', Math.max(0, top - 96)); gas.setAttribute('fill', STROKES[ph].c);
  gas.setAttribute('opacity', ph === 1 ? .35 + .4 * u : ph === 2 ? .85 - .5 * u : ph === 3 ? .4 - .25 * u : .25 + .25 * u);
  const lift = Math.sin(u * Math.PI) * 16;
  $('#vIn', cyl).setAttribute('transform', `translate(0,${ph === 0 ? lift : 0})`);
  $('#vEx', cyl).setAttribute('transform', `translate(0,${ph === 3 ? lift : 0})`);
  $('#intakePort', cyl).setAttribute('opacity', ph === 0 ? .9 : .25); $('#exhPort', cyl).setAttribute('opacity', ph === 3 ? .9 : .25);
  $('#spark', cyl).setAttribute('opacity', ph === 2 && u < .18 ? 1 - u / .18 : 0);
  $('#phase', cyl).textContent = L(STROKES[ph]);
  $$('#strokes .stroke').forEach((s, i) => s.classList.toggle('on', i === ph));
}
function cylLoop(t) {
  if (!cylRun) return;
  const dt = Math.min(50, t - (lastT || t)); lastT = t;
  crank += dt * (.0008 + rpmK * .012); drawCyl(crank);
  requestAnimationFrame(cylLoop);
}
$('#rpm').oninput = e => { rpmK = e.target.value / 100; $('#rpmVal').textContent = Math.round(800 + rpmK * 5700) };
function renderEngine() {
  $('#strokes').innerHTML = STROKES.map((s, i) => `<div class="stroke" style="--c:${s.c}"><b>${i + 1}. ${L(s)}</b><p>${L(s.d)}</p></div>`).join('');
  const e = SPECS.engine, v = x => typeof x === 'object' && 'value' in x ? x.value + (x.verified === false ? ' *' : '') : L(x);
  const rows = [['displacement', 'Объём', 'Displacement'], ['power', 'Мощность', 'Power'], ['torque', 'Крутящий момент', 'Torque'], ['bore_stroke', 'Диаметр x ход', 'Bore x stroke'], ['compression', 'Степень сжатия', 'Compression'], ['redline', 'Отсечка', 'Redline'], ['firing_order', 'Порядок работы', 'Firing order'], ['fuel', 'Топливо', 'Fuel'], ['oil', 'Масло', 'Oil'], ['coolant', 'Антифриз', 'Coolant'], ['spark_plugs', 'Свечи', 'Spark plugs'], ['injection', 'Впрыск', 'Injection'], ['block', 'Блок', 'Block'], ['timing_drive', 'Привод ГРМ', 'Timing drive']];
  $('#engSpecs').innerHTML = rows.filter(r => e[r[0]]).map(([k, ru, en]) => `<div class="spec"><small>${lang === 'ru' ? ru : en}</small><b>${esc(v(e[k]))}</b></div>`).join('') + `<p class="note wide">* ${L(T.check)}</p>`;
  $('#engWeak').innerHTML = `<h3>${lang === 'ru' ? 'Слабые места' : 'Weak points'}</h3><ul>${SPECS.weak_points.map(w => `<li>${esc(L(w))}</li>`).join('')}</ul>`;
  drawCyl(crank);
}
new IntersectionObserver(([en]) => { cylRun = en.isIntersecting && !RM; lastT = 0; if (cylRun) requestAnimationFrame(cylLoop) }).observe(cyl);

// ---------- MMT: схема и сценарии ----------
const mmt = $('#mmtSvg');
mmt.innerHTML = `
  <text x="20" y="28" class="m-l">${'ДВИГАТЕЛЬ'}</text>
  <rect x="10" y="60" width="110" height="220" rx="18" class="m-eng"/>
  <path d="M120,170 L150,170" class="m-shaft"/>
  <rect id="flywheel" x="150" y="70" width="18" height="200" rx="6" class="m-fly"/>
  <rect id="disc" x="174" y="90" width="12" height="160" rx="5" class="m-disc"/>
  <rect id="plate" x="190" y="80" width="16" height="180" rx="6" class="m-plate"/>
  <path id="fork" d="M214,60 L232,150" class="m-fork"/>
  <g id="cAct"><rect x="196" y="12" width="70" height="34" rx="10" class="m-act"/><circle cx="208" cy="29" r="9" class="m-mot"/></g>
  <path d="M206,170 L300,170" class="m-shaft"/>
  <rect x="300" y="60" width="210" height="220" rx="22" class="m-box"/>
  <g id="gears"></g>
  <g id="sAct"><rect x="360" y="12" width="96" height="34" rx="10" class="m-act"/><circle cx="374" cy="29" r="9" class="m-mot"/><circle cx="442" cy="29" r="9" class="m-mot"/></g>
  <path d="M510,170 L560,170 L560,240" class="m-shaft"/><circle cx="560" cy="260" r="26" class="m-diff"/>
  <g id="hgate" transform="translate(540,40)"><path d="M10,10 v60 M45,10 v60 M80,10 v60 M10,40 h70" class="m-gate"/><circle id="knob" cx="45" cy="40" r="8"/>
  <text x="10" y="6" class="m-g">1</text><text x="10" y="86" class="m-g">2</text><text x="45" y="6" class="m-g">3</text><text x="45" y="86" class="m-g">4</text><text x="80" y="6" class="m-g">5</text><text x="80" y="86" class="m-g">R</text></g>
  <text x="320" y="330" id="mmtState" class="m-state"></text>`;
const GPOS = { N: [45, 40], 1: [10, 12], 2: [10, 68], 3: [45, 12], 4: [45, 68], 5: [80, 12], R: [80, 68] };
$('#gears', mmt).innerHTML = ['1', '2', '3', '4', '5', 'R'].map((g, i) => `<g data-g="${g}"><rect x="${318 + i * 31}" y="${100 + i * 6}" width="22" height="${120 - i * 12}" rx="6"/><text x="${329 + i * 31}" y="262" text-anchor="middle">${g}</text></g>`).join('');
let mState = { gap: 0, gear: 'N', knob: [45, 40] }, mBusy = false;
function drawMMT() {
  const g = mState.gap;
  $('#disc', mmt).setAttribute('x', 174 + g * 6); $('#plate', mmt).setAttribute('x', 190 + g * 10);
  $('#fork', mmt).setAttribute('d', `M214,60 L${232 + g * 12},150`);
  $('#cAct', mmt).classList.toggle('busy', !!mState.cb); $('#sAct', mmt).classList.toggle('busy', !!mState.sb);
  $('#knob', mmt).setAttribute('cx', mState.knob[0]); $('#knob', mmt).setAttribute('cy', mState.knob[1]);
  $$('#gears g', mmt).forEach(e => e.classList.toggle('on', e.dataset.g === mState.gear));
  $('.m-l', mmt).textContent = lang === 'ru' ? 'ДВИГАТЕЛЬ' : 'ENGINE';
}
const tween = (from, to, ms, fn) => new Promise(r => { const t0 = performance.now(); const s = now => { const u = RM ? 1 : Math.min(1, (now - t0) / ms), e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; fn(from + (to - from) * e); u < 1 ? requestAnimationFrame(s) : r() }; requestAnimationFrame(s) });
const MSG = {
  open: { ru: 'Актуатор сцепления выжимает сцепление', en: 'Clutch actuator releases the clutch' },
  shift: { ru: 'Актуатор переключения включает передачу', en: 'Shift actuator selects the gear' },
  close: { ru: 'Сцепление плавно отпускается, машина едет', en: 'Clutch engages smoothly, car moves' },
  stop: { ru: 'Нейтраль: двигатель крутится, колёса стоят', en: 'Neutral: engine spins, wheels stand still' },
};
const say = k => $('#mmtState', mmt).textContent = L(MSG[k]);
async function shiftTo(g) {
  if (mBusy || g === mState.gear) return; mBusy = true;
  mState.cb = true; say('open'); await tween(0, 1, 500, v => { mState.gap = v; drawMMT() }); mState.cb = false;
  mState.sb = true; say('shift'); const k0 = [...mState.knob], mid = [k0[0], 40], to = GPOS[g];
  await tween(0, 1, 260, v => { mState.knob = [k0[0], k0[1] + (40 - k0[1]) * v]; drawMMT() });
  await tween(0, 1, 260, v => { mState.knob = [mid[0] + (to[0] - mid[0]) * v, 40]; drawMMT() });
  await tween(0, 1, 260, v => { mState.knob = [to[0], 40 + (to[1] - 40) * v]; drawMMT() });
  mState.gear = g; mState.sb = false; drawMMT();
  if (g === 'N') { say('stop'); mBusy = false; return }
  await tween(1, 0, 900, v => { mState.gap = v; drawMMT() }); say('close'); mBusy = false;
}
function renderMMT() {
  const m = SPECS.mmt;
  $('#mmtCtrl').innerHTML = ['N', '1', '2', '3', '4', '5', 'R'].map(g => `<button class="pill gear" data-g="${g}">${g}</button>`).join('');
  $('#mmtText').innerHTML = `<h3>${esc(m.code)} - ${esc(L(m.name))}</h3><p>${esc(L(m.how_it_works))}</p><p><b>${lang === 'ru' ? 'Режимы' : 'Modes'}:</b> ${esc(L(m.modes))}</p><p><b>${lang === 'ru' ? 'Масло' : 'Oil'}:</b> ${esc(L(m.oil))}</p><p><b>${lang === 'ru' ? 'Калибровка' : 'Calibration'}:</b> ${esc(L(m.calibration))}</p><h3>${lang === 'ru' ? 'Что ломается' : 'What fails'}</h3><ul>${m.problems.map(p => `<li>${esc(L(p))}</li>`).join('')}</ul>`;
  $('#mmtTips').innerHTML = m.driving_tips.map((t, i) => `<div class="tipcard"><b>${i + 1}</b><p>${esc(L(t))}</p></div>`).join('');
  drawMMT(); if (!mBusy) say(mState.gear === 'N' ? 'stop' : 'close');
}
$('#mmtCtrl').onclick = e => { const b = e.target.closest('[data-g]'); if (b) shiftTo(b.dataset.g) };

// ---------- салон: лампы на виде сверху ----------
const BULB_AT = {
  front_low_beam: [[185, 186], [185, 574]], front_high_beam: [[222, 168], [222, 592]], front_position: [[250, 150], [250, 610]], front_turn: [[160, 214], [160, 546]],
  front_fog: [[148, 268], [148, 492]], drl: [[143, 330], [143, 430]], side_repeater: [[492, 124], [492, 636]],
  rear_tail_brake: [[1462, 200], [1462, 560]], rear_turn: [[1446, 168], [1446, 592]], reverse: [[1476, 300]], rear_fog: [[1476, 460]], license_plate: [[1480, 380]], third_brake: [[1262, 380]],
  front_map: [[720, 380]], rear_dome: [[990, 380]], trunk: [[1380, 380]], glovebox: [[600, 250]], door_courtesy: [[780, 140], [780, 620]], vanity_mirror: [[700, 270], [700, 490]],
  dashboard: [[588, 500]], gear_indicator: [[624, 456]], clock_climate: [[580, 380]],
};
const SALON_EXTRA = `<g class="salon-in">
  <path d="M560,170 C590,166 620,164 640,164 L640,596 C620,596 590,594 560,590 Z" class="si-dash"/>
  <rect x="720" y="214" width="140" height="132" rx="26" class="si-seat"/><rect x="720" y="414" width="140" height="132" rx="26" class="si-seat"/>
  <rect x="842" y="214" width="34" height="132" rx="14" class="si-back"/><rect x="842" y="414" width="34" height="132" rx="14" class="si-back"/>
  <rect x="950" y="196" width="120" height="368" rx="30" class="si-seat"/><rect x="1060" y="196" width="34" height="368" rx="14" class="si-back"/>
  <ellipse cx="660" cy="480" rx="14" ry="50" class="si-wheel"/><rect x="680" y="350" width="150" height="60" rx="20" class="si-console"/>
  <rect x="1250" y="176" width="210" height="408" rx="30" class="si-trunk"/></g>`;
function renderSalon() {
  const byPlace = Object.fromEntries(SPECS.bulbs.map(b => [b.place, b]));
  const dots = Object.entries(BULB_AT).filter(([k]) => byPlace[k]).flatMap(([k, pts]) => pts.map(([x, y]) => `<g class="bulb" data-b="${k}" tabindex="0" role="button"><circle cx="${x}" cy="${y}" r="16" class="b-glow"/><circle cx="${x}" cy="${y}" r="6.5"/></g>`)).join('');
  $('#salonSvg').innerHTML = topCar(SALON_EXTRA + dots);
  $('#bulbTbl').innerHTML = `<thead><tr><th>${L(T.place)}</th><th>${L(T.bulb)}</th><th>${L(T.watt)}</th></tr></thead><tbody>` + SPECS.bulbs.map(b => `<tr data-b="${b.place}"><td>${esc(L(b))}${b.verified === false ? ' <span class="q" title="' + L(T.check) + '">?</span>' : ''}</td><td><b>${esc(b.code)}</b></td><td>${esc(b.watts || '')}</td></tr>`).join('') + '</tbody>';
  const tone = c => /red/.test(c) && !/amber/.test(c) ? 'r' : /amber/.test(c) ? 'a' : 'g';
  $('#warns').innerHTML = SPECS.warning_lights.map(w => `<div class="warn w-${tone(w.color)}"><i></i><b>${esc(w.code)}</b><p>${esc(L(w))}</p></div>`).join('');
  const up = SPECS.interior.reupholstery.map(r => `<div class="card glass"><p>${esc(L(r))}</p></div>`).join('');
  const reup = PR.reupholstery, cov = PR.seat_covers;
  $('#uphol').innerHTML = `<div class="card glass accent-card"><h3>${lang === 'ru' ? 'Комплектации и обивка' : 'Trims and upholstery'}</h3><p>${esc(L(SPECS.interior.trims))}</p><p>${esc(L(SPECS.interior.seats))}</p>${reup ? `<p class="big">${fmt(reup.new_byn)}</p><small>${esc(L(reup))}</small>` : ''}${cov ? `<p class="big">${fmt(cov.new_byn)}</p><small>${esc(L(cov))}</small>` : ''}</div>` + up;
}
function bulbHover(e) {
  const g = e.target.closest?.('[data-b]'); if (!g) return hideTip();
  const b = SPECS.bulbs.find(x => x.place === g.dataset.b); if (!b) return;
  showTip(e, `<i style="--c:#FFE45C"></i><b>${esc(b.code)}${b.watts ? ' · ' + esc(b.watts) + ' ' + L(T.watt) : ''}</b><small>${esc(L(b))}</small>`);
  $$('[data-b]').forEach(x => x.classList.toggle('hov', x.dataset.b === g.dataset.b));
}
['#salonSvg', '#bulbTbl'].forEach(s => { $(s).addEventListener('pointermove', bulbHover); $(s).addEventListener('pointerleave', () => { hideTip(); $$('[data-b]').forEach(x => x.classList.remove('hov')) }) });
$('#salonSvg').addEventListener('focusin', e => { const r = e.target.getBoundingClientRect(); bulbHover({ target: e.target, clientX: r.right, clientY: r.top }) });

// ---------- размеры ----------
function dimLine(x1, y1, x2, y2, label, vert) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return `<g class="dim"><path d="M${x1},${y1} L${x2},${y2}"/><path d="M${x1 - (vert ? 10 : 0)},${y1 - (vert ? 0 : 10)} l${vert ? 20 : 0},${vert ? 0 : 20} M${x2 - (vert ? 10 : 0)},${y2 - (vert ? 0 : 10)} l${vert ? 20 : 0},${vert ? 0 : 20}"/>
  <text x="${vert ? mx - 14 : mx}" y="${vert ? my : my - 12}" ${vert ? `transform="rotate(-90 ${mx - 14} ${my})"` : ''} text-anchor="middle">${label}</text></g>`;
}
function renderSize() {
  if (!$('#dimSide')) return renderSizeSpecs();
  const body = $('#bodyLayer').cloneNode(true); body.removeAttribute('id'); body.querySelectorAll('.part').forEach(e => { e.classList.remove('part'); e.removeAttribute('data-id') });
  // id из скрытой страницы не рисуются: копия defs получает свои id с префиксом d
  const side = $('#dimSide'), ren = h => h.replace(/id="(\w+)"/g, 'id="d$1"').replace(/#(paintG|glassG|tyreG|rimG|soft|bodyClip|wheelArt)/g, '#d$1');
  side.innerHTML = ren($('#carSvg defs').outerHTML + body.outerHTML); side.style.setProperty('--paint', $('#stage').style.getPropertyValue('--paint'));
  side.insertAdjacentHTML('beforeend', dimLine(120, 560, 1485, 560, num('length') + ' '+MM()) + dimLine(405, 500, 1185, 500, num('wheelbase') + ' '+MM()) + dimLine(1530, 520, 1530, 79, num('height') + ' '+MM(), true) + dimLine(80, 520, 80, 475, num('ground_clearance') + '', true) + `<path class="ground" d="M60,520 L1540,520"/>`);
  const W = num('width'), H = num('height'), k = .3, cx = 350, gy = 560, hw = W * k / 2, top = gy - H * k;
  $('#dimFront').innerHTML = `<g class="front-car">
    <path d="M${cx - hw},${gy - 40} L${cx - hw},${gy - 150} C${cx - hw},${gy - 190} ${cx - hw + 30},${gy - 200} ${cx - hw + 60},${gy - 205} L${cx - 150},${top + 20} C${cx - 120},${top} ${cx + 120},${top} ${cx + 150},${top + 20} L${cx + hw - 60},${gy - 205} C${cx + hw - 30},${gy - 200} ${cx + hw},${gy - 190} ${cx + hw},${gy - 150} L${cx + hw},${gy - 40} Z" class="fc-body"/>
    <path d="M${cx - 140},${top + 34} C${cx - 100},${top + 22} ${cx + 100},${top + 22} ${cx + 140},${top + 34} L${cx + hw - 74},${gy - 214} L${cx - hw + 74},${gy - 214} Z" class="fc-glass"/>
    <path d="M${cx - hw - 50},${gy - 230} l40,-6 l6,30 l-40,6 Z M${cx + hw + 50},${gy - 230} l-40,-6 l-6,30 l40,6 Z" class="fc-mirror"/>
    <rect x="${cx - hw + 14}" y="${gy - 180}" width="80" height="34" rx="12" class="fc-lamp"/><rect x="${cx + hw - 94}" y="${gy - 180}" width="80" height="34" rx="12" class="fc-lamp"/>
    <rect x="${cx - 70}" y="${gy - 120}" width="140" height="40" rx="14" class="fc-grille"/>
    <rect x="${cx - hw + 20}" y="${gy - 62}" width="62" height="62" rx="12" class="fc-tyre"/><rect x="${cx + hw - 82}" y="${gy - 62}" width="62" height="62" rx="12" class="fc-tyre"/></g>
    <path class="ground" d="M20,${gy} L680,${gy}"/>` +
    dimLine(cx - hw, gy + 34, cx + hw, gy + 34, W + ' '+MM()) + dimLine(cx - hw - 50, top - 30, cx + hw + 50, top - 30, (D.width_mirrors?.value || '') ) + dimLine(cx + hw + 80, gy, cx + hw + 80, top, H + ' '+MM(), true);
  $('#dimSpecs').innerHTML = SPECS.dimensions.filter(d => !['bolt_pattern', 'center_bore', 'offset', 'rim_width', 'wheel_nut', 'wheel_torque', 'tyre_pressure', 'tyres'].includes(d.key)).map(d => `<div class="spec"><small>${esc(L(d))}</small><b>${esc(d.value)}${d.verified === false ? ' *' : ''}</b></div>`).join('');
  $('#wheelSpecs').innerHTML = ['tyres', 'bolt_pattern', 'center_bore', 'offset', 'rim_width', 'wheel_nut', 'wheel_torque', 'tyre_pressure'].filter(k => D[k]).map(k => `<div class="spec"><small>${esc(L(D[k]))}</small><b>${esc(D[k].value)}</b></div>`).join('');
}

function renderSizeSpecs() {
  $('#dimSpecs').innerHTML = SPECS.dimensions.filter(d => !['bolt_pattern', 'center_bore', 'offset', 'rim_width', 'wheel_nut', 'wheel_torque', 'tyre_pressure', 'tyres'].includes(d.key)).map(d => `<div class="spec"><small>${esc(L(d))}</small><b>${esc(d.value)}${d.verified === false ? ' *' : ''}</b></div>`).join('');
  $('#wheelSpecs').innerHTML = ['tyres', 'bolt_pattern', 'center_bore', 'offset', 'rim_width', 'wheel_nut', 'wheel_torque', 'tyre_pressure'].filter(k => D[k]).map(k => `<div class="spec"><small>${esc(L(D[k]))}</small><b>${esc(D[k].value)}</b></div>`).join('');
}

// ---------- ништяки ----------
function renderMods() {
  const arr = PRICES.upgrades.filter(u => u.new_byn).sort((a, b) => a.new_byn[0] - b.new_byn[0]);
  const no = PRICES.upgrades.filter(u => !u.new_byn);
  $('#mods').innerHTML = arr.concat(no).map(u => `<article class="card glass mod">
    <div class="mod-top"><h3>${esc(L(u))}</h3>${u.new_byn ? `<strong>${fmt(u.new_byn)}</strong>` : '<strong>-</strong>'}</div>
    ${u.why_ru ? `<p class="why">${esc(lang === 'ru' ? u.why_ru : u.why_en)}</p>` : ''}
    ${u.note_ru ? `<p class="note">${esc(lang === 'ru' ? u.note_ru : u.note_en)}</p>` : ''}
    ${u.where?.length ? `<div class="links">${u.where.map(w => `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.name)}</a>`).join('')}</div>` : ''}
    ${u.estimate ? `<span class="badge">${L(T.est)}</span>` : `<span class="badge ok">${L(T.real)}</span>`}</article>`).join('');
}

// ---------- обслуживание ----------
function renderService() {
  $('#maintTbl').innerHTML = `<thead><tr><th>${L(T.item)}</th><th>${L(T.when)}</th></tr></thead><tbody>` + SPECS.maintenance.map(m => `<tr><td>${esc(L(m))}</td><td>${esc(L(m.interval))}</td></tr>`).join('') + '</tbody>';
  $('#fluidTbl').innerHTML = '<tbody>' + SPECS.fluids.map(f => `<tr><td>${esc(L(f))}${f.verified === false ? ' <span class="q">?</span>' : ''}</td></tr>`).join('') + '</tbody>';
  $('#laborTbl').innerHTML = `<thead><tr><th>${L(T.work)}</th><th>${L(T.price)}</th></tr></thead><tbody>` + PRICES.labor.map(l => `<tr><td>${esc(L(l))}</td><td><b>${fmt(l.byn)}</b></td></tr>`).join('') + '</tbody>';
  renderPartsTbl();
  const r = PRICES.rates; $('#rateNote').textContent = `${L(T.rate)}${r.date}: 1 USD = ${r.USD} BYN, 1 EUR = ${r.EUR} BYN.`;
}
function renderPartsTbl() {
  const q = $('#partSearch').value.trim().toLowerCase();
  const rows = PRICES.parts.filter(p => !q || (p.ru + ' ' + p.en + ' ' + (p.oem || '')).toLowerCase().includes(q));
  const onCar = Object.fromEntries(Object.values(P).flatMap(p => p.prices.map(x => [x.id, p.id])));
  $('#partsTbl').innerHTML = `<thead><tr><th>${L(T.part)}</th><th>${L(T.newp)}</th><th>${L(T.used)}</th><th></th></tr></thead><tbody>` + rows.map(p => `<tr><td>${esc(L(p))}${p.estimate ? '' : ' <span class="badge ok sm">' + L(T.real) + '</span>'}<small class="oem">${esc(p.oem || '')}</small></td><td>${fmt(p.new_byn) || '-'}</td><td>${fmt(p.used_byn) || '-'}</td><td>${onCar[p.id] ? `<button class="pill sm" data-show="${onCar[p.id]}">${L(T.show)}</button>` : ''}</td></tr>`).join('') + '</tbody>';
}
$('#partSearch').oninput = renderPartsTbl;
$('#partsTbl').onclick = e => { const b = e.target.closest('[data-show]'); if (b) { location.hash = '#/car'; setTimeout(() => focusPart(b.dataset.show), 120) } };

// ---------- сборка ----------
const RENDER = { ref: () => window.renderRef(), drive: renderDrive, engine: renderEngine, mmt: renderMMT, salon: renderSalon, size: renderSize, mods: renderMods, service: renderService };
const rendered = new Set();
function onPage(p) { if (!rendered.has(p) && RENDER[p]) { RENDER[p](); rendered.add(p) } if (p !== 'drive') clearInterval(flowTimer) }
function renderAll() {
  rendered.clear(); renderLegend(); renderPaints(); onPage(page);
  if (drawer.classList.contains('open')) openDrawer(drawer.dataset.id);
  if (sheet.classList.contains('open')) openSheet();
  moveBlob();
}
setLang(lang);
go(location.hash.slice(2) || 'car');
requestAnimationFrame(() => document.body.classList.add('ready'));
