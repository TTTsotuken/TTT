// common.js の wordbook が利用可能

const wordbookList = document.getElementById('wordbook-list');
const deleteSelectedButton = document.getElementById('delete-selected-button');
const wordbookTitle = document.getElementById('wordbook-title');

let selectedWordIds = new Set(); // 選択された単語のIDを保持

// =========================================================================
// 1. レンダリングとUI更新
// =========================================================================

function renderWordbook() {
    wordbookList.innerHTML = '';
    const words = wordbook.words; // 永続化データを使用
    const wordCount = words.length;

    wordbookTitle.textContent = `単語帳リスト (${wordCount}件)`;

    if (wordCount === 0) {
        wordbookList.innerHTML = '<p class="text-gray-500 text-sm p-3">単語帳に登録された単語はありません。</p>';
        deleteSelectedButton.disabled = true;
        return;
    }
    
    // 既存の選択状態をクリア
    selectedWordIds.clear();
    updateDeleteButtonState();

    words.forEach(item => {
        const li = document.createElement('li');
        li.className = 'p-3 border-b flex items-center hover:bg-gray-50 transition duration-100';
        li.setAttribute('data-id', item.id);

        // チェックボックス (複数削除用)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mr-3 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0';
        checkbox.setAttribute('data-id', item.id);
        checkbox.addEventListener('change', handleCheckboxChange);

        // 単語情報
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 min-w-0 mr-4'; // マージンを追加
        infoDiv.innerHTML = `
            <div class="flex items-baseline">
                <span class="text-lg font-bold text-gray-800 break-words">${item.word}</span>
                <span class="ml-2 text-sm text-gray-400">(${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()})</span>
            </div>
            <p class="text-green-600 break-words">${item.translation}</p>
        `;
        
        // 🚨 個別削除ボタンを追加 🚨
        const deleteSingleButton = document.createElement('button');
        deleteSingleButton.className = 'p-1 ml-auto text-gray-400 hover:text-red-500 transition duration-150 flex-shrink-0';
        deleteSingleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        `;
        deleteSingleButton.setAttribute('data-id', item.id);
        deleteSingleButton.addEventListener('click', handleDeleteSingle);
        
        li.appendChild(checkbox);
        li.appendChild(infoDiv);
        li.appendChild(deleteSingleButton); // ボタンをリスト項目の最後に追加
        wordbookList.appendChild(li);
    });
}

function updateDeleteButtonState() {
    const count = selectedWordIds.size;
    deleteSelectedButton.disabled = count === 0;
    deleteSelectedButton.textContent = count > 0 ? `選択した単語を削除 (${count})` : '選択した単語を削除';
}

// =========================================================================
// 2. イベントハンドラ
// =========================================================================

function handleCheckboxChange(event) {
    const id = event.target.getAttribute('data-id');
    if (event.target.checked) {
        selectedWordIds.add(id);
    } else {
        selectedWordIds.delete(id);
    }
    updateDeleteButtonState();
}

// 🚨 個別削除のロジック
function handleDeleteSingle(event) {
    const id = event.currentTarget.getAttribute('data-id');
    if (confirm('この単語を単語帳から削除しますか？')) {
        wordbook.remove(id); 
        renderWordbook();
    }
}

// 複数削除のロジック
function handleDeleteSelected() {
    if (selectedWordIds.size === 0) return;

    if (confirm(`${selectedWordIds.size}件の単語を単語帳から削除しますか？`)) {
        wordbook.removeSelected(Array.from(selectedWordIds)); 
        renderWordbook();
    }
}

// =========================================================================
// 3. イベントリスナー設定
// =========================================================================

window.addEventListener('DOMContentLoaded', () => { 
    renderWordbook(); 
    deleteSelectedButton.addEventListener('click', handleDeleteSelected);
});

window.updateWordbookView = renderWordbook;