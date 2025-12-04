// 認証・ルーム管理サービス
class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentRoom = null;
    this.cleanupInterval = null;
  }

  // 🆕 古いルームの定期クリーンアップを開始（1週間ごと）
  startRoomCleanup() {
    // 既に実行中なら何もしない
    if (this.cleanupInterval) return;

    // 1週間ごとに古いルームをチェック
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupOldRooms();
    }, 7 * 24 * 60 * 60 * 1000); // 1週間

    console.log('🔄 古いルーム自動クリーンアップを開始しました（1週間間隔）');
  }

  // 🆕 1週間以上前の古いルームを削除
  async cleanupOldRooms() {
    try {
      // 全ルームを取得
      const allRooms = await window.firebaseService.get('rooms');
      
      if (!allRooms) return;

      let deletedCount = 0;
      const now = Date.now();
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
      
      // 各ルームをチェック
      for (const [roomId, roomData] of Object.entries(allRooms)) {
        // 1週間以上前に作成されたルームを削除
        const isOldRoom = roomData.createdAt && (now - roomData.createdAt > ONE_WEEK);
        
        if (isOldRoom) {
          await window.firebaseService.remove(`rooms/${roomId}`);
          deletedCount++;
          console.log(`🗑️ 古いルーム削除（1週間以上経過）: ${roomId}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount}個の古いルームを自動削除しました`);
      }
    } catch (error) {
      console.error('❌ クリーンアップエラー:', error);
    }
  }

  // 🆕 クリーンアップ停止
  stopRoomCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
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
      
      // クリーンアップ開始
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
      
      // クリーンアップ開始
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

    // クリーンアップ開始
    this.startRoomCleanup();

    return { success: true, action: 'joined', userId };
  }

  // ルームから退出（即時削除の設定を受け取る）
  async leaveRoom(autoDeleteEmpty = true) {
    if (!this.currentRoom || !this.currentUser) return;

    try {
      const roomId = this.currentRoom.roomId;
      const userId = this.currentUser.userId;
      
      console.log(`👋 ユーザー退出: ${userId} from ${roomId}`);
      
      // 自分を削除
      await window.firebaseService.remove(`rooms/${roomId}/users/${userId}`);

      // 即時削除がONの場合のみ、空ルームチェック
      if (autoDeleteEmpty) {
        // 少し待ってから残りのユーザー数を確認
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const roomData = await window.firebaseService.get(`rooms/${roomId}`);
        
        // ルームが存在し、ユーザーデータがある場合
        if (roomData && roomData.users) {
          const remainingUsers = Object.keys(roomData.users).length;
          console.log(`👥 残りユーザー数: ${remainingUsers}`);
          
          // 誰もいなくなったらルーム全体を即座に削除（メッセージも含む）
          if (remainingUsers === 0) {
            await window.firebaseService.remove(`rooms/${roomId}`);
            console.log('✅ 最後のユーザーが退出したため、空ルームを即座に削除しました');
          }
        } else if (roomData && !roomData.users) {
          // ユーザーデータがない場合もルームを即座に削除
          await window.firebaseService.remove(`rooms/${roomId}`);
          console.log('✅ ユーザーがいないため、空ルームを即座に削除しました');
        }
      } else {
        console.log('⏸️ 即時削除OFF - ルームは1週間後に自動削除されます');
      }
    } catch (error) {
      console.error('❌ 退出エラー:', error);
    }

    // クリーンアップ停止
    this.stopRoomCleanup();

    this.currentUser = null;
    this.currentRoom = null;
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

// グローバル設定（アプリ全体で共有）
window.roomSettings = {
  autoDeleteEmpty: true  // 初期値: ON
};
