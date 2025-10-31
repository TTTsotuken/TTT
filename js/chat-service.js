// チャット機能サービス
class ChatService {
  constructor() {
    this.listeners = {};
  }

  // メッセージを送信
  async sendMessage(roomId, sender, senderLang, originalText, targetLang) {
    try {
      // 翻訳
      const translatedText = await geminiService.translate(originalText, targetLang);

      // メッセージ保存
      const messageRef = firebaseService.push(`rooms/${roomId}/messages`);
      const messageId = messageRef.key;

      await firebaseService.set(`rooms/${roomId}/messages/${messageId}`, {
        id: messageId,
        sender: sender,
        senderLang: senderLang,
        originalText: originalText,
        translatedText: translatedText,
        timestamp: firebaseService.serverTimestamp()
      });

      return { success: true, messageId, translatedText };
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      throw error;
    }
  }

  // メッセージをリアルタイム監視
  watchMessages(roomId, callback) {
    const unsubscribe = firebaseService.onValue(
      `rooms/${roomId}/messages`,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messages = Object.values(data).sort((a, b) => 
            (a.timestamp || 0) - (b.timestamp || 0)
          );
          callback(messages);
        } else {
          callback([]);
        }
      }
    );
    
    this.listeners[`messages_${roomId}`] = unsubscribe;
    return unsubscribe;
  }

  // ユーザーをリアルタイム監視
  watchUsers(roomId, callback) {
    const unsubscribe = firebaseService.onValue(
      `rooms/${roomId}/users`,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const users = Object.values(data);
          callback(users);
        } else {
          callback([]);
        }
      }
    );
    
    this.listeners[`users_${roomId}`] = unsubscribe;
    return unsubscribe;
  }

  // ルームの存在を監視
  watchRoom(roomId, callback) {
    const unsubscribe = firebaseService.onValue(
      `rooms/${roomId}`,
      (snapshot) => {
        const exists = snapshot.exists();
        callback(exists);
      }
    );
    
    this.listeners[`room_${roomId}`] = unsubscribe;
    return unsubscribe;
  }

  // 全ての監視を解除
  unwatchAll() {
    Object.values(this.listeners).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners = {};
  }
}


window.chatService = new ChatService();
