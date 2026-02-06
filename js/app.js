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
const clipboardText = document.getElementById('clipboardText');
const copyTextBtn = document.getElementById('copyTextBtn');
const clearTextBtn = document.getElementById('clearTextBtn');
const pasteTextBtn = document.getElementById('pasteTextBtn');
const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
const charCount = document.getElementById('charCount');
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const notification = document.getElementById('notification');

// 상태 관리
let currentRoom = null;
let roomRef = null;
let isUpdatingFromFirebase = false;

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
    const count = clipboardText.value.length;
    charCount.textContent = count.toLocaleString();
}

// 새 룸 만들기
async function createRoom() {
    try {
        const roomCode = generateRoomCode();
        const roomData = {
            code: roomCode,
            text: '',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            expiresAt: Date.now() + (ROOM_EXPIRY_HOURS * 60 * 60 * 1000)
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
        
        // UI 전환
        roomSelection.style.display = 'none';
        clipboardArea.style.display = 'block';
        
        // 초기 텍스트 로드
        isUpdatingFromFirebase = true;
        clipboardText.value = roomData.text || '';
        updateCharCount();
        isUpdatingFromFirebase = false;
        
        // 실시간 리스너 설정
        setupRealtimeListener();
        
        showNotification('룸에 입장했습니다!', 'success');
    } catch (error) {
        console.error('룸 입장 실패:', error);
        showNotification('룸 입장에 실패했습니다.', 'error');
    }
}

// 실시간 리스너 설정
function setupRealtimeListener() {
    if (!roomRef) return;
    
    // 연결 상태 모니터링
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        updateConnectionStatus(snapshot.val() === true);
    });
    
    // 텍스트 변경 리스너
    roomRef.child('text').on('value', (snapshot) => {
        if (!isUpdatingFromFirebase) {
            isUpdatingFromFirebase = true;
            clipboardText.value = snapshot.val() || '';
            updateCharCount();
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
                text: clipboardText.value,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.error('텍스트 업데이트 실패:', error);
            showNotification('텍스트 저장에 실패했습니다.', 'error');
        }
    }, UPDATE_DEBOUNCE_MS);
}

// 룸 나가기
function leaveRoom() {
    if (roomRef) {
        roomRef.off();
        database.ref('.info/connected').off();
    }
    
    currentRoom = null;
    roomRef = null;
    clipboardText.value = '';
    roomCodeInput.value = '';
    
    roomSelection.style.display = 'block';
    clipboardArea.style.display = 'none';
    
    showNotification('룸에서 나갔습니다.', 'success');
}

// 텍스트 복사
async function copyText() {
    try {
        await navigator.clipboard.writeText(clipboardText.value);
        showNotification('클립보드에 복사되었습니다!', 'success');
    } catch (error) {
        console.error('복사 실패:', error);
        // 폴백: 텍스트 선택
        clipboardText.select();
        document.execCommand('copy');
        showNotification('텍스트가 선택되었습니다. Ctrl+C로 복사하세요.', 'warning');
    }
}

// 텍스트 지우기
async function clearText() {
    if (confirm('텍스트를 모두 지우시겠습니까?')) {
        clipboardText.value = '';
        updateCharCount();
        updateText();
        showNotification('텍스트가 지워졌습니다.', 'success');
    }
}

// 붙여넣기
async function pasteText() {
    try {
        const text = await navigator.clipboard.readText();
        const currentText = clipboardText.value;
        const start = clipboardText.selectionStart;
        const end = clipboardText.selectionEnd;
        
        // 커서 위치에 붙여넣기
        clipboardText.value = currentText.substring(0, start) + text + currentText.substring(end);
        
        // 커서 위치 조정
        const newPosition = start + text.length;
        clipboardText.setSelectionRange(newPosition, newPosition);
        
        updateCharCount();
        updateText();
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
copyTextBtn.addEventListener('click', copyText);
clearTextBtn.addEventListener('click', clearText);
pasteTextBtn.addEventListener('click', pasteText);
copyRoomCodeBtn.addEventListener('click', copyRoomCode);

clipboardText.addEventListener('input', () => {
    updateCharCount();
    updateText();
});

// 초기화
updateCharCount();

// 정기적으로 만료된 룸 정리
setInterval(cleanupExpiredRooms, CLEANUP_INTERVAL_MS);

// 페이지 로드 시 한 번 실행
cleanupExpiredRooms();

console.log(`${APP_NAME} v${APP_VERSION} - 시작되었습니다.`);
