// 클립보드 공유 앱
import { firebaseConfig, APP_NAME, APP_VERSION, RTDB_PATH, ROOM_EXPIRY_HOURS, MAX_TEXT_LENGTH, UPDATE_DEBOUNCE_MS } from './config.js';

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 관리자 이메일 목록
const ADMIN_EMAILS = ['msea200@gmail.com', 'bkcode200@gmail.com'];

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
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');
const adminBadge = document.getElementById('adminBadge');

// 상태 관리
let currentRoom = null;
let roomRef = null;
let clipboardsRef = null;
let tempTextRef = null;
let isUpdatingFromFirebase = false;
let isUpdatingTempText = false;
let tempTextTimeout = null;
let currentUser = null;

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
            clipboards: {},
            tempText: ''
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
    try {
        await clipboardsRef.child(id).remove();
        showNotification('클립보드가 삭제되었습니다.', 'success');
    } catch (error) {
        console.error('삭제 실패:', error);
        showNotification('삭제에 실패했습니다.', 'error');
    }
}

// 임시 텍스트 업데이트 (디바운싱)
function updateTempText() {
    if (isUpdatingTempText || !tempTextRef) return;
    
    clearTimeout(tempTextTimeout);
    tempTextTimeout = setTimeout(async () => {
        try {
            const text = newClipboardText.value;
            await tempTextRef.set(text);
        } catch (error) {
            console.error('임시 텍스트 저장 실패:', error);
        }
    }, 300);
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
        isUpdatingTempText = false;
        
        showNotification('클립보드가 추가되었습니다!', 'success');
    } catch (error) {
        console.error('클립보드 추가 실패:', error);
        showNotification('클립보드 추가에 실패했습니다.', 'error');
    }
}

// 실시간 리스너 설정
function setupRealtimeListener() {
    if (!roomRef || !clipboardsRef || !tempTextRef) return;
    
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
    
    // 임시 텍스트 실시간 동기화 리스너
    tempTextRef.on('value', (snapshot) => {
        if (!isUpdatingTempText) {
            isUpdatingTempText = true;
            const text = snapshot.val() || '';
            newClipboardText.value = text;
            updateCharCount();
            setTimeout(() => {
                isUpdatingTempText = false;
            }, 100);
        }
    });
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
    
    if (tempTextRef) {
        tempTextRef.off();
    }
    
    currentRoom = null;
    roomRef = null;
    clipboardsRef = null;
    tempTextRef = null;
    newClipboardText.value = '';
    roomCodeInput.value = '';
    clipboardItems.innerHTML = '';
    
    roomSelection.style.display = 'block';
    clipboardArea.style.display = 'none';
    
    showNotification('룸에서 나갔습니다.', 'info');
}

// 룸 코드 복사
async function copyRoomCode() {
    try {
        await navigator.clipboard.writeText(currentRoom);
        showNotification('룸 코드가 복사되었습니다!', 'success');
    } catch (error) {
        console.error('룸 코드 복사 실패:', error);
        showNotification('복사에 실패했습니다.', 'error');
    }
}

// 룸 코드 포맷팅 (ABC-123)
function formatRoomCode(input) {
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (value.length > 6) {
        value = value.substring(0, 6);
    }
    
    if (value.length > 3) {
        value = value.substring(0, 3) + '-' + value.substring(3, 6);
    }
    
    input.value = value;
}

// Google 로그인
async function loginWithGoogle() {
    try {
        await auth.signInWithPopup(googleProvider);
        showNotification('로그인 되었습니다!', 'success');
    } catch (error) {
        console.error('로그인 실패:', error);
        showNotification('로그인에 실패했습니다.', 'error');
    }
}

// 로그아웃
async function logout() {
    try {
        await auth.signOut();
        showNotification('로그아웃 되었습니다.', 'info');
    } catch (error) {
        console.error('로그아웃 실패:', error);
        showNotification('로그아웃에 실패했습니다.', 'error');
    }
}

// 사용자 UI 업데이트
function updateUserUI(user) {
    if (user) {
        currentUser = user;
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        userPhoto.src = user.photoURL || 'https://via.placeholder.com/40';
        userName.textContent = user.displayName || user.email;
        
        // 관리자 배지 표시
        if (ADMIN_EMAILS.includes(user.email)) {
            adminBadge.style.display = 'inline-block';
        } else {
            adminBadge.style.display = 'none';
        }
    } else {
        currentUser = null;
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
        adminBadge.style.display = 'none';
    }
}

// 인증 상태 변경 리스너
auth.onAuthStateChanged((user) => {
    updateUserUI(user);
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 로그인/로그아웃
    loginBtn.addEventListener('click', loginWithGoogle);
    logoutBtn.addEventListener('click', logout);
    
    // 룸 생성/입장
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', () => {
        const code = roomCodeInput.value.trim();
        if (code) {
            joinRoom(code);
        } else {
            showNotification('룸 코드를 입력하세요.', 'warning');
        }
    });
    
    // 룸 코드 입력 필드 포맷팅
    roomCodeInput.addEventListener('input', (e) => {
        formatRoomCode(e.target);
    });
    
    // 룸 코드 입력 필드 엔터키
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });
    
    // 룸 나가기
    leaveRoomBtn.addEventListener('click', leaveRoom);
    
    // 룸 코드 복사
    copyRoomCodeBtn.addEventListener('click', copyRoomCode);
    
    // 새 클립보드 추가
    addClipboardBtn.addEventListener('click', addClipboard);
    
    // 텍스트 영역 실시간 동기화
    newClipboardText.addEventListener('input', () => {
        updateCharCount();
        updateTempText();
    });
    
    // 텍스트 영역 Ctrl+Enter로 추가
    newClipboardText.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            addClipboard();
        }
    });
}

// 앱 초기화
function initApp() {
    console.log(`${APP_NAME} v${APP_VERSION} 초기화 중...`);
    setupEventListeners();
    console.log('앱이 준비되었습니다.');
}

// 앱 시작
document.addEventListener('DOMContentLoaded', initApp);
