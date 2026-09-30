'use strict';
const { mc, nearNumbers, classificationPools } = require('./util');

const HW_SW = {
  硬體: ['滑鼠', '鍵盤', '螢幕', '主機', '印表機', '喇叭', '隨身碟', '麥克風', '耳機', '掃描器', '網路攝影機', '觸控板'],
  軟體: ['網頁瀏覽器', '作業系統', '文書處理軟體', '小算盤程式', 'Scratch', '防毒軟體', '簡報軟體', '小畫家', '電子試算表'],
};
const IO = {
  輸入裝置: ['鍵盤', '滑鼠', '麥克風', '掃描器', '觸控板', '網路攝影機', '條碼掃描器'],
  輸出裝置: ['螢幕', '印表機', '喇叭', '耳機', '投影機'],
};

const FACTS = [
  [3, '設定密碼時，下列哪一個最安全？', '由大小寫字母、數字和符號混合組成', ['自己的生日', '123456', '自己的名字']],
  [3, '在網路上遇到陌生人要你的住址和電話，應該？', '不告訴對方，並告訴師長', ['立刻告訴對方', '只告訴電話', '約對方見面']],
  [3, '收到來路不明、要你點連結領獎品的訊息，應該？', '不點連結並告訴大人', ['馬上點開', '轉傳給同學', '輸入帳號密碼']],
  [4, '使用別人的圖片或文章時，應該？', '注意著作權並註明出處', ['直接說是自己做的', '隨便修改使用', '不用在意']],
  [4, '在網路上發言時，應該？', '尊重他人，不說傷人的話', ['可以隨便罵人', '匿名就不用負責', '散播未經證實的消息']],
  [3, '使用電腦一段時間後，應該？', '起來休息、讓眼睛放鬆', ['越久越好', '把螢幕調到最亮', '臉靠近螢幕']],
  [4, '電腦病毒可能會？', '破壞檔案或竊取資料', ['讓電腦變快', '讓人生病', '自動幫你寫功課']],
  [4, '1 個位元組（Byte）等於幾個位元（bit）？', '8', ['2', '10', '16']],
  [4, '二進位只使用哪兩個數字？', '0 和 1', ['1 和 2', '0 和 9', '1 和 10']],
  [4, '程式中「重複執行」同一段指令的結構稱為？', '迴圈', ['條件判斷', '變數', '註解']],
  [4, '程式中依照情況決定做不同事情的結構稱為？', '條件判斷（如果…否則…）', ['迴圈', '變數', '函式庫']],
  [4, '程式中用來「存放資料、之後可以改變」的叫做？', '變數', ['迴圈', '事件', '角色']],
  [4, '把一個大問題拆成幾個小問題來解決，稱為？', '問題拆解', ['複製貼上', '隨機猜測', '重新開機']],
  [4, '一步一步、有順序解決問題的方法稱為？', '演算法', ['硬體', '病毒', '網址']],
  [4, '在 Scratch 中，角色執行的指令積木要？', '依照順序由上往下接在一起', ['隨便放在畫面上', '只能放一個', '倒過來接']],
  [4, '在 Scratch 中，「當綠旗被點擊」屬於哪一類積木？', '事件', ['外觀', '音效', '運算']],
  [4, '程式執行結果不如預期時，找出並修正錯誤的過程叫做？', '除錯（Debug）', ['下載', '格式化', '備份']],
  [3, '檔案不小心刪除後，最常可以先去哪裡找回？', '資源回收筒', ['桌布', '工作列', '開始功能表']],
  [3, '想要複製選取的文字，常用的鍵盤快速鍵是？', 'Ctrl + C', ['Ctrl + V', 'Ctrl + Z', 'Ctrl + P']],
  [3, '想要貼上複製的文字，常用的鍵盤快速鍵是？', 'Ctrl + V', ['Ctrl + C', 'Ctrl + S', 'Ctrl + A']],
  [3, '想要復原上一個動作，常用的鍵盤快速鍵是？', 'Ctrl + Z', ['Ctrl + X', 'Ctrl + C', 'Ctrl + N']],
  [3, '想要儲存檔案，常用的鍵盤快速鍵是？', 'Ctrl + S', ['Ctrl + P', 'Ctrl + O', 'Ctrl + W']],
  [3, '想要全選，常用的鍵盤快速鍵是？', 'Ctrl + A', ['Ctrl + S', 'Ctrl + E', 'Ctrl + Q']],
  [4, '網址開頭是 https，代表？', '連線有加密，比較安全', ['網站一定是政府的', '網站一定沒有廣告', '網站速度比較快']],
  [4, '重要的作業檔案，最好的保存方式是？', '定期備份到不同的地方', ['只存在一台電腦', '從不存檔', '存在公用電腦桌面']],
  [5, '用搜尋引擎找資料時，要判斷資料可不可信，應該？', '比對多個可靠來源', ['相信第一個搜尋結果', '只看標題', '看按讚數最多的']],
  [5, '副檔名 .jpg 通常代表哪一種檔案？', '圖片', ['文字文件', '音樂', '程式']],
  [5, '副檔名 .mp3 通常代表哪一種檔案？', '音訊', ['圖片', '簡報', '試算表']],
  [5, '副檔名 .mp4 通常代表哪一種檔案？', '影片', ['圖片', '文字文件', '壓縮檔']],
  [5, '副檔名 .pdf 通常代表哪一種檔案？', '可攜式文件', ['音樂', '影片', '程式碼']],
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

module.exports = function computing(r) {
  const pools = [];

  const bin = [];
  for (let n = 1; n <= 63; n++) {
    const b = n.toString(2);
    bin.push(mc(r, { grade: 5, topic: '二進位', stem: `二進位的 ${b} 等於十進位的多少？`, answer: n,
      distractors: nearNumbers(r, n, 4), explanation: `${b}（二進位）= ${n}` }));
    bin.push(mc(r, { grade: 5, topic: '二進位', stem: `十進位的 ${n} 寫成二進位是？`, answer: b,
      distractors: [n + 1, n - 1, n + 2, n ^ 1, n ^ 2, n + 3, n * 2].filter((x) => x > 0 && x !== n).map((x) => x.toString(2)),
      explanation: `${n} = ${b}（二進位）` }));
  }
  pools.push({ topic: '二進位', items: bin });

  pools.push({ topic: '迴圈', items: collect(220, () => {
    const times = r.int(2, 12);
    const step = r.pick([5, 10, 15, 20, 25, 30, 50]);
    if (r.next() < 0.6) {
      const ans = times * step;
      return mc(r, { grade: 4, topic: '迴圈', stem: `角色「重複執行 ${times} 次：移動 ${step} 點」，總共移動多少點？`, answer: ans,
        distractors: [ans + step, ans - step, times + step, step, ans * 2].filter((x) => x > 0 && x !== ans),
        explanation: `${times} × ${step} = ${ans}` });
    }
    const inner = r.int(2, 5);
    const ans = times * inner;
    return mc(r, { grade: 5, topic: '迴圈', stem: `「重複 ${times} 次：（重複 ${inner} 次：拍一下手）」，總共拍幾下手？`, answer: ans,
      distractors: [times + inner, ans + inner, ans - inner, ans + times].filter((x) => x > 0 && x !== ans),
      explanation: `外層 ${times} 次 × 內層 ${inner} 次 = ${ans}` });
  }) });

  pools.push({ topic: '變數', items: collect(240, () => {
    const start = r.int(0, 20);
    const times = r.int(2, 8);
    const add = r.int(1, 9);
    const minus = r.next() < 0.3 && start > times * add;
    const ans = minus ? start - times * add : start + times * add;
    const op = minus ? `分數 = 分數 − ${add}` : `分數 = 分數 + ${add}`;
    return mc(r, { grade: 5, topic: '變數', stem: `分數一開始是 ${start}，重複 ${times} 次「${op}」，最後分數是多少？`, answer: ans,
      distractors: [ans + add, ans - add, start + add, times * add, ans + 1].filter((x) => x >= 0 && x !== ans),
      explanation: `${start} ${minus ? '−' : '+'} ${times} × ${add} = ${ans}` });
  }) });

  pools.push({ topic: '條件判斷', items: collect(220, () => {
    const limit = r.int(5, 90);
    const x = r.int(0, 100);
    if (x === limit) return null;
    const op = r.pick(['>', '<']);
    const cond = op === '>' ? x > limit : x < limit;
    const [yes, no] = r.pick([['說「過關」', '說「再試一次」'], ['亮綠燈', '亮紅燈'], ['加 1 分', '扣 1 分'], ['向右走', '向左走']]);
    const ans = cond ? yes : no;
    return mc(r, { grade: 5, topic: '條件判斷', stem: `程式：「如果 x ${op} ${limit}，就${yes}；否則${no}」。當 x = ${x} 時會？`,
      answer: ans, distractors: [cond ? no : yes, '兩個都做', '什麼都不做'],
      explanation: `${x} ${op} ${limit} 是${cond ? '成立' : '不成立'}的，所以${ans}` });
  }) });

  pools.push(...classificationPools(r, { grade: 3, topic: '硬體與軟體', table: HW_SW,
    directStem: (x) => `「${x}」屬於硬體還是軟體？`, pickStem: (c) => `下列哪一個屬於「${c}」？`, pickCount: 120,
    explain: (x, c) => `${x}是${c}${c === '硬體' ? '（摸得到的實體設備）' : '（在電腦上執行的程式）'}` }));
  pools.push(...classificationPools(r, { grade: 3, topic: '輸入與輸出', table: IO,
    directStem: (x) => `「${x}」是輸入裝置還是輸出裝置？`, pickStem: (c) => `下列哪一個是「${c}」？`, pickCount: 120,
    explain: (x, c) => `${x}是${c}` }));

  pools.push({ topic: '資訊素養', items: FACTS.map(([grade, stem, ans, wrong]) =>
    mc(r, { grade, topic: '資訊素養', stem, answer: ans, distractors: wrong, explanation: `答案：${ans}` })) });

  return pools;
};
