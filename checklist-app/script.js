document.addEventListener('DOMContentLoaded', () => {
    const checklistBody = document.querySelector('#checklist tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const sortBtn = document.getElementById('sortBtn');
    const storageKey = 'rsrChecklistItems';
    let items = []; // 最初は空の配列

// JSONファイルを読み込んでパースする非同期関数
async function loadItemsFromJSON() {
    try {
        // 1. ファイルをfetchする
        const response = await fetch('items.json');
        // 2. response.json() を呼ぶだけで、自動的にJSONがJSのオブジェクトに変換される
        const parsedItems = await response.json();
        
        // 読み込んだデータに、アプリで使うIDやチェック状態を追加する
        return parsedItems.map(item => ({
            ...item, // JSONからの元のデータ (name, memo, needsPurchase)
            id: Date.now() + Math.random(), // ユニークIDを生成
            prepared: false, // チェックボックスの初期状態
            confirmed: false // チェックボックスの初期状態
        }));
    } catch (error) {
        console.error('JSONファイルの読み込みに失敗しました:', error);
        return []; // エラー時は空の配列を返す
    }
}

// アプリを初期化するメインの非同期関数
async function initializeApp() {
    const savedItems = localStorage.getItem(storageKey);

    if (savedItems) {
        items = JSON.parse(savedItems);
    } else {
        // JSONから読み込んだら…
        items = await loadItemsFromJSON();
        // ★★★ すぐにローカルストレージへ保存する処理を追加 ★★★
        saveItems(); 
    }
    
    renderList();
}
    // データをローカルストレージに保存する関数
    const saveItems = () => {
        localStorage.setItem(storageKey, JSON.stringify(items));
    };

    // リストを描画する関数 (内容は前回と同じ)
    const renderList = () => {
        checklistBody.innerHTML = '';
        items.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.id = item.id; // 行にIDを持たせる
            row.innerHTML = `
                <td><input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''}></td>
                <td><input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''}></td>
                <td><input type="text" class="name" value="${item.name}"></td>
                <td><input type="checkbox" class="needsPurchase" ${item.needsPurchase ? 'checked' : ''}></td>
                <td><input type="text" class="memo" value="${item.memo}"></td>
                <td class="actions"><button class="btn btn-delete">削除</button></td>
            `;
            checklistBody.appendChild(row);
        });
    };

    // イベント処理 (IDの取得方法を少し変更)
    checklistBody.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);

        if (item) {
            if (e.target.classList.contains('name')) item.name = e.target.value;
            if (e.target.classList.contains('memo')) item.memo = e.target.value;
            saveItems();
        }
    });
    
    checklistBody.addEventListener('change', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);

        if (item) {
            if (e.target.classList.contains('prepared')) item.prepared = e.target.checked;
            if (e.target.classList.contains('confirmed')) item.confirmed = e.target.checked;
            if (e.target.classList.contains('needsPurchase')) item.needsPurchase = e.target.checked;
            saveItems();
        }
    });

    checklistBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const row = e.target.closest('tr');
            if (!row) return;
            const id = parseFloat(row.dataset.id);
            items = items.filter(i => i.id !== id);
            saveItems();
            renderList();
        }
    });

    // 項目を追加 (内容は前回と同じ)
    addItemBtn.addEventListener('click', () => {
        const newItem = {
            id: Date.now(),
            prepared: false, confirmed: false,
            name: '新しい持ち物', needsPurchase: false, memo: ''
        };
        items.push(newItem);
        saveItems();
        renderList();
    });

    // 購入要否でソート (内容は前回と同じ)
    sortBtn.addEventListener('click', () => {
        items.sort((a, b) => (b.needsPurchase - a.needsPurchase));
        renderList();
    });

    // アプリケーションを開始
    initializeApp();
});