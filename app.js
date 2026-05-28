// ===== localStorageのキー名 =====
const STORAGE_KEY = 'cleaning-app-data';


// ===== データの読み書き =====

function loadData() {
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// ===== 日付の計算 =====

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function calcElapsedDays(lastCleaned) {
  const lastDate = new Date(lastCleaned);
  const today = new Date(getTodayString());
  const diffMilliseconds = today - lastDate;
  return Math.floor(diffMilliseconds / (1000 * 60 * 60 * 24));
}


// ===== 状態の判定 =====

function getStatus(elapsedDays, frequency) {
  if (elapsedDays >= frequency) {
    return { cssClass: 'status-overdue', text: '掃除した方がいい' };
  }
  if (elapsedDays >= frequency - 3) {
    return { cssClass: 'status-soon', text: 'そろそろ掃除' };
  }
  return { cssClass: 'status-ok', text: 'まだ大丈夫' };
}


// ===== 並び替え =====

let currentSort = 'added';

function getStatusPriority(item) {
  const elapsed = calcElapsedDays(item.lastCleaned);
  if (elapsed >= item.frequency)      return 2;
  if (elapsed >= item.frequency - 3)  return 1;
  return 0;
}

function getSortedData(data) {
  if (currentSort === 'added') return data;
  return [...data].sort(function(a, b) {
    const priorityDiff = getStatusPriority(b) - getStatusPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return calcElapsedDays(b.lastCleaned) - calcElapsedDays(a.lastCleaned);
  });
}

function handleSortToggle() {
  currentSort = currentSort === 'added' ? 'urgent' : 'added';
  renderCards();
}


// ===== ⑤ カテゴリフィルター =====

// 現在選択中のカテゴリ（'all'はすべて表示）
let currentCategory = 'all';

// データからカテゴリの一覧（重複なし）を取得する
function getCategories(data) {
  const categories = data
    .map(function(item) { return item.category; })
    .filter(function(c) { return c && c.trim() !== ''; });
  return [...new Set(categories)];
}

// 選択中のカテゴリでデータをフィルタリングする
function getFilteredData(data) {
  if (currentCategory === 'all') return data;
  return data.filter(function(item) { return item.category === currentCategory; });
}

// カテゴリタブをHTMLに描画する
function renderFilterTabs(data) {
  const tabsContainer = document.getElementById('filter-tabs');
  const categories = getCategories(data);

  // カテゴリが1つもなければタブ自体を非表示にする
  if (categories.length === 0) {
    tabsContainer.innerHTML = '';
    return;
  }

  // 「すべて」＋各カテゴリのタブボタンを生成する
  const allTabs = ['all', ...categories];
  tabsContainer.innerHTML = allTabs.map(function(cat) {
    const isActive = cat === currentCategory;
    const label = cat === 'all' ? 'すべて' : cat;
    return `<button class="tab ${isActive ? 'is-active' : ''}" onclick="handleCategoryFilter('${escapeHTML(cat)}')">${escapeHTML(label)}</button>`;
  }).join('');
}

// タブを押したときの処理
function handleCategoryFilter(category) {
  currentCategory = category;
  renderCards();
}


// ===== 編集 =====

let editingId = null;

function createEditFormHTML(item) {
  return `
    <div class="card card-editing" data-id="${item.id}">
      <div class="card-body">
        <div class="edit-field">
          <label class="form-label">掃除する場所</label>
          <input class="form-input" type="text" id="edit-place" value="${escapeHTML(item.place)}" maxlength="20">
        </div>
        <div class="edit-field">
          <label class="form-label">カテゴリ（任意）</label>
          <input class="form-input" type="text" id="edit-category" value="${escapeHTML(item.category || '')}" placeholder="例：キッチン、バス・トイレ" maxlength="20">
        </div>
        <div class="edit-field">
          <label class="form-label">掃除の頻度（日ごと）</label>
          <input class="form-input" type="number" id="edit-frequency" value="${item.frequency}" min="1">
        </div>
        <div class="edit-field">
          <label class="form-label">最後に掃除した日</label>
          <input class="form-input" type="date" id="edit-last-cleaned" value="${item.lastCleaned}">
        </div>
      </div>
      <div class="card-actions card-actions-edit">
        <button class="btn btn-save" onclick="handleSaveEdit('${item.id}')">保存</button>
        <button class="btn btn-cancel" onclick="handleCancelEdit()">キャンセル</button>
      </div>
    </div>
  `;
}

function handleEditStart(id) {
  editingId = id;
  renderCards();
}

function handleSaveEdit(id) {
  const placeInput       = document.getElementById('edit-place');
  const categoryInput    = document.getElementById('edit-category');
  const frequencyInput   = document.getElementById('edit-frequency');
  const lastCleanedInput = document.getElementById('edit-last-cleaned');

  const place       = placeInput.value.trim();
  const category    = categoryInput.value.trim();
  const frequency   = parseInt(frequencyInput.value, 10);
  const lastCleaned = lastCleanedInput.value;

  if (!place) {
    alert('掃除する場所を入力してください。');
    placeInput.focus();
    return;
  }
  if (!frequencyInput.value || frequency < 1) {
    alert('掃除の頻度を1以上の数字で入力してください。');
    frequencyInput.focus();
    return;
  }
  if (!lastCleaned) {
    alert('最後に掃除した日を入力してください。');
    lastCleanedInput.focus();
    return;
  }

  const data = loadData();
  const item = data.find(function(d) { return d.id === id; });
  if (item) {
    item.place       = place;
    item.category    = category;
    item.frequency   = frequency;
    item.lastCleaned = lastCleaned;
    saveData(data);
  }

  editingId = null;
  renderCards();
}

function handleCancelEdit() {
  editingId = null;
  renderCards();
}


// ===== カードのHTML生成 =====

function createCardHTML(item) {
  // 編集中のカードは編集フォームを表示する
  if (item.id === editingId) {
    return createEditFormHTML(item);
  }

  const elapsedDays = calcElapsedDays(item.lastCleaned);
  const status = getStatus(elapsedDays, item.frequency);
  const elapsedText = elapsedDays === 0 ? '今日掃除した' : `${elapsedDays}日前に掃除`;

  // 次の掃除まであと何日か
  const daysUntilNext = item.frequency - elapsedDays;
  let countdownText;
  if (daysUntilNext > 0) {
    countdownText = `あと${daysUntilNext}日で掃除予定`;
  } else if (daysUntilNext === 0) {
    countdownText = '今日が掃除予定日';
  } else {
    countdownText = `${Math.abs(daysUntilNext)}日で超えています`;
  }
  const countdownClass = daysUntilNext < 0 ? 'card-countdown is-overdue' : 'card-countdown';

  // ④ 掃除履歴：lastCleanedより前の最大2件を「05/22  05/15」形式で表示
  const pastHistory = item.history && item.history.length > 1
    ? item.history.slice(1, 3).map(function(d) { return d.slice(5).replace('-', '/'); }).join('  ')
    : null;
  const historyHTML = pastHistory
    ? `<div class="card-history">履歴：${pastHistory}</div>`
    : `<div class="card-history card-history-empty">履歴：記録なし</div>`;

  // ⑤ カテゴリタグ
  const categoryHTML = item.category
    ? `<span class="card-category">${escapeHTML(item.category)}</span>`
    : '';

  return `
    <div class="card ${status.cssClass}" data-id="${item.id}">
      <div class="card-body">
        <div class="card-header-row">
          <div class="card-place">${escapeHTML(item.place)}</div>
          ${categoryHTML}
        </div>
        <div class="card-info">${elapsedText}（頻度：${item.frequency}日ごと）</div>
        <div class="${countdownClass}">${countdownText}</div>
        ${historyHTML}
        <span class="card-status-label">${status.text}</span>
      </div>
      <div class="card-actions">
        <button class="btn btn-done"   onclick="handleDone('${item.id}')">掃除完了</button>
        <button class="btn btn-edit"   onclick="handleEditStart('${item.id}')">編集</button>
        <button class="btn btn-delete" onclick="handleDelete('${item.id}')" title="削除">×</button>
      </div>
    </div>
  `;
}

// XSS対策：特殊文字をHTMLエスケープする
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


// ===== 画面の更新 =====

function renderCards() {
  const data = loadData();
  const cardList = document.getElementById('card-list');
  const emptyMessage = document.getElementById('empty-message');

  // ソートボタンの状態を更新する
  const sortBtn = document.getElementById('btn-sort');
  if (currentSort === 'urgent') {
    sortBtn.textContent = '追加順に並べる';
    sortBtn.classList.add('is-active');
  } else {
    sortBtn.textContent = '緊急順に並べる';
    sortBtn.classList.remove('is-active');
  }

  // カテゴリタブを描画する
  renderFilterTabs(data);

  if (data.length === 0) {
    cardList.innerHTML = '';
    emptyMessage.style.display = 'block';
    return;
  }

  emptyMessage.style.display = 'none';
  // フィルタリング→ソートの順で適用する
  const displayData = getSortedData(getFilteredData(data));
  cardList.innerHTML = displayData.map(createCardHTML).join('');
}


// ===== ボタンの処理 =====

function handleAdd() {
  const placeInput       = document.getElementById('input-place');
  const categoryInput    = document.getElementById('input-category');
  const frequencyInput   = document.getElementById('input-frequency');
  const lastCleanedInput = document.getElementById('input-last-cleaned');

  const place       = placeInput.value.trim();
  const category    = categoryInput.value.trim();
  const frequency   = parseInt(frequencyInput.value, 10);
  const lastCleaned = lastCleanedInput.value;

  if (!place) {
    alert('掃除する場所を入力してください。');
    placeInput.focus();
    return;
  }
  if (!frequencyInput.value || frequency < 1) {
    alert('掃除の頻度を1以上の数字で入力してください。');
    frequencyInput.focus();
    return;
  }
  if (!lastCleaned) {
    alert('最後に掃除した日を入力してください。');
    lastCleanedInput.focus();
    return;
  }

  const data = loadData();
  data.push({
    id: String(Date.now()),
    place: place,
    category: category,
    frequency: frequency,
    lastCleaned: lastCleaned,
    history: [lastCleaned] // 登録日を履歴の1件目にする
  });
  saveData(data);

  placeInput.value       = '';
  categoryInput.value    = '';
  frequencyInput.value   = '';
  lastCleanedInput.value = '';
  renderCards();
}

// ① 掃除完了ボタン：アニメーション→履歴更新→再描画
function handleDone(id) {
  // カードに完了フラッシュアニメーションを付ける
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) {
    card.classList.add('is-done-flash');
  }

  // アニメーション終了後（600ms）にデータを更新して再描画する
  setTimeout(function() {
    const data = loadData();
    const item = data.find(function(d) { return d.id === id; });
    if (item) {
      const today = getTodayString();
      item.lastCleaned = today;

      // 履歴の先頭に今日を追加し、3件を超えたら末尾を削除する
      if (!item.history) item.history = [];
      item.history.unshift(today);
      if (item.history.length > 3) item.history.pop();

      saveData(data);
      renderCards();
    }
  }, 600);
}

