# 검사 일정 관리 웹페이지

정기검사 대상지, 검사 일정, 완료 목록을 관리하는 단일 HTML 웹앱입니다. 화면 구성과 엑셀 백업/복원 흐름은 유지하면서, 브라우저 `localStorage` 대신 Google Apps Script Web App API를 통해 Google Sheets에 저장하고 조회합니다.

## 변경 파일

- `index.html`: 화면, Google Apps Script API 통신, 자동 저장, 저장 후 검증 흐름
- `Code.gs`: Google Apps Script Web App API 예시 코드
- `README.md`: 설정, 배포, 테스트, 디버깅 가이드

## 직접 설정해야 하는 값

`index.html` 상단의 아래 값을 배포된 Apps Script 웹 앱 URL로 설정합니다.

```js
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/배포ID/exec';
```

`Code.gs` 상단의 아래 값은 사용할 Google Sheets 문서 ID입니다.

```js
const SPREADSHEET_ID = '1KjSZGr5mwrFWIMLAPdBFONNXdYMF1eJCXPj4b33xMBY';
```

GitHub Pages 주소가 바뀌면 `Code.gs`의 `FRONTEND_URL`도 함께 바꿔주세요.

```js
const FRONTEND_URL = 'https://tae-bin.github.io/inspection-schedule-manager/';
```

## Google Sheets 탭과 컬럼 구조

Apps Script가 아래 4개 탭을 사용합니다. 탭이 없으면 자동 생성하고, 첫 번째 행을 헤더로 맞춥니다.

| 탭 이름 | 용도 |
| --- | --- |
| `대상지_리스트` | 대상지 데이터 |
| `검사_일정` | 검사 일정 데이터 |
| `완료` | 완료 데이터 |
| `충전소DB` | 충전소 검색 DB |

업무 데이터 탭의 컬럼은 아래 순서입니다.

```text
id, groupId, regDate, serial, name, no, address, chargerType, chargerCh,
manager, phone, hevManager, requestDate, inspectDate, inspectTime,
result, certificateDate, memo, completedAt
```

`hevManager`는 검사 일정 표의 `H.EV 담당자` 입력값입니다.

충전소 DB 탭의 컬럼은 아래 순서입니다.

```text
name, no, road, jibun, addr, region, city, op, kind, indoor,
slow7, fast53, ultra105
```

## Apps Script 배포 방법

