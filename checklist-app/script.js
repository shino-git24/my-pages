document.addEventListener('DOMContentLoaded', () => {
    const checklistBody = document.querySelector('#checklist tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const sortBtn = document.getElementById('sortBtn');
    const progressDiv = document.getElementById('progress');
    const storageKey = 'rsrChecklistItems';
    
    // ★★★ 1. スクリプトのバージョンを定義 ★★★
    const SCRIPT_VERSION = "1.3"; // ファイルを更新するたびに、ここの数字を少し変えると確実です

    let items = [];
    let categoryState = {};

    // ★★★ 2. JSON読み込み時にキャッシュを回避するよう変更 ★★★
    async function loadItemsFromJSON() {
        try {
            // URLに現在時刻を付与して、ブラウザのキャッシュを無効化する
            const response = await fetch(`items.json?t=${new Date().getTime()}`);
            const parsedItems = await response.json();
            
            return parsedItems.map(item => ({
                id: Date.now() + Math.random(),
                ...item,
                prepared: false,
                confirmed: false,
                needsPurchase: typeof item.needsPurchase === 'boolean' ? item.needsPurchase : false
            }));
        } catch (error) {
            console.error('JSONファイルの読み込みに失敗しました:', error);
            return [];
        }
    }

    // アプリを初期化
    async function initializeApp() {
        // ★★★ 3. バージョンをチェックして、古ければデータをクリア ★★★
        const savedVersion = localStorage.getItem(`${storageKey}_version`);
        if (savedVersion !== SCRIPT_VERSION) {
            console.log(`バージョンが異なるためデータをリセットします。(旧: ${savedVersion}, 新: ${SCRIPT_VERSION})`);
            localStorage.removeItem(storageKey);
            localStorage.removeItem(`${storageKey}_categoryState`);
            localStorage.setItem(`${storageKey}_version`, SCRIPT_VERSION); // 新しいバージョンを保存
        }

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
        // バージョン情報も保存しておく
        localStorage.setItem(`${storageKey}_version`, SCRIPT_VERSION);
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
        const categories = [...new Set(items.map(item => item.category || 'その他'))];

        categories.forEach(category => {
            if (categoryState[category] === undefined) {
                categoryState[category] = false;
            }

            const headerRow = document.createElement('tr');
            headerRow.className = 'category-header';
            if (categoryState[category]) {
                headerRow.classList.add('collapsed');
            }
            headerRow.dataset.category = category;
            headerRow.innerHTML = `<td colspan="6"><span class="arrow"></span>${category}</td>`;
            checklistBody.appendChild(headerRow);

            const itemsInCategory = items.filter(item => (item.category || 'その他') === category);

            itemsInCategory.forEach(item => {
                const row = document.createElement('tr');
                row.dataset.id = item.id;
                row.dataset.category = category;
                if (categoryState[category]) {
                    row.style.display = 'none';
                }
                row.innerHTML = `
                    <td data-label="事前" class="col-prepared"><input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''}></td>
                    <td data-label="当日" class="col-confirmed"><input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''}></td>
                    <td data-label="品名" class="col-name"><input type="text" class="name" value="${item.name}"></td>
                    <td data-label="購入" class="col-purchase"><input type="checkbox" class="needsPurchase" ${item.needsPurchase ? 'checked' : ''}></td>
                    <td data-label="メモ" class="col-memo"><input type="text" class="memo" value="${item.memo}"></td>
                    <td data-label="操作" class="col-actions actions"><button class="btn btn-delete">削除</button></td>
                `;
                checklistBody.appendChild(row);
            });
        });
        saveItems();
    };

    // --- イベントリスナー ---
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

        if (item && e.target.type === 'checkbox') {
            if (e.target.classList.contains('prepared')) item.prepared = e.target.checked;
            if (e.target.classList.contains('confirmed')) item.confirmed = e.target.checked;
            if (e.target.classList.contains('needsPurchase')) item.needsPurchase = e.target.checked;
            updateProgress();
            saveItems();
        }
    });

    checklistBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-delete')) {
            const row = target.closest('tr');
            if (!row) return;
            const id = parseFloat(row.dataset.id);
            items = items.filter(i => i.id !== id);
            renderList();
            updateProgress();
            return;
        }

        const header = target.closest('.category-header');
        if (header) {
            const category = header.dataset.category;
            categoryState[category] = !categoryState[category];
            header.classList.toggle('collapsed');
            
            const rowsToToggle = checklistBody.querySelectorAll(`tr[data-category="${category}"]:not(.category-header)`);
            rowsToToggle.forEach(row => {
                row.style.display = categoryState[category] ? 'none' : '';
            });
            saveItems();
        }
    });

    addItemBtn.addEventListener('click', () => {
        const newItem = {
            id: Date.now(),
            category: 'その他',
            prepared: false, 
            confirmed: false,
            name: '新しい持ち物', 
            needsPurchase: false, 
            memo: ''
        };
        items.unshift(newItem); // pushからunshiftに変更し、リストの先頭に追加
        renderList();
        updateProgress();
    });

    sortBtn.addEventListener('click', () => {
        items.sort((a, b) => (b.needsPurchase - a.needsPurchase));
        renderList();
    });

    // アプリケーションを開始
    initializeApp();
});