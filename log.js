// common.js の logManager が利用可能

const logList = document.getElementById('log-list');
const clearAllButton = document.getElementById('clear-all-button');
// 🚨 新しい要素を定義
const deleteSelectedButton = document.getElementById('delete-selected-button');
const logTitle = document.getElementById('log-title');

let selectedLogIds = new Set(); // 選択されたログのIDを保持

// =========================================================================
// 1. レンダリングとUI更新
// =========================================================================

function renderLog() {
    logList.innerHTML = '';
    const logs = logManager.logs;
    const logCount = logs.length;

    logTitle.textContent = `翻訳ログ (${logCount}件)`; // ログ件数表示を更新

    if (logCount === 0) {
        logList.innerHTML = '<p class="text-gray-500 text-sm p-3">翻訳ログはまだありません。</p>';
        clearAllButton.disabled = true;
        deleteSelectedButton.disabled = true;
        return;
    }
    
    clearAllButton.disabled = false;
    
    // 既存の選択状態をクリア
    selectedLogIds.clear();
    updateDeleteButtonState();

    logs.forEach(item => {
        const li = document.createElement('li');
        li.className = 'p-4 border-b hover:bg-gray-50 transition duration-100 flex items-start';
        li.setAttribute('data-id', item.id);
        
        // 🚨 チェックボックス (複数削除用)
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mt-1 mr-3 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 flex-shrink-0';
        checkbox.setAttribute('data-id', item.id);
        checkbox.addEventListener('change', handleCheckboxChange);

        // ログ情報
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 min-w-0 mr-4'; // マージンを追加
        
        const date = new Date(item.date).toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        infoDiv.innerHTML = `
            <div class="text-xs text-gray-500 mb-1">${date} - ${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()} ${item.isImage ? ' (画像)' : ''}</div>
            <p class="text-gray-800 font-medium break-words mb-1">
                <span class="text-indigo-600">元:</span> ${item.sourceText}
            </p>
            <p class="text-green-600 break-words">
                <span class="text-indigo-600">訳:</span> ${item.translatedText}
            </p>
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
        logList.appendChild(li);
    });
}

// 🚨 複数削除ボタンの状態を更新
function updateDeleteButtonState() {
    const count = selectedLogIds.size;
    deleteSelectedButton.disabled = count === 0;
    deleteSelectedButton.textContent = count > 0 ? `選択したログを削除 (${count})` : '選択したログを削除';
}

// =========================================================================
// 2. イベントハンドラ
// =========================================================================

// 🚨 チェックボックスの変更処理
function handleCheckboxChange(event) {
    const id = event.target.getAttribute('data-id');
    if (event.target.checked) {
        selectedLogIds.add(id);
    } else {
        selectedLogIds.delete(id);
    }
    updateDeleteButtonState();
}

// 🚨 個別削除のロジック
function handleDeleteSingle(event) {
    const id = event.currentTarget.getAttribute('data-id');
    if (confirm('この翻訳ログを削除しますか？')) {
        logManager.remove(id); 
        renderLog();
    }
}

// 🚨 複数削除のロジック
function handleDeleteSelected() {
    if (selectedLogIds.size === 0) return;

    if (confirm(`${selectedLogIds.size}件の翻訳ログを削除しますか？`)) {
        logManager.removeSelected(Array.from(selectedLogIds)); 
        renderLog();
    }
}

function handleClearAll() {
    if (confirm('全ての翻訳ログを削除してもよろしいですか？この操作は元に戻せません。')) {
        logManager.clearLogs();
        renderLog();
    }
}

// =========================================================================
// 3. イベントリスナー設定
// =========================================================================

window.addEventListener('DOMContentLoaded', () => {
    renderLog();
    clearAllButton.addEventListener('click', handleClearAll);
    // 🚨 複数選択削除のイベントリスナーを追加
    deleteSelectedButton.addEventListener('click', handleDeleteSelected); 
});