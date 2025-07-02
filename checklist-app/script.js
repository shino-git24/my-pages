document.addEventListener('DOMContentLoaded', () => {
    const checklistBody = document.querySelector('#checklist tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const sortBtn = document.getElementById('sortBtn');
    const progressDiv = document.getElementById('progress');
    const storageKey = 'rsrChecklistItems';

    let items = [];
    let categoryState = {};

    async function loadItemsFromJSON() {
        try {
            // Service Workerがキャッシュを管理するので、タイムスタンプは不要
            const response = await fetch('items.json');
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
        const savedItems = localStorage.getItem(storageKey);
        const savedCategoryState = localStorage.getItem(`${storageKey}_categoryState`);

        if (savedItems) {
            items = JSON.parse(savedItems);
        } else {
            items = await loadItemsFromJSON();
        }

        if(savedCategoryState) {
            categoryState = JSON.parse(savedCategoryState);
        } else {
            // カテゴリ状態の初期化
            const categories = [...new Set(items.map(item => item.category || 'その他'))];
            categories.forEach(cat => categoryState[cat] = false);
        }
        
        renderList();
        updateProgress();
    }

    const saveItems = () => {
        localStorage.setItem(storageKey, JSON.stringify(items));
        localStorage.setItem(`${storageKey}_categoryState`, JSON.stringify(categoryState));
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
            const isCollapsed = categoryState[category] || false;

            const headerRow = document.createElement('tr');
            headerRow.className = 'category-header';
            if (isCollapsed) headerRow.classList.add('collapsed');
            headerRow.dataset.category = category;
            headerRow.innerHTML = `<td colspan="4"><span class="arrow">▼</span> ${category}</td>`;
            checklistBody.appendChild(headerRow);

            const itemsInCategory = items.filter(item => (item.category || 'その他') === category);

            itemsInCategory.forEach(item => {
                const row = document.createElement('tr');
                row.className = 'item-row';
                row.dataset.id = item.id;
                if (isCollapsed) row.style.display = 'none';

                row.innerHTML = `
                    <td class="cell-name">
                        <input type="text" class="name" value="${item.name}" placeholder="品名">
                    </td>
                    <td class="cell-checks">
                        <label class="checkbox-label"><input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''}> 事前</label>
                        <label class="checkbox-label"><input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''}> 当日</label>
                        <label class="checkbox-label"><input type="checkbox" class="needsPurchase" ${item.needsPurchase ? 'checked' : ''}> 購入</label>
                    </td>
                    <td class="cell-memo">
                        <input type="text" class="memo" value="${item.memo}" placeholder="メモ">
                    </td>
                    <td class="cell-actions">
                        <button class="btn btn-delete">削除</button>
                    </td>
                `;
                checklistBody.appendChild(row);
            });
        });
        saveItems();
    };

    // --- イベントリスナー ---
    checklistBody.addEventListener('input', (e) => {
        if (e.target.tagName !== 'INPUT' || e.target.type !== 'text') return;
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
        if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox') return;
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);

        if (item) {
            if (e.target.classList.contains('prepared')) item.prepared = e.target.checked;
            if (e.target.classList.contains('confirmed')) item.confirmed = e.target.checked;
            if (e.target.classList.contains('needsPurchase')) item.needsPurchase = e.target.checked;
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
            renderList(); // 開閉状態を反映して再描画
        }
    });

    addItemBtn.addEventListener('click', () => {
        const newItem = {
            id: Date.now(), category: 'その他',
            prepared: false, confirmed: false, needsPurchase: false,
            name: '新しい持ち物', memo: ''
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