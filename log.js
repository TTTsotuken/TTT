// common.js の logManager が利用可能

const logList = document.getElementById('log-list');
const clearLogButton = document.getElementById('clear-log-button');
const logTitle = document.getElementById('log-title');

// =========================================================================
// 1. レンダリングとUI更新
// =========================================================================

function renderLogs() {
    logList.innerHTML = '';
    const logs = logManager.logs;
    const logCount = logs.length;

    logTitle.textContent = `翻訳ログ (${logCount}件)`;

    if (logCount === 0) {
        logList.innerHTML = '<p class="text-gray-500 text-sm p-3">翻訳ログはまだありません。</p>';
        clearLogButton.disabled = true;
        return;
    }
    
    clearLogButton.disabled = false;

    logs.forEach(log => {
        const li = document.createElement('li');
        li.className = 'p-3 border-b hover:bg-gray-50 transition duration-100';
        li.setAttribute('data-id', log.id);

        const date = new Date(log.date);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

        // ログの内容表示
        li.innerHTML = `
            <div class="text-xs text-gray-400 mb-1">${formattedDate}</div>
            <div class="text-sm font-semibold mb-1">
                <span class="text-indigo-600">${log.sourceLang.toUpperCase()}</span> → 
                <span class="text-green-600">${log.targetLang.toUpperCase()}</span>
            </div>
            <div class="bg-gray-100 p-2 rounded text-sm whitespace-pre-wrap">
                <p class="font-bold text-gray-700 mb-1">${log.isImage ? '🖼️ [画像翻訳]' : '原文'}: ${log.sourceText}</p>
                <p class="text-gray-600">翻訳: ${log.translatedText}</p>
            </div>
        `;
        logList.appendChild(li);
    });
}

// =========================================================================
// 2. ログ削除ロジック
// =========================================================================

function handleClearLogs() {
    if (confirm("本当に全ての翻訳ログを削除しますか？この操作は元に戻せません。")) {
        logManager.clearLogs();
        renderLogs(); 
    }
}

// =========================================================================
// 3. イベントリスナー設定
// =========================================================================

window.addEventListener('load', () => {
    clearLogButton.addEventListener('click', handleClearLogs);
    renderLogs();
});