# ClipShare AI Worker (Cloudflare Workers)

## 📌 개요

Firebase Functions 대신 Cloudflare Workers를 사용하여 OpenAI API를 호출하는 백엔드입니다.

### 🎯 왜 Cloudflare Workers?

| 항목 | Cloudflare Workers | Firebase Functions |
|------|-------------------|-------------------|
| 무료 tier | **100,000 요청/일** (월 3백만) | 2,000,000 호출/월 |
| Cold start | **없음** (V8 isolate) | 있음 |
| 응답 속도 | **매우 빠름** (edge) | 중간 |
| 글로벌 배포 | **자동** (200+ 도시) | 단일 리전 |
| **결제 필요** | **없음** | **Blaze 플랜 필수** |

👉 **Cloudflare Workers가 이 프로젝트에 완벽합니다!**

## 🚀 빠른 시작

### 1. Wrangler CLI 설치

```bash
npm install -g wrangler
```

### 2. Cloudflare 로그인

```bash
wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하세요.

### 3. 환경 변수 설정

```bash
cd worker
wrangler secret put OPENAI_API_KEY
```

OpenAI API 키를 입력하세요:
```
sk-xxx... (본인의 OpenAI API 키)
```

### 4. 배포

```bash
npm run deploy
```

또는

```bash
wrangler deploy
```

배포 완료 후 URL이 표시됩니다:
```
✨ Published clipshare-ai-worker (1.23 sec)
   https://clipshare-ai-worker.YOUR_SUBDOMAIN.workers.dev
```

### 5. 프론트엔드 설정

[js/app.js](../js/app.js)에서 Worker URL로 변경:

```javascript
// 기존 (Firebase Functions)
const functionUrl = 'https://asia-northeast3-clip2share.cloudfunctions.net/organizeSchedule';

// 새로운 (Cloudflare Workers)
const functionUrl = 'https://clipshare-ai-worker.YOUR_SUBDOMAIN.workers.dev';
```

## 🧪 로컬 테스트

### 개발 서버 실행

```bash
cd worker
npm run dev
```

로컬 서버가 `http://localhost:8787`에서 실행됩니다.

### 테스트 요청

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"prompt": "내일 오후 3시 회의, 저녁 6시 저녁약속"}'
```

## 📊 비용 및 제한

### 무료 Tier 제한

- **요청 수**: 100,000 요청/일 (월 약 3백만)
- **CPU 시간**: 10ms/요청
- **메모리**: 128MB
- **스크립트 크기**: 1MB

### 실제 사용량 예상

| 사용자 수 | 일일 요청 | 월 요청 | 무료 tier |
|----------|---------|--------|----------|
| 10명 | 50 | 1,500 | ✅ 충분 |
| 100명 | 500 | 15,000 | ✅ 충분 |
| 1,000명 | 5,000 | 150,000 | ✅ 충분 |
| 10,000명 | 50,000 | 1,500,000 | ✅ 충분 |

👉 **개인 프로젝트에는 평생 무료!**

## 🔧 커스텀 도메인 (선택사항)

### 1. Cloudflare에 도메인 추가

Dashboard → Websites → Add a Site

### 2. Worker Routes 설정

```toml
# wrangler.toml
route = "https://api.clipshare.com/*"
```

### 3. 재배포

```bash
wrangler deploy
```

## 📝 API 엔드포인트

### POST /

메모를 AI로 정리합니다.

**요청:**

```json
{
  "prompt": "내일 오후 3시 회의\n저녁 6시 저녁약속\n주말에 운동하기"
}
```

**응답 (성공):**

```json
{
  "success": true,
  "result": "# 일정 정리\n\n## 📅 내일\n- [ ] 15:00 회의\n- [ ] 18:00 저녁약속\n\n## 🏃 주말\n- [ ] 운동하기"
}
```

**응답 (실패):**

```json
{
  "success": false,
  "error": "유효한 메모를 입력하세요."
}
```

## 🔍 모니터링

### Cloudflare Dashboard에서 확인

1. Cloudflare Dashboard 로그인
2. Workers & Pages → clipshare-ai-worker
3. Metrics 탭에서 실시간 통계 확인:
   - 요청 수
   - 오류율
   - 응답 시간
   - CPU 사용량

### Wrangler로 로그 확인

```bash
wrangler tail
```

실시간으로 Worker 로그를 확인할 수 있습니다.

## 🛠️ 트러블슈팅

### 1. "Unauthorized" 오류

```bash
wrangler login
```

다시 로그인하세요.

### 2. API 키 설정 확인

```bash
wrangler secret list
```

`OPENAI_API_KEY`가 표시되어야 합니다.

### 3. CORS 오류

Worker 코드의 `corsHeaders`에서 `Access-Control-Allow-Origin`을 확인하세요.

현재는 `*` (모든 도메인 허용)으로 설정되어 있습니다.

프로덕션에서는 특정 도메인만 허용하도록 변경하세요:

```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://clip2share.web.app',
  // ...
};
```

## 🚀 배포 체크리스트

- [ ] Wrangler CLI 설치
- [ ] Cloudflare 계정 로그인
- [ ] OpenAI API 키 설정 (`wrangler secret put`)
- [ ] Worker 배포 (`wrangler deploy`)
- [ ] 배포된 URL 확인
- [ ] [js/app.js](../js/app.js)에서 URL 업데이트
- [ ] 프론트엔드 재배포 (`firebase deploy --only hosting`)
- [ ] AI 기능 테스트

## 📚 참고 자료

- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/wrangler/)
- [OpenAI API 문서](https://platform.openai.com/docs/api-reference)

## 💡 다음 단계

1. **Custom Domain**: 자신만의 도메인 사용 (예: api.clipshare.com)
2. **Rate Limiting**: IP별 요청 제한 추가
3. **Firebase Auth 연동**: 인증된 사용자만 사용하도록 제한
4. **Analytics**: 더 자세한 사용 통계 추적
