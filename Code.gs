const SPREADSHEET_ID = '1KjSZGr5mwrFWIMLAPdBFONNXdYMF1eJCXPj4b33xMBY';
const FRONTEND_URL = 'https://deploy-preview-2--stupendous-valkyrie-12e79e.netlify.app';
const SESSION_TTL_SECONDS = 6 * 60 * 60;
const AUTH_USERS_PROPERTY = 'APP_USERS_JSON';

const SHEETS = {
  targets: '대상지_리스트',
  schedules: '검사_일정',
  completed: '완료',
  stationDb: '충전소DB'
};

const BUSINESS_HEADERS = [
  'id',
  'groupId',
  'regDate',
  'serial',
  'name',
  'no',
  'address',
  'chargerType',
  'chargerCh',
  'manager',
  'phone',
  'requestDate',
  'inspectDate',
  'inspectTime',
  'result',
  'certificateDate',
  'memo',
  'completedAt'
];

const STATION_HEADERS = [
  'name',
  'no',
  'road',
  'jibun',
  'addr',
  'region',
  'city',
  'op',
  'kind',
  'indoor',
  'slow7',
  'fast53',
  'ultra105'
];

function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return json_({
      ok: true,
      message: '검사 일정 관리자 앱 스크립트 API가 실행 중입니다.'
    });
  }

  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="ko"><head><base target="_top"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>검사 일정 관리자</title>' +
    '<style>body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f6f8fb;color:#172033;display:grid;place-items:center;min-height:100vh}.box{background:#fff;border:1px solid #d9e2ef;border-radius:14px;padding:28px;max-width:560px;box-shadow:0 12px 30px rgba(15,23,42,.08)}a{display:inline-block;margin-top:16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;padding:11px 14px;font-weight:700}.muted{color:#64748b;font-size:14px;line-height:1.6}.url{word-break:break-all;background:#f8fafc;border:1px solid #d9e2ef;border-radius:10px;padding:10px 12px;font-size:13px}</style>' +
    '</head><body><div class="box"><h1>검사 일정 관리자</h1>' +
    '<p class="muted">이 주소는 Google Sheets 저장을 담당하는 Apps Script API 주소입니다. 실제 사용 화면은 아래 웹앱 주소로 접속하세요.</p>' +
    '<p class="url">' + FRONTEND_URL + '</p>' +
    '<a href="' + FRONTEND_URL + '">웹앱 열기</a>' +
    '<p class="muted">이 안내 페이지가 열리지 않는 환경에서는 위 주소를 복사해 크롬/엣지 주소창에 직접 붙여넣어 주세요.</p>' +
    '</div></body></html>'
  ).setTitle('검사 일정 관리자');
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');

    if (payload.action === 'login') {
      return json_({ ok: true, data: login_(payload.userId, payload.password) });
    }

    requireAuth_(payload.token);

    if (payload.action === 'loadState') {
      return json_({ ok: true, data: loadState_() });
    }

    if (payload.action === 'saveState') {
      saveState_(payload.state || {});
      return json_({ ok: true, data: { savedAt: new Date().toISOString() } });
    }

    if (payload.action === 'saveStationDb') {
      saveStationDb_(payload.stationDb || []);
      return json_({ ok: true, data: { savedAt: new Date().toISOString() } });
    }

    throw new Error('Unsupported action: ' + payload.action);
  } catch (error) {
    return json_({ ok: false, message: error.message });
  }
}

function login_(userId, password) {
  const id = String(userId || '').trim();
  const pw = String(password || '');
  const users = getAuthUsers_();
  const user = users.find((item) => item.id === id && item.password === pw);

  if (!user) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  const token = Utilities.getUuid() + ':' + Utilities.getUuid();
  CacheService.getScriptCache().put('auth:' + token, JSON.stringify({ id: user.id, name: user.name || user.id }), SESSION_TTL_SECONDS);

  return {
    token: token,
    user: { id: user.id, name: user.name || user.id },
    expiresIn: SESSION_TTL_SECONDS
  };
}

function getAuthUsers_() {
  const raw = PropertiesService.getScriptProperties().getProperty(AUTH_USERS_PROPERTY);

  if (!raw) {
    throw new Error('로그인 사용자 설정이 없습니다. Apps Script 스크립트 속성에 APP_USERS_JSON을 설정하세요.');
  }

  let users;

  try {
    users = JSON.parse(raw);
  } catch (error) {
    throw new Error('APP_USERS_JSON 문법 오류입니다. 사용자 항목 사이에 쉼표(,)가 있는지 확인하세요. 원문 오류: ' + error.message);
  }

  if (!Array.isArray(users) || !users.length) {
    throw new Error('APP_USERS_JSON은 사용자 배열이어야 합니다.');
  }

  return users;
}

function requireAuth_(token) {
  const key = String(token || '').trim();

  if (!key) {
    throw new Error('LOGIN_REQUIRED');
  }

  const session = CacheService.getScriptCache().get('auth:' + key);

  if (!session) {
    throw new Error('LOGIN_REQUIRED');
  }

  return JSON.parse(session);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function loadState_() {
  return {
    targets: readObjects_(SHEETS.targets, BUSINESS_HEADERS),
    schedules: readObjects_(SHEETS.schedules, BUSINESS_HEADERS),
    completed: readObjects_(SHEETS.completed, BUSINESS_HEADERS),
    stationDb: readObjects_(SHEETS.stationDb, STATION_HEADERS)
  };
}

function saveState_(state) {
  writeObjects_(SHEETS.targets, BUSINESS_HEADERS, state.targets || []);
  writeObjects_(SHEETS.schedules, BUSINESS_HEADERS, state.schedules || []);
  writeObjects_(SHEETS.completed, BUSINESS_HEADERS, state.completed || []);

  if (Array.isArray(state.stationDb)) {
    writeObjects_(SHEETS.stationDb, STATION_HEADERS, state.stationDb);
  }
}

function saveStationDb_(stationDb) {
  if (!Array.isArray(stationDb)) {
    throw new Error('stationDb must be an array.');
  }

  writeObjects_(SHEETS.stationDb, STATION_HEADERS, stationDb);
}

function readObjects_(sheetName, headers) {
  const sheet = ensureSheet_(sheetName, headers);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .filter((row) => row.some((value) => value !== ''))
    .map((row) => rowToObject_(headers, row));
}

function writeObjects_(sheetName, headers, rows) {
  const sheet = ensureSheet_(sheetName, headers);
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  }

  if (!rows.length) {
    return;
  }

  const values = rows.map((row) => headers.map((header) => cleanValue_(row[header])));
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function ensureSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function rowToObject_(headers, row) {
  return headers.reduce((object, header, index) => {
    const value = row[index];
    object[header] = value instanceof Date
      ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : value;
    return object;
  }, {});
}

function cleanValue_(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return value;
}
