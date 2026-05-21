# 검사 일정 관리 웹앱

정기검사 대상지, 검사 일정, 완료 목록을 관리하는 단일 HTML 웹앱입니다. 브라우저 `localStorage` 대신 Google Apps Script Web App API를 통해 Google Sheets에 저장하고 조회합니다.

## 변경 파일

- `index.html`: Google Apps Script API 호출, 대상지/검사 일정/완료 화면, 엑셀 백업/복원
- `Code.gs`: Google Sheets를 데이터 저장소로 사용하는 Apps Script Web App API
- `README.md`: 설정 및 배포 방법

## 사용자가 직접 설정해야 하는 값

`index.html`에서 아래 값을 Apps Script 웹 앱 URL로 교체합니다.

```js
const GAS_WEB_APP_URL = '';
```

`Code.gs`에서 아래 값을 사용할 Google Sheets 문서 ID로 확인합니다.

```js
const SPREADSHEET_ID = '1KjSZGr5mwrFWIMLAPdBFONNXdYMF1eJCXPj4b33xMBY';
```

현재 요청받은 Google Sheets ID는 이미 `Code.gs`에 입력되어 있습니다.

## Google Sheets 탭과 컬럼 구조

Apps Script는 아래 4개 탭을 사용합니다. 탭이 없으면 자동 생성하고, 첫 번째 행을 영문 필드명으로 맞춥니다.

| 탭 | 용도 |
| --- | --- |
| `대상지_리스트` | 대상지 탭 데이터 |
| `검사_일정` | 검사 일정 탭 데이터 |
| `완료` | 완료 탭 데이터 |
| `충전소DB` | 충전소 업로드 데이터 |

업무 데이터 탭 컬럼:

```text
id, groupId, regDate, serial, name, no, address, chargerType, chargerCh,
manager, phone, requestDate, inspectDate, inspectTime, result,
certificateDate, memo, completedAt
```

충전소DB 탭 컬럼:

```text
name, no, road, jibun, addr, region, city, op, kind, indoor,
slow7, fast53, ultra105
```

컬럼 구조가 바뀌면 `Code.gs`의 `BUSINESS_HEADERS`, `STATION_HEADERS`와 `index.html`의 필드명이 함께 맞아야 합니다.

## Apps Script 배포 방법

1. [Google Apps Script](https://script.google.com/)에서 프로젝트를 엽니다.
2. `Code.gs` 내용을 이 저장소의 `Code.gs` 내용으로 교체합니다.
3. `Code.gs` 상단의 `SPREADSHEET_ID`가 실제 Google Sheets ID와 같은지 확인합니다.
4. 상단 메뉴에서 `배포 > 새 배포`를 선택합니다.
5. 유형 선택에서 `웹 앱`을 선택합니다.
6. 설정은 아래처럼 둡니다.
   - 실행 사용자: `나`
   - 액세스 권한: 외부 로컬 HTML 또는 배포 사이트에서 접속할 경우 `모든 사용자`
7. `배포`를 누르고 권한 승인을 완료합니다.
8. 배포 후 표시되는 웹 앱 URL을 복사합니다.
9. `index.html`의 `GAS_WEB_APP_URL`에 복사한 URL을 입력합니다.
10. 변경 사항을 GitHub에 다시 커밋하면 배포 사이트가 최신 파일을 사용합니다.

## GitHub Pages 배포 방법

1. GitHub 저장소에서 `Settings > Pages`로 이동합니다.
2. Source를 `Deploy from a branch`로 선택합니다.
3. Branch를 `main`, folder를 `/root`로 선택합니다.
4. 저장 후 GitHub Pages URL이 생성될 때까지 기다립니다.
5. Apps Script URL을 입력한 `index.html`이 `main`에 반영되어 있어야 실제 저장이 동작합니다.

## 테스트 방법

1. Apps Script 웹 앱 URL을 브라우저 주소창에 직접 열어 `ok: true` 응답이 보이는지 확인합니다.
2. 배포된 웹앱 또는 `index.html`을 엽니다.
3. 화면 상단에 Google Sheets 연결 실패 알림이 없는지 확인합니다.
4. 대상지를 추가합니다.
5. Google Sheets의 `대상지_리스트` 탭에 행이 저장되는지 확인합니다.
6. 대상지를 검사 일정으로 이동하고 `검사_일정` 탭이 갱신되는지 확인합니다.
7. 완료 이동 후 `완료` 탭이 갱신되는지 확인합니다.
8. 엑셀 백업과 엑셀 복원 기능이 동작하는지 확인합니다.
9. `구글시트 새로고침` 버튼으로 시트 데이터를 다시 불러올 수 있는지 확인합니다.

## 배포 전 확인사항

- `index.html`의 `GAS_WEB_APP_URL`이 비어 있지 않은지 확인합니다.
- Apps Script를 수정한 뒤에는 `배포 관리`에서 새 버전으로 다시 배포합니다.
- Web App 액세스 권한이 실제 접속 환경과 맞는지 확인합니다.
- Google Sheets 첫 행은 Apps Script가 자동으로 관리하므로 임의로 컬럼명을 바꾸지 않습니다.
- Apps Script URL, 시트 ID, 탭 이름 중 하나라도 틀리면 화면 상단에 연결 실패 알림이 표시됩니다.
