# 검사 일정 관리 웹앱

정기검사 대상지, 검사 일정, 완료 목록을 관리하는 단일 HTML 웹앱입니다. 브라우저 `localStorage` 대신 Google Apps Script Web App API를 통해 Google Sheets에 저장하고 조회합니다.

## 변경 파일

- `index.html`: 화면, Google Apps Script API 호출, 충전소 검색, 엑셀 백업/복원
- `Code.gs`: Google Sheets를 데이터 저장소로 사용하는 Apps Script Web App API
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

현재 요청받은 Google Sheets ID는 이미 `Code.gs`에 입력되어 있습니다.

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
- `Code.gs`를 수정한 뒤 Apps Script에서 새 버전으로 다시 배포하지 않으면 `saveStationDb` 요청이 실패할 수 있습니다.

## Apps Script 배포 방법

1. [Google Apps Script](https://script.google.com/)에서 프로젝트를 엽니다.
2. 왼쪽 파일 목록에서 `Code.gs`를 클릭합니다.
3. 이 저장소의 `Code.gs` 전체 내용을 복사해서 기존 내용을 전부 교체합니다.
4. 저장 아이콘 또는 `Ctrl + S`로 저장합니다.
5. 상단 메뉴에서 `배포 > 새 배포`를 선택합니다.
6. 유형 선택에서 `웹 앱`을 선택합니다.
7. 설정은 아래처럼 둡니다.
   - 실행 사용자: `나`
   - 액세스 권한: 외부 사이트에서 접속할 경우 `모든 사용자`
8. `배포`를 누르고 권한 승인을 완료합니다.
9. 배포 후 표시되는 웹 앱 URL을 복사합니다. 주소는 `/exec`로 끝나야 합니다.
10. `index.html`의 `GAS_WEB_APP_URL`에 복사한 URL을 입력합니다.
11. `Code.gs`를 나중에 다시 수정했다면 `배포 > 배포 관리 > 수정 > 새 버전`으로 다시 배포합니다.

## 테스트 방법

1. Apps Script 웹 앱 URL을 브라우저 주소창에 직접 열어 `ok: true` 응답이 보이는지 확인합니다.
2. 배포된 웹앱 또는 Netlify 미리보기를 엽니다.
3. `충전소목록 최신화` 버튼으로 충전소 엑셀 파일을 업로드합니다.
4. 안내문이 `충전소DB 0건`이 아니라 실제 건수로 표시되는지 확인합니다.
5. Google Sheets의 `충전소DB` 탭에 데이터가 저장되는지 확인합니다.
6. `대상지_리스트` 화면의 `충전소 검색`에서 충전소명을 검색합니다.
7. 검색 결과를 체크하면 오른쪽 `선택한 충전소 상세`에 표시되는지 확인합니다.
8. `대상지_리스트에 추가`를 눌러 대상지에 추가합니다.
9. Google Sheets의 `대상지_리스트` 탭에 새 행이 저장되는지 확인합니다.
10. 같은 상태에서 다시 `충전소목록 최신화`를 실행해도 `대상지_리스트`, `검사_일정`, `완료` 탭의 기존 행이 사라지지 않는지 확인합니다.
11. 엑셀 백업과 엑셀 복원 기능이 동작하는지 확인합니다.

## 배포 전 확인사항

- `index.html`의 `GAS_WEB_APP_URL`이 비어 있지 않은지 확인합니다.
- Apps Script를 수정한 뒤에는 반드시 새 버전으로 다시 배포합니다.
- Web App 액세스 권한이 실제 접속 환경과 맞는지 확인합니다.
- Google Sheets 첫 행은 Apps Script가 자동으로 관리하므로 임의로 컬럼명을 바꾸지 않습니다.
- Apps Script URL, 시트 ID, 탭 이름 중 하나라도 틀리면 화면 상단에 연결 실패 알림이 표시됩니다.
