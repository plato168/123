'use strict';
const { mc } = require('./util');

// 國小常用英文單字（依主題）。中文意思在整份表中不重複，避免中翻英出現兩個正解。
const WORDS = {
  動物: 'dog 狗,cat 貓,bird 鳥,fish 魚,pig 豬,cow 母牛,horse 馬,sheep 綿羊,duck 鴨子,chicken 雞,rabbit 兔子,mouse 老鼠,tiger 老虎,lion 獅子,monkey 猴子,elephant 大象,bear 熊,snake 蛇,frog 青蛙,panda 貓熊,zebra 斑馬,giraffe 長頸鹿,kangaroo 袋鼠,whale 鯨魚,dolphin 海豚,turtle 烏龜,bee 蜜蜂,ant 螞蟻,butterfly 蝴蝶,owl 貓頭鷹',
  食物: 'apple 蘋果,banana 香蕉,orange 柳橙,grape 葡萄,lemon 檸檬,watermelon 西瓜,strawberry 草莓,bread 麵包,rice 米飯,noodles 麵條,egg 蛋,milk 牛奶,water 水,juice 果汁,tea 茶,cake 蛋糕,candy 糖果,cookie 餅乾,sandwich 三明治,hamburger 漢堡,pizza 披薩,soup 湯,salad 沙拉,chocolate 巧克力,ice cream 冰淇淋',
  顏色: 'red 紅色,blue 藍色,yellow 黃色,green 綠色,black 黑色,white 白色,pink 粉紅色,purple 紫色,brown 咖啡色,gray 灰色',
  身體: 'head 頭,face 臉,eye 眼睛,ear 耳朵,nose 鼻子,mouth 嘴巴,hair 頭髮,hand 手,arm 手臂,leg 腿,foot 腳,finger 手指,tooth 牙齒,neck 脖子,shoulder 肩膀,knee 膝蓋',
  家人: 'father 父親,mother 母親,brother 兄弟,sister 姊妹,grandfather 祖父,grandmother 祖母,uncle 叔叔,aunt 阿姨,cousin 堂表兄弟姊妹,baby 嬰兒,family 家庭,friend 朋友',
  學校: 'book 書,pen 原子筆,pencil 鉛筆,eraser 橡皮擦,ruler 尺,bag 書包,chair 椅子,teacher 老師,student 學生,classroom 教室,school 學校,library 圖書館,notebook 筆記本,crayon 蠟筆,glue 膠水,scissors 剪刀,marker 麥克筆,playground 操場,homework 功課',
  自然與天氣: 'sun 太陽,moon 月亮,star 星星,sky 天空,cloud 雲,rain 雨,snow 雪,wind 風,tree 樹,flower 花,grass 草,river 河流,mountain 山,sea 海,sunny 晴朗的,rainy 下雨的,cloudy 多雲的,windy 颳風的,hot 熱的,cold 冷的',
  衣物: 'shirt 襯衫,T-shirt T恤,pants 長褲,shorts 短褲,skirt 裙子,dress 洋裝,coat 外套,hat 帽子,shoes 鞋子,socks 襪子,gloves 手套,scarf 圍巾,sweater 毛衣',
  地點: 'home 家,park 公園,zoo 動物園,hospital 醫院,bank 銀行,store 商店,supermarket 超級市場,restaurant 餐廳,post office 郵局,police station 警察局,museum 博物館,beach 海灘,bakery 麵包店,bookstore 書店,market 市場',
  交通: 'bus 公車,car 汽車,bike 腳踏車,train 火車,taxi 計程車,airplane 飛機,boat 小船,ship 輪船,MRT 捷運,scooter 機車',
  動作: 'run 跑,walk 走路,jump 跳,swim 游泳,sing 唱歌,dance 跳舞,read 閱讀,write 寫,draw 畫畫,eat 吃,drink 喝,sleep 睡覺,play 玩,cook 煮飯,fly 飛,sit 坐,stand 站,open 打開,close 關上,listen 聽,speak 說,look 看,cry 哭,laugh 大笑,wash 洗,buy 買,go 去,come 來,help 幫忙',
  形容詞: 'big 大的,small 小的,tall 高的,short 矮的,long 長的,fat 胖的,thin 瘦的,happy 快樂的,sad 難過的,angry 生氣的,tired 累的,hungry 餓的,thirsty 渴的,new 新的,old 舊的,young 年輕的,fast 快的,slow 慢的,beautiful 美麗的,cute 可愛的,clean 乾淨的,dirty 髒的,good 好的,bad 壞的',
  職業: 'doctor 醫生,nurse 護理師,farmer 農夫,police officer 警察,firefighter 消防員,driver 司機,singer 歌手,dancer 舞者,writer 作家,pilot 飛行員,mail carrier 郵差',
  運動與休閒: 'basketball 籃球,baseball 棒球,soccer 足球,tennis 網球,badminton 羽毛球,volleyball 排球,jogging 慢跑,hiking 健行,fishing 釣魚,camping 露營',
  居家: 'house 房子,kitchen 廚房,bedroom 臥室,bathroom 浴室,living room 客廳,door 門,window 窗戶,bed 床,table 桌子,sofa 沙發,lamp 檯燈,TV 電視,clock 時鐘,cup 杯子,bowl 碗',
};

