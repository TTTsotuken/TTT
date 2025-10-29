// メインアプリケーション
class TranslationChatApp {
  constructor() {
    this.state = {
      screen: 'login',
      loginTab: 'login',
      roomId: '',
      password: '',
      confirmPassword: '',
      userName: '',
      userLanguage: 'ja',
      message: '',
      messages: [],
      roomUsers: [],
      isRecording: false,
      isTranslating: false,
      error: '',
      success: ''
    };
    
    this.inactivityTimer = null;
    this.recognition = null;
  }

  async init() {
    try {
      await firebaseService.initialize();
      this.render();
      this.setupBeforeUnload();
    } catch (error) {
      console.error('初期化エラー:', error);
      this.showError('アプリの初期化に失敗しました');
    }
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  showError(message) {
    this.setState({ error: message });
    setTimeout(() => this.setState({ error: '' }), 5000);
  }

  showSuccess(message) {
    this.setState({ success: message });
    setTimeout(() => this.setState({ success: '' }), 3000);
  }

  // タブを閉じる時の処理
  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      if (authService.currentRoom && authService.currentUser) {
        authService.leaveRoom();
      }
    });
  }

  // 非アクティブタイマー設定
  setupInactivityTimer() {
    const resetTimer = () => {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      
      this.inactivityTimer = setTimeout(() => {
        this.showError('15分間操作がなかったため、自動的にログアウトします。');
        setTimeout(() => this.handleLogout(), 2000);
      }, CONFIG.app.inactivityTimeout);
    };

    resetTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });
  }

  // ログイン処理
  async handleLogin() {
    const { roomId, password, userName, userLanguage } = this.state;

    if (!roomId || !password || !userName) {
      this.showError('全ての項目を入力してください');
      return;
    }

    try {
      const result = await authService.joinRoom(roomId, password, userName, userLanguage);
      
      this.showSuccess(
        result.action === 'created' ? '新しいルームを作成しました！' :
        result.action === 'rejoined' ? 'ルームに再接続しました！' :
        'ルームに参加しました！'
      );

      this.setState({ screen: 'chat' });
      
      // リアルタイム監視開始
      this.startWatching();
      this.setupInactivityTimer();
      
    } catch (error) {
      this.showError(error.message);
    }
  }

  // リアルタイム監視開始
  startWatching() {
    const roomId = authService.currentRoom.roomId;

    // メッセージ監視
    chatService.watchMessages(roomId, (messages) => {
      this.setState({ messages });
    });

    // ユーザー監視
    chatService.watchUsers(roomId, (users) => {
      this.setState({ roomUsers: users });
    });

    // ルーム削除監視
    chatService.watchRoom(roomId, (exists) => {
      if (!exists && this.state.screen === 'chat') {
        this.showError('ルームが削除されました。ログアウトします。');
        setTimeout(() => this.handleLogout(), 2000);
      }
    });
  }

  // メッセージ送信
  async handleSendMessage() {
    const { message, roomUsers } = this.state;
    
    if (!message.trim()) return;

    const otherUser = roomUsers.find(u => u.name !== authService.currentUser.userName);
    if (!otherUser) {
      this.showError('相手がまだ参加していません');
      return;
    }

    try {
      this.setState({ isTranslating: true });
      
      await chatService.sendMessage(
        authService.currentRoom.roomId,
        authService.currentUser.userName,
        authService.currentUser.userLanguage,
        message,
        otherUser.language
      );

      this.setState({ message: '', isTranslating: false });
    } catch (error) {
      this.setState({ isTranslating: false });
      this.showError('メッセージの送信に失敗しました');
    }
  }

  // 音声認識開始
  startRecording() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.showError('お使いのブラウザは音声認識に対応していません');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.state.userLanguage;
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.setState({ isRecording: true });
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.setState({ message: transcript });
      setTimeout(() => this.setState({ isRecording: false }), 100);
    };

    this.recognition.onerror = () => {
      this.showError('音声認識エラー');
      this.setState({ isRecording: false });
    };

    this.recognition.onend = () => {
      this.setState({ isRecording: false });
    };

    this.recognition.start();
  }

  stopRecording() {
    if (this.recognition) {
      this.recognition.stop();
      this.setState({ isRecording: false });
    }
  }

  // ログアウト
  async handleLogout() {
    chatService.unwatchAll();
    await authService.leaveRoom();
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.setState({
      screen: 'login',
      roomId: '',
      password: '',
      messages: [],
      roomUsers: [],
      error: ''
    });
  }

  // ルーム削除
  async handleDeleteRoom() {
    const { roomId, password, confirmPassword } = this.state;

    if (!roomId || !password || !confirmPassword) {
      this.showError('全ての項目を入力してください');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('パスワードが一致しません');
      return;
    }

    try {
      await authService.deleteRoom(roomId, password);
      this.showSuccess('ルームを削除しました');
      this.setState({ roomId: '', password: '', confirmPassword: '' });
    } catch (error) {
      this.showError(error.message);
    }
  }

  // メッセージ削除
  async handleClearMessages() {
    if (!confirm('このルームの全メッセージを削除しますか？')) return;

    try {
      await authService.clearMessages(authService.currentRoom.roomId);
      this.showSuccess('メッセージを削除しました');
    } catch (error) {
      this.showError('メッセージの削除に失敗しました');
    }
  }

  // レンダリング
  render() {
    const app = document.getElementById('app');
    
    if (this.state.screen === 'login') {
      app.innerHTML = this.renderLoginScreen();
      this.attachLoginEvents();
    } else {
      app.innerHTML = this.renderChatScreen();
      this.attachChatEvents();
      this.scrollToBottom();
    }
  }

  renderLoginScreen() {
    const { loginTab, roomId, password, confirmPassword, userName, userLanguage, error, success } = this.state;
    
    return `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800">🌍 翻訳チャット</h1>
            <p class="text-sm text-purple-600 mt-2">✨ Gemini AI搭載</p>
          </div>

          <div class="flex mb-6 border-b border-gray-200">
            <button id="tab-login" class="flex-1 py-3 font-medium ${loginTab === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}">
              ログイン
            </button>
            <button id="tab-delete" class="flex-1 py-3 font-medium ${loginTab === 'delete' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}">
              ルーム削除
            </button>
          </div>

          ${error ? `<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">${error}</div>` : ''}
          ${success ? `<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">${success}</div>` : ''}

          ${loginTab === 'login' ? `
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">ルームID</label>
                <input type="text" id="roomId" value="${roomId}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="例: room123">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
                <input type="password" id="password" value="${password}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">ユーザー名</label>
                <input type="text" id="userName" value="${userName}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="例: 太郎">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">あなたの言語</label>
                <select id="userLanguage" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  ${CONFIG.languages.map(lang => `<option value="${lang.code}" ${userLanguage === lang.code ? 'selected' : ''}>${lang.name}</option>`).join('')}
                </select>
              </div>
              <button id="btn-login" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">
                ルームに入る
              </button>
            </div>
          ` : `
            <div class="space-y-4">
              <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <p class="font-medium mb-2">⚠️ 警告</p>
                <p class="text-xs">ルームを削除すると、全てのデータが完全に削除されます。</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">削除するルームID</label>
                <input type="text" id="deleteRoomId" value="${roomId}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="例: room123">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
                <input type="password" id="deletePassword" value="${password}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">パスワード（確認）</label>
                <input type="password" id="confirmPassword" value="${confirmPassword}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••">
              </div>
              <button id="btn-delete-room" class="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700">
                ルームを完全に削除
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderChatScreen() {
    const { messages, roomUsers, message, isRecording, isTranslating, error, success } = this.state;
    const roomId = authService.currentRoom?.roomId || '';
    const userName = authService.currentUser?.userName || '';
    const userLanguage = authService.currentUser?.userLanguage || 'ja';
    const langName = CONFIG.languages.find(l => l.code === userLanguage)?.name || '';

    return `
      <div class="flex flex-col h-screen bg-gray-100">
        <div class="bg-indigo-600 text-white p-4 shadow-lg">
          <div class="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h2 class="font-bold text-lg">ルーム: ${roomId} <span class="text-xs bg-purple-500 px-2 py-1 rounded ml-2">✨ Gemini</span></h2>
              <p class="text-sm text-indigo-200">${userName} (${langName}) • ${roomUsers.length}人参加中</p>
            </div>
            <div class="flex gap-2">
              <button id="btn-clear" class="p-2 hover:bg-indigo-700 rounded-lg" title="メッセージ削除">🗑️</button>
              <button id="btn-logout" class="p-2 hover:bg-indigo-700 rounded-lg" title="ログアウト">🚪</button>
            </div>
          </div>
        </div>

        ${roomUsers.length < 2 ? '<div class="bg-yellow-50 border-b border-yellow-200 p-3 text-center text-yellow-800 text-sm">相手の参加を待っています... (1/2人)</div>' : ''}
        ${isTranslating ? '<div class="bg-purple-50 border-b border-purple-200 p-3 text-center text-purple-700 text-sm">✨ Gemini AIで翻訳中...</div>' : ''}
        ${error ? `<div class="bg-red-50 border-b border-red-200 p-3 text-center text-red-700 text-sm">${error}</div>` : ''}
        ${success ? `<div class="bg-green-50 border-b border-green-200 p-3 text-center text-green-700 text-sm">${success}</div>` : ''}

        <div class="flex-1 overflow-y-auto p-4" id="messages-container">
          <div class="max-w-4xl mx-auto space-y-4">
            ${messages.length === 0 ? `
              <div class="text-center text-gray-500 py-12">
                <div class="text-6xl mb-4">💬</div>
                <p class="text-lg font-medium">まだメッセージがありません</p>
                <p class="text-sm mt-2">Gemini AIが自然な翻訳で会話をサポートします！</p>
              </div>
            ` : messages.map(msg => {
              const isOwn = msg.sender === userName;
              return `
                <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
                  <div class="max-w-xs lg:max-w-md rounded-2xl p-4 ${isOwn ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-md'}">
                    <div class="font-medium text-sm mb-1">${msg.sender}</div>
                    <div class="break-words">${isOwn ? msg.originalText : msg.translatedText}</div>
                    ${!isOwn && msg.originalText !== msg.translatedText ? `
                      <div class="text-xs mt-2 pt-2 border-t ${isOwn ? 'border-indigo-400 text-indigo-200' : 'border-gray-200 text-gray-500'}">
                        原文: ${msg.originalText}
                      </div>
                    ` : ''}
                    <div class="text-xs mt-2 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}">
                      ${msg.timestamp ? new Date(msg.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="bg-white border-t border-gray-200 p-4">
          <div class="max-w-4xl mx-auto">
            ${roomUsers.length < 2 ? '<div class="mb-2 text-center text-sm text-yellow-700 bg-yellow-50 py-2 px-4 rounded-lg">⚠️ 相手が参加するまでメッセージは送信できません</div>' : ''}
            <div class="flex gap-2">
              <button id="btn-mic" class="p-3 rounded-lg ${isRecording ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'} ${roomUsers.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}" ${roomUsers.length < 2 ? 'disabled' : ''}>
                ${isRecording ? '🎙️' : '🎤'}
              </button>
              <input type="text" id="message-input" value="${message}" placeholder="${isTranslating ? '翻訳中...' : roomUsers.length < 2 ? '相手の参加を待っています...' : 'メッセージを入力...'}" 
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg ${roomUsers.length < 2 || isTranslating ? 'bg-gray-100' : ''}" 
                ${roomUsers.length < 2 || isTranslating ? 'disabled' : ''}>
              <button id="btn-send" class="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 ${!message.trim() || roomUsers.length < 2 || isTranslating ? 'opacity-50 cursor-not-allowed' : ''}" 
                ${!message.trim() || roomUsers.length < 2 || isTranslating ? 'disabled' : ''}>
                ➤
              </button>
            </div>
            <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Enterキーで送信</span>
              <span>✨ Gemini AI • 接続中</span>
            </div>
          </div>
        </div>
      </div>
      ` : `


        
              <button id="btn-login" class="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">入室 / 作成</button>
            </div>
          ` : `
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">ルームID</label>
                <input type="text" id="roomId" value="${roomId}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="例: room123">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
                <input type="password" id="password" value="${password}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">確認用パスワード</label>
                <input type="password" id="confirmPassword" value="${confirmPassword}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="もう一度入力">
              </div>
              <button id="btn-delete-room" class="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition">ルーム削除</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  attachLoginEvents() {
    document.getElementById('tab-login').addEventListener('click', () => this.setState({ loginTab: 'login' }));
    document.getElementById('tab-delete').addEventListener('click', () => this.setState({ loginTab: 'delete' }));
    
    const btnLogin = document.getElementById('btn-login');
    const btnDelete = document.getElementById('btn-delete-room');

    if (btnLogin) {
      btnLogin.addEventListener('click', () => {
        this.setState({
          roomId: document.getElementById('roomId').value.trim(),
          password: document.getElementById('password').value.trim(),
          userName: document.getElementById('userName').value.trim(),
          userLanguage: document.getElementById('userLanguage').value
        });
        this.handleLogin();
      });
    }

    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        this.setState({
          roomId: document.getElementById('roomId').value.trim(),
          password: document.getElementById('password').value.trim(),
          confirmPassword: document.getElementById('confirmPassword').value.trim()
        });
        this.handleDeleteRoom();
      });
    }
  }

  renderChatScreen() {
    const { messages, message, isRecording, isTranslating, roomUsers, error, success } = this.state;
    const userName = authService.currentUser?.userName || '';
    const otherUser = roomUsers.find(u => u.name !== userName);
    const otherLangName = otherUser ? otherUser.language : '相手未参加';

    return `
      <div class="flex flex-col h-screen bg-gray-100">
        <div class="bg-white shadow p-4 flex justify-between items-center">
          <div>
            <h2 class="text-lg font-semibold text-gray-800">💬 ルーム: ${authService.currentRoom.roomId}</h2>
            <p class="text-sm text-gray-500">相手の言語: ${otherLangName}</p>
          </div>
          <div class="flex gap-2">
            <button id="btn-clear" class="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600">全削除</button>
            <button id="btn-logout" class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600">ログアウト</button>
          </div>
        </div>

        <div id="chatArea" class="flex-1 overflow-y-auto p-4 space-y-3">
          ${messages.map(msg => `
            <div class="flex ${msg.sender === userName ? 'justify-end' : 'justify-start'}">
              <div class="max-w-xs bg-${msg.sender === userName ? 'indigo' : 'gray'}-200 p-3 rounded-2xl shadow">
                <p class="text-sm text-gray-700"><strong>${msg.sender}</strong></p>
                <p class="text-gray-800">${msg.originalText}</p>
                <p class="text-xs text-gray-500 mt-1">→ ${msg.translatedText}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="bg-white p-4 shadow flex items-center gap-2">
          <input id="messageInput" type="text" value="${message}" placeholder="メッセージを入力..." class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none">
          <button id="btn-mic" class="p-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-200'}">
            🎤
          </button>
          <button id="btn-send" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            ${isTranslating ? '翻訳中...' : '送信'}
          </button>
        </div>

        ${error ? `<div class="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg">${error}</div>` : ''}
        ${success ? `<div class="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg">${success}</div>` : ''}
      </div>
    `;
  }

  attachChatEvents() {
    document.getElementById('btn-logout').addEventListener('click', () => this.handleLogout());
    document.getElementById('btn-send').addEventListener('click', () => this.handleSendMessage());
    document.getElementById('btn-clear').addEventListener('click', () => this.handleClearMessages());

    const input = document.getElementById('messageInput');
    input.addEventListener('input', (e) => this.setState({ message: e.target.value }));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSendMessage();
    });

    const micButton = document.getElementById('btn-mic');
    micButton.addEventListener('click', () => {
      if (this.state.isRecording) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });
  }

  scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }
}

// アプリ初期化
const app = new TranslationChatApp();
window.addEventListener('DOMContentLoaded', () => app.init());
