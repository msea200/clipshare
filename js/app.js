// 클립보드 공유 앱
import { firebaseConfig, APP_NAME, APP_VERSION, RTDB_PATH, ROOM_EXPIRY_HOURS, MAX_TEXT_LENGTH, UPDATE_DEBOUNCE_MS, CLEANUP_INTERVAL_MS } from './config.js';

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM 요소
const roomSelection = document.getElementById('roomSelection');
const clipboardArea = document.getElementById('clipboardArea');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const currentRoomCode = document.getElementById('currentRoomCode');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const newClipboardText = document.getElementById('newClipboardText');
const addClipboardBtn = document.getElementById('addClipboardBtn');
const clipboardItems = document.getElementById('clipboardItems');
const clipboardCount = document.getElementById('clipboardCount');
const newCharCount = document.getElementById('newCharCount');
const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const notification = document.getElementById('notification');

// 상태 관리
let currentRoom = null;
let roomRef = null;
let clipboardsRef = null;
let tempTextRef = null;
let isUpdatingFromFirebase = false;
let isUpdatingTempText = false;

// 룸 코드 생성 (ABC-123 형식)
function generateRoomCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code = '';
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    code += '-';
    for (let i = 0; i < 3; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return code;
}

// 알림 표시
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 연결 상태 업데이트
function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.className = 'status-indicator connected';
        connectionStatus.textContent = '🟢';
        connectionText.textContent = '연결됨';
    } else {
        connectionStatus.className = 'status-indicator disconnected';
        connectionStatus.textContent = '🔴';
        connectionText.textContent = '연결 끊김';
    }
}

// 글자 수 업데이트
function updateCharCount() {
    const count = newClipboardText.value.length;
    newCharCount.textContent = count.toLocaleString();
}

// 클립보드 개수 업데이트
function updateClipboardCount(count) {
    clipboardCount.textContent = count.toLocaleString();
}

// 시간 포맷팅
function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    if (seconds > 10) return `${seconds}초 전`;
    return '방금 전';
}

// 클립보드 아이템 HTML 생성
function createClipboardItemHTML(id, data) {
    const time = formatTime(data.createdAt);
    const length = data.text.length;
    
    return `
        <div class="clipboard-item" data-id="${id}">
            <div class="clipboard-item-header">
                <div class="clipboard-item-info">
                    <span class="clipboard-item-time">🕐 ${time}</span>
                    <span class="clipboard-item-length">📝 ${length.toLocaleString()}자</span>
                </div>
                <div class="clipboard-item-actions">
                    <button class="btn-icon-sm copy-item" title="복사">📋</button>
                    <button class="btn-icon-sm danger delete-item" title="삭제">🗑️</button>
                </div>
            </div>
            <div class="clipboard-item-content">${escapeHtml(data.text)}</div>
        </div>
    `;
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 새 룸 만들기
async function createRoom() {
    try {
        const roomCode = generateRoomCode();
        const roomData = {
            code: roomCode,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            expiresAt: Date.now() + (ROOM_EXPIRY_HOURS * 60 * 60 * 1000),
            clipboards: {}
        };
        
        await database.ref(`${RTDB_PATH.CLIPBOARD}/${roomCode}`).set(roomData);
        joinRoom(roomCode);
        showNotification('새 룸이 생성되었습니다!', 'success');
    } catch (error) {
        console.error('룸 생성 실패:', error);
        showNotification('룸 생성에 실패했습니다.', 'error');
    }
}

// 룸 입장
async function joinRoom(roomCode) {
    try {
        const formattedCode = roomCode.toUpperCase().trim();
        
        // 룸이 존재하는지 확인
        const snapshot = await database.ref(`${RTDB_PATH.CLIPBOARD}/${formattedCode}`).once('value');
        
        if (!snapshot.exists()) {
            showNotification('존재하지 않는 룸 코드입니다.', 'error');
            return;
        }
        
        const roomData = snapshot.val();
        
        // 만료된 룸 확인
        if (roomData.expiresAt && roomData.expiresAt < Date.now()) {
            await database.ref(`${RTDB_PATH.CLIPBOARD}/${formattedCode}`).remove();
            showNotification('만료된 룸입니다.', 'error');
            return;
        }
        
        currentRoom = formattedCode;
        currentRoomCode.textContent = formattedCode;
        roomRef = database.ref(`${RTDB_PATH.CLIPBOARD}/${formattedCode}`);
        clipboardsRef = roomRef.child('clipboards');
        tempTextRef = roomRef.child('tempText');
        
        // UI 전환
        roomSelection.style.display = 'none';
        clipboardArea.style.display = 'block';
        
        // 초기 클립보드 목록 로드
        loadClipboards();
        
        // 초기 임시 텍스트 로드
        loadTempText();
        
        // 실시간 리스너 설정
        setupRealtimeListener();
        
        showNotification('룸에 입장했습니다!', 'success');
    } catch (error) {
        console.error('룸 입장 실패:', error);
        showNotification('룸 입장에 실패했습니다.', 'error');
    }
}

// 클립보드 목록 로드
async function loadClipboards() {
    try {
        const snapshot = await clipboardsRef.once('value');
        const clipboards = snapshot.val();
        
        renderClipboards(clipboards);
    } catch (error) {
        console.error('클립보드 로드 실패:', error);
    }
}

// 임시 텍스트 로드
async function loadTempText() {
    try {
        const snapshot = await tempTextRef.once('value');
        const text = snapshot.val();
        
        if (text) {
            isUpdatingTempText = true;
            newClipboardText.value = text;
            updateCharCount();
            isUpdatingTempText = false;
        }
    } catch (error) {
        console.error('임시 텍스트 로드 실패:', error);
    }
}

// 클립보드 렌더링
function renderClipboards(clipboards) {
    if (!clipboards || Object.keys(clipboards).length === 0) {
        clipboardItems.innerHTML = `
            <div class="empty-state">
                <p>📋 아직 공유된 클립보드가 없습니다.</p>
                <p>위에서 새 클립보드를 추가해보세요!</p>
            </div>
        `;
        updateClipboardCount(0);
        return;
    }
    
    // 생성 시간 기준 내림차순 정렬
    const sortedClipboards = Object.entries(clipboards)
        .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    
    clipboardItems.innerHTML = sortedClipboards
        .map(([id, data]) => createClipboardItemHTML(id, data))
        .join('');
    
    updateClipboardCount(sortedClipboards.length);
    
    // 이벤트 리스너 추가
    attachClipboardItemListeners();
}

// 클립보드 아이템 이벤트 리스너
function attachClipboardItemListeners() {
    // 복사 버튼
    document.querySelectorAll('.copy-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.clipboard-item');
            const content = item.querySelector('.clipboard-item-content').textContent;
            await copyToClipboard(content);
        });
    });
    
    // 삭제 버튼
    document.querySelectorAll('.delete-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const item = e.target.closest('.clipboard-item');
            const id = item.dataset.id;
            await deleteClipboard(id);
        });
    });
}

