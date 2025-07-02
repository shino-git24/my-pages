document.addEventListener('DOMContentLoaded', () => {
    const checklistBody = document.querySelector('#checklist tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const sortBtn = document.getElementById('sortBtn');
    const progressDiv = document.getElementById('progress');
    const storageKey = 'rsrChecklistItems';
    
    // スクリプトのバージョンを更新
    const SCRIPT_VERSION = "1.4"; 

    let items = [];
    let categoryState = {};

    async function loadItemsFromJSON() {
        try {
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

    async function initializeApp() {
        const savedVersion = localStorage.getItem(`${storageKey}_version`);
        if (savedVersion !== SCRIPT_VERSION) {
            console.log(`バージョンが異なるためデータをリセットします。(旧: ${savedVersion}, 新: ${SCRIPT_VERSION})`);
            localStorage.removeItem(storageKey);
            localStorage.removeItem(`${storageKey}_categoryState`);
            localStorage.setItem(`${storageKey}_version`, SCRIPT_VERSION);
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

    const saveItems = () => {
        localStorage.setItem(storageKey, JSON.stringify(items));
        localStorage.setItem(`${storageKey}_categoryState`, JSON.stringify(categoryState));
        localStorage.setItem(`${storageKey}_version`, SCRIPT_VERSION);
    };

    const updateProgress = () => {
        const totalItems = items.length;
        const preparedItems = items.filter(item => item.prepared).length;
        if (progressDiv) {
            progressDiv.textContent = `準備完了: ${preparedItems} / ${totalItems}`;
        }
    };

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

                // ★★★ スマホ用のHTML構造を要望に合わせて変更 ★★★
                row.innerHTML = `
                    <td data-label="事前" class="col-prepared"><input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''}></td>
                    <td data-label="当日" class="col-confirmed"><input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''}></td>
                    <td data-label="品名" class="col-name"><input type="text" class="name" value="${item.name}"></td>
                    <td data-label="購入" class="col-purchase"><input type="checkbox" class="needsPurchase" ${item.needsPurchase ? 'checked' : ''}></td>
                    <td data-label="メモ" class="col-memo"><input type="text" class="memo" value="${item.memo}"></td>
                    <td data-label="操作" class="col-actions actions"><button class="btn btn-delete">削除</button></td>

                    <td class="mobile-card">
                        <div class="card-cell item-controls">
                            <div class="checkbox-group">
                                <label class="checkbox-label"><input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''}> 事前</label>
                                <label class="checkbox-label"><input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''}> 当日</label>
                                <label class="checkbox-label"><input type="checkbox" class="needsPurchase" ${item.needsPurchase ? 'checked' : ''}> 購入</label>
                            </div>
                            <button class="btn btn-delete">削除</button>
                        </div>
                        <div class="card-cell item-name">
                            <input type="text" class="name" value="${item.name}" placeholder="品名">
                        </div>
                        <div class="card-cell item-memo">
                            <input type="text" class="memo" value="${item.memo}" placeholder="メモ">
                        </div>
                    </td>
                `;
                checklistBody.appendChild(row);
            });
        });
        saveItems();
    };

    // --- イベントリスナー ---
    // イベント処理を.mobile-card内でもPC表示でも両方で機能するように調整
    checklistBody.addEventListener('input', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);

        if (item && e.target.classList.contains('name')) item.name = e.target.value;
        if (item && e.target.classList.contains('memo')) item.memo = e.target.value;
        saveItems();
    });
    
    checklistBody.addEventListener('change', (e) => {
        const row = e.target.closest('tr');
        if (!row || e.target.type !== 'checkbox') return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);

        if (item) {
            if (e.target.classList.contains('prepared')) item.prepared = e.target.checked;
            if (e.target.classList.contains('confirmed')) item.confirmed = e.target.checked;
            if (e.target.classList.contains('needsPurchase')) item.needsPurchase = e.target.checked;
            
            // 両方のビューのチェックボックスの状態を同期させる
            const allCheckboxesInRow = row.querySelectorAll(`input[type="checkbox"]`);
            allCheckboxesInRow.forEach(cb => {
                if(cb.classList.contains('prepared')) cb.checked = item.prepared;
                if(cb.classList.contains('confirmed')) cb.checked = item.confirmed;
                if(cb.classList.contains('needsPurchase')) cb.checked = item.needsPurchase;
            });

            updateProgress();
            saveItems();
        }
    });

    checklistBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.closest('.btn-delete')) {
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
        items.unshift(newItem);
        renderList();
        updateProgress();
    });

    sortBtn.addEventListener('click', () => {
        items.sort((a, b) => (b.needsPurchase - a.needsPurchase));
        renderList();
    });

    initializeApp();
});