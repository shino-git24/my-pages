document.addEventListener('DOMContentLoaded', () => {
    const checklistBody = document.querySelector('#checklist tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const progressDiv = document.getElementById('progress');
    const legendDiv = document.getElementById('legend');
    const storageKey = 'rsrChecklistItems';

    // --- モーダル関連の要素 ---
    const modal = document.getElementById('add-item-modal');
    const modalNameInput = document.getElementById('new-item-name');
    const modalMemoInput = document.getElementById('new-item-memo');
    const modalCategorySelect = document.getElementById('new-item-category');
    const confirmBtn = document.getElementById('add-item-confirm-btn');
    const cancelBtn = document.getElementById('add-item-cancel-btn');

    let items = [];
    let categoryState = {};

    async function loadItemsFromJSON() {
        try {
            const response = await fetch('items.json');
            const parsedItems = await response.json();
            return parsedItems.map(item => ({
                id: Date.now() + Math.random(),
                ...item,
                prepared: false,
                confirmed: false,
            }));
        } catch (error) {
            console.error('JSONファイルの読み込みに失敗しました:', error);
            return [];
        }
    }

    async function initializeApp() {
        const savedItems = localStorage.getItem(storageKey);
        if (savedItems) {
            items = JSON.parse(savedItems);
        } else {
            items = await loadItemsFromJSON();
        }

        const savedCategoryState = localStorage.getItem(`${storageKey}_categoryState`);
        if (savedCategoryState) {
            categoryState = JSON.parse(savedCategoryState);
        } else {
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
        progressDiv.textContent = `準備完了: ${preparedItems} / ${totalItems}`;
    };

    const renderList = () => {
        checklistBody.innerHTML = '';
        legendDiv.innerHTML = `凡例: <label><input type=checkbox disabled>事前</label> <label><input type=checkbox disabled>当日</label>`;
        const categories = [...new Set(items.map(item => item.category || 'その他'))];

        categories.forEach(category => {
            const isCollapsed = categoryState[category] || false;
            const headerRow = document.createElement('tr');
            headerRow.className = 'category-header';
            if (isCollapsed) headerRow.classList.add('collapsed');
            headerRow.dataset.category = category;
            headerRow.innerHTML = `<td colspan="5"><span>▼</span> ${category}</td>`;
            checklistBody.appendChild(headerRow);

            const itemsInCategory = items.filter(item => (item.category || 'その他') === category);
            itemsInCategory.forEach(item => {
                const row = document.createElement('tr');
                row.className = 'item-row';
                row.dataset.id = item.id;
                if (isCollapsed) row.style.display = 'none';

                // 品名とメモを結合した表示用のHTMLを作成
                const nameAndMemoHTML = item.memo 
                    ? `<div class="item-name-wrapper">${item.name}</div><div class="item-memo-wrapper">(${item.memo})</div>`
                    : `<div class="item-name-wrapper">${item.name}</div>`;

                row.innerHTML = `
                    <td class="cell-checks">
                        <input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''} title="事前">
                    </td>
                    <td class="cell-checks">
                        <input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''} title="当日">
                    </td>
                    <td class="cell-name">
                        <div class="name-memo-container">${nameAndMemoHTML}</div>
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
    checklistBody.addEventListener('change', (e) => {
        if (e.target.tagName !== 'INPUT' || e.target.type !== 'checkbox') return;
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);
        if (item) {
            if (e.target.classList.contains('prepared')) item.prepared = e.target.checked;
            if (e.target.classList.contains('confirmed')) item.confirmed = e.target.checked;
            updateProgress();
            saveItems();
        }
    });

    checklistBody.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete')) {
            const row = e.target.closest('tr');
            if (!row) return;
            const id = parseFloat(row.dataset.id);
            items = items.filter(i => i.id !== id);
            renderList();
            updateProgress();
            return;
        }
        if (e.target.closest('.category-header')) {
            const header = e.target.closest('.category-header');
            const category = header.dataset.category;
            categoryState[category] = !categoryState[category];
            renderList();
        }
        // 品名クリックで編集（PCのみ）
        if (e.target.closest('.name-memo-container')) {
            const row = e.target.closest('tr');
            const nameCell = row.querySelector('.cell-name');
            const memoCell = row.querySelector('.cell-memo');
            nameCell.innerHTML = `<input type="text" class="name" value="${items.find(i=>i.id==row.dataset.id).name}">`;
            memoCell.style.display = 'table-cell'; // メモ欄を表示して編集可能に
        }
    });
    
    // PCでのみ、入力欄からフォーカスが外れたら表示を更新
    checklistBody.addEventListener('focusout', (e) => {
        if (window.innerWidth <= 768) return; // スマホでは無効
        if (e.target.tagName !== 'INPUT' || e.target.type !== 'text') return;
        const row = e.target.closest('tr');
        if (!row) return;
        const id = parseFloat(row.dataset.id);
        const item = items.find(i => i.id === id);
        if (item) {
            const nameInput = row.querySelector('input.name');
            const memoInput = row.querySelector('input.memo');
            if (nameInput) item.name = nameInput.value;
            if (memoInput) item.memo = memoInput.value;
            saveItems();
            renderList(); // 表示を元に戻す
        }
    });


    // --- モーダル関連の処理 ---
    function openModal() {
        // カテゴリのセレクトボックスを生成
        const categories = [...new Set(items.map(item => item.category || 'その他'))];
        modalCategorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        modal.style.display = 'flex';
        modalNameInput.focus();
    }
    function closeModal() {
        modal.style.display = 'none';
        modalNameInput.value = '';
        modalMemoInput.value = '';
    }

    addItemBtn.addEventListener('click', openModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(); // 外側クリックで閉じる
    });

    confirmBtn.addEventListener('click', () => {
        const name = modalNameInput.value.trim();
        if (!name) {
            alert('品名を入力してください。');
            return;
        }
        const newItem = {
            id: Date.now(),
            category: modalCategorySelect.value,
            name: name,
            memo: modalMemoInput.value.trim(),
            prepared: false,
            confirmed: false,
        };
        items.unshift(newItem);
        renderList();
        updateProgress();
        closeModal();
    });

    initializeApp();
});