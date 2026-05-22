const SPREADSHEET_ID = '1KjSZGr5mwrFWIMLAPdBFONNXdYMF1eJCXPj4b33xMBY';
const FRONTEND_URL = 'https://tae-bin.github.io/inspection-schedule-manager/';
const SESSION_TTL_SECONDS = 6 * 60 * 60;
const AUTH_USERS_PROPERTY = 'APP_USERS_JSON';

const SHEETS = {
  targets: '대상지_리스트',
  schedules: '검사_일정',
  completed: '완료',
  stationDb: '충전소DB'
};

const BUSINESS_FIELDS = [
  { key: 'id', label: 'id' },
  { key: 'groupId', label: 'groupId' },
  { key: 'regDate', label: '등록일자' },
  { key: 'serial', label: '관리번호' },
  { key: 'name', label: '충전소명' },
  { key: 'no', label: '충전소 번호', aliases: ['충전소번호'] },
  { key: 'address', label: '주소' },
  { key: 'chargerType', label: '충전기 종류', aliases: ['충전기종류'] },
  { key: 'chargerCh', label: 'CH' },
  { key: 'manager', label: '담당자' },
  { key: 'phone', label: '연락처' },
  { key: 'hevManager', label: 'H.EV 담당자', aliases: ['hevManager', 'HEV 담당자', 'H EV 담당자'] },
  { key: 'requestDate', label: '신청일자' },
  { key: 'inspectDate', label: '검사예정일', aliases: ['검사일정'] },
  { key: 'inspectTime', label: '검사시간', aliases: ['시간'] },
  { key: 'result', label: '검사결과', aliases: ['결과'] },
  { key: 'certificateDate', label: '필증수령일' },
  { key: 'memo', label: '메모' },
  { key: 'completedAt', label: '완료일자' }
];

const STATION_FIELDS = [
  { key: 'name', label: 'name' },
  { key: 'no', label: 'no' },
  { key: 'road', label: 'road' },
  { key: 'jibun', label: 'jibun' },
  { key: 'addr', label: 'addr' },
  { key: 'region', label: 'region' },
  { key: 'city', label: 'city' },
  { key: 'op', label: 'op' },
  { key: 'kind', label: 'kind' },
  { key: 'indoor', label: 'indoor' },
  { key: 'slow7', label: 'slow7' },
  { key: 'fast53', label: 'fast53' },
  { key: 'ultra105', label: 'ultra105' }
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
    '<p class="muted">이 주소는 Google Sheets 저장을 담당하는 Apps Script API 주소입니다. 실제 사용 화면은 아래 GitHub Pages 주소로 접속하세요.</p>' +
    '<p class="url">' + FRONTEND_URL + '</p>' +
    '<a href="' + FRONTEND_URL + '">웹앱 열기</a>' +
    '<p class="muted">안내 페이지가 열리지 않는 환경에서는 위 주소를 복사해 브라우저 주소창에 직접 붙여넣어 주세요.</p>' +
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
      return json_({ ok: true, data: { savedAt: new Date().toISOString(), summary: getStateSummary_() } });
    }

    if (payload.action === 'saveStationDb') {
      saveStationDb_(payload.stationDb || []);
      return json_({ ok: true, data: { savedAt: new Date().toISOString(), summary: getStateSummary_() } });
    }

    throw new Error('지원하지 않는 작업입니다: ' + payload.action);
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
    targets: readObjects_(SHEETS.targets, BUSINESS_FIELDS),
    schedules: readObjects_(SHEETS.schedules, BUSINESS_FIELDS),
    completed: readObjects_(SHEETS.completed, BUSINESS_FIELDS),
    stationDb: readObjects_(SHEETS.stationDb, STATION_FIELDS)
  };
}

function getStateSummary_() {
  const state = loadState_();
  return {
    targets: state.targets.length,
    schedules: state.schedules.length,
    completed: state.completed.length,
    stationDb: state.stationDb.length
  };
}

function saveState_(state) {
  writeObjects_(SHEETS.targets, BUSINESS_FIELDS, state.targets || []);
  writeObjects_(SHEETS.schedules, BUSINESS_FIELDS, state.schedules || []);
  writeObjects_(SHEETS.completed, BUSINESS_FIELDS, state.completed || []);

  if (Array.isArray(state.stationDb)) {
    writeObjects_(SHEETS.stationDb, STATION_FIELDS, state.stationDb);
  }
}

function saveStationDb_(stationDb) {
  if (!Array.isArray(stationDb)) {
    throw new Error('stationDb must be an array.');
  }

  writeObjects_(SHEETS.stationDb, STATION_FIELDS, stationDb);
}

function readObjects_(sheetName, fields) {
  const sheet = ensureSheet_(sheetName, fields);
  const lastRow = sheet.getLastRow();
  const headers = getHeaderRow_(sheet, fields);

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .filter((row) => row.some((value) => value !== ''))
    .map((row) => rowToObject_(fields, headers, row));
}

function writeObjects_(sheetName, fields, rows) {
  const sheet = ensureSheet_(sheetName, fields);
  const headers = getHeaderRow_(sheet, fields);
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  }

  if (!rows.length) {
    return;
  }

  const values = rows.map((row) => headers.map((header) => {
    const field = findFieldByHeader_(fields, header);
    return field ? cleanValue_(row[field.key]) : '';
  }));

  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function ensureSheet_(sheetName, fields) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  let headers = getHeaderRow_(sheet, fields);
  let changed = false;

  fields.forEach((field) => {
    const index = findHeaderIndex_(headers, getFieldAliases_(field));

    if (index === -1) {
      headers.push(field.label);
      changed = true;
      return;
    }

    if (headers[index] !== field.label) {
      headers[index] = field.label;
      changed = true;
    }
  });

  if (!headers.length) {
    headers = fields.map((field) => field.label);
    changed = true;
  }

  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function getHeaderRow_(sheet, fields) {
  const width = Math.max(sheet.getLastColumn(), fields.length);

  if (!width) {
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, width).getValues()[0].map((value) => String(value || '').trim());

  while (headers.length && headers[headers.length - 1] === '') {
    headers.pop();
  }

  return headers;
}

function rowToObject_(fields, headers, row) {
  return fields.reduce((object, field) => {
    const index = findHeaderIndex_(headers, getFieldAliases_(field));
    const value = index >= 0 ? row[index] : '';
    object[field.key] = value instanceof Date
      ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : value;
    return object;
  }, {});
}

function findFieldByHeader_(fields, header) {
  return fields.find((field) => getFieldAliases_(field).some((alias) => normalizeHeader_(alias) === normalizeHeader_(header)));
}

function findHeaderIndex_(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeHeader_);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader_(header)));
}

function getFieldAliases_(field) {
  return [field.key, field.label].concat(field.aliases || []);
}

function normalizeHeader_(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s._\-()]/g, '');
}

function cleanValue_(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return value;
}