1. [Google Apps Script](https://script.google.com/)에 접속합니다.
2. 기존 프로젝트를 열거나 새 프로젝트를 만듭니다.
3. 왼쪽 파일 목록에서 `Code.gs`를 클릭합니다.
4. 이 저장소의 `Code.gs` 전체 내용을 복사해 Apps Script의 `Code.gs`에 붙여넣습니다.
5. 상단의 저장 아이콘 또는 `Ctrl + S`를 눌러 저장합니다.
6. 왼쪽 톱니바퀴 아이콘 `프로젝트 설정`을 클릭합니다.
7. `스크립트 속성`에서 `APP_USERS_JSON` 값을 설정합니다.
8. 상단 오른쪽의 `배포` 버튼을 누릅니다.
9. 처음이면 `새 배포`, 기존 배포를 갱신할 때는 `배포 관리`에서 새 버전을 만듭니다.
10. 유형은 `웹 앱`을 선택합니다.
11. `실행 사용자`는 `나`, `액세스 권한`은 실제 사용 환경에 맞게 설정합니다.
12. `배포`를 누르고 권한 승인 화면이 나오면 승인합니다.
13. 표시되는 웹 앱 URL을 복사해 `index.html`의 `GAS_WEB_APP_URL`에 넣습니다.

## 로그인 사용자 설정 예시

Apps Script의 `프로젝트 설정 > 스크립트 속성`에서 속성 이름은 `APP_USERS_JSON`, 값은 아래처럼 입력합니다.

```json
[
  { "id": "tbpark", "password": "tbpark1", "name": "관리자" },
  { "id": "humaxev1", "password": "1111", "name": "사용자1" },
  { "id": "humaxev2", "password": "2222", "name": "사용자2" }
]
```

주의: 각 사용자 항목 사이에는 반드시 쉼표가 있어야 합니다.

## 저장 검증 흐름

화면에서 데이터가 바뀌면 자동 저장이 실행됩니다. 이제 저장 요청만 보내고 끝내지 않고, 저장 직후 Google Sheets에서 다시 데이터를 읽어 화면 데이터와 비교합니다.

정상일 때는 화면 상단에 아래처럼 표시됩니다.

```text
구글 시트 저장 및 검증 완료
```

검증이 실패하면 아래처럼 표시됩니다.

```text
구글 시트 저장 검증 실패: ...
```

이 메시지가 나오면 Apps Script 배포 버전, 시트 권한, 컬럼 구조를 먼저 확인하세요.

## 브라우저에서 저장 실패 디버깅 방법

1. 웹앱 화면을 엽니다.
2. 키보드에서 `F12`를 누릅니다.
3. 개발자도구가 열리면 위쪽 탭에서 `Console`을 클릭합니다.
4. 화면에서 대상지를 추가하거나 검사 일정 값을 수정합니다.
5. Console에 빨간 오류가 있는지 확인합니다.
6. 위쪽 탭에서 `Network`를 클릭합니다.
7. 다시 데이터를 수정합니다.
8. `script.google.com`으로 시작하는 요청을 클릭합니다.
9. 오른쪽 또는 아래쪽의 `Status Code`가 `200`인지 확인합니다.
10. `Response`에 `"ok":true`가 있는지 확인합니다.

자주 보는 오류:

- `LOGIN_REQUIRED`: 로그인 세션이 만료되었습니다. 로그아웃 후 다시 로그인하세요.
- `Failed to fetch`: Apps Script URL, 배포 권한, 네트워크 차단을 확인하세요.
- `APP_USERS_JSON 문법 오류`: 로그인 사용자 JSON에서 쉼표가 빠졌는지 확인하세요.
- `저장 후 다시 읽은 데이터가 화면 데이터와 다릅니다`: `Code.gs`와 GitHub Pages의 `index.html`이 서로 다른 버전일 가능성이 큽니다.

## 테스트 방법

1. GitHub Pages 주소를 엽니다.
2. 로그인합니다.
3. `충전소목록 최신화`로 엑셀 파일을 업로드합니다.
4. `충전소 검색`에서 충전소를 검색합니다.
5. 검색 결과에서 충전소를 체크합니다.
6. `선택한 충전소 상세`에 등록일자, 담당자, 연락처, 메모를 입력합니다.
7. `대상지_리스트에 추가`를 클릭합니다.
8. 대상지 리스트에 행이 추가되는지 확인합니다.
9. 입력했던 등록일자, 담당자, 연락처, 메모가 초기화되는지 확인합니다.
10. 화면 상단에 `구글 시트 저장 및 검증 완료`가 표시되는지 확인합니다.
11. Google Sheets의 `대상지_리스트` 탭에 같은 데이터가 들어갔는지 확인합니다.
12. 대상지를 검사 일정으로 이동합니다.
13. 검사 일정 표에서 `H.EV 담당자`에 값을 입력합니다.
14. 다시 `구글 시트 저장 및 검증 완료`가 표시되는지 확인합니다.
15. 새로고침 후 `H.EV 담당자` 값이 유지되는지 확인합니다.

## 배포 전 확인사항

- `index.html`의 `GAS_WEB_APP_URL`이 최신 Apps Script 웹 앱 URL인지 확인합니다.
- Apps Script의 `Code.gs`가 저장소의 최신 `Code.gs`와 같은지 확인합니다.
- Apps Script 수정 후 새 버전으로 다시 배포했는지 확인합니다.
- Google Sheets 탭 이름을 임의로 바꾸지 않았는지 확인합니다.
- 업무 데이터 탭에 `hevManager` 컬럼이 있는지 확인합니다.
- GitHub Pages 주소가 열리는지 확인합니다.
- 저장 후 화면 상단에 `구글 시트 저장 및 검증 완료`가 뜨는지 확인합니다.
