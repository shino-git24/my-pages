document.addEventListener('DOMContentLoaded', () => {
    const checklistBody = document.querySelector('#checklist tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const sortBtn = document.getElementById('sortBtn');
    const progressDiv = document.getElementById('progress');
    const storageKey = 'rsrChecklistItems';

    let items = [];
    // カテゴリごとの開閉状態を管理するオブジェクト
    let categoryState = {};

    // JSONファイルを読み込む
    async function loadItemsFromJSON() {
        try {
            const response = await fetch('items.json');
            const parsedItems = await response.json();
            
            return parsedItems.map(item => ({
                id: Date.now() + Math.random(),
                ...item,
                prepared: false,
                confirmed: false,
                // needsPurchase はJSONから読み込む
                needsPurchase: typeof item.needsPurchase === 'boolean' ? item.needsPurchase : false
            }));
        } catch (error) {
            console.error('JSONファイルの読み込みに失敗しました:', error);
            return [];
        }
    }

    // アプリを初期化
    async function initializeApp() {
        const savedItems = localStorage.getItem(storageKey);
        const savedCategoryState = localStorage.getItem(`${storageKey}_categoryState`);

        if (savedItems) {
            items = JSON.parse(savedItems);
        } else {
            items = await loadItemsFromJSON();
            saveItems(); 
        }

        if(savedCategoryState) {
            categoryState = JSON.parse(savedCategoryState);
        }
        
        renderList();
        updateProgress();
    }

    // データをローカルストレージに保存
    const saveItems = () => {
        localStorage.setItem(storageKey, JSON.stringify(items));
        localStorage.setItem(`${storageKey}_categoryState`, JSON.stringify(categoryState));
    };

    // 進捗状況を更新
    const updateProgress = () => {
        const totalItems = items.length;
        const preparedItems = items.filter(item => item.prepared).length;
        if (progressDiv) {
            progressDiv.textContent = `準備完了: ${preparedItems} / ${totalItems}`;
        }
    };

    // リストを描画
    const renderList = () => {
        checklistBody.innerHTML = '';

        // 1. ユニークなカテゴリのリストを取得
        const categories = [...new Set(items.map(item => item.category || 'その他'))];

        // 2. カテゴリごとに処理
        categories.forEach(category => {
            // カテゴリの開閉状態を初期化（まだなければ開いた状態に）
            if (categoryState[category] === undefined) {
                categoryState[category] = false; // false = 開いている
            }

            // 3. カテゴリヘッダー行を作成
            const headerRow = document.createElement('tr');
            headerRow.className = 'category-header';
            if (categoryState[category]) {
                headerRow.classList.add('collapsed');
            }
            headerRow.dataset.category = category;
            headerRow.innerHTML = `<td colspan="6"><span class="arrow"></span>${category}</td>`;
            checklistBody.appendChild(headerRow);

            // 4. そのカテゴリに属するアイテムを取得
            const itemsInCategory = items.filter(item => (item.category || 'その他') === category);

            // 5. 各アイテムの行を作成
            itemsInCategory.forEach(item => {
                const row = document.createElement('tr');
                row.dataset.id = item.id;
                row.dataset.category = category;
                // カテゴリが閉じられていれば非表示にする
                if (categoryState[category]) {
                    row.style.display = 'none';
                }

                // data-label属性はスマホ表示時のラベルとして使用
                row.innerHTML = `
                    <td data-label="事前" class="col-prepared"><input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''}></td>
                    <td data-label="当日" class="col-confirmed"><input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''}></td>
                    <td data-label="品名" class="col-name"><input type="text" class="name" value="${item.name}"></td>
                    <td data-label="購入" class="col-purchase"><input type="checkbox" class="needsPurchase" ${item.needsPurchase ? 'checked' : ''}></td>
                    <td data-label="メモ" class="col-memo"><input type="text" class="memo" value="${item.memo}"></td>
                    <td class="col-actions actions"><button class="btn btn-delete">削除</button></td>
                `;
                checklistBody.appendChild(row);
            });
        });
        saveItems();
    };

    // --- イベントリスナー ---

    // チェックやテキスト入力の処理
    checklistBody.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);

        if (item) {
            if (e.target.classList.contains('name')) item.name = e.target.value;
            if (e.target.classList.contains('memo')) item.memo = e.target.value;
            saveItems(); // テキスト入力でも保存
        }
    });
    
    // チェックボックスの変更処理
    checklistBody.addEventListener('change', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);

        if (item && e.target.type === 'checkbox') {
            if (e.target.classList.contains('prepared')) item.prepared = e.target.checked;
            if (e.target.classList.contains('confirmed')) item.confirmed = e.target.checked;
            if (e.target.classList.contains('needsPurchase')) item.needsPurchase = e.target.checked;
            updateProgress(); // 進捗を更新
            saveItems();
        }
    });

    // クリックイベントの処理（削除ボタンとカテゴリヘッダー）
    checklistBody.addEventListener('click', (e) => {
        const target = e.target;

        // 削除ボタン
        if (target.classList.contains('btn-delete')) {
            const row = target.closest('tr');
            if (!row) return;
            const id = parseFloat(row.dataset.id);
            items = items.filter(i => i.id !== id);
            renderList(); // リストを再描画
            updateProgress(); // 進捗も更新
            return; // 処理を終了
        }

        // カテゴリヘッダー
        const header = target.closest('.category-header');
        if (header) {
            const category = header.dataset.category;
            // 状態を反転
            categoryState[category] = !categoryState[category];
            header.classList.toggle('collapsed');
            
            // 該当するアイテム行の表示を切り替え
            const rowsToToggle = checklistBody.querySelectorAll(`tr[data-category="${category}"]:not(.category-header)`);
            rowsToToggle.forEach(row => {
                row.style.display = categoryState[category] ? 'none' : '';
            });
            saveItems(); // 開閉状態を保存
        }
    });

    // 項目を追加
    addItemBtn.addEventListener('click', () => {
        const newItem = {
            id: Date.now(),
            category: 'その他', // デフォルトは「その他」カテゴリ
            prepared: false, 
            confirmed: false,
            name: '新しい持ち物', 
            needsPurchase: false, 
            memo: ''
        };
        items.push(newItem);
        renderList();
        updateProgress();
    });

    // 購入要否でソート
    sortBtn.addEventListener('click', () => {
        // 購入要否がtrueのものを優先、それ以外は元の順序を維持しない
        items.sort((a, b) => (b.needsPurchase - a.needsPurchase));
        renderList(); // ソート後にリストを再描画
    });

    // アプリケーションを開始
    initializeApp();
});