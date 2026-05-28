// ===== localStorageのキー名 =====
// データを保存・読み込みするときに使う名前
const STORAGE_KEY = 'cleaning-app-data';


// ===== データの読み書き =====

// localStorageからデータを読み込む
// データがなければ空の配列を返す
function loadData() {
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

// localStorageにデータを保存する
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// ===== 日付の計算 =====

// 今日の日付を「YYYY-MM-DD」の文字列で返す
function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

// 最後に掃除した日から今日まで何日経ったか計算する
function calcElapsedDays(lastCleaned) {
  const lastDate = new Date(lastCleaned);
  const today = new Date(getTodayString());
  const diffMilliseconds = today - lastDate;
  return Math.floor(diffMilliseconds / (1000 * 60 * 60 * 24));
}


// ===== 状態の判定 =====

// 経過日数と掃除頻度を比べて、状態を返す
// 戻り値: { cssClass: CSSのクラス名, text: 表示するテキスト }
function getStatus(elapsedDays, frequency) {
  if (elapsedDays < frequency) {
    return { cssClass: 'status-ok', text: 'まだ大丈夫' };
  }
  if (elapsedDays === frequency) {
    return { cssClass: 'status-soon', text: 'そろそろ掃除' };
  }
  // elapsedDays > frequency
  return { cssClass: 'status-overdue', text: '掃除した方がいい' };
}


// ===== カードのHTML生成 =====

// 1件分のカードHTMLを組み立てて文字列で返す
function createCardHTML(item) {
  const elapsedDays = calcElapsedDays(item.lastCleaned);
  const status = getStatus(elapsedDays, item.frequency);

  // 経過日数の表示テキスト
  const elapsedText = elapsedDays === 0 ? '今日掃除した' : `${elapsedDays}日前に掃除`;

  return `
    <div class="card ${status.cssClass}" data-id="${item.id}">
      <div class="card-body">
        <div class="card-place">${escapeHTML(item.place)}</div>
        <div class="card-info">${elapsedText}（頻度：${item.frequency}日ごと）</div>
        <span class="card-status-label">${status.text}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-done" onclick="handleDone('${item.id}')">掃除完了</button>
        <button class="btn btn-delete" onclick="handleDelete('${item.id}')" title="削除">×</button>
      </div>
    </div>
  `;
}

// XSS対策：入力した文字列をHTML上で安全に表示するためにエスケープする
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ===== 画面の更新 =====

// 全カードを再描画する
function renderCards() {
  const data = loadData();
  const cardList = document.getElementById('card-list');
  const emptyMessage = document.getElementById('empty-message');

  if (data.length === 0) {
    cardList.innerHTML = '';
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';
  cardList.innerHTML = data.map(createCardHTML).join('');
}


// ===== ボタンの処理 =====

// 「追加する」ボタンを押したときの処理
function handleAdd() {
  const placeInput = document.getElementById('input-place');
  const frequencyInput = document.getElementById('input-frequency');
  const lastCleanedInput = document.getElementById('input-last-cleaned');

  const place = placeInput.value.trim();
  const frequency = parseInt(frequencyInput.value, 10);
  const lastCleaned = lastCleanedInput.value;

  // 入力チェック：場所名が空なら登録しない
  if (!place) {
    alert('掃除する場所を入力してください。');
    placeInput.focus();
    return;
  }

  // 入力チェック：頻度が空または1未満なら登録しない
  if (!frequencyInput.value || frequency < 1) {
    alert('掃除の頻度を1以上の数字で入力してください。');
    frequencyInput.focus();
    return;
  }

  // 入力チェック：最後に掃除した日が空なら登録しない
  if (!lastCleaned) {
    alert('最後に掃除した日を入力してください。');
    lastCleanedInput.focus();
    return;
  }

  // 新しい掃除項目をデータに追加して保存する
  const data = loadData();
  data.push({
    id: String(Date.now()), // 重複しないIDとして現在時刻を使う
    place: place,
    frequency: frequency,
    lastCleaned: lastCleaned
  });
  saveData(data);

  // フォームを空にして再描画する
  placeInput.value = '';
  frequencyInput.value = '';
  lastCleanedInput.value = '';
  renderCards();
}

// 「掃除完了」ボタンを押したときの処理
// 最後に掃除した日を今日の日付に更新する
function handleDone(id) {
  const data = loadData();
  const item = data.find(function(d) { return d.id === id; });
  if (item) {
    item.lastCleaned = getTodayString();
    saveData(data);
    renderCards();
  }
}

// 削除ボタンを押したときの処理
function handleDelete(id) {
  const data = loadData();
  const item = data.find(function(d) { return d.id === id; });
  if (!item) return;

  if (!confirm(`「${item.place}」を削除しますか？`)) return;

  // 選んだ項目だけ除いた新しい配列を作って保存する
  const newData = data.filter(function(d) { return d.id !== id; });
  saveData(newData);
  renderCards();
}


// ===== デモデータ =====

// 今日からn日前の日付を「YYYY-MM-DD」形式で返す
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// localStorageが空のときだけサンプルデータを入れる
function loadDemoDataIfEmpty() {
  if (loadData().length > 0) return;

  const demoData = [
    { id: 'demo-1', place: 'トイレ',           frequency: 7,  lastCleaned: daysAgo(3)  }, // まだ大丈夫
    { id: 'demo-2', place: 'キッチン',          frequency: 7,  lastCleaned: daysAgo(7)  }, // そろそろ掃除
    { id: 'demo-3', place: 'お風呂',            frequency: 14, lastCleaned: daysAgo(20) }, // 掃除した方がいい
    { id: 'demo-4', place: '洗面台',            frequency: 7,  lastCleaned: daysAgo(4)  }, // まだ大丈夫
    { id: 'demo-5', place: 'エアコンフィルター', frequency: 30, lastCleaned: daysAgo(38) }, // 掃除した方がいい
  ];
  saveData(demoData);
}


// ===== 初期化 =====

// ページが読み込まれたときに実行される
document.addEventListener('DOMContentLoaded', function() {
  // データがなければデモデータを入れる
  loadDemoDataIfEmpty();

  // 「追加する」ボタンにクリックイベントを設定する
  document.getElementById('btn-add').addEventListener('click', handleAdd);

  // 「最後に掃除した日」の入力欄でEnterを押しても追加できるようにする
  document.getElementById('input-last-cleaned').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleAdd();
  });

  // カード一覧を画面に表示する
  renderCards();
});
