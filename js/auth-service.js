// 認証・ルーム管理サービス
class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentRoom = null;
  }

  // ルームに参加
  async joinRoom(roomId, password, userName, userLanguage) {
    const roomPath = `rooms/${roomId}`;
    const roomData = await firebaseService.get(roomPath);

    const userId = `user_${Date.now()}`;

    if (!roomData) {
      // 新規ルーム作成
      await firebaseService.set(roomPath, {
        password: password,
        createdAt: firebaseService.serverTimestamp(),
        users: {
          [userId]: {
            name: userName,
            language: userLanguage,
            joinedAt: firebaseService.serverTimestamp(),
            lastActive: firebaseService.serverTimestamp() // ★追加: アクティビティタイムスタンプ
          }
        }
      });
      
      this.currentUser = { userId, userName, userLanguage };
      this.currentRoom = { roomId, password };
      
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
      // ★追加: 再参加時にlastActiveを更新
      await firebaseService.update(
        `${roomPath}/users/${existingUser[0]}`, 
        { lastActive: firebaseService.serverTimestamp() }
      );
      return { success: true, action: 'rejoined', userId: existingUser[0] };
    }

    // 定員チェック
    const usersList = Object.values(users);
    if (usersList.length >= CONFIG.app.maxUsersPerRoom) { // CONFIGに依存
      throw new Error('このルームは既に満員です');
    }

    // ユーザー追加
    await firebaseService.set(`${roomPath}/users/${userId}`, {
      name: userName,
      language: userLanguage,
      joinedAt: firebaseService.serverTimestamp(),
      lastActive: firebaseService.serverTimestamp() // ★追加: アクティビティタイムスタンプ
    });

    this.currentUser = { userId, userName, userLanguage };
    this.currentRoom = { roomId, password };

    return { success: true, action: 'joined', userId };
  }

  // ユーザーアクティビティを更新 // ★追加
  async updateActivity() {
    if (!this.currentRoom || !this.currentUser) return;

    try {
      const path = `rooms/${this.currentRoom.roomId}/users/${this.currentUser.userId}`;
      await firebaseService.update(path, {
        lastActive: firebaseService.serverTimestamp()
      });
    } catch (error) {
      console.error('アクティビティ更新エラー:', error);
    }
  }

  // ルームから退出
  async leaveRoom() {
    if (!this.currentRoom || !this.currentUser) return;

    try {
      await firebaseService.remove(
        `rooms/${this.currentRoom.roomId}/users/${this.currentUser.userId}`
      );
    } catch (error) {
      console.error('退出エラー:', error);
    }

    this.currentUser = null;
    this.currentRoom = null;
  }

  // ルーム削除
  async deleteRoom(roomId, password) {
    const roomData = await firebaseService.get(`rooms/${roomId}`);

    if (!roomData) {
      throw new Error('ルームが見つかりません');
    }

    if (roomData.password !== password) {
      throw new Error('パスワードが正しくありません');
    }

    await firebaseService.remove(`rooms/${roomId}`);
    return { success: true };
  }

  // メッセージ削除 (全件)
  async clearMessages(roomId) {
    await firebaseService.remove(`rooms/${roomId}/messages`);
    return { success: true };
  }
}

const authService = new AuthService();
