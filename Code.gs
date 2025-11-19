/**
 * [2025 연천초등학교 교육과정 워크숍 웹 앱]
 * - 수정사항: 허용되지 않는 addMetaTag 제거 (에러 해결)
 */

// ==========================================
// 1. 환경 설정 (Configuration)
// ==========================================

const SPREADSHEET_ID = '1HVVjNgXQ0xWZSwvofIUPOSeFgS3d-a7TwjO7rmlhrjY';
const SHEET_NAME = '기록';

// 🔴 중요: 발급받은 새 API 키를 아래 따옴표 안에 넣으세요.
const GEMINI_API_KEY = '여기에_새로운_API_키를_붙여넣으세요'; 

// ✅ 모델 설정
const GEMINI_MODEL = 'gemini-1.5-flash'; 

// ==========================================
// 2. 웹 앱 초기 구동 (doGet) - 중요 수정!
// ==========================================
function doGet() {
  // 브라우저 탭 아이콘 (파비콘) 설정
  const faviconUrl = 'https://cdn-icons-png.flaticon.com/512/2913/2913974.png'; 

  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('2025 연천초등학교 교육과정 워크숍')
    // ✅ 중요: viewport는 허용되지만, og:title 등은 에러가 나므로 삭제했습니다.
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    // ✅ 파비콘 설정은 가능합니다.
    .setFaviconUrl(faviconUrl);
}

// ==========================================
// 3. 클라이언트 요청 처리 (processForm)
// ==========================================
function processForm(formData) {
  try {
    // 1) AI 메시지 생성
    const aiResponse = callGeminiAI(formData); 
    const aiMessage = aiResponse.text;
    
    // 2) 로그 확인
    if (aiResponse.error) {
      Logger.log('API Error Log: ' + aiResponse.error);
    }

    // 3) 시트 저장
    saveToSheet(formData, aiMessage);
    
    return {
      success: true,
      message: aiMessage
    };
    
  } catch (error) {
    Logger.log('System Error: ' + error.toString());
    return {
      success: false,
      message: "잠시 후 다시 시도해주세요. (서버 연결 오류)"
    };
  }
}

// ==========================================
// 4. 구글 시트 저장 함수
// ==========================================
function saveToSheet(data, messageToSave) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const timestamp = new Date();
  
  const rowData = [
    timestamp,
    data.name,
    data.goodPoints,
    data.improvements,
    data.others,
    messageToSave
  ];
  
  sheet.appendRow(rowData);
}

// ==========================================
// 5. Gemini API 호출 함수
// ==========================================
function callGeminiAI(data) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const promptText = `
    당신은 동료 교사로서 '${data.name}' 선생님의 1년 회고를 듣고 따뜻한 위로를 건네주세요.
    
    [회고 내용]
    - 좋았던 점: ${data.goodPoints || '없음'}
    - 아쉬운 점: ${data.improvements || '없음'}
    - 기타: ${data.others || '없음'}

    [요청사항]
    - 3~4문장의 짧은 편지글 형식.
    - "수고했다"는 뻔한 말보다, 감성적이고 구체적인 비유를 사용해 감동을 주세요.
    - 정중하고 따뜻한 해요체 사용.
  `;

  const payload = {
    "contents": [{ "parts": [{ "text": promptText }] }],
    "generationConfig": {
      "temperature": 1.0,
      "topP": 0.95,
      "topK": 40
    }
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const json = JSON.parse(response.getContentText());
    
    if (responseCode === 200 && json.candidates && json.candidates.length > 0) {
      return { text: json.candidates[0].content.parts[0].text, error: null };
    } else {
      const errorMsg = json.error ? json.error.message : "Unknown Error";
      return { 
        text: getRandomFallbackMessage(data.name), 
        error: errorMsg 
      };
    }
  } catch (e) {
    return { 
      text: getRandomFallbackMessage(data.name), 
      error: e.toString() 
    };
  }
}

// ==========================================
// 6. 대체 문구 생성기 (비상용)
// ==========================================
function getRandomFallbackMessage(name) {
  const messages = [
    `${name} 선생님, 올 한 해 정말 고생 많으셨습니다. 선생님의 미소가 아이들에겐 가장 큰 선물이었습니다.`,
    `보이지 않는 곳에서의 헌신, 저희는 모두 알고 있습니다. ${name} 선생님 덕분에 학교가 더 따뜻했습니다.`,
    `숨 가쁘게 달려온 1년, 잠시 쉬어가셔도 괜찮습니다. 2025년엔 더 행복한 일만 가득하시길 응원합니다.`,
    `${name} 선생님, 당신의 열정이 아이들의 마음속에 예쁜 꽃을 피웠을 거예요. 정말 수고 많으셨습니다.`
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