const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function numberWord(n) {
  if (n < 20) return NUMBERS[n];
  if (n === 100) return 'one hundred';
  return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + NUMBERS[n % 10] : '');
}

const WEEKDAYS = [['Monday', '星期一'], ['Tuesday', '星期二'], ['Wednesday', '星期三'], ['Thursday', '星期四'],
  ['Friday', '星期五'], ['Saturday', '星期六'], ['Sunday', '星期日']];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

const PLURALS = [['box', 'boxes'], ['bus', 'buses'], ['watch', 'watches'], ['dish', 'dishes'], ['baby', 'babies'],
  ['city', 'cities'], ['story', 'stories'], ['leaf', 'leaves'], ['knife', 'knives'], ['wolf', 'wolves'],
  ['child', 'children'], ['man', 'men'], ['woman', 'women'], ['foot', 'feet'], ['tooth', 'teeth'], ['mouse', 'mice'],
  ['sheep', 'sheep'], ['tomato', 'tomatoes'], ['potato', 'potatoes'], ['toy', 'toys'],
  ['boy', 'boys'], ['key', 'keys'], ['day', 'days'], ['book', 'books'], ['cat', 'cats'], ['pen', 'pens'],
  ['class', 'classes'], ['glass', 'glasses'], ['brush', 'brushes'], ['bench', 'benches'], ['family', 'families'],
  ['country', 'countries'], ['party', 'parties'], ['lady', 'ladies'], ['peach', 'peaches'], ['fox', 'foxes'],
  ['goose', 'geese'], ['wife', 'wives']];

function wrongPlurals(w, right) {
  return [w + 's', w + 'es', w.replace(/y$/, 'ies'), w.replace(/f$|fe$/, 'ves'), w + 'ies', w + 'en']
    .filter((x) => x !== right && x !== w);
}

// 主詞 → 正確 be 動詞
const SUBJECTS = [['I', 'am'], ['You', 'are'], ['He', 'is'], ['She', 'is'], ['It', 'is'], ['We', 'are'], ['They', 'are'],
  ['My mother', 'is'], ['Tom', 'is'], ['Amy and I', 'are'], ['The dogs', 'are'], ['My brother', 'is'],
  ['Mr. Lin', 'is'], ['The students', 'are'], ['Ben and Sue', 'are']];
const COMPLEMENTS = ['happy', 'tired', 'hungry', 'at school', 'in the park', 'tall', 'busy', 'at home', 'ten years old',
  'in the classroom', 'sad', 'from Taiwan', 'in the kitchen', 'thirsty', 'ready'];

