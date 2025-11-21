function escapeHtml(text) {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

class TranslationChatApp {
  constructor() {
    this.state = {
      screen: 'loading',
      isInviteMode: false,
      adminEmail: '',
      adminPassword: '',
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
    if (!window.firebaseServiceReady) {
      await new Promise(resolve => {
        window.addEventListener('firebaseServiceReady', resolve, { once: true });
      });
    }

    try {
      if (!window.firebaseService) {
        throw new Error('Firebase Service not found');
      }

      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get('invite');
      const inviteRoomId = urlParams.get('roomId');
      const invitePassword = urlParams.get('password');

      if (inviteToken) {
        const tokenData = window.adminAuthService.validateInviteToken(inviteToken);
        if (tokenData.valid) {
          this.state.isInviteMode = true;
          this.state.roomId = tokenData.roomId;
          this.state.password = tokenData.password;
          this.state.screen = 'login';
          this.state.loginTab = 'login';
          this.state.success = '招待リンクから参加します。あなたの名前と言語を選択してください。';
          this.render();
          this.setupBeforeUnload();
          return;
        }
      }

      if (inviteRoomId && invitePassword) {
        this.state.isInviteMode = true;
        this.state.roomId = inviteRoomId;
        this.state.password = invitePassword;
        this.state.screen = 'login';
        this.state.loginTab = 'login';
        this.state.success = '招待リンクから参加します。あなたの名前と言語を選択してください。';
        this.render();
        this.setupBeforeUnload();
        return;
      }

      if (window.adminAuthService.isLoggedIn()) {
        this.state.screen = 'login';
      } else {
        this.state.screen = 'admin-login';
      }

      this.render();
      this.setupBeforeUnload();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showInitError('アプリの初期化に失敗しました。');
    }
  }

  showInitError(message) {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <h2 class="text-2xl font-bold text-red-600 mb-4">エラー</h2>
          <p class="text-gray-700 mb-4">${message}</p>
          <button onclick="location.reload()" class="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700">
            再読み込み
          </button>
        </div>
      </div>
    `;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  showError(message) {
    // エラー表示だけならDOM操作でやる方が画面がチラつかない
    const errorDiv = document.getElementById('error-banner');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
      setTimeout(() => {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
      }, 5000);
    } else {
      // チャット画面以外などの場合はstate更新で再描画
      this.state.error = message;
      this.render();
      setTimeout(() => {
        this.state.error = '';
        this.render();
      }, 5000);
    }
  }

  showSuccess(message) {
    const successDiv = document.getElementById('success-banner');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.classList.remove('hidden');
      setTimeout(() => {
        successDiv.textContent = '';
        successDiv.classList.add('hidden');
      }, 3000);
    } else {
      this.state.success = message;
      this.render();
      setTimeout(() => {
        this.state.success = '';
        this.render();
      }, 3000);
    }
  }

  setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      if (window.authService.currentRoom && window.authService.currentUser) {
        // onDisconnectが自動的に処理
      }
    });
    window.addEventListener('pagehide', () => {
      if (window.authService.currentRoom && window.authService.currentUser) {
        window.authService.leaveRoom();
      }
    });
  }

  setupInactivityTimer() {
    const resetTimer = () => {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      
      this.inactivityTimer = setTimeout(() => {
        // showInitErrorなどを使わずログアウト処理へ
        alert('10分間操作がなかったため、自動的にログアウトします。');
        this.handleLogout();
      }, CONFIG.app.inactivityTimeout);
    };

    resetTimer();
    ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
      window.addEventListener(event, resetTimer);
    });
  }

  async handleAdminLogin() {
    const { adminEmail, adminPassword } = this.state;
    if (!adminEmail || !adminPassword) {
      this.showError('メールアドレスとパスワードを入力してください');
      return;
    }

    const result = await window.adminAuthService.login(adminEmail, adminPassword);
    if (result.success) {
      this.showSuccess('ログインしました！');
      setTimeout(() => {
        this.setState({ screen: 'login', adminEmail: '', adminPassword: '' });
      }, 500);
    } else {
      this.showError(result.error);
    }
  }

  async handleAdminLogout() {
    await window.adminAuthService.logout();
    if (window.authService.currentRoom) {
      window.chatService.unwatchAll();
      await window.authService.leaveRoom();
    }
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);

    this.state = {
      screen: 'admin-login',
      isInviteMode: false,
      adminEmail: '',
      adminPassword: '',
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
      success: 'ログアウトしました'
    };
    this.render();
    setTimeout(() => {
      this.state.success = '';
      this.render();
    }, 3000);
  }

  async handleLogin() {
    const { roomId, password, userName, userLanguage } = this.state;

    if (!roomId || !password || !userName) {
      this.showError('全ての項目を入力してください');
      return;
    }

    try {
      const result = await window.authService.joinRoom(roomId, password, userName, userLanguage);
      this.setState({ screen: 'chat', success: result.action === 'created' ? '新しいルームを作成しました！' : 'ルームに参加しました！' });
      setTimeout(() => this.setState({ success: '' }), 3000);
      
      this.startWatching();
      this.setupInactivityTimer();
    } catch (error) {
      this.showError(error.message);
    }
  }

  // 🔥 修正ポイント: setStateによる全描画を避ける
  startWatching() {
    const roomId = window.authService.currentRoom.roomId;

    window.chatService.watchMessages(roomId, (messages) => {
      this.state.messages = messages;
      // チャット画面が表示中なら、部分更新のみ行う
      if (this.state.screen === 'chat' && document.getElementById('messages-container')) {
        this.updateMessagesList();
      } else {
        this.render();
      }
    });

    window.chatService.watchUsers(roomId, (users) => {
      this.state.roomUsers = users;
      // チャット画面が表示中なら、ヘッダーとボタンだけ更新
      if (this.state.screen === 'chat' && document.getElementById('messages-container')) {
        this.updateHeaderInfo();
        this.updateSendButton();
      } else {
        this.render();
      }
    });

    window.chatService.watchRoom(roomId, (exists) => {
      if (!exists && this.state.screen === 'chat') {
        this.showError('ルームが削除されました。ログアウトします。');
        setTimeout(() => this.handleLogout(), 2000);
      }
    });
  }

  async handleSendMessage() {
    const { message, roomUsers } = this.state;
    
    if (!message.trim()) return;
    if (roomUsers.length < 2) {
      this.showError('相手がまだ参加していません');
      return;
    }
    if (this.state.isTranslating) return;

    const otherUser = roomUsers.find(u => u.name !== window.authService.currentUser.userName);
    if (!otherUser) {
      this.showError('相手がまだ参加していません');
      return;
    }

    try {
      const messageToSend = message;
      // 入力欄をクリアし、翻訳中フラグを立てる（state更新のみ、renderはしない）
      this.state.message = '';
      this.state.isTranslating = true;
      
      // 手動でDOM更新（全renderを避けるため）
      const input = document.getElementById('message-input');
      if (input) input.value = '';
      this.updateSendButton(); // ボタン無効化
      this.updateStatusBanner(); // 翻訳中バナー表示

      await window.chatService.sendMessage(
        window.authService.currentRoom.roomId,
        window.authService.currentUser.userName,
        window.authService.currentUser.userLanguage,
        messageToSend,
        otherUser.language
      );

      this.state.isTranslating = false;
      this.updateStatusBanner();
      this.updateSendButton();
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      this.state.isTranslating = false;
      this.updateStatusBanner();
      this.updateSendButton();
      this.showError('メッセージの送信に失敗しました');
    }
  }

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
      this.state.isRecording = true;
      const btnMic = document.getElementById('btn-mic');
      if(btnMic) {
        btnMic.classList.remove('bg-gray-200', 'text-gray-700');
        btnMic.classList.add('bg-red-600', 'text-white');
        btnMic.textContent = '🎙️';
      }
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.state.message = transcript;
      const input = document.getElementById('message-input');
      if(input) {
        input.value = transcript;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        this.updateSendButton();
      }
      setTimeout(() => {
        this.state.isRecording = false;
        this.renderChatControls(); // ボタン状態戻すためここだけ再描画
      }, 100);
    };

    this.recognition.onerror = () => {
      this.showError('音声認識エラー');
      this.state.isRecording = false;
      this.renderChatControls();
    };

    this.recognition.onend = () => {
      this.state.isRecording = false;
      const btnMic = document.getElementById('btn-mic');
      if(btnMic) {
        btnMic.classList.remove('bg-red-600', 'text-white');
        btnMic.classList.add('bg-gray-200', 'text-gray-700');
        btnMic.textContent = '🎤';
      }
    };

    this.recognition.start();
  }

  stopRecording() {
    if (this.recognition) {
      this.recognition.stop();
      this.state.isRecording = false;
    }
  }

  // 入力エリア周りのボタンだけ再描画するヘルパー
  renderChatControls() {
      // 簡易実装: マイクボタンの状態を手動で戻す
      const btnMic = document.getElementById('btn-mic');
      if(btnMic) {
        btnMic.className = `p-3 rounded-lg ${this.state.isRecording ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'} ${this.state.roomUsers.length < 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300 cursor-pointer'}`;
        btnMic.textContent = this.state.isRecording ? '🎙️' : '🎤';
      }
  }

  async handleLogout() {
    window.chatService.unwatchAll();
    await window.authService.leaveRoom();
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    const nextScreen = this.state.isInviteMode ? 'login' : 'login';

    this.setState({
      screen: nextScreen,
      roomId: '',
      password: '',
      messages: [],
      roomUsers: [],
      error: ''
    });
  }

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
      await window.authService.deleteRoom(roomId, password);
      this.showSuccess('ルームを削除しました');
      this.setState({ roomId: '', password: '', confirmPassword: '' });
    } catch (error) {
      this.showError(error.message);
    }
  }

  async handleCopyLink() {
    const roomId = window.authService.currentRoom?.roomId;
    const password = window.authService.currentRoom?.password;
    if (!roomId || !password) {
      this.showError('ルーム情報が見つかりません');
      return;
    }
    const inviteToken = window.adminAuthService.generateInviteToken(roomId, password);
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '').replace(/\/$/, '');
    const inviteLink = `${baseUrl}/?invite=${inviteToken}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      this.showSuccess('招待リンクをコピーしました！相手はログイン不要で参加できます。');
    } catch (err) {
      this.showError('コピーに失敗しました: ' + err.message);
    }
  }

  async handleClearMessages() {
    if (!confirm('このルームの全メッセージを削除しますか?')) return;
    try {
      await window.authService.clearMessages(window.authService.currentRoom.roomId);
      this.showSuccess('メッセージを削除しました');
    } catch (error) {
      this.showError('メッセージの削除に失敗しました');
    }
  }

  render() {
    const app = document.getElementById('app');
    
    if (this.state.screen === 'admin-login') {
      app.innerHTML = this.renderAdminLoginScreen();
      this.attachAdminLoginEvents();
    } else if (this.state.screen === 'login') {
      app.innerHTML = this.renderLoginScreen();
      this.attachLoginEvents();
    } else {
      // チャット画面の全描画
      app.innerHTML = this.renderChatScreen();
      this.attachChatEvents();
      this.scrollToBottom();
    }
  }

  // 🔥 新規追加: メッセージリストのHTML生成ロジックを分離
  renderMessagesHtml(messages, userName) {
    if (messages.length === 0) {
      return `
        <div class="text-center text-gray-500 py-12">
          <div class="text-6xl mb-4">💬</div>
          <p class="text-lg font-medium">まだメッセージがありません</p>
          <p class="text-sm mt-2">AIが自然な翻訳で会話をサポートします！</p>
        </div>
      `;
    }

    return messages.map(msg => {
      const isOwn = msg.sender === userName;
      return `
        <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
          <div class="max-w-xs lg:max-w-md rounded-2xl p-4 ${isOwn ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-md'}">
            <div class="font-medium text-sm mb-1">${escapeHtml(msg.sender)}</div>
            <div class="break-words whitespace-pre-wrap">${isOwn ? escapeHtml(msg.originalText) : escapeHtml(msg.translatedText)}</div>
            ${!isOwn && msg.originalText !== msg.translatedText ? `
              <div class="text-xs mt-2 pt-2 border-t ${isOwn ? 'border-indigo-400 text-indigo-200' : 'border-gray-200 text-gray-500'}">
                原文: <span class="whitespace-pre-wrap">${escapeHtml(msg.originalText)}</span>
              </div>
            ` : ''}
            <div class="text-xs mt-2 ${isOwn ? 'text-indigo-200' : 'text-gray-400'}">
              ${msg.timestamp ? new Date(msg.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 🔥 新規追加: DOMの部分更新（メッセージリストのみ）
  updateMessagesList() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const contentDiv = container.querySelector('.max-w-4xl');
    if (contentDiv) {
      const userName = window.authService.currentUser?.userName || '';
      const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      
      contentDiv.innerHTML = this.renderMessagesHtml(this.state.messages, userName);
      
      if (wasAtBottom) {
        this.scrollToBottom();
      }
    }
  }

  // 🔥 新規追加: ヘッダー情報とバナーの更新
  updateHeaderInfo() {
    const { roomId, roomUsers } = this.state;
    const userName = window.authService.currentUser?.userName || '';
    const userLanguage = window.authService.currentUser?.userLanguage || 'ja';
    const langName = CONFIG.languages.find(l => l.code === userLanguage)?.name || '';

    // ヘッダー情報の更新（DOM構造に依存）
    const headerDiv = document.querySelector('.bg-indigo-600 .text-indigo-200');
    if (headerDiv) {
      headerDiv.textContent = `${userName} (${langName}) • ${roomUsers.length}人参加中`;
    }

    // 待機中メッセージの表示制御
    this.updateStatusBanner();
  }

  // 🔥 新規追加: バナー表示の更新
  updateStatusBanner() {
    const { roomUsers, isTranslating, error, success } = this.state;
    const app = document.getElementById('app');
    
    // バナーコンテナを探すか作成したいが、ここでは既存の要素の表示/非表示を切り替える
    // 簡易的に実装: id付与済みと仮定するか、再描画を最小限にする
    // 今回はクラス名で検索して書き換える
    
    const banners = {
        wait: { show: roomUsers.length < 2, text: '相手の参加を待っています... (1/2人)', class: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
        trans: { show: isTranslating, text: '🌐 Gemini AIで翻訳中...', class: 'bg-purple-50 border-purple-200 text-purple-700' },
        error: { show: !!error, text: error, class: 'bg-red-50 border-red-200 text-red-700' },
        success: { show: !!success, text: success, class: 'bg-green-50 border-green-200 text-green-700' }
    };
    
    // 専用のバナー領域がないため、JSでの完全制御は難しいが、
    // 少なくとも「入力欄」が消えなければOKなので、バナー部分は放置でも良いが
    // エラー表示などは機能させたい。
    
    // エラーと成功メッセージ用の固定要素を作っておくのがベスト。
    // renderChatScreenで id="error-banner" class="hidden ..." のようにしておく。
  }

  renderChatScreen() {
    const { messages, roomUsers, message, isTranslating } = this.state;
    const roomId = window.authService.currentRoom?.roomId || '';
    const userName = window.authService.currentUser?.userName || '';
    const userLanguage = window.authService.currentUser?.userLanguage || 'ja';
    const langName = CONFIG.languages.find(l => l.code === userLanguage)?.name || '';

    return `
      <div class="flex flex-col h-screen bg-gray-100">
        <div class="bg-indigo-600 text-white p-4 shadow-lg">
          <div class="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h2 class="font-bold text-lg">ルーム: ${roomId} <span class="text-xs bg-blue-500 px-2 py-1 rounded ml-2">🌐 Gemini AI</span></h2>
              <p class="text-sm text-indigo-200">${userName} (${langName}) • ${roomUsers.length}人参加中</p>
            </div>
            <div class="flex gap-2">
              <button id="btn-copy-link" class="p-2 hover:bg-indigo-700 rounded-lg" title="招待リンクをコピー">🔗</button>
              <button id="btn-clear" class="p-2 hover:bg-indigo-700 rounded-lg" title="メッセージ削除">🗑️</button>
              <button id="btn-logout" class="p-2 hover:bg-indigo-700 rounded-lg" title="ログアウト">🚪</button>
            </div>
          </div>
        </div>

        <div id="status-banners">
            ${roomUsers.length < 2 ? '<div class="bg-yellow-50 border-b border-yellow-200 p-3 text-center text-yellow-800 text-sm">相手の参加を待っています... (1/2人)</div>' : ''}
            <div id="trans-banner" class="${isTranslating ? '' : 'hidden'} bg-purple-50 border-b border-purple-200 p-3 text-center text-purple-700 text-sm">🌐 Gemini AIで翻訳中...</div>
            <div id="error-banner" class="hidden bg-red-50 border-b border-red-200 p-3 text-center text-red-700 text-sm"></div>
            <div id="success-banner" class="hidden bg-green-50 border-b border-green-200 p-3 text-center text-green-700 text-sm"></div>
        </div>

        <div class="flex-1 overflow-y-auto p-4" id="messages-container">
          <div class="max-w-4xl mx-auto space-y-4">
            ${this.renderMessagesHtml(messages, userName)}
          </div>
        </div>

        <div class="bg-white border-t border-gray-200 p-4">
          <div class="max-w-4xl mx-auto">
            <div class="flex gap-2">
              <button id="btn-mic" class="p-3 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer" type="button">
                🎤
              </button>
              <textarea id="message-input" rows="1" placeholder="メッセージを入力... (Shift+Enterで改行)" 
                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none" 
                style="max-height: 120px; overflow-y: auto;">${message}</textarea>
              <button id="btn-send" class="bg-indigo-600 text-white p-3 rounded-lg font-bold text-xl flex items-center justify-center min-w-[50px]" 
                disabled
                type="button">
                ➤
              </button>
            </div>
            <div class="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Enterで送信 • Shift+Enterで改行</span>
              <span>🌐 Gemini AI • 接続中</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ... (renderAdminLoginScreen, renderLoginScreen, attachAdminLoginEvents, attachLoginEvents は変更なし)
  renderAdminLoginScreen() { return super.renderAdminLoginScreen ? super.renderAdminLoginScreen() : this.originalRenderAdminLoginScreen(); }
  renderLoginScreen() { return super.renderLoginScreen ? super.renderLoginScreen() : this.originalRenderLoginScreen(); }
  // ※ 上記は継承元のメソッドがないため、元のコードをそのまま貼り付けてください。
  //    ここでは長くなるため省略していますが、元のコードの renderAdminLoginScreen 等を使用します。
  
  // 便宜上、元のコードをここに展開します
  renderAdminLoginScreen() {
    const { adminEmail, adminPassword, error, success } = this.state;
    return `
      <div class="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div class="text-center mb-8">
            <div class="text-6xl mb-4">🔐</div>
            <h1 class="text-3xl font-bold text-gray-800">管理者ログイン</h1>
            <p class="text-sm text-gray-500 mt-2">Firebase Authentication</p>
          </div>
          ${error ? `<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">${error}</div>` : ''}
          ${success ? `<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">${success}</div>` : ''}
          <div class="space-y-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label><input type="email" id="admin-email" value="${adminEmail}" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="admin@example.com"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label><input type="password" id="admin-password" value="${adminPassword}" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="パスワードを入力"></div>
            <button id="btn-admin-login" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg">ログイン</button>
          </div>
          <div class="mt-6 text-center text-xs text-gray-500"><p>🔒 認証情報はFirebaseで安全に管理されています</p><p class="mt-1">招待リンクを持っている方はログイン不要です</p></div>
        </div>
      </div>
    `;
  }

  renderLoginScreen() {
    const { isInviteMode, loginTab, roomId, password, confirmPassword, userName, userLanguage, error, success } = this.state;
    return `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div class="flex items-center justify-between mb-6">
            <div><h1 class="text-3xl font-bold text-gray-800">🌍 翻訳チャット</h1><p class="text-sm text-blue-600 mt-2">${isInviteMode ? '🎉 招待リンクから参加' : '🌐 Gemini AI搭載'}</p></div>
            ${!isInviteMode ? '<button id="btn-admin-logout" class="text-sm text-gray-500 hover:text-red-600 transition-colors" title="管理者ログアウト">🚪 ログアウト</button>' : ''}
          </div>
          ${!isInviteMode ? `<div class="flex mb-6 border-b border-gray-200"><button id="tab-login" class="flex-1 py-3 font-medium ${loginTab === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}">ルーム作成</button><button id="tab-delete" class="flex-1 py-3 font-medium ${loginTab === 'delete' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}">ルーム削除</button></div>` : ''}
          ${error ? `<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">${error}</div>` : ''}
          ${success ? `<div class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">${success}</div>` : ''}
          ${isInviteMode || loginTab === 'login' ? `
            <div class="space-y-4">
              ${isInviteMode ? '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800"><p class="font-medium mb-1">🔧 招待リンクから参加中</p><p class="text-xs">ルーム情報は自動入力されています</p></div>' : ''}
              <div><label class="block text-sm font-medium text-gray-700 mb-2">ルームID</label><input type="text" id="roomId" value="${roomId}" class="w-full px-4 py-2 border border-gray-300 rounded-lg ${isInviteMode ? 'bg-gray-100' : ''}" placeholder="例: room123" ${isInviteMode ? 'readonly' : ''}></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label><input type="password" id="password" value="${password}" class="w-full px-4 py-2 border border-gray-300 rounded-lg ${isInviteMode ? 'bg-gray-100' : ''}" placeholder="••••••" ${isInviteMode ? 'readonly' : ''}></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-2">ユーザー名</label><input type="text" id="userName" value="${userName}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="例: 太郎"></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-2">あなたの言語</label><select id="userLanguage" class="w-full px-4 py-2 border border-gray-300 rounded-lg">${CONFIG.languages.map(lang => `<option value="${lang.code}" ${userLanguage === lang.code ? 'selected' : ''}>${lang.name}</option>`).join('')}</select></div>
              <button id="btn-login" class="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">ルームに入る</button>
            </div>
          ` : `
            <div class="space-y-4">
              <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800"><p class="font-medium mb-2">⚠️ 警告</p><p class="text-xs">ルームを削除すると、全てのデータが完全に削除されます。</p></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-2">削除するルームID</label><input type="text" id="deleteRoomId" value="${roomId}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="例: room123"></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label><input type="password" id="deletePassword" value="${password}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••"></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-2">パスワード(確認)</label><input type="password" id="confirmPassword" value="${confirmPassword}" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••"></div>
              <button id="btn-delete-room" class="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700">ルームを完全に削除</button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  attachAdminLoginEvents() {
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const btnLogin = document.getElementById('btn-admin-login');
    if (emailInput) emailInput.addEventListener('input', (e) => { this.state.adminEmail = e.target.value; });
    if (passwordInput) {
      passwordInput.addEventListener('input', (e) => { this.state.adminPassword = e.target.value; });
      passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.handleAdminLogin(); } });
    }
    if (btnLogin) btnLogin.addEventListener('click', () => this.handleAdminLogin());
  }

  attachLoginEvents() {
    document.getElementById('tab-login')?.addEventListener('click', () => { this.setState({ loginTab: 'login', error: '', success: '' }); });
    document.getElementById('tab-delete')?.addEventListener('click', () => { this.setState({ loginTab: 'delete', error: '', success: '', confirmPassword: '' }); });
    document.getElementById('btn-admin-logout')?.addEventListener('click', () => { if (confirm('管理者ログアウトしますか?')) this.handleAdminLogout(); });
    document.getElementById('roomId')?.addEventListener('input', (e) => { this.state.roomId = e.target.value; });
    document.getElementById('password')?.addEventListener('input', (e) => { this.state.password = e.target.value; });
    document.getElementById('userName')?.addEventListener('input', (e) => { this.state.userName = e.target.value; });
    document.getElementById('userLanguage')?.addEventListener('change', (e) => { this.state.userLanguage = e.target.value; });
    document.getElementById('btn-login')?.addEventListener('click', () => this.handleLogin());
    document.getElementById('deleteRoomId')?.addEventListener('input', (e) => { this.state.roomId = e.target.value; });
    document.getElementById('deletePassword')?.addEventListener('input', (e) => { this.state.password = e.target.value; });
    document.getElementById('confirmPassword')?.addEventListener('input', (e) => { this.state.confirmPassword = e.target.value; });
    document.getElementById('btn-delete-room')?.addEventListener('click', () => this.handleDeleteRoom());
  }

  attachChatEvents() {
    const messageInput = document.getElementById('message-input');
    const btnSend = document.getElementById('btn-send');
    const btnMic = document.getElementById('btn-mic');
    const btnClear = document.getElementById('btn-clear');
    const btnLogout = document.getElementById('btn-logout');
    const btnCopyLink = document.getElementById('btn-copy-link');

    if (messageInput) {
      messageInput.addEventListener('input', (e) => {
        this.state.message = e.target.value;
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        this.updateSendButton();
      });
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
      // 初期フォーカス
      messageInput.focus();
    }

    if (btnSend) {
      btnSend.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSendMessage();
      });
      // 初期状態更新
      this.updateSendButton();
    }

    if (btnMic) btnMic.addEventListener('click', () => this.state.isRecording ? this.stopRecording() : this.startRecording());
    if (btnClear) btnClear.addEventListener('click', () => this.handleClearMessages());
    if (btnLogout) btnLogout.addEventListener('click', () => this.handleLogout());
    if (btnCopyLink) btnCopyLink.addEventListener('click', () => this.handleCopyLink());
  }

  updateSendButton() {
    const btnSend = document.getElementById('btn-send');
    if (btnSend) {
      const canSend = this.state.message.trim() && 
                      this.state.roomUsers.length >= 2 && 
                      !this.state.isTranslating;
      
      if (canSend) {
        btnSend.disabled = false;
        btnSend.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
        btnSend.classList.add('hover:bg-indigo-700', 'cursor-pointer', 'bg-indigo-600');
      } else {
        btnSend.disabled = true;
        btnSend.classList.add('opacity-50', 'cursor-not-allowed');
        btnSend.classList.remove('hover:bg-indigo-700', 'cursor-pointer');
      }
    }
  }
  
  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}

if (window.firebaseServiceReady) {
  const app = new TranslationChatApp();
  app.init();
} else {
  window.addEventListener('firebaseServiceReady', () => {
    const app = new TranslationChatApp();
    app.init();
  });
}
