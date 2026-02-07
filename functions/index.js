/**
 * Firebase Cloud Functions for Time Note
 * OpenAI API를 안전하게 호출하는 백엔드 함수
 */

const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require('firebase-admin');
const logger = require("firebase-functions/logger");

admin.initializeApp();

// Firebase Secret Manager에서 API 키 정의
const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * OpenAI API를 사용하여 일정을 정리하는 함수
 * POST 요청으로 prompt를 받아서 OpenAI API 호출 후 결과 반환
 */
exports.organizeSchedule = onRequest(
  {
    region: 'asia-northeast3', // 서울 리전
    cors: true, // CORS 자동 처리
    maxInstances: 10,
    secrets: [openaiApiKey] // Secret 사용 선언
  },
  async (req, res) => {
    // POST 요청만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // 요청 데이터 가져오기
      const { prompt } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: '메모를 입력하세요.' });
      }

      // Secret에서 OpenAI API 키 가져오기
      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        logger.error('OpenAI API 키가 설정되지 않았습니다.');
        return res.status(500).json({ error: '서버 설정 오류' });
      }

      logger.info('OpenAI API 호출 시작');

      // OpenAI API 호출
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `당신은 일정 정리 전문가입니다. 사용자가 궁금해 하거나 검색이 필요한 부분을 검색 후 요약정보를 제공하고, 사용자의 메모나 일정을 읽기 쉽고 구조화된 형식으로 정리해주세요.

규칙:
1. 날짜와 시간을 명확하게 표시
2. 중요한 정보는 굵게 표시 (마크다운 **텍스트** 형식)
3. 목록 형식으로 정리
4. 한국어로 답변
5. 이모지를 적절히 사용하여 가독성 향상
6. 사용자가 "검색해", "알려줘", "추천해" 등의 정보 요청 시 관련 정보를 검색하여 함께 제공`
            },
            {
              role: 'user',
              content: prompt.trim()
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        logger.error('OpenAI API 오류:', errorData);
        return res.status(openaiResponse.status).json({
          error: errorData.error?.message || 'AI 처리 실패'
        });
      }

      const data = await openaiResponse.json();
      const result = data.choices[0].message.content;

      logger.info('OpenAI API 호출 성공');

      // 성공 응답
      return res.status(200).json({
        success: true,
        result: result
      });

    } catch (error) {
      logger.error('함수 실행 오류:', error);
      return res.status(500).json({
        error: '서버 오류가 발생했습니다.',
        details: error.message
      });
    }
  }
);
