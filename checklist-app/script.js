document.addEventListener('DOMContentLoaded', () => {
    const checklistBody = document.querySelector('#checklist tbody');
    const addItemBtn = document.getElementById('addItemBtn');
    const progressDiv = document.getElementById('progress');
    const storageKey = 'rsrChecklistItems';

    // --- モーダル関連の要素 ---
    const modal = document.getElementById('add-item-modal');
    const modalNameInput = document.getElementById('new-item-name');
    const modalCategorySelect = document.getElementById('new-item-category');
    const confirmBtn = document.getElementById('add-item-confirm-btn');
    const cancelBtn = document.getElementById('add-item-cancel-btn');

    let items = [];
    let categoryState = {};

    async function loadItemsFromJSON() {
        try {
            const response = await fetch('items.json');
            const parsedItems = await response.json();
            // Add state properties to each item
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
        const categories = [...new Set(items.map(item => item.category || 'その他'))];

        categories.forEach(category => {
            const isCollapsed = categoryState[category] || false;
            const headerRow = document.createElement('tr');
            headerRow.className = 'category-header';
            if (isCollapsed) headerRow.classList.add('collapsed');
            headerRow.dataset.category = category;
            headerRow.innerHTML = `<td colspan="4"><span>▼</span> ${category}</td>`; // Colspan is 4 now
            checklistBody.appendChild(headerRow);

            const itemsInCategory = items.filter(item => (item.category || 'その他') === category);
            itemsInCategory.forEach(item => {
                const row = document.createElement('tr');
                row.className = 'item-row';
                row.dataset.id = item.id;
                if (isCollapsed) row.style.display = 'none';

                row.innerHTML = `
                    <td class="cell-check">
                        <input type="checkbox" class="prepared" ${item.prepared ? 'checked' : ''} title="事前準備">
                    </td>
                    <td class="cell-check">
                        <input type="checkbox" class="confirmed" ${item.confirmed ? 'checked' : ''} title="当日確認">
                    </td>
                    <td class="cell-name">
                        <span class="item-name-text">${item.name}</span>
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
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
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
        }
    });

    checklistBody.addEventListener('click', (e) => {
        // Delete button
        if (e.target.closest('.btn-delete')) {
            const row = e.target.closest('tr');
            if (!row) return;
            const id = parseFloat(row.dataset.id);
            items = items.filter(i => i.id !== id);
            renderList();
            updateProgress();
            return;
        }
        // Category header
        if (e.target.closest('.category-header')) {
            const header = e.target.closest('.category-header');
            const category = header.dataset.category;
            categoryState[category] = !categoryState[category];
            renderList();
        }
        // Click item name to edit
        if (e.target.classList.contains('item-name-text')) {
            const nameSpan = e.target;
            const row = nameSpan.closest('tr');
            const id = parseFloat(row.dataset.id);
            const item = items.find(i => i.id === id);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = item.name;
            input.className = 'name-edit-input';
            
            nameSpan.replaceWith(input);
            input.focus();

            input.addEventListener('blur', () => {
                item.name = input.value.trim();
                saveItems();
                renderList(); // Re-render to show the span again
            });

            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    input.blur();
                }
            });
        }
    });

    // --- モーダル関連の処理 ---
    function openModal() {
        const categories = [...new Set(items.map(item => item.category || 'その他'))];
        modalCategorySelect.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        modal.style.display = 'flex';
        modalNameInput.focus();
    }
    function closeModal() {
        modal.style.display = 'none';
        modalNameInput.value = '';
    }

    addItemBtn.addEventListener('click', openModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
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