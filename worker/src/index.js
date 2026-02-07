/**
 * Cloudflare Worker for ClipShare AI Organization
 * 
 * 이 Worker는 클라이언트와 OpenAI API 사이의 프록시 역할을 합니다.
 * Firebase Functions 대신 Cloudflare Workers를 사용하여:
 * - 무료 tier: 일 100,000 요청 (월 3백만)
 * - Cold start 없음 (V8 isolate)
 * - Edge에서 실행되어 전 세계 어디서나 빠른 응답
 */

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// OpenAI 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 일정과 메모를 정리하는 전문가입니다.

사용자가 입력한 메모를 다음 규칙에 따라 정리하세요:

1. **날짜와 시간**: 모든 날짜와 시간을 명확하게 표시하세요 (예: 2024-01-15 14:00)
2. **카테고리 분류**: 업무, 개인, 중요, 긴급 등으로 구분하세요
3. **우선순위**: 중요도에 따라 ⭐ 표시를 추가하세요
4. **체크리스트**: 할 일 목록은 - [ ] 형식으로 변환하세요
5. **간결성**: 불필요한 내용은 제거하고 핵심만 남기세요
6. **구조화**: 제목, 소제목, 목록을 활용해 읽기 쉽게 정리하세요

입력된 메모를 분석하고 위 규칙에 따라 깔끔하게 정리해주세요.`;

export default {
  async fetch(request, env, ctx) {
    // DEBUG: API 키 확인 엔드포인트
    const url = new URL(request.url);
    if (url.pathname === '/debug') {
      const apiKey = env.OPENAI_API_KEY;
      return new Response(
        JSON.stringify({
          hasKey: !!apiKey,
          keyPrefix: apiKey ? apiKey.substring(0, 20) + '...' : 'null',
          keyLength: apiKey ? apiKey.length : 0
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // CORS preflight 요청 처리
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // POST 요청만 허용
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.',
        }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    try {
      // 요청 본문 파싱
      const body = await request.json();
      const { prompt } = body;

      // 입력 검증
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: '유효한 메모를 입력하세요.',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // OpenAI API 키 확인
      const apiKey = env.OPENAI_API_KEY;
      console.log('API Key exists:', !!apiKey);
      console.log('API Key prefix:', apiKey ? apiKey.substring(0, 20) + '...' : 'null');
      
      if (!apiKey) {
        console.error('OPENAI_API_KEY not configured');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'API key not configured. Please set up environment variables.',
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      console.log('Calling OpenAI API...');
      console.log('API Key trim length:', apiKey.trim().length);
      console.log('API Key starts with:', apiKey.substring(0, 15));

      // OpenAI API 호출
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      console.log('OpenAI API response status:', openaiResponse.status);

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error('OpenAI API error:', openaiResponse.status, errorData);
        return new Response(
          JSON.stringify({
            success: false,
            error: `OpenAI API 오류: ${openaiResponse.status} ${openaiResponse.statusText}`,
          }),
          {
            status: openaiResponse.status,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      const data = await openaiResponse.json();
      const result = data.choices?.[0]?.message?.content;

      if (!result) {
        throw new Error('No response from OpenAI');
      }

      // 성공 응답
      return new Response(
        JSON.stringify({
          success: true,
          result: result.trim(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || '서버 오류가 발생했습니다.',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  },
};
