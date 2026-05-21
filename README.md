# 검사 일정 관리 웹앱

정기검사 대상지, 검사 일정, 완료 목록을 관리하는 단일 HTML 웹앱입니다. 화면은 GitHub Pages에서 열고, 데이터는 Google Apps Script Web App API를 통해 Google Sheets에 저장합니다.

## 최종 운영 구조

이 프로젝트는 화면과 데이터를 분리해서 사용합니다.

| 구분 | 역할 | 사용자가 직접 여는 주소 |
| --- | --- | --- |
| GitHub Pages | 실제 웹앱 화면, 로그인 화면, 엑셀 업로드/다운로드 화면 | 예 |
| Apps Script Web App | Google Sheets 저장/조회 API | 아니오 |
| Google Sheets | 대상지, 검사 일정, 완료 항목, 충전소 DB 저장소 | 관리자만 확인 |

사용자에게 공유할 최종 주소는 아래 GitHub Pages 주소입니다.

```text
https://tae-bin.github.io/inspection-schedule-manager/
```

Apps Script Web App URL은 `index.html` 안에서 API 주소로만 사용합니다. 사용자가 Apps Script URL을 직접 열면 Google 계정/권한/브라우저 환경에 따라 `현재 파일을 열 수 없습니다`가 보일 수 있으므로, 실제 사용자는 반드시 GitHub Pages 주소로 접속해야 합니다.

## 변경 파일

- `index.html`: 기존 화면 구성 유지, 로그인 화면 추가, Google Apps Script API 통신, 충전소 검색/상세, 엑셀 업로드/다운로드 유지
- `Code.gs`: Google Sheets 저장/조회 API, 로그인 토큰 검증, 충전소 DB 저장 API, Apps Script 안내 화면
- `README.md`: GitHub Pages, Apps Script, Google Sheets 설정 방법 설명

## 사용자가 직접 설정해야 하는 값

### 1. `index.html`의 Apps Script API 주소

현재 `index.html`에는 아래 Apps Script Web App URL이 설정되어 있습니다.

```js
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzO4ZaYdlHH0zXqha8NtjfFlWZLygjONsg1O1pd0YIdKvHM-6VZGRPO0z0ZGU3359Pv/exec";
```

Apps Script를 새로 배포해서 URL이 바뀌면 이 값도 새 URL로 바꾼 뒤 GitHub에 다시 반영해야 합니다.

### 2. `Code.gs`의 Google Sheets 문서 ID

현재 저장소는 아래 Google Sheets 문서에 저장하도록 설정되어 있습니다.

```js
const SPREADSHEET_ID = '1KjSZGr5mwrFWIMLAPdBFONNXdYMF1eJCXPj4b33xMBY';
```

다른 Google Sheets를 사용하려면 이 값을 새 문서 ID로 바꿉니다.

### 3. `Code.gs`의 화면 주소

Apps Script URL을 직접 열었을 때 안내할 실제 화면 주소입니다.

```js
const FRONTEND_URL = 'https://tae-bin.github.io/inspection-schedule-manager/';
```

GitHub Pages 주소가 바뀌면 이 값도 바꿉니다.

## 로그인 사용자 설정

로그인 아이디/비밀번호는 GitHub 코드에 넣지 않습니다. Apps Script의 비공개 `스크립트 속성`에 저장합니다.

1. Apps Script 프로젝트를 엽니다.
2. 왼쪽 메뉴에서 톱니바퀴 모양 `프로젝트 설정`을 클릭합니다.
3. 아래쪽 `스크립트 속성` 영역을 찾습니다.
4. `스크립트 속성 추가`를 클릭합니다.
5. 속성 이름에 아래 값을 입력합니다.

```text
APP_USERS_JSON
```

6. 값에는 아래 형식으로 입력합니다. 사용자 항목 사이에는 반드시 쉼표가 필요합니다.

```json
[
  { "id": "user1", "password": "password1", "name": "관리자" },
  { "id": "user2", "password": "password2", "name": "사용자2" }
]
```

7. 저장합니다.
8. `Code.gs`를 수정했다면 `배포 > 배포 관리 > 수정 > 새 버전`으로 다시 배포합니다.

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
- 업로드 후 안내문이 `충전소 DB 0건`으로 표시되면 엑셀 파일의 머리글 행에 충전소명, 충전소 번호, 주소에 해당하는 컬럼이 있는지 확인합니다.

## GitHub Pages 배포 방법

GitHub Pages는 사용자가 실제로 접속하는 웹앱 화면입니다.

1. 브라우저에서 GitHub 저장소를 엽니다.

```text
https://github.com/tae-bin/inspection-schedule-manager
```

