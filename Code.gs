const SPREADSHEET_ID = '1KjSZGr5mwrFWIMLAPdBFONNXdYMF1eJCXPj4b33xMBY';

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

function doGet() {
  return json_({
    ok: true,
    message: 'Inspection Schedule Manager Apps Script API is running.'
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');

    if (payload.action === 'loadState') {
      return json_({ ok: true, data: loadState_() });
    }

    if (payload.action === 'saveState') {
      saveState_(payload.state || {});
      return json_({ ok: true, data: { savedAt: new Date().toISOString() } });
    }

    throw new Error('Unsupported action: ' + payload.action);
  } catch (error) {
    return json_({ ok: false, message: error.message });
  }
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