module.exports = function english(r) {
  const entries = [];
  for (const [cat, list] of Object.entries(WORDS)) {
    for (const pair of list.split(',')) {
      const i = pair.lastIndexOf(' ');
      entries.push({ cat, en: pair.slice(0, i), zh: pair.slice(i + 1) });
    }
  }
  const zhSeen = new Set();
  for (const e of entries) {
    if (zhSeen.has(e.zh)) throw new Error(`英語單字中文意思重複：${e.zh}`);
    zhSeen.add(e.zh);
  }
  const grade = (e) => (['動物', '食物', '顏色', '身體', '家人', '學校', '交通'].includes(e.cat) ? 3 : 4);
  const sameCat = (e, key) => r.shuffle(entries.filter((x) => x.cat === e.cat && x.en !== e.en).map((x) => x[key]))
    .concat(r.shuffle(entries.filter((x) => x.cat !== e.cat).map((x) => x[key])));

  const pools = [];
  pools.push({ topic: '單字：英翻中', items: entries.map((e) => mc(r, { grade: grade(e), topic: '單字：英翻中',
    stem: `「${e.en}」的中文意思是？`, answer: e.zh, distractors: sameCat(e, 'zh'), explanation: `${e.en} = ${e.zh}` })) });
  pools.push({ topic: '單字：中翻英', items: entries.map((e) => mc(r, { grade: grade(e), topic: '單字：中翻英',
    stem: `「${e.zh}」的英文是？`, answer: e.en, distractors: sameCat(e, 'en'), explanation: `${e.zh} = ${e.en}` })) });

  // 拼字：挖掉一個字母（附中文提示，只有一個正解）
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const spell = [];
  for (const e of entries) {
    if (!/^[a-z]{3,}$/.test(e.en)) continue;
    const pos = r.int(1, e.en.length - 1);
    const ch = e.en[pos];
    const masked = e.en.slice(0, pos) + '_' + e.en.slice(pos + 1);
    spell.push(mc(r, { grade: grade(e), topic: '拼字', stem: `${e.zh}：${masked}，底線應填哪個字母？`, answer: ch,
      distractors: r.shuffle(letters.filter((l) => l !== ch)), explanation: `${e.zh} 的拼法是 ${e.en}` }));
  }
  pools.push({ topic: '拼字', items: spell });

  // 數字 0～100
  const nums = [];
  for (let n = 0; n <= 100; n++) {
    const w = numberWord(n);
    const near = [n + 1, n - 1, n + 10, n - 10, n + 2, n - 2].filter((x) => x >= 0 && x <= 100 && x !== n);
    nums.push(mc(r, { grade: 3, topic: '數字', stem: `數字 ${n} 的英文是？`, answer: w,
      distractors: near.map(numberWord), explanation: `${n} = ${w}` }));
  }
  for (let n = 11; n <= 99; n += 2) {
    const w = numberWord(n);
    nums.push(mc(r, { grade: 3, topic: '數字', stem: `「${w}」是數字幾？`, answer: n,
      distractors: [n + 1, n - 1, n + 10, n - 10, n + 20].filter((x) => x >= 0 && x <= 100), explanation: `${w} = ${n}` }));
  }
  pools.push({ topic: '數字', items: nums });

  // 星期與月份
  const cal = [];
  WEEKDAYS.forEach(([en, zh], i) => {
    cal.push(mc(r, { grade: 3, topic: '星期與月份', stem: `「${zh}」的英文是？`, answer: en,
      distractors: r.shuffle(WEEKDAYS.filter((_, j) => j !== i).map((x) => x[0])), explanation: `${zh} = ${en}` }));
    cal.push(mc(r, { grade: 3, topic: '星期與月份', stem: `「${en}」是星期幾？`, answer: zh,
      distractors: r.shuffle(WEEKDAYS.filter((_, j) => j !== i).map((x) => x[1])), explanation: `${en} = ${zh}` }));
    const next = WEEKDAYS[(i + 1) % 7][0];
    cal.push(mc(r, { grade: 4, topic: '星期與月份', stem: `${en} 的下一天是？`, answer: next,
      distractors: r.shuffle(WEEKDAYS.map((x) => x[0]).filter((x) => x !== next && x !== en)), explanation: `${en} 之後是 ${next}` }));
  });
  MONTHS.forEach((m, i) => {
    cal.push(mc(r, { grade: 4, topic: '星期與月份', stem: `「${i + 1} 月」的英文是？`, answer: m,
      distractors: r.shuffle(MONTHS.filter((x) => x !== m)), explanation: `${i + 1} 月 = ${m}` }));
    cal.push(mc(r, { grade: 4, topic: '星期與月份', stem: `「${m}」是幾月？`, answer: `${i + 1} 月`,
      distractors: r.shuffle(MONTHS.map((_, j) => `${j + 1} 月`).filter((x) => x !== `${i + 1} 月`)), explanation: `${m} = ${i + 1} 月` }));
  });
  pools.push({ topic: '星期與月份', items: cal });

  // 複數
  pools.push({ topic: '名詞複數', items: PLURALS.map(([w, p]) => mc(r, { grade: 5, topic: '名詞複數',
    stem: `「${w}」的複數形是？`, answer: p, distractors: r.shuffle(wrongPlurals(w, p)).concat([w + 'ss', w + 'x', w + 'ves']),
    explanation: `${w} → ${p}` })) });

  // be 動詞
  const be = [];
  for (const [s, v] of SUBJECTS) {
    for (const c of COMPLEMENTS) {
      be.push(mc(r, { grade: 4, topic: 'be 動詞', stem: `${s} ___ ${c}.`, answer: v,
        distractors: ['am', 'is', 'are', 'be'].filter((x) => x !== v), explanation: `主詞 ${s} 搭配 ${v}` }));
    }
  }
  pools.push({ topic: 'be 動詞', items: r.shuffle(be) });

  return pools;
};
