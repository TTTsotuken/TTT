// Firebase操作サービス
class FirebaseService {
  constructor() {
    this.app = null;
    this.database = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      const { initializeApp, getDatabase } = window.firebaseImports;
      this.app = initializeApp(CONFIG.firebase);
      
      // Firebase Realtime Database関数を動的にインポート
      const dbModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
      this.dbFunctions = dbModule;
      
      this.database = getDatabase(this.app);
      this.initialized = true;
      console.log('✅ Firebase初期化完了');
    } catch (error) {
      console.error('❌ Firebase初期化エラー:', error);
      throw error;
    }
  }

  // データベース参照を取得
  ref(path) {
    return this.dbFunctions.ref(this.database, path);
  }

  // データを取得
  async get(path) {
    const snapshot = await this.dbFunctions.get(this.ref(path));
    return snapshot.val();
  }

  // データを設定
  async set(path, data) {
    await this.dbFunctions.set(this.ref(path), data);
  }

  // データを更新
  async update(path, data) {
    await this.dbFunctions.update(this.ref(path), data);
  }

  // データを削除
  async remove(path) {
    await this.dbFunctions.remove(this.ref(path));
  }

  // リアルタイム監視
  onValue(path, callback) {
    return this.dbFunctions.onValue(this.ref(path), callback);
  }

  // 監視解除
  off(path, callback) {
    this.dbFunctions.off(this.ref(path), callback);
  }

  // サーバータイムスタンプ
  get serverTimestamp() {
    return this.dbFunctions.serverTimestamp();
  }

  // 新しいキーを生成
  push(path) {
    return this.dbFunctions.push(this.ref(path));
  }
}

const firebaseService = new FirebaseService();