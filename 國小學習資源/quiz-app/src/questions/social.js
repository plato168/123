'use strict';
const { mc, classificationPools } = require('./util');

const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
const opposite = (d) => DIRS[(DIRS.indexOf(d) + 4) % 8];
const PLACES = ['學校', '公園', '圖書館', '車站', '醫院', '郵局', '市場', '廟宇', '警察局', '超商', '體育館', '博物館'];

const FESTIVALS = [
  ['春節', '農曆正月初一', '貼春聯、發紅包'], ['元宵節', '農曆正月十五', '提燈籠、猜燈謎'],
  ['端午節', '農曆五月初五', '划龍舟、吃粽子'], ['七夕', '農曆七月初七', '牛郎織女相會的傳說'],
  ['中秋節', '農曆八月十五', '賞月、吃月餅'], ['重陽節', '農曆九月初九', '登高、敬老'],
  ['清明節', '國曆四月四日或五日前後', '掃墓、祭祖'],
];

const GOV = [
  ['行政院', '執行國家政策、管理各部會'], ['立法院', '制定法律、審查預算'], ['司法院', '掌理審判，解釋憲法'],
  ['考試院', '辦理公務人員考試與任用制度'], ['監察院', '糾正、彈劾違法失職的公務人員'],
];

const CITY_TYPE = {
  直轄市: ['臺北市', '新北市', '桃園市', '臺中市', '臺南市', '高雄市'],
  縣: ['宜蘭縣', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣', '屏東縣', '臺東縣', '花蓮縣', '澎湖縣',
    '金門縣', '連江縣'],
  市: ['基隆市', '新竹市', '嘉義市'],
};

const GEO = [
  [4, '臺灣最高的山是？', '玉山', ['雪山', '阿里山', '合歡山']],
  [4, '臺灣最長的河川是？', '濁水溪', ['淡水河', '高屏溪', '大甲溪']],
  [4, '臺灣流域面積最大的河川是？', '高屏溪', ['濁水溪', '淡水河', '曾文溪']],
  [4, '日月潭位於哪一個縣市？', '南投縣', ['臺中市', '嘉義縣', '花蓮縣']],
  [4, '臺灣本島四周環繞的是？', '海洋', ['沙漠', '高原', '冰川']],
  [4, '臺灣本島面積最大的地形是？', '山地', ['平原', '盆地', '臺地']],
  [4, '臺灣本島面積最大的平原是？', '嘉南平原', ['蘭陽平原', '屏東平原', '臺北盆地']],
  [4, '位於臺灣西邊、隔開臺灣與中國大陸的海峽是？', '臺灣海峽', ['巴士海峽', '麻六甲海峽', '白令海峽']],
  [4, '在地圖上，如果沒有特別標示，通常上方代表哪個方位？', '北方', ['南方', '東方', '西方']],
  [4, '地圖上用來說明各種符號代表什麼的是？', '圖例', ['比例尺', '指北針', '標題']],
  [4, '地圖上表示實際距離縮小多少倍的是？', '比例尺', ['圖例', '指北針', '經緯線']],
  [5, '通過英國格林威治天文臺的經線是幾度經線？', '0 度', ['90 度', '180 度', '23.5 度']],
  [5, '將地球分為南、北半球的緯線是？', '赤道', ['本初子午線', '北回歸線', '國際換日線']],
  [5, '通過臺灣嘉義、花蓮一帶的重要緯線是？', '北回歸線', ['赤道', '南回歸線', '本初子午線']],
  [5, '臺灣的離島中，由許多島嶼組成、位於臺灣海峽的縣是？', '澎湖縣', ['臺東縣', '屏東縣', '宜蘭縣']],
  [5, '蘭嶼上主要居住的原住民族是？', '達悟族（雅美族）', ['阿美族', '泰雅族', '排灣族']],
  [5, '臺灣原住民族中人口最多的是？', '阿美族', ['泰雅族', '布農族', '卑南族']],
  [3, '家庭中爸爸媽媽的父母親，是我們的？', '祖父母、外祖父母', ['叔叔、阿姨', '兄弟姊妹', '堂表兄弟']],
  [3, '過馬路時應該走在哪裡？', '斑馬線（行人穿越道）', ['車道中間', '分隔島上', '任何地方都可以']],
  [3, '看到紅燈亮起時，行人應該？', '停下來等待', ['快跑通過', '慢慢走過去', '看看有沒有車再走']],
  [4, '垃圾分類中，寶特瓶應該放在哪一類？', '資源回收', ['一般垃圾', '廚餘', '有害垃圾']],
  [4, '廢電池應該怎麼處理？', '交給回收點回收', ['丟進一般垃圾', '丟進廚餘桶', '埋在土裡']],
  [5, '人民享有權利，也必須盡義務；下列何者是國民的義務？', '依法納稅', ['言論自由', '集會結社', '宗教信仰自由']],
  [5, '臺灣的最高行政機關是？', '行政院', ['立法院', '總統府', '司法院']],
  [3, '班級中選出班長、幹部，是一種什麼精神的表現？', '民主', ['獨裁', '抽籤', '世襲']],
  [5, '收入減去支出後剩下的錢，可以拿來？', '儲蓄', ['浪費', '借給陌生人', '丟掉']],
  [5, '買東西前先想清楚「需要」還是「想要」，是屬於？', '理性消費', ['衝動購物', '浪費', '炫耀']],
  [6, '清朝在甲午戰爭後簽訂條約，將臺灣割讓給日本，這個條約是？', '馬關條約', ['南京條約', '北京條約', '天津條約']],
  [6, '鄭成功在 1662 年驅逐了哪一個國家在臺灣的勢力？', '荷蘭', ['西班牙', '日本', '英國']],
  [6, '十七世紀曾佔領臺灣北部（基隆、淡水一帶）的歐洲國家是？', '西班牙', ['荷蘭', '葡萄牙', '法國']],
  [6, '日治時期臺灣開始於哪一年？', '1895 年', ['1662 年', '1945 年', '1683 年']],
  [6, '第二次世界大戰結束、臺灣由中華民國政府接收是在哪一年？', '1945 年', ['1895 年', '1949 年', '1912 年']],
  [6, '中華民國成立於哪一年？', '1912 年', ['1911 年', '1945 年', '1949 年']],
];

