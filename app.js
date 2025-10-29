// メインアプリケーション
const { useState, useEffect, useRef } = React;

const TranslationChatApp = () => {
    const [screen, setScreen] = useState('login');
    const [loginTab, setLoginTab] = useState('login');
    const [roomId, setRoomId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [userLanguage, setUserLanguage] = useState('ja');
    const [currentRoom, setCurrentRoom] = useState(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [roomUsers, setRoomUsers] = useState([]);
    const [isConnected, setIsConnected] = useState(true);
    const [isTranslating, setIsTranslating] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const messagesListenerRef = useRef(null);
    const usersListenerRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    // 言語設定
    const languages = [
        { code: 'ja', name: '日本語', geminiCode: 'Japanese' },
        { code: 'en', name: 'English', geminiCode: 'English' },
        { code: 'zh-CN', name: '中文', geminiCode: 'Chinese' },
        { code: 'ko', name: '한국어', geminiCode: 'Korean' },
        { code: 'es', name: 'Español', geminiCode: 'Spanish' },
        { code: 'fr', name: 'Français', geminiCode: 'French' },
        { code: 'de', name: 'Deutsch', geminiCode: 'German' },
        { code: 'it', name: 'Italiano', geminiCode: 'Italian' },
        { code: 'pt', name: 'Português', geminiCode: 'Portuguese' },
        { code: 'ru', name: 'Русский', geminiCode: 'Russian' },
        { code: 'ar', name: 'العربية', geminiCode: 'Arabic' },
        { code: 'hi', name: 'हिन्दी', geminiCode: 'Hindi' },
        { code: 'th', name: 'ไทย', geminiCode: 'Thai' },
        { code: 'vi', name: 'Tiếng Việt', geminiCode: 'Vietnamese' }
    ];

    // Firebase接続状態の監視
    useEffect(() => {
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            setIsConnected(snap.val() === true);
        });
        return () => connectedRef.off();
    }, []);

    // ルーム削除の監視
    useEffect(() => {
        if (!currentRoom) return;

        const roomRef = database.ref(`rooms/${currentRoom.id}`);
        const roomListener = roomRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                showError('ルームが削除されました。ログアウトします。');
                setTimeout(() => {
                    handleLogout();
                }, 2000);
            }
        });

        return () => {
            roomRef.off('value', roomListener);
        };
    }, [currentRoom]);

    // タブを閉じた時の処理
    useEffect(() => {
        if (!currentRoom || !currentUserId) return;

        const handleBeforeUnload = async () => {
            const userRef = database.ref(`rooms/${currentRoom.id}/users/${currentUserId}`);
            await userRef.remove();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (currentRoom && currentUserId) {
                database.ref(`rooms/${currentRoom.id}/users/${currentUserId}`).remove();
            }
        };
    }, [currentRoom, currentUserId]);

    // 15分間非アクティブでログアウト
    useEffect(() => {
        if (!currentRoom) return;

        const INACTIVITY_TIMEOUT = 15 * 60 * 1000;

        const resetTimer = () => {
            lastActivityRef.current = Date.now();
            
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }

            inactivityTimerRef.current = setTimeout(() => {
                showError('15分間操作がなかったため、自動的にログアウトします。');
                setTimeout(() => {
                    handleLogout();
                }, 2000);
            }, INACTIVITY_TIMEOUT);
        };

        resetTimer();

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [currentRoom]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => {
            if (messagesListenerRef.current && currentRoom) {
                database.ref(`rooms/${currentRoom.id}/messages`).off('value', messagesListenerRef.current);
            }
            if (usersListenerRef.current && currentRoom) {
                database.ref(`rooms/${currentRoom.id}/users`).off('value', usersListenerRef.current);
            }
        };
    }, [currentRoom]);

    const showError = (msg) => {
        setError(msg);
        setTimeout(() => setError(''), 5000);
    };

    const showSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 3000);
    };

    // Gemini APIを使用した翻訳
    const translateText = async (text, targetLangCode) => {
        const targetLang = languages.find(l => l.code === targetLangCode);
        if (!targetLang) return text;

        try {
            setIsTranslating(true);
            
            const prompt = `Translate the following text to ${targetLang.geminiCode}. Only provide the translation, no explanations or additional text:\n\n${text}`;

            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1000,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API error:', errorData);
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const translatedText = data.candidates[0].content.parts[0].text.trim();
            
            setIsTranslating(false);
            return translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            setIsTranslating(false);
            showError('翻訳に失敗しました。APIキーを確認してください。');
            return text;
        }
    };



  // ログイン処理
    const handleLogin = async () => {
        if (!roomId || !password || !userName || !userLanguage) {
            showError('全ての項目を入力してください');
            return;
        }

        if (!isConnected) {
            showError('インターネット接続を確認してください');
            return;
        }

        if (GEMINI_API_KEY === '' || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
            showError('Gemini APIキーが設定されていません');
            return;
        }

        try {
            const roomRef = database.ref(`rooms/${roomId}`);
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();

            if (roomData) {
                if (roomData.password !== password) {
                    showError('パスワードが正しくありません');
                    return;
                }

                const users = roomData.users || {};
                const usersList = Object.values(users);
                const existingUserEntry = Object.entries(users).find(([_, u]) => u.name === userName);
                
                let userId;
                if (!existingUserEntry) {
                    if (usersList.length >= 2) {
                        showError('このルームは既に満員です（最大2人）');
                        return;
                    }
                    
                    userId = `user_${Date.now()}`;
                    await database.ref(`rooms/${roomId}/users/${userId}`).set({
                        name: userName,
                        language: userLanguage,
                        joinedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    showSuccess('ルームに参加しました！');
                } else {
                    userId = existingUserEntry[0];
                    showSuccess('ルームに再接続しました！');
                }
                setCurrentUserId(userId);
            } else {
                const userId = `user_${Date.now()}`;
                await roomRef.set({
                    password: password,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    users: {
                        [userId]: {
                            name: userName,
                            language: userLanguage,
                            joinedAt: firebase.database.ServerValue.TIMESTAMP
                        }
                    }
                });
                setCurrentUserId(userId);
                showSuccess('新しいルームを作成しました！');
            }

            setCurrentRoom({ id: roomId, password: password });
            setScreen('chat');

            const messagesRef = database.ref(`rooms/${roomId}/messages`);
            messagesListenerRef.current = messagesRef.on('value', (snapshot) => {
                const messagesData = snapshot.val();
                if (messagesData) {
                    const messagesList = Object.values(messagesData).sort((a, b) => 
                        a.timestamp - b.timestamp
                    );
                    setMessages(messagesList);
                } else {
                    setMessages([]);
                }
            });

            const usersRef = database.ref(`rooms/${roomId}/users`);
            usersListenerRef.current = usersRef.on('value', (snapshot) => {
                const usersData = snapshot.val();
                if (usersData) {
                    const usersList = Object.values(usersData);
                    setRoomUsers(usersList);
                } else {
                    setRoomUsers([]);
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            showError('ルームへの接続に失敗しました: ' + error.message);
        }
    };

    // メッセージ送信
    const handleSendMessage = async () => {
        if (!message.trim() || !currentRoom) return;

        if (!isConnected) {
            showError('インターネット接続を確認してください');
            return;
        }

        const otherUser = roomUsers.find(u => u.name !== userName);
        if (!otherUser) {
            showError('相手がまだ参加していません');
            return;
        }

        try {
            const translatedText = await translateText(message, otherUser.language);
            
            const messageId = database.ref(`rooms/${currentRoom.id}/messages`).push().key;
            const newMessage = {
                id: messageId,
                sender: userName,
                senderLang: userLanguage,
                originalText: message,
                translatedText: translatedText,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            await database.ref(`rooms/${currentRoom.id}/messages/${messageId}`).set(newMessage);
            setMessage('');
            setError('');
        } catch (error) {
            console.error('Send message error:', error);
            showError('メッセージの送信に失敗しました');
        }
    };

    // 音声認識開始
    const startRecording = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showError('お使いのブラウザは音声認識に対応していません（Chrome推奨）');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        let recognitionLang = userLanguage;
        if (userLanguage === 'zh-CN') recognitionLang = 'zh-CN';
        
        recognitionRef.current.lang = recognitionLang;
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onstart = () => {
            setIsRecording(true);
            setError('');
        };

        recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setMessage(transcript);
            setTimeout(() => {
                setIsRecording(false);
            }, 100);
        };

        recognitionRef.current.onerror = (event) => {
            showError('音声認識エラー: ' + event.error);
            setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
            setIsRecording(false);
        };

        try {
            recognitionRef.current.start();
        } catch (error) {
            showError('音声認識の開始に失敗しました');
            setIsRecording(false);
        }
    };

    // 音声認識停止
    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    };

    // ログアウト
    const handleLogout = async () => {
        if (messagesListenerRef.current && currentRoom) {
            database.ref(`rooms/${currentRoom.id}/messages`).off('value', messagesListenerRef.current);
        }
        if (usersListenerRef.current && currentRoom) {
            database.ref(`rooms/${currentRoom.id}/users`).off('value', usersListenerRef.current);
        }
        
        if (currentRoom && currentUserId) {
            try {
                await database.ref(`rooms/${currentRoom.id}/users/${currentUserId}`).remove();
            } catch (error) {
                console.error('Error removing user:', error);
            }
        }

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        
        setScreen('login');
        setCurrentRoom(null);
        setCurrentUserId(null);
        setMessages([]);
        setRoomUsers([]);
        setRoomId('');
        setPassword('');
        setError('');
    };

    // メッセージ全削除
    const clearRoom = async () => {
        if (!window.confirm('このルームの全メッセージを削除しますか?\n（この操作は元に戻せません）')) return;
        
        try {
            await database.ref(`rooms/${currentRoom.id}/messages`).remove();
            showSuccess('メッセージを削除しました');
        } catch (error) {
            showError('メッセージの削除に失敗しました');
        }
    };

    // ルーム削除
    const handleDeleteRoom = async () => {
        if (!roomId || !password || !confirmPassword) {
            showError('全ての項目を入力してください');
            return;
        }

        if (password !== confirmPassword) {
            showError('パスワードが一致しません');
            return;
        }

        if (!isConnected) {
            showError('インターネット接続を確認してください');
            return;
        }

        try {
            const roomRef = database.ref(`rooms/${roomId}`);
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();

            if (!roomData) {
                showError('指定されたルームが見つかりません');
                return;
            }

            if (roomData.password !== password) {
                showError('パスワードが正しくありません');
                return;
            }

            await roomRef.remove();
            showSuccess('ルームを削除しました');
            setRoomId('');
            setPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Delete room error:', error);
            showError('ルームの削除に失敗しました: ' + error.message);
        }
    };



  // ログイン画面のレンダリング
    if (screen === 'login') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                    <div className="flex items-center justify-center mb-6">
                        <div className="text-indigo-600 mr-3"><Globe /></div>
                        <h1 className="text-3xl font-bold text-gray-800">翻訳チャット</h1>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 mb-4 flex items-center">
                        <Sparkles />
                        <span className="ml-2 text-sm text-purple-800 font-medium">Gemini AI搭載</span>
                    </div>
                    
                    {!isConnected && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            ⚠️ オフライン - インターネット接続を確認してください
                        </div>
                    )}

                    <div className="flex mb-6 border-b border-gray-200">
                        <button
                            onClick={() => {
                                setLoginTab('login');
                                setError('');
                                setSuccess('');
                            }}
                            className={`flex-1 py-3 font-medium transition-colors ${
                                loginTab === 'login'
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            ログイン
                        </button>
                        <button
                            onClick={() => {
                                setLoginTab('delete');
                                setError('');
                                setSuccess('');
                                setConfirmPassword('');
                            }}
                            className={`flex-1 py-3 font-medium transition-colors ${
                                loginTab === 'delete'
                                    ? 'text-red-600 border-b-2 border-red-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            ルーム削除
                        </button>
                    </div>
                    
                    {loginTab === 'login' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ルームID
                                </label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="例: room123"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    パスワード
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ユーザー名
                                </label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="例: 太郎"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    あなたの言語
                                </label>
                                <select
                                    value={userLanguage}
                                    onChange={(e) => setUserLanguage(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                                    <CheckCircle />
                                    <span className="ml-2">{success}</span>
                                </div>
                            )}

                            <button
                                onClick={handleLogin}
                                disabled={!isConnected}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <span className="mr-2"><Lock /></span>
                                ルームに入る
                            </button>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                                <p className="font-medium mb-2">💡 使い方</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>同じルームIDとパスワードで2人が入室</li>
                                    <li>Gemini AIが文脈を理解して高品質な翻訳を提供</li>
                                    <li>異なるデバイスからでもアクセス可能</li>
                                    <li>音声入力にも対応（Chrome推奨）</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                                <p className="font-medium mb-2">⚠️ 警告</p>
                                <p className="text-xs">ルームを削除すると、全てのメッセージとユーザー情報が完全に削除されます。この操作は元に戻せません。</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    削除するルームID
                                </label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="例: room123"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    パスワード
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    パスワード（確認）
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="••••••"
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                                    <CheckCircle />
                                    <span className="ml-2">{success}</span>
                                </div>
                            )}

                            <button
                                onClick={handleDeleteRoom}
                                disabled={!isConnected}
                                className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <span className="mr-2"><Trash2 /></span>
                                ルームを完全に削除
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // チャット画面のレンダリング
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <div className="bg-indigo-600 text-white p-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center">
                        <span className="mr-3"><Users /></span>
                        <div>
                            <h2 className="font-bold text-lg flex items-center">
                                ルーム: {currentRoom?.id}
                                <span className="ml-2 text-xs bg-purple-500 px-2 py-1 rounded flex items-center">
                                    <Sparkles />
                                    <span className="ml-1">Gemini</span>
                                </span>
                            </h2>
                            <p className="text-sm text-indigo-200">
                                {userName} ({languages.find(l => l.code === userLanguage)?.name})
                                {roomUsers.length > 1 && ` • ${roomUsers.length}人参加中`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isConnected && (
                            <span className="text-xs bg-red-500 px-2 py-1 rounded">オフライン</span>
                        )}
                        <button
                            onClick={clearRoom}
                            className="p-2 hover:bg-indigo-700 rounded-lg transition-colors"
                            title="メッセージを全削除"
                        >
                            <Trash2 />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 hover:bg-indigo-700 rounded-lg transition-colors"
                            title="ログアウト"
                        >
                            <LogOut />
                        </button>
                    </div>
                </div>
            </div>

            {roomUsers.length < 2 && (
                <div className="bg-yellow-50 border-b border-yellow-200 p-3 text-center text-yellow-800 text-sm">
                    相手の参加を待っています... ({roomUsers.length}/2人)
                </div>
            )}

            {isTranslating && (
                <div className="bg-purple-50 border-b border-purple-200 p-3 text-center text-purple-700 text-sm flex items-center justify-center">
                    <Sparkles />
                    <span className="ml-2">Gemini AIで翻訳中...</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-b border-red-200 p-3 text-center text-red-700 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border-b border-green-200 p-3 text-center text-green-700 text-sm flex items-center justify-center">
                    <CheckCircle />
                    <span className="ml-2">{success}</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto">
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 py-12">
                            <div className="text-6xl mb-4">💬</div>
                            <p className="text-lg font-medium">まだメッセージがありません</p>
                            <p className="text-sm mt-2">Gemini AIが自然な翻訳で会話をサポートします！</p>
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isOwnMessage = msg.sender === userName;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl p-4 ${
                                        isOwnMessage
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-gray-800 shadow-md'
                                    }`}
                                >
                                    <div className="font-medium text-sm mb-1">
                                        {msg.sender}
                                    </div>
                                    <div className="break-words whitespace-pre-wrap">
                                        {isOwnMessage ? msg.originalText : msg.translatedText}
                                    </div>
                                    {!isOwnMessage && msg.originalText !== msg.translatedText && (
                                        <div className={`text-xs mt-2 pt-2 border-t ${isOwnMessage ? 'border-indigo-400' : 'border-gray-200'} ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'}`}>
                                            原文: {msg.originalText}
                                        </div>
                                    )}
                                    <div className={`text-xs mt-2 ${isOwnMessage ? 'text-indigo-200' : 'text-gray-400'}`}>
                                        {msg.timestamp && new Date(msg.timestamp).toLocaleString('ja-JP', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto">
                    {roomUsers.length < 2 && (
                        <div className="mb-2 text-center text-sm text-yellow-700 bg-yellow-50 py-2 px-4 rounded-lg">
                            ⚠️ 相手が参加するまでメッセージは送信できません
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={roomUsers.length < 2 || !isConnected || isTranslating}
                            className={`p-3 rounded-lg transition-colors ${
                                isRecording
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}
                            title={isRecording ? '録音停止' : '音声入力'}
                        >
                            {isRecording ? <MicOff /> : <Mic />}
                        </button>
                        
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                            disabled={roomUsers.length < 2 || !isConnected || isTranslating}
                            placeholder={
                                isTranslating ? "翻訳中..." :
                                roomUsers.length < 2 ? "相手の参加を待っています..." : 
                                "メッセージを入力..."
                            }
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        
                        <button
                            onClick={handleSendMessage}
                            disabled={!message.trim() || roomUsers.length < 2 || !isConnected || isTranslating}
                            className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            title="送信"
                        >
                            <Send />
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>Enterキーで送信</span>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center">
                                <Sparkles />
                                <span className="ml-1">Gemini AI</span>
                            </span>
                            <span>•</span>
                            <span>{isConnected ? '接続中' : 'オフライン'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

ReactDOM.render(<TranslationChatApp />, document.getElementById('root'));