2. 화면 위쪽 탭에서 `Settings`를 클릭합니다.
3. 왼쪽 메뉴에서 `Pages`를 클릭합니다.
4. `Build and deployment` 영역을 찾습니다.
5. `Source`를 `Deploy from a branch`로 선택합니다.
6. `Branch`에서 `main`을 선택합니다.
7. 폴더 선택은 `/(root)`를 선택합니다.
8. `Save` 버튼을 클릭합니다.
9. 1분에서 5분 정도 기다립니다.
10. 같은 `Pages` 화면 위쪽에 초록색 안내문과 함께 배포 주소가 표시되는지 확인합니다.
11. 아래 주소를 엽니다.

```text
https://tae-bin.github.io/inspection-schedule-manager/
```

이 주소에서 로그인 화면이 보이면 GitHub Pages 배포는 정상입니다.

## Apps Script 배포 방법

Apps Script는 화면이 아니라 Google Sheets 저장/조회 API입니다.

1. Google Apps Script 프로젝트를 엽니다.
2. 왼쪽 파일 목록에서 `Code.gs`를 클릭합니다.
3. 이 저장소의 `Code.gs` 전체 내용을 복사해서 기존 내용을 전부 교체합니다.
4. 저장 아이콘 또는 `Ctrl + S`로 저장합니다.
5. 왼쪽 `프로젝트 설정`에서 `APP_USERS_JSON` 스크립트 속성이 설정되어 있는지 확인합니다.
6. 상단 메뉴에서 `배포 > 새 배포`를 선택합니다.
7. 유형 선택에서 `웹 앱`을 선택합니다.
8. 설정은 아래처럼 둡니다.
   - 실행 사용자: `나`
   - 액세스 권한: 외부 GitHub Pages 화면에서 접속할 경우 `모든 사용자`
9. `배포`를 누르고 권한 승인을 완료합니다.
10. 배포 후 표시되는 웹 앱 URL을 복사합니다. 주소는 `/exec`로 끝나야 합니다.
11. 그 URL이 `index.html`의 `GAS_WEB_APP_URL`과 같은지 확인합니다.
12. `Code.gs`를 나중에 다시 수정했다면 `배포 > 배포 관리 > 수정 > 새 버전`으로 다시 배포합니다.

## 테스트 방법

1. GitHub Pages 주소를 엽니다.

```text
https://tae-bin.github.io/inspection-schedule-manager/
```

2. 로그인 화면이 보이는지 확인합니다.
3. Apps Script의 `APP_USERS_JSON`에 설정한 아이디/비밀번호로 로그인합니다.
4. 로그인 성공 후 대시보드와 대상지 화면이 보이는지 확인합니다.
5. `충전소목록 최신화` 버튼으로 충전소 엑셀 파일을 업로드합니다.
6. 안내문이 `충전소 DB 0건`이 아니라 실제 건수로 표시되는지 확인합니다.
7. Google Sheets의 `충전소DB` 탭에 데이터가 저장되는지 확인합니다.
8. 웹앱으로 돌아와 `충전소 검색`에서 충전소명을 검색합니다.
9. 검색 결과를 선택했을 때 `선택한 충전소 상세` 영역에 정보가 표시되는지 확인합니다.
10. `대상지_리스트에 추가` 버튼을 눌러 대상지에 추가합니다.
11. Google Sheets의 `대상지_리스트` 탭에 새 행이 저장되는지 확인합니다.
12. 다시 `충전소목록 최신화`를 실행해도 `대상지_리스트`, `검사_일정`, `완료` 탭의 기존 행이 사라지지 않는지 확인합니다.
13. `엑셀 다운로드` 기능으로 현재 데이터가 파일로 내려받아지는지 확인합니다.
14. 로그아웃 후 다시 접속했을 때 로그인 화면이 먼저 보이는지 확인합니다.

## 배포 전 확인사항

- GitHub PR이 `main` 브랜치에 반영되어 있는지 확인합니다.
- GitHub 저장소 `Settings > Pages`에서 `main` / `/(root)`로 설정되어 있는지 확인합니다.
- GitHub Pages 주소에서 로그인 화면이 열리는지 확인합니다.
- `index.html`의 `GAS_WEB_APP_URL`이 최신 Apps Script `/exec` URL인지 확인합니다.
- `Code.gs`의 `FRONTEND_URL`이 GitHub Pages 주소인지 확인합니다.
- Apps Script의 `APP_USERS_JSON` 스크립트 속성이 올바른 JSON 형식인지 확인합니다.
- Apps Script를 수정한 뒤에는 반드시 `배포 관리 > 수정 > 새 버전`으로 다시 배포합니다.
- Google Sheets에 `대상지_리스트`, `검사_일정`, `완료`, `충전소DB` 탭이 생성되는지 확인합니다.
- 사용자에게 공유하는 주소가 Apps Script URL이 아니라 GitHub Pages 주소인지 확인합니다.
