// チャット機能サービス - LibreTranslate対応版
class ChatService {
  constructor() {
    this.listeners = {};
  }

  // メッセージを送信
  async sendMessage(roomId, sender, senderLang, originalText, targetLang) {
    try {
      console.log('メッセージ送信開始:', { roomId, sender, originalText, targetLang });
      
      // LibreTranslateサービスを使用して翻訳
      const translatedText = await window.libreTranslateService.translate(
        originalText, 
        targetLang, 
        senderLang
      );
      console.log('翻訳完了:', translatedText);

      // メッセージ保存
      const messageRef = firebaseService.push(`rooms/${roomId}/messages`);
      const messageId = messageRef.key;

      const messageData = {
        id: messageId,
        sender: sender,
        senderLang: senderLang,
        originalText: originalText,
        translatedText: translatedText,
        timestamp: Date.now()
      };

      console.log('メッセージデータ:', messageData);

      await firebaseService.set(`rooms/${roomId}/messages/${messageId}`, messageData);
      console.log('メッセージ保存完了');

      return { success: true, messageId, translatedText };
    } catch (error) {
      console.error('メッセージ送信エラー詳細:', error);
      console.error('エラースタック:', error.stack);
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
console.log('✅ Chat Service 初期化完了 (LibreTranslate対応)');
