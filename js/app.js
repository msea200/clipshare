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
const adminPanelBtn = document.getElementById('adminPanelBtn');
const adminPanel = document.getElementById('adminPanel');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const adminRoomList = document.getElementById('adminRoomList');
const normalRooms = document.getElementById('normalRooms');
const permanentRooms = document.getElementById('permanentRooms');
const normalRoomsCard = document.getElementById('normalRoomsCard');
const permanentRoomsCard = document.getElementById('permanentRoomsCard');
const permanentBadge = document.getElementById('permanentBadge');
const togglePermanentRoomBtn = document.getElementById('togglePermanentRoomBtn');
const deleteRoomBtn = document.getElementById('deleteRoomBtn');

// 상태 관리
let currentRoom = null;
let roomRef = null;
let clipboardsRef = null;
let tempTextRef = null;
let isUpdatingFromFirebase = false;
let isUpdatingTempText = false;
let tempTextTimeout = null;
let currentUser = null;
let isFromAdminPanel = false; // 관리자 패널에서 입장했는지 여부
let adminRoomFilter = 'normal'; // 'normal' or 'permanent'

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
    const authorName = data.author?.name || '익명';
    const authorPhoto = data.author?.photo;
    
    return `
        <div class="clipboard-item" data-id="${id}">
            <div class="clipboard-item-header">
                <div class="clipboard-item-author">
                    ${authorPhoto ? `<img src="${authorPhoto}" class="clipboard-author-photo" alt="${authorName}">` : '<span class="clipboard-author-icon">👤</span>'}
                    <span class="clipboard-author-name">${escapeHtml(authorName)}</span>
                </div>
                <div class="clipboard-item-actions">
                    <button class="btn-icon-sm copy-item" title="복사">📋</button>
                    <button class="btn-icon-sm danger delete-item" title="삭제">🗑️</button>
                </div>
            </div>
            <div class="clipboard-item-meta">
                <span class="clipboard-item-time">🕐 ${time}</span>
                <span class="clipboard-item-length">📝 ${length.toLocaleString()}자</span>
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
        
        // 만료된 룸 확인 (영구 보관이 아닌 경우)
        if (!roomData.permanent && roomData.expiresAt && roomData.expiresAt < Date.now()) {
            await database.ref(`${RTDB_PATH.CLIPBOARD}/${formattedCode}`).remove();
            showNotification('만료된 룸입니다.', 'error');
            return;
        }
        
        currentRoom = formattedCode;
        currentRoomCode.textContent = formattedCode;
        roomRef = database.ref(`${RTDB_PATH.CLIPBOARD}/${formattedCode}`);
        clipboardsRef = roomRef.child('clipboards');
        tempTextRef = roomRef.child('tempText');
        
        // 영구 보관 배지 표시
        if (roomData.permanent) {
            permanentBadge.style.display = 'inline-block';
        } else {
            permanentBadge.style.display = 'none';
        }
        
        // 관리자 모드일 때 삭제 및 영구 보관 버튼 표시
        if (isAdmin()) {
            togglePermanentRoomBtn.style.display = 'inline-block';
            deleteRoomBtn.style.display = 'inline-block';
            
            // 영구 보관 버튼 아이콘 업데이트
            if (roomData.permanent) {
                togglePermanentRoomBtn.textContent = '🔓';
                togglePermanentRoomBtn.title = '영구 보관 해제';
                togglePermanentRoomBtn.classList.add('permanent');
            } else {
                togglePermanentRoomBtn.textContent = '🔒';
                togglePermanentRoomBtn.title = '영구 보관 설정';
                togglePermanentRoomBtn.classList.remove('permanent');
            }
        } else {
            togglePermanentRoomBtn.style.display = 'none';
            deleteRoomBtn.style.display = 'none';
        }
        
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
        
        // 작성자 정보 추가
        const authorName = currentUser ? (currentUser.displayName || currentUser.email) : '익명';
        const authorEmail = currentUser ? currentUser.email : null;
        const authorPhoto = currentUser ? currentUser.photoURL : null;
        
        await newClipboardRef.set({
            text: text,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            author: {
                name: authorName,
                email: authorEmail,
                photo: authorPhoto
            }
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
    
    clipboardArea.style.display = 'none';
    
    // 관리자 패널에서 입장한 경우 관리자 패널로 돌아감
    if (isFromAdminPanel && isAdmin()) {
        adminPanel.style.display = 'block';
        roomSelection.style.display = 'none';
        loadAllRooms();
        isFromAdminPanel = false;
        showNotification('관리자 패널로 돌아왔습니다.', 'info');
    } else {
        roomSelection.style.display = 'block';
        adminPanel.style.display = 'none';
        isFromAdminPanel = false;
        showNotification('룸에서 나갔습니다.', 'info');
    }
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
        
        console.log('User email:', user.email);
        console.log('Is admin:', ADMIN_EMAILS.includes(user.email));
        
        // 관리자 배지 표시
        if (ADMIN_EMAILS.includes(user.email)) {
            adminBadge.style.display = 'inline-block';
            adminPanelBtn.style.display = 'block';
            console.log('Admin panel button should be visible');
        } else {
            adminBadge.style.display = 'none';
            adminPanelBtn.style.display = 'none';
        }
    } else {
        currentUser = null;
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
        adminBadge.style.display = 'none';
        adminPanelBtn.style.display = 'none';
    }
}

// 관리자 여부 확인
function isAdmin() {
    return currentUser && ADMIN_EMAILS.includes(currentUser.email);
}

// 관리자 패널 열기
function openAdminPanel() {
    if (!isAdmin()) {
        showNotification('관리자 권한이 필요합니다.', 'error');
        return;
    }
    
    adminPanel.style.display = 'block';
    roomSelection.style.display = 'none';
    clipboardArea.style.display = 'none';
    loadAllRooms();
}

// 관리자 패널 닫기
function closeAdminPanel() {
    adminPanel.style.display = 'none';
    roomSelection.style.display = 'block';
}

// 모든 룸 목록 로드
async function loadAllRooms() {
    try {
        const snapshot = await database.ref(RTDB_PATH.CLIPBOARD).once('value');
        const rooms = snapshot.val();
        
        if (!rooms) {
            adminRoomList.innerHTML = '<div class="empty-state"><p>생성된 룸이 없습니다.</p></div>';
            normalRooms.textContent = '0';
            permanentRooms.textContent = '0';
            return;
        }
        
        const roomEntries = Object.entries(rooms);
        const now = Date.now();
        let permCount = 0;
        let normalCount = 0;
        
        // 만료된 룸 필터링
        const activeRooms = roomEntries.filter(([code, data]) => {
            if (data.permanent) {
                permCount++;
                return true;
            }
            if (!data.expiresAt || data.expiresAt > now) {
                normalCount++;
                return true;
            }
            return false;
        });
        
        // 필터에 따라 룸 분류
        const filteredRooms = activeRooms.filter(([code, data]) => {
            if (adminRoomFilter === 'permanent') {
                return data.permanent === true;
            } else {
                return !data.permanent;
            }
        });
        
        // 최근 생성 순으로 정렬
        filteredRooms.sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
        
        normalRooms.textContent = normalCount;
        permanentRooms.textContent = permCount;
        
        if (filteredRooms.length === 0) {
            const message = adminRoomFilter === 'permanent' ? '영구 룸이 없습니다.' : '일반 룸이 없습니다.';
            adminRoomList.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
        } else {
            adminRoomList.innerHTML = filteredRooms.map(([code, data]) => createAdminRoomItemHTML(code, data)).join('');
            // 이벤트 리스너 추가
            attachAdminRoomListeners();
        }
    } catch (error) {
        console.error('룸 목록 로드 실패:', error);
        showNotification('룸 목록 로드에 실패했습니다.', 'error');
    }
}

// 관리자 룸 아이템 HTML 생성
function createAdminRoomItemHTML(code, data) {
    const createdTime = data.createdAt ? formatTime(data.createdAt) : '알 수 없음';
    const clipboardCount = data.clipboards ? Object.keys(data.clipboards).length : 0;
    const expiresTime = data.permanent ? '영구 보관' : 
        (data.expiresAt ? new Date(data.expiresAt).toLocaleString('ko-KR') : '알 수 없음');
    
    return `
        <div class="admin-room-item" data-room-code="${code}">
            <div class="admin-room-header">
                <div>
                    <span class="admin-room-code">${code}</span>
                    ${data.permanent ? '<span class="permanent-badge">🔒 영구 보관</span>' : ''}
                </div>
                <div class="admin-room-actions">
                    <button class="btn-toggle-permanent ${data.permanent ? 'permanent' : ''}" 
                            data-room-code="${code}" 
                            data-permanent="${data.permanent || false}"
                            title="${data.permanent ? '영구 보관 해제' : '영구 보관 설정'}">
                        ${data.permanent ? '🔓' : '🔒'}
                    </button>
                    <button class="btn-icon-sm danger admin-delete-room" data-room-code="${code}" title="삭제">🗑️</button>
                </div>
            </div>
            <div class="admin-room-info">
                <div class="admin-room-info-item">📅 생성: ${createdTime}</div>
                <div class="admin-room-info-item">📋 클립보드: ${clipboardCount}개</div>
                <div class="admin-room-info-item">⏰ 만료: ${expiresTime}</div>
            </div>
        </div>
    `;
}

// 관리자 룸 리스너 추가
function attachAdminRoomListeners() {
    // 룸 목록 클릭 시 입장
    document.querySelectorAll('.admin-room-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 버튼 클릭은 제외
            if (e.target.closest('button')) return;
            
            const roomCode = item.dataset.roomCode;
            isFromAdminPanel = true; // 관리자 패널에서 입장했음을 표시
            closeAdminPanel();
            joinRoom(roomCode);
        });
    });
    
    // 영구 보관 토글
    document.querySelectorAll('.btn-toggle-permanent').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // 상위 요소로 이벤트 전파 방지
            const roomCode = e.target.dataset.roomCode;
            const isPermanent = e.target.dataset.permanent === 'true';
            await togglePermanent(roomCode, !isPermanent);
        });
    });
    
    // 룸 삭제
    document.querySelectorAll('.admin-delete-room').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // 상위 요소로 이벤트 전파 방지
            const roomCode = e.target.dataset.roomCode;
            if (confirm(`룸 ${roomCode}을(를) 정말 삭제하시겠습니까?`)) {
                await deleteRoom(roomCode);
            }
        });
    });
}

// 룸 삭제 (관리자 전용)
async function deleteRoom(roomCode) {
    if (!isAdmin()) {
        showNotification('관리자 권한이 필요합니다.', 'error');
        return;
    }
    
    try {
        await database.ref(`${RTDB_PATH.CLIPBOARD}/${roomCode}`).remove();
        showNotification(`룸 ${roomCode}이(가) 삭제되었습니다.`, 'success');
        
        // 관리자 패널에서 입장한 경우 관리자 패널로 돌아가고, 그렇지 않으면 초기 화면으로
        if (isFromAdminPanel) {
            leaveRoom();
        } else {
            loadAllRooms();
        }
    } catch (error) {
        console.error('룸 삭제 실패:', error);
        showNotification('룸 삭제에 실패했습니다.', 'error');
    }
}

// 현재 룸 삭제
async function deleteCurrentRoom() {
    if (!currentRoom) return;
    
    if (confirm(`룸 ${currentRoom}을(를) 정말 삭제하시겠습니까?`)) {
        const roomCode = currentRoom;
        leaveRoom();
        await deleteRoom(roomCode);
    }
}

// 영구 보관 토글 (관리자 전용)
async function togglePermanent(roomCode, permanent) {
    if (!isAdmin()) {
        showNotification('관리자 권한이 필요합니다.', 'error');
        return;
    }
    
    try {
        await database.ref(`${RTDB_PATH.CLIPBOARD}/${roomCode}/permanent`).set(permanent);
        showNotification(permanent ? '영구 보관으로 설정되었습니다.' : '영구 보관이 해제되었습니다.', 'success');
        
        // 현재 룸인 경우 배지 업데이트
        if (currentRoom === roomCode) {
            permanentBadge.style.display = permanent ? 'inline-block' : 'none';
            
            // 영구 보관 버튼 아이콘 업데이트
            if (permanent) {
                togglePermanentRoomBtn.textContent = '🔓';
                togglePermanentRoomBtn.title = '영구 보관 해제';
                togglePermanentRoomBtn.classList.add('permanent');
            } else {
                togglePermanentRoomBtn.textContent = '🔒';
                togglePermanentRoomBtn.title = '영구 보관 설정';
                togglePermanentRoomBtn.classList.remove('permanent');
            }
        }
        
        loadAllRooms();
    } catch (error) {
        console.error('영구 보관 설정 실패:', error);
        showNotification('영구 보관 설정에 실패했습니다.', 'error');
    }
}

// 현재 룸 영구 보관 토글
async function toggleCurrentRoomPermanent() {
    if (!currentRoom) return;
    
    const snapshot = await database.ref(`${RTDB_PATH.CLIPBOARD}/${currentRoom}/permanent`).once('value');
    const isPermanent = snapshot.val() || false;
    
    await togglePermanent(currentRoom, !isPermanent);
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
    
    // 관리자 패널
    adminPanelBtn.addEventListener('click', openAdminPanel);
    closeAdminBtn.addEventListener('click', closeAdminPanel);
    
    // 관리자 패널 필터
    normalRoomsCard.addEventListener('click', () => {
        adminRoomFilter = 'normal';
        normalRoomsCard.style.opacity = '1';
        permanentRoomsCard.style.opacity = '0.7';
        loadAllRooms();
    });
    
    permanentRoomsCard.addEventListener('click', () => {
        adminRoomFilter = 'permanent';
        permanentRoomsCard.style.opacity = '1';
        normalRoomsCard.style.opacity = '0.7';
        loadAllRooms();
    });
    
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
    
    // 관리자 전용: 현재 룸 삭제
    deleteRoomBtn.addEventListener('click', deleteCurrentRoom);
    
    // 관리자 전용: 현재 룸 영구 보관 토글
    togglePermanentRoomBtn.addEventListener('click', toggleCurrentRoomPermanent);
    
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