function collect(n, make) {
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < n && guard++ < n * 50) {
    const q = make();
    if (!q || seen.has(q.stem)) continue;
    seen.add(q.stem);
    out.push(q);
  }
  return out;
}

function toCentury(y) {
  return Math.ceil(y / 100);
}

module.exports = function social(r) {
  const pools = [];

  pools.push({ topic: '方位', items: collect(300, () => {
    const [a, b] = r.sample(PLACES, 2);
    const d = r.pick(DIRS);
    const ans = opposite(d);
    return mc(r, { grade: 3, topic: '方位', stem: `${a}在${b}的${d}方，那麼${b}在${a}的哪一方？`, answer: `${ans}方`,
      distractors: r.shuffle(DIRS.filter((x) => x !== ans)).map((x) => `${x}方`),
      explanation: `方位相對：${d}的相反方向是${ans}` });
  }) });

  const turn = [];
  for (const face of ['北', '東', '南', '西']) {
    for (const [act, steps] of [['向右轉', 2], ['向左轉', -2], ['向後轉', 4], ['向右轉兩次', 4], ['向左轉三次', -6], ['向右轉三次', 6]]) {
      const ans = DIRS[(DIRS.indexOf(face) + steps + 16) % 8];
      turn.push(mc(r, { grade: 3, topic: '方位', stem: `面向${face}方，${act}（每次 90 度）之後面向哪一方？`, answer: `${ans}方`,
        distractors: r.shuffle(['北', '東', '南', '西'].filter((x) => x !== ans)).map((x) => `${x}方`),
        explanation: `從${face}方${act}後面向${ans}方` }));
    }
  }
  pools.push({ topic: '方位', items: turn });

  pools.push({ topic: '比例尺', items: collect(160, () => {
    const scale = r.pick([1000, 2000, 5000, 10000, 20000, 50000, 100000]);
    const cm = r.int(1, 12);
    const meters = (scale * cm) / 100;
    const fmt = (m) => (m >= 1000 && m % 1000 === 0 ? `${m / 1000} 公里` : `${m} 公尺`);
    const ans = fmt(meters);
    return mc(r, { grade: 5, topic: '比例尺', stem: `地圖比例尺為 1：${scale}，圖上 ${cm} 公分代表實際距離多少？`, answer: ans,
      distractors: [meters * 10, meters / 10, meters * 100, meters * 2, meters + scale / 100].filter((m) => m > 0).map(fmt),
      explanation: `${cm} × ${scale} = ${cm * scale} 公分 = ${meters} 公尺` });
  }) });

  pools.push({ topic: '年代與世紀', items: collect(250, () => {
    const y = r.int(1500, 2099);
    const c = toCentury(y);
    return mc(r, { grade: 5, topic: '年代與世紀', stem: `西元 ${y} 年屬於第幾世紀？`, answer: `${c} 世紀`,
      distractors: [c - 1, c + 1, c - 2, c + 2].map((x) => `${x} 世紀`),
      explanation: `西元 ${(c - 1) * 100 + 1}～${c * 100} 年是第 ${c} 世紀` });
  }) });

  pools.push({ topic: '民國與西元', items: collect(240, () => {
    const roc = r.int(1, 120);
    const ad = roc + 1911;
    if (r.next() < 0.5) {
      return mc(r, { grade: 5, topic: '民國與西元', stem: `民國 ${roc} 年是西元幾年？`, answer: `${ad} 年`,
        distractors: [ad - 1, ad + 1, roc + 1912, roc + 1900, ad + 10].map((x) => `${x} 年`),
        explanation: `民國年 + 1911 = 西元年，${roc} + 1911 = ${ad}` });
    }
    return mc(r, { grade: 5, topic: '民國與西元', stem: `西元 ${ad} 年是民國幾年？`, answer: `民國 ${roc} 年`,
      distractors: [roc - 1, roc + 1, roc + 10, roc + 11, roc - 10].filter((x) => x > 0).map((x) => `民國 ${x} 年`),
      explanation: `西元年 − 1911 = 民國年，${ad} − 1911 = ${roc}` });
  }) });

  const fest = [];
  FESTIVALS.forEach(([name, date, custom]) => {
    const others = FESTIVALS.filter((f) => f[0] !== name);
    fest.push(mc(r, { grade: 3, topic: '節日與習俗', stem: `「${name}」在什麼時候？`, answer: date,
      distractors: r.shuffle(others.map((f) => f[1])), explanation: `${name}：${date}，${custom}` }));
    fest.push(mc(r, { grade: 3, topic: '節日與習俗', stem: `「${custom}」是哪一個節日的習俗或故事？`, answer: name,
      distractors: r.shuffle(others.map((f) => f[0])), explanation: `${name}：${date}，${custom}` }));
    fest.push(mc(r, { grade: 3, topic: '節日與習俗', stem: `${date}是哪一個節日？`, answer: name,
      distractors: r.shuffle(others.map((f) => f[0])), explanation: `${name}：${date}` }));
    fest.push(mc(r, { grade: 3, topic: '節日與習俗', stem: `「${name}」常見的習俗是？`, answer: custom,
      distractors: r.shuffle(others.map((f) => f[2])), explanation: `${name}：${custom}` }));
  });
  pools.push({ topic: '節日與習俗', items: fest });

  pools.push({ topic: '政府組織', items: GOV.flatMap(([org, duty]) => [
    mc(r, { grade: 6, topic: '政府組織', stem: `「${org}」的主要職權是？`, answer: duty,
      distractors: r.shuffle(GOV.filter((g) => g[0] !== org).map((g) => g[1])), explanation: `${org}：${duty}` }),
    mc(r, { grade: 6, topic: '政府組織', stem: `負責「${duty}」的是五院中的哪一院？`, answer: org,
      distractors: r.shuffle(GOV.filter((g) => g[0] !== org).map((g) => g[0])), explanation: `${org}：${duty}` }),
  ]) });

  pools.push(...classificationPools(r, { grade: 4, topic: '臺灣行政區', table: CITY_TYPE,
    directStem: (x) => `「${x}」屬於哪一種地方行政區？`, pickStem: (c) => `下列哪一個屬於「${c === '市' ? '縣級的市（非直轄市）' : c}」？`,
    pickCount: 120, explain: (x, c) => `${x}是${c === '市' ? '與縣同級的市' : c}` }));

  pools.push({ topic: '社會常識', items: GEO.map(([grade, stem, ans, wrong]) =>
    mc(r, { grade, topic: '社會常識', stem, answer: ans, distractors: wrong, explanation: `答案：${ans}` })) });

  return pools;
};
