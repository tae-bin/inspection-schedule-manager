# 검사 일정 관리 웹앱

정기검사 대상지, 검사 일정, 완료 목록을 관리하는 단일 HTML 웹앱입니다. 브라우저 `localStorage` 대신 Google Apps Script Web App API를 통해 Google Sheets에 저장하고 조회합니다.

## 중요한 주소 구분

주소는 2개가 있습니다.

| 주소 | 용도 |
| --- | --- |
| Netlify/GitHub Pages 주소 | 사용자가 실제로 접속하는 화면 주소 |
| Apps Script Web App URL | Google Sheets 저장/조회 API 주소 |

Apps Script Web App URL을 브라우저에 직접 열면 예전에는 JSON 문구가 보였습니다. 이제는 실제 화면 주소로 안내/이동하도록 바꿨습니다. 그래도 기본 개념은 같습니다. 사용자는 Netlify/GitHub Pages 주소로 접속하고, 화면 내부에서 Apps Script URL을 데이터 저장용으로 사용합니다.

## 변경 파일

- `index.html`: 화면, 로그인 창, Google Apps Script API 호출, 충전소 검색, 엑셀 백업/복원
- `Code.gs`: Google Sheets 저장소 API, 로그인 토큰 검증, Apps Script URL 안내 화면
- `README.md`: 설정 및 배포 방법

## 사용자가 직접 설정해야 하는 값

`index.html`의 아래 값을 Apps Script 웹 앱 URL로 설정합니다.

```js
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/여기에_본인_URL/exec';
```

`Code.gs`의 아래 값은 사용할 Google Sheets 문서 ID입니다.

```js
const SPREADSHEET_ID = '1KjSZGr5mwrFWIMLAPdBFONNXdYMF1eJCXPj4b33xMBY';
```

`Code.gs`의 아래 값은 Apps Script URL을 직접 열었을 때 이동시킬 실제 화면 주소입니다.

```js
const FRONTEND_URL = 'https://deploy-preview-2--stupendous-valkyrie-12e79e.netlify.app';
```

최종 배포 사이트 주소가 따로 있으면 `FRONTEND_URL`을 그 주소로 바꿉니다.

## 로그인 사용자 설정

로그인 아이디/비밀번호는 GitHub 코드에 넣지 않습니다. Apps Script의 비공개 `스크립트 속성`에 넣습니다.

### 설정 순서

1. Apps Script 프로젝트를 엽니다.
2. 왼쪽 메뉴에서 톱니바퀴 모양 `프로젝트 설정`을 클릭합니다.
3. 아래쪽 `스크립트 속성` 영역을 찾습니다.
4. `스크립트 속성 추가`를 클릭합니다.
5. 속성 이름에 아래 값을 입력합니다.

```text
APP_USERS_JSON
```

6. 값에는 아래 형식으로 입력합니다.

```json
[
  { "id": "admin", "password": "원하는비밀번호", "name": "관리자" }
]
```

7. 여러 명을 허용하려면 쉼표로 추가합니다.

```json
[
  { "id": "admin", "password": "관리자비밀번호", "name": "관리자" },
  { "id": "user1", "password": "사용자1비밀번호", "name": "사용자1" }
]
```

8. 저장합니다.
9. `Code.gs`를 수정했다면 `배포 > 배포 관리 > 수정 > 새 버전`으로 다시 배포합니다.

주의: 이 방식은 화면 접근과 Google Sheets API 사용을 로그인으로 막습니다. 다만 정적 웹사이트 파일 자체는 Netlify/GitHub Pages에 공개되어 있을 수 있습니다. 실제 데이터 조회/저장은 로그인 토큰이 없으면 거부됩니다.

## Google Sheets 탭과 컬럼 구조

Apps Script는 아래 4개 탭을 사용합니다. 탭이 없으면 자동 생성하고, 첫 번째 행을 영문 필드명으로 맞춥니다.

| 탭 | 용도 |
| --- | --- |
| `대상지_리스트` | 대상지 탭 데이터 |
| `검사_일정` | 검사 일정 탭 데이터 |
| `완료` | 완료 탭 데이터 |
| `충전소DB` | 충전소목록 최신화 업로드 데이터 |

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

## 충전소목록 최신화 동작

