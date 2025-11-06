// 認証・ルーム管理サービス
class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentRoom = null;
    this.cleanupInterval = null;
  }

  // 🆕 空ルームの自動クリーンアップを開始
  startRoomCleanup() {
    // 既に実行中なら何もしない
    if (this.cleanupInterval) return;

    // 5分ごとに空ルームをチェック
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupEmptyRooms();
    }, 5 * 60 * 1000); // 5分

    // 初回は即座に実行
    this.cleanupEmptyRooms();
  }

  // 🆕 空ルームを削除
  async cleanupEmptyRooms() {
    try {
      // 全ルームを取得
      const allRooms = await window.firebaseService.get('rooms');
      
      if (!allRooms) return;

      let deletedCount = 0;
      
      // 各ルームをチェック
      for (const [roomId, roomData] of Object.entries(allRooms)) {
        // ユーザーがいないルームを削除
        if (!roomData.users || Object.keys(roomData.users).length === 0) {
          await window.firebaseService.remove(`rooms/${roomId}`);
          deletedCount++;
          console.log(`🗑️ 空ルーム削除: ${roomId}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount}個の空ルームを削除しました`);
      }
    } catch (error) {
      console.error('クリーンアップエラー:', error);
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

  // ルームから退出
  async leaveRoom() {
    if (!this.currentRoom || !this.currentUser) return;

    try {
      // 自分を削除
      await window.firebaseService.remove(
        `rooms/${this.currentRoom.roomId}/users/${this.currentUser.userId}`
      );

      // 残りのユーザー数を確認
      const roomData = await window.firebaseService.get(`rooms/${this.currentRoom.roomId}`);
      
      if (roomData && roomData.users) {
        const remainingUsers = Object.keys(roomData.users).length;
        
        // 誰もいなくなったらルーム全体を削除
        if (remainingUsers === 0) {
          await window.firebaseService.remove(`rooms/${this.currentRoom.roomId}`);
          console.log('✅ 最後のユーザーが退出したため、ルームを削除しました');
        }
      }
    } catch (error) {
      console.error('退出エラー:', error);
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
