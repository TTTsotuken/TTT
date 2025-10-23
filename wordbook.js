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
    
    selectedWordIds.clear();
    updateDeleteButtonState();

    words.forEach(item => {
        const li = document.createElement('li');
        li.className = 'p-3 border-b flex items-center hover:bg-gray-50 transition duration-100';
        li.setAttribute('data-id', item.id);

        // チェックボックス
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'mr-3 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500';
        checkbox.setAttribute('data-id', item.id);
        checkbox.addEventListener('change', handleCheckboxChange);

        // 単語情報
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 min-w-0';
        infoDiv.innerHTML = `
            <div class="flex items-baseline">
                <span class="text-lg font-bold text-gray-800 break-words">${item.word}</span>
                <span class="ml-2 text-sm text-gray-400">(${item.sourceLang.toUpperCase()} → ${item.targetLang.toUpperCase()})</span>
            </div>
            <p class="text-green-600 break-words">${item.translation}</p>
        `;
        
        li.appendChild(checkbox);
        li.appendChild(infoDiv);
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

// 🚨 修正: HTML要素がDOMツリーに構築された時点でレンダリングを実行
window.addEventListener('DOMContentLoaded', () => { 
    renderWordbook(); 
    deleteSelectedButton.addEventListener('click', handleDeleteSelected);
});

window.updateWordbookView = renderWordbook;