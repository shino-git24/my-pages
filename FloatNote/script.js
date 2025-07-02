document.addEventListener('DOMContentLoaded', () => {
    const noteList = document.getElementById('note-list');
    const newNoteBtn = document.getElementById('new-note-btn');
    const deleteNoteBtn = document.getElementById('delete-note-btn');
    const noteTitle = document.getElementById('note-title');
    const noteEditor = document.getElementById('note-editor');
    const editorToolbar = document.querySelector('.editor-toolbar');
    const searchInput = document.getElementById('search-input');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');

    let notes = [];
    let activeNoteId = null;

    // 1. Data Persistence (localStorage)
    const loadNotes = () => {
        const storedNotes = localStorage.getItem('floatnote-notes');
        if (storedNotes) {
            notes = JSON.parse(storedNotes);
        }
        const sidebarHidden = localStorage.getItem('floatnote-sidebar-hidden') === 'true';
        if (sidebarHidden) {
            sidebar.classList.add('hidden');
            sidebarToggleBtn.textContent = '》';
        }
    };

    const saveNotes = () => {
        localStorage.setItem('floatnote-notes', JSON.stringify(notes));
    };

    // 2. Note Management
    const renderNoteList = () => {
        noteList.innerHTML = '';
        if (notes.length === 0) {
            noteList.innerHTML = '<li>メモがありません</li>';
            return;
        }
        notes.forEach(note => {
            const li = document.createElement('li');
            li.textContent = note.title || '無題のメモ';
            li.dataset.id = note.id;
            if (note.id === activeNoteId) {
                li.classList.add('active');
            }
            noteList.appendChild(li);
        });
    };

    const getActiveNote = () => notes.find(note => note.id === activeNoteId);

    const displayNote = (note) => {
        if (note) {
            activeNoteId = note.id;
            noteTitle.value = note.title;
            noteEditor.innerHTML = note.content;
            document.querySelector('.main-content').style.visibility = 'visible';
        } else {
            activeNoteId = null;
            noteTitle.value = '';
            noteEditor.innerHTML = '';
            document.querySelector('.main-content').style.visibility = 'hidden';
        }
        renderNoteList();
    };

    const createNewNote = () => {
        const newNote = {
            id: Date.now(),
            title: '新しいメモ',
            content: ''
        };
        notes.unshift(newNote);
        saveNotes();
        displayNote(newNote);
    };

    const deleteActiveNote = () => {
        if (!activeNoteId) return;
        notes = notes.filter(note => note.id !== activeNoteId);
        saveNotes();
        displayNote(notes[0] || null);
    };
    
    const updateActiveNote = () => {
        const activeNote = getActiveNote();
        if (activeNote) {
            activeNote.title = noteTitle.value;
            activeNote.content = noteEditor.innerHTML;
            saveNotes();
            renderNoteList(); // Update title in the list
        }
    };

    // 3. Rich Text Editor
    editorToolbar.addEventListener('click', (e) => {
        const command = e.target.closest('button')?.dataset.command;
        if (command) {
            e.preventDefault();
            document.execCommand(command, false, null);
            noteEditor.focus();
            updateActiveNote();
        }
    });

    // 4. Search
    let originalContent = '';
    searchInput.addEventListener('input', () => {
        const note = getActiveNote();
        if (!note) return;

        if (searchInput.value.length === 0) {
            noteEditor.innerHTML = note.content;
            return;
        }
        
        // Restore original content before a new search to avoid nested marks
        noteEditor.innerHTML = note.content;

        const searchTerm = searchInput.value;
        const regex = new RegExp(searchTerm, 'gi');
        const content = noteEditor.innerHTML;
        
        // Avoid re-marking already marked content
        const cleanContent = content.replace(/<mark>|<\/mark>/gi, "");
        const newContent = cleanContent.replace(regex, (match) => `<mark>${match}</mark>`);
        
        if (newContent !== cleanContent) {
            noteEditor.innerHTML = newContent;
        }
    });


    // 5. Event Listeners
    newNoteBtn.addEventListener('click', createNewNote);
    deleteNoteBtn.addEventListener('click', deleteActiveNote);

    noteList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI' && e.target.dataset.id) {
            const noteId = parseInt(e.target.dataset.id);
            const noteToDisplay = notes.find(note => note.id === noteId);
            displayNote(noteToDisplay);
        }
    });

    noteTitle.addEventListener('input', updateActiveNote);
    noteEditor.addEventListener('input', updateActiveNote);

    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        const isHidden = sidebar.classList.contains('hidden');
        localStorage.setItem('floatnote-sidebar-hidden', isHidden);
        sidebarToggleBtn.textContent = isHidden ? '》' : '❮';
    });

    // 6. Initial Load
    loadNotes();
    if (notes.length > 0) {
        displayNote(notes[0]);
    } else {
        displayNote(null);
    }
    
    // 7. PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});