function handleDelete(id) {
  const data = loadData();
  const item = data.find(function(d) { return d.id === id; });
  if (!item) return;

  if (!confirm(`「${item.place}」を削除しますか？`)) return;

  const newData = data.filter(function(d) { return d.id !== id; });
  saveData(newData);
  renderCards();
}


// ===== デモデータ =====

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function loadDemoDataIfEmpty() {
  if (loadData().length > 0) return;

  const demoData = [
    {
      id: 'demo-1', place: 'トイレ', category: 'バス・トイレ',
      frequency: 7,  lastCleaned: daysAgo(3),
      history: [daysAgo(3), daysAgo(10), daysAgo(17)]
    },
    {
      id: 'demo-2', place: 'キッチン', category: 'キッチン',
      frequency: 7,  lastCleaned: daysAgo(7),
      history: [daysAgo(7), daysAgo(14)]
    },
    {
      id: 'demo-3', place: 'お風呂', category: 'バス・トイレ',
      frequency: 14, lastCleaned: daysAgo(20),
      history: [daysAgo(20), daysAgo(34)]
    },
    {
      id: 'demo-4', place: '洗面台', category: 'バス・トイレ',
      frequency: 7,  lastCleaned: daysAgo(4),
      history: [daysAgo(4), daysAgo(11), daysAgo(18)]
    },
    {
      id: 'demo-5', place: 'エアコンフィルター', category: 'リビング',
      frequency: 30, lastCleaned: daysAgo(38),
      history: [daysAgo(38), daysAgo(68)]
    },
  ];
  saveData(demoData);
}


// ===== 初期化 =====

document.addEventListener('DOMContentLoaded', function() {
  loadDemoDataIfEmpty();

  document.getElementById('btn-add').addEventListener('click', handleAdd);
  document.getElementById('btn-sort').addEventListener('click', handleSortToggle);

  document.getElementById('input-last-cleaned').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleAdd();
  });

  renderCards();
});
