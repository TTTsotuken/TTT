// common.js の Wordbook が利用可能

const wordbookList = document.getElementById('wordbook-list');
const deleteSelectedButton = document.getElementById('delete-selected-button');
const wordbookTitle = document.getElementById('wordbook-title');

// =========================================================================
// 1. レンダリングとUI更新
// =========================================================================

function renderWordbook() {
    wordbookList.innerHTML = '';
    const words = wordbook.words;
    const wordCount = words.length;

    wordbookTitle.textContent = `単語帳リスト (${wordCount}件)`;

    if (wordCount === 0) {
        wordbookList.innerHTML = '<p class="text-gray-500 text-sm p-3">単語帳に登録された単語はありません。</p>';
        deleteSelectedButton.disabled = true;
        return;
    }

    words.forEach(item => {
        const li = document.createElement('li');
        li.className = 'p-3 flex justify-between items-center text-sm hover:bg-gray-50 transition duration-100';
        li.setAttribute('data-id', item.id);
        li.innerHTML = `
            <div class="flex items-center space-x-3 w-full">
                <input type="checkbox" data-id="${item.id}" class="word-checkbox form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out">
                <div class="flex-1">
                    <span class="font-bold text-indigo-700">${item.word}</span> 
                    <span class="text-gray-600">→</span> 
                    <span class="text-green-700">${item.translation}</span>
                    <p class="text-xs text-gray-400 mt-0.5">${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()}</p>
                </div>
                <button class="remove-single-button text-red-400 hover:text-red-600 p-1" data-id="${item.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        `;
        wordbookList.appendChild(li);
    });
    
    // イベントリスナーの再設定
    attachEventListeners();
    updateDeleteSelectedButton();
}


// =========================================================================
// 2. 削除ロジック
// =========================================================================

function updateDeleteSelectedButton() {
    const checkedCheckboxes = document.querySelectorAll('.word-checkbox:checked');
    deleteSelectedButton.disabled = checkedCheckboxes.length === 0;
}

function deleteSelectedWords() {
    const checkedCheckboxes = document.querySelectorAll('.word-checkbox:checked');
    // data-id属性から文字列としてIDを取得
    const idsToDelete = Array.from(checkedCheckboxes).map(cb => cb.getAttribute('data-id'));
    
    if (idsToDelete.length > 0) {
        wordbook.removeSelected(idsToDelete);
        renderWordbook(); // 削除後に再描画
    }
}

function handleSingleRemove(e) {
    const id = e.currentTarget.getAttribute('data-id'); 
    wordbook.remove(id); // common.js の remove は内部でNumberに変換
    renderWordbook(); // 削除後に再描画
}

// =========================================================================
// 3. イベントリスナー設定
// =========================================================================

function attachEventListeners() {
    // チェックボックスのイベントリスナー設定
    document.querySelectorAll('.word-checkbox').forEach(checkbox => {
        checkbox.removeEventListener('change', updateDeleteSelectedButton); // 重複防止
        checkbox.addEventListener('change', updateDeleteSelectedButton);
    });
    
    // 単体削除ボタンのイベントリスナー設定
    document.querySelectorAll('.remove-single-button').forEach(button => {
        button.removeEventListener('click', handleSingleRemove); // 重複防止
        button.addEventListener('click', handleSingleRemove);
    });
}


// 初期ロード時の処理
window.addEventListener('load', () => {
    deleteSelectedButton.addEventListener('click', deleteSelectedWords);
    renderWordbook();
});