// 클립보드에 복사
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showNotification('클립보드에 복사되었습니다!', 'success');
    } catch (error) {
        console.error('복사 실패:', error);
        showNotification('복사에 실패했습니다.', 'error');
    }
}

// 클립보드 삭제
async function deleteClipboard(id) {
    if (!confirm('이 클립보드를 삭제하시겠습니까?')) return;
    
    try {
        await clipboardsRef.child(id).remove();
        showNotification('삭제되었습니다.', 'success');
    } catch (error) {
        console.error('삭제 실패:', error);
        showNotification('삭제에 실패했습니다.', 'error');
    }
}

// 임시 텍스트 업데이트 (디바운싱)
let tempTextTimeout = null;
function updateTempText() {
    if (isUpdatingTempText) return;
    
    clearTimeout(tempTextTimeout);
    tempTextTimeout = setTimeout(async () => {
        try {
            await tempTextRef.set(newClipboardText.value);
        } catch (error) {
            console.error('임시 텍스트 업데이트 실패:', error);
        }
    }, 300); // 300ms 디바운싱
}

// 새 클립보드 추가
async function addClipboard() {
    const text = newClipboardText.value.trim();
    
    if (!text) {
        showNotification('내용을 입력하세요.', 'warning');
        return;
    }
    
    try {
        const newClipboardRef = clipboardsRef.push();
        await newClipboardRef.set({
            text: text,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // 입력 필드 및 임시 텍스트 초기화
        isUpdatingTempText = true;
        newClipboardText.value = '';
        updateCharCount();
        await tempTextRef.set('');
        isUpdatingTempText = false
    
    // 클립보드 목록 변경 리스너
    clipboardsRef.on('value', (snapshot) => {
        if (!isUpdatingFromFirebase) {
            isUpdatingFromFirebase = true;
            const clipboards = snapshot.val();
            renderClipboards(clipboards);
            isUpdatingFromFirebase = false;
        }
    });
    
    // 임시 텍스트 실시간 동기화 리스너
    tempTextRef.on('value', (snapshot) => {
        if (!isUpdatingTempText) {
            isUpdatingTempText = true;
            const text = snapshot.val() || '';
            newClipboardText.value = text;
            updateCharCount();
            isUpdatingTempText
// 실시간 리스너 설정
function setupRealtimeListener() {
    if (!roomRef || !clipboardsRef) return;
    
    // 연결 상태 모니터링
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        updateConnectionStatus(snapshot.val() === true);
    });
    
    // 클립보드 목록 변경 리스너
    clipboardsRef.on('value', (snapshot) => {
        if (!isUpdatingFromFirebase) {
            isUpdatingFromFirebase = true;
            const clipboards = snapshot.val();
            renderClipboards(clipboards);
            isUpdatingFromFirebase = false;
        }
    });
}

// 텍스트 업데이트 (디바운싱)
let updateTimeout = null;
function updateText() {
    if (isUpdatingFromFirebase) return;
    
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(async () => {
        try {
            await roomRef.update({
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
    if (tempTextRef) {
        tempTextRef.off();
    }
    
    currentRoom = null;
    roomRef = null;
    clipboardsRef = null;
    tempTextnsole.error('업데이트 실패:', error);
        }
    }, UPDATE_DEBOUNCE_MS);
}

// 룸 나가기
function leaveRoom() {
    if (roomRef) {
        roomRef.off();
        database.ref('.info/connected').off();
    }
    
    if (clipboardsRef) {
        clipboardsRef.off();
    }
    
    currentRoom = null;
    roomRef = null;
    clipboardsRef = null;
    newClipboardText.value = '';
    roomCodeInput.value = '';
    clipboardItems.innerHTML = '';
    
    roomSelection.style.display = 'block';
    clipboardArea.style.display = 'none';
    
    showNotification('룸에서 나갔습니다.', 'success');
}

// 붙여넣기
async function pasteText() {
    try {
        const text = await navigator.clipboard.readText();
        newClipboardText.value = text;
        updateCharCount();
        showNotification('텍스트가 붙여넣어졌습니다.', 'success');
    } catch (error) {
        console.error('붙여넣기 실패:', error);
        showNotification('붙여넣기에 실패했습니다. Ctrl+V를 사용하세요.', 'warning');
    }
}

// 룸 코드 복사
async function copyRoomCode() {
    try {
        await navigator.clipboard.writeText(currentRoom);
        showNotification('룸 코드가 복사되었습니다!', 'success');
    } catch (error) {
        console.error('복사 실패:', error);
        showNotification('룸 코드 복사에 실패했습니다.', 'error');
    }
}

// 룸 코드 입력 포맷팅
function formatRoomCode(input) {
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (value.length > 3) {
        value = value.substring(0, 3) + '-' + value.substring(3, 6);
    }
    
    input.value = value;
}

// 만료된 룸 정리 (주기적 실행)
async function cleanupExpiredRooms() {
    try {
        const snapshot = await database.ref(RTDB_PATH.CLIPBOARD).once('value');
        const rooms = snapshot.val();
        
        if (!rooms) return;
        
        const now = Date.now();
        const updates = {};
        
        Object.keys(rooms).forEach(roomCode => {
            const room = rooms[roomCode];
            if (room.expiresAt && room.expiresAt < now) {
                updates[roomCode] = null;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref(RTDB_PATH.CLIPBOARD).update(updates);
            console.log(`${Object.keys(updates).length}개의 만료된 룸을 정리했습니다.`);
        }
    } catch (error) {
        console.error('룸 정리 실패:', error);
    }
}

// 이벤트 리스너
createRoomBtn.addEventListener('click', createRoom);
joinRoomBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim();
    if (code) {
        joinRoom(code);
    } else {
        showNotification('룸 코드를 입력하세요.', 'warning');
    }
});

roomCodeInput.addEventListener('input', (e) => {
    formatRoomCode(e.target);
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoomBtn.click();
    }
});

leaveRoomBtn.addEventListener('click', leaveRoom);
    updateTempText(); // 실시간 동기화
addClipboardBtn.addEventListener('click', addClipboard);
copyRoomCodeBtn.addEventListener('click', copyRoomCode);

newClipboardText.addEventListener('input', () => {
    updateCharCount();
});

newClipboardText.addEventListener('keydown', (e) => {
    // Ctrl+Enter로 클립보드 추가
    if (e.ctrlKey && e.key === 'Enter') {
        addClipboard();
    }
});

// 초기화
updateCharCount();

// 정기적으로 만료된 룸 정리
setInterval(cleanupExpiredRooms, CLEANUP_INTERVAL_MS);

// 페이지 로드 시 한 번 실행
cleanupExpiredRooms();

console.log(`${APP_NAME} v${APP_VERSION} - 시작되었습니다.`);