`충전소목록 최신화` 버튼으로 엑셀 파일을 업로드하면 웹앱은 엑셀 안에서 충전소명, 충전소 번호, 주소, 완속/급속/초급속 수량 컬럼을 찾아 `충전소DB` 탭에 저장합니다.

중요한 점:

- 충전소목록 최신화는 `충전소DB` 탭만 교체합니다.
- 이미 추가한 `대상지_리스트`, `검사_일정`, `완료` 항목은 삭제하지 않습니다.
- 충전소 검색 결과가 0건이면 엑셀 파일의 머리글 행에 `충전소명`, `충전소 번호`, `주소`에 해당하는 컬럼이 있는지 확인합니다.

## Apps Script 배포 방법

1. Google Apps Script에서 프로젝트를 엽니다.
2. 왼쪽 파일 목록에서 `Code.gs`를 클릭합니다.
3. 이 저장소의 `Code.gs` 전체 내용을 복사해서 기존 내용을 전부 교체합니다.
4. 저장 아이콘 또는 `Ctrl + S`로 저장합니다.
5. 프로젝트 설정에서 `APP_USERS_JSON` 스크립트 속성을 추가합니다.
6. 상단 메뉴에서 `배포 > 새 배포`를 선택합니다.
7. 유형 선택에서 `웹 앱`을 선택합니다.
8. 설정은 아래처럼 둡니다.
   - 실행 사용자: `나`
   - 액세스 권한: 외부 사이트에서 접속할 경우 `모든 사용자`
9. `배포`를 누르고 권한 승인을 완료합니다.
10. 배포 후 표시되는 웹 앱 URL을 복사합니다. 주소는 `/exec`로 끝나야 합니다.
11. `index.html`의 `GAS_WEB_APP_URL`에 복사한 URL을 입력합니다.
12. `Code.gs`를 나중에 다시 수정했다면 `배포 > 배포 관리 > 수정 > 새 버전`으로 다시 배포합니다.

## 테스트 방법

1. 배포된 웹앱 또는 Netlify 미리보기를 엽니다.
2. 로그인 화면이 보이는지 확인합니다.
3. Apps Script의 `APP_USERS_JSON`에 설정한 아이디/비밀번호로 로그인합니다.
4. 로그인 성공 후 대시보드와 대상지 화면이 보이는지 확인합니다.
5. `충전소목록 최신화` 버튼으로 충전소 엑셀 파일을 업로드합니다.
6. 안내문이 `충전소DB 0건`이 아니라 실제 건수로 표시되는지 확인합니다.
7. Google Sheets의 `충전소DB` 탭에 데이터가 저장되는지 확인합니다.
8. `대상지_리스트` 화면의 `충전소 검색`에서 충전소명을 검색합니다.
9. 검색 결과를 체크하면 오른쪽 `선택한 충전소 상세`에 표시되는지 확인합니다.
10. `대상지_리스트에 추가`를 눌러 대상지에 추가합니다.
11. Google Sheets의 `대상지_리스트` 탭에 새 행이 저장되는지 확인합니다.
12. 같은 상태에서 다시 `충전소목록 최신화`를 실행해도 `대상지_리스트`, `검사_일정`, `완료` 탭의 기존 행이 사라지지 않는지 확인합니다.
13. 로그아웃 후 다시 접속하면 로그인 화면이 보이는지 확인합니다.

## 배포 전 확인사항

- `index.html`의 `GAS_WEB_APP_URL`이 비어 있지 않은지 확인합니다.
- `Code.gs`의 `FRONTEND_URL`이 실제 사용자가 접속할 화면 주소인지 확인합니다.
- Apps Script의 `APP_USERS_JSON` 스크립트 속성이 설정되어 있는지 확인합니다.
- Apps Script를 수정한 뒤에는 반드시 새 버전으로 다시 배포합니다.
- Web App 액세스 권한이 실제 접속 환경과 맞는지 확인합니다.
- Google Sheets 첫 행은 Apps Script가 자동으로 관리하므로 임의로 컬럼명을 바꾸지 않습니다.
- Apps Script URL, 시트 ID, 탭 이름 중 하나라도 틀리면 화면 상단에 연결 실패 알림이 표시됩니다.
