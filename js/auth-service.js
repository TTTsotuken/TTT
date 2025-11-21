// 認証・ルーム管理サービス
class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentRoom = null;
    this.cleanupInterval = null;
    this.disconnectRef = null; // onDisconnect用の参照を保持
  }

  // 🆕 空ルームの自動クリーンアップを開始
  startRoomCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(async () => {
      await this.cleanupEmptyRooms();
    }, 5 * 60 * 1000); // 5分

    console.log('🔄 空ルーム自動クリーンアップを開始しました（5分間隔）');
  }

  // 🆕 空ルームを削除（権限エラー対策版）
  async cleanupEmptyRooms() {
    try {
      // 権限エラーを防ぐため、現在のルームのみをチェック
      if (!this.currentRoom) {
        return;
      }

      const roomId = this.currentRoom.roomId;
      const roomData = await window.firebaseService.get(`rooms/${roomId}`);
      
      if (!roomData) {
        console.log('📭 現在のルームは既に削除されています');
        return;
      }

      const hasNoUsers = !roomData.users || Object.keys(roomData.users).length === 0;
      const isOldRoom = roomData.createdAt && (Date.now() - roomData.createdAt > 24 * 60 * 60 * 1000);
      
      if (hasNoUsers || isOldRoom) {
        await window.firebaseService.remove(`rooms/${roomId}`);
        console.log(`🗑️ ${hasNoUsers ? '空' : '古い'}ルーム削除: ${roomId}`);
      }
    } catch (error) {
      // 権限エラーは無視（他のユーザーのルームにアクセスできない場合）
      if (error.message.includes('Permission denied')) {
        console.log('ℹ️ クリーンアップ: 権限エラー（正常動作）');
      } else {
        console.error('❌ クリーンアップエラー:', error);
      }
    }
  }

  stopRoomCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // 🔥 onDisconnectを設定（接続が切れた時に自動削除）
  setupOnDisconnect(roomId, userId) {
    try {
      const userPath = `rooms/${roomId}/users/${userId}`;
      const userRef = window.firebaseService.ref(userPath);
      
      // 接続が切れた時に自動的にユーザーを削除
      import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js')
        .then(({ onDisconnect }) => {
          this.disconnectRef = onDisconnect(userRef);
          this.disconnectRef.remove();
          console.log('✅ onDisconnect設定完了: タブを閉じると自動削除されます');
        });
    } catch (error) {
      console.error('❌ onDisconnect設定エラー:', error);
    }
  }

  // 🔥 onDisconnectをキャンセル（明示的なログアウト時）
  cancelOnDisconnect() {
    if (this.disconnectRef) {
      try {
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js')
          .then(({ onDisconnect }) => {
            // キャンセルして手動で削除する
            this.disconnectRef.cancel();
            console.log('✅ onDisconnectをキャンセルしました');
          });
      } catch (error) {
        console.error('❌ onDisconnectキャンセルエラー:', error);
      }
    }
  }

  // ルームに参加
  async joinRoom(roomId, password, userName, userLanguage) {
    const roomPath = `rooms/${roomId}`;
    const roomData = await window.firebaseService.get(roomPath);

    const userId = `user_${Date.now()}`;

    if (!roomData) {
      // 新規ルーム作成
      await window.firebaseService.set(roomPath, {
        password: password,
        createdAt: Date.now(),
        users: {
          [userId]: {
            name: userName,
            language: userLanguage,
            joinedAt: Date.now()
          }
        }
      });
      
      this.currentUser = { userId, userName, userLanguage };
      this.currentRoom = { roomId, password };
      
      // 🔥 onDisconnect設定
      this.setupOnDisconnect(roomId, userId);
      
      this.startRoomCleanup();
      
      return { success: true, action: 'created', userId };
    }

    // パスワード検証
    if (roomData.password !== password) {
      throw new Error('パスワードが正しくありません');
    }

    // 既存ユーザーチェック
    const users = roomData.users || {};
    const existingUser = Object.entries(users).find(([_, u]) => u.name === userName);
    
    if (existingUser) {
      this.currentUser = { userId: existingUser[0], userName, userLanguage };
      this.currentRoom = { roomId, password };
      
      // 🔥 onDisconnect設定
      this.setupOnDisconnect(roomId, existingUser[0]);
      
      this.startRoomCleanup();
      
      return { success: true, action: 'rejoined', userId: existingUser[0] };
    }

    // 定員チェック
    const usersList = Object.values(users);
    if (usersList.length >= CONFIG.app.maxUsersPerRoom) {
      throw new Error('このルームは既に満員です');
    }

    // ユーザー追加
    await window.firebaseService.set(`${roomPath}/users/${userId}`, {
      name: userName,
      language: userLanguage,
      joinedAt: Date.now()
    });

    this.currentUser = { userId, userName, userLanguage };
    this.currentRoom = { roomId, password };

    // 🔥 onDisconnect設定
    this.setupOnDisconnect(roomId, userId);

    this.startRoomCleanup();

    return { success: true, action: 'joined', userId };
  }

  // ルームから退出
  async leaveRoom() {
    if (!this.currentRoom || !this.currentUser) return;

    try {
      const roomId = this.currentRoom.roomId;
      const userId = this.currentUser.userId;
      
      console.log(`👋 ユーザー退出: ${userId} from ${roomId}`);
      
      // 🔥 onDisconnectをキャンセル（手動削除するため）
      this.cancelOnDisconnect();
      
      // 自分を削除
      await window.firebaseService.remove(`rooms/${roomId}/users/${userId}`);

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const roomData = await window.firebaseService.get(`rooms/${roomId}`);
      
      if (roomData && roomData.users) {
        const remainingUsers = Object.keys(roomData.users).length;
        console.log(`👥 残りユーザー数: ${remainingUsers}`);
        
        if (remainingUsers === 0) {
          await window.firebaseService.remove(`rooms/${roomId}`);
          console.log('✅ 最後のユーザーが退出したため、ルームとメッセージを全て削除しました');
        }
      } else if (roomData && !roomData.users) {
        await window.firebaseService.remove(`rooms/${roomId}`);
        console.log('✅ ユーザーがいないため、ルームを削除しました');
      }
    } catch (error) {
      console.error('❌ 退出エラー:', error);
    }

    this.stopRoomCleanup();

    this.currentUser = null;
    this.currentRoom = null;
    this.disconnectRef = null;
  }

  // ルーム削除
  async deleteRoom(roomId, password) {
    const roomData = await window.firebaseService.get(`rooms/${roomId}`);

    if (!roomData) {
      throw new Error('ルームが見つかりません');
    }

    if (roomData.password !== password) {
      throw new Error('パスワードが正しくありません');
    }

    await window.firebaseService.remove(`rooms/${roomId}`);
    return { success: true };
  }

  // メッセージ削除
  async clearMessages(roomId) {
    await window.firebaseService.remove(`rooms/${roomId}/messages`);
    return { success: true };
  }
}

window.authService = new AuthService();
