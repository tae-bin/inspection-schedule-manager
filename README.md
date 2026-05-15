# 검사 일정 관리 웹앱

충전소 정기검사 대상지, 검사 일정, 완료 목록을 관리하는 **단일 HTML 정적 웹앱**입니다. 기존 브라우저 `localStorage` 중심 구조를 Supabase 기반 협업형 구조로 전환해, 팀원 여러 명이 같은 링크에서 동일한 데이터를 조회·추가·수정·삭제·이동할 수 있습니다.

## 사용 기술

- 정적 웹앱: `index.html`, `config.js`
- 백엔드: Supabase
  - Supabase Auth: 이메일/비밀번호 로그인
  - Supabase Postgres: 공동 업무 데이터 저장
  - Supabase Realtime: 여러 사용자 화면 자동 동기화
  - Supabase RLS: 역할별 최소 접근 제어
- 엑셀 처리: SheetJS `xlsx` CDN
- 배포: Netlify, Vercel, GitHub Pages 등 정적 호스팅

## 파일 구성

| 파일 | 설명 |
| --- | --- |
| `index.html` | 앱 본체. Supabase Auth, CRUD, Realtime, 엑셀 백업/복원, 충전소DB 업로드 포함 |
| `config.js` | Supabase Project URL과 anon key 설정 파일 |

## Supabase 프로젝트 생성 방법

1. [Supabase](https://supabase.com/)에서 새 프로젝트를 생성합니다.
2. 프로젝트 생성 후 **Project Settings → API**로 이동합니다.
3. 다음 값을 복사합니다.
   - Project URL
   - Project API keys → `anon public`
4. 아래 `config.js` 설정 방법에 따라 값을 입력합니다.
5. **SQL Editor**에서 아래 SQL을 순서대로 실행합니다.

## 필요한 테이블 생성 SQL

> 아래 SQL은 업무 데이터, 충전소DB, 허용 사용자, RLS 헬퍼 함수, updated_at 트리거를 모두 생성합니다. `inspection_items.completed_at`은 완료 목록의 완료일자를 저장하기 위해 권장 구조에 추가한 컬럼입니다.

```sql
create extension if not exists pgcrypto;

create table if not exists public.allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.inspection_groups (
  id uuid primary key default gen_random_uuid(),
  management_no text not null unique,
  registered_date date,
  manager text,
  phone text,
  memo text,
  stage text not null default 'target' check (stage in ('target', 'schedule', 'completed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.inspection_groups(id) on delete cascade,
  station_name text,
  station_no text,
  address text,
  charger_type text check (
    charger_type is null or charger_type in ('완속(7kW)/CH', '급속(53kW)/CH', '초급속(105kW)/CH', '미입력')
  ),
  ch_count numeric,
  request_date date,
  inspection_date date,
  inspection_time text,
  result text,
  certificate_received_date date,
  item_memo text,
  status text not null default 'target' check (status in ('target', 'schedule', 'completed')),
  completed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.station_db (
  id uuid primary key default gen_random_uuid(),
  station_name text not null,
  station_no text not null,
  road_address text,
  jibun_address text,
  address text,
  slow_ch numeric default 0,
  fast_ch numeric default 0,
  ultra_ch numeric default 0,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_no)
);

create index if not exists inspection_groups_stage_idx on public.inspection_groups(stage);
create index if not exists inspection_items_group_id_idx on public.inspection_items(group_id);
create index if not exists inspection_items_status_idx on public.inspection_items(status);
create index if not exists station_db_name_idx on public.station_db(station_name);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_inspection_groups_updated_at on public.inspection_groups;
create trigger set_inspection_groups_updated_at
before update on public.inspection_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_inspection_items_updated_at on public.inspection_items;
create trigger set_inspection_items_updated_at
before update on public.inspection_items
for each row execute function public.set_updated_at();

drop trigger if exists set_station_db_updated_at on public.station_db;
create trigger set_station_db_updated_at
before update on public.station_db
for each row execute function public.set_updated_at();
```

## RLS 정책 SQL

> 로그인 사용자는 `allowed_users`에 등록되어 있어야 앱에 진입할 수 있습니다. 역할은 `admin`, `editor`, `viewer` 중 하나입니다.

```sql
alter table public.allowed_users enable row level security;
alter table public.inspection_groups enable row level security;
alter table public.inspection_items enable row level security;
alter table public.station_db enable row level security;

create or replace function public.current_app_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select au.role
  from public.allowed_users au
  where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.is_allowed_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.allowed_users au
    where lower(au.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

-- allowed_users: 본인 row 조회 가능, admin은 전체 관리 가능
create policy "allowed users can read own profile"
on public.allowed_users for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email') or public.current_app_role() = 'admin');

create policy "admins can insert allowed users"
on public.allowed_users for insert
to authenticated
with check (public.current_app_role() = 'admin');

create policy "admins can update allowed users"
on public.allowed_users for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "admins can delete allowed users"
on public.allowed_users for delete
to authenticated
using (public.current_app_role() = 'admin');

-- 업무 데이터: 허용 사용자는 조회, admin/editor는 변경 가능
create policy "allowed users can read groups"
on public.inspection_groups for select
to authenticated
using (public.is_allowed_user());

create policy "editors can insert groups"
on public.inspection_groups for insert
to authenticated
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors can update groups"
on public.inspection_groups for update
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors can delete groups"
on public.inspection_groups for delete
to authenticated
using (public.current_app_role() in ('admin', 'editor'));

create policy "allowed users can read items"
on public.inspection_items for select
to authenticated
using (public.is_allowed_user());

create policy "editors can insert items"
on public.inspection_items for insert
to authenticated
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors can update items"
on public.inspection_items for update
to authenticated
using (public.current_app_role() in ('admin', 'editor'))
with check (public.current_app_role() in ('admin', 'editor'));

create policy "editors can delete items"
on public.inspection_items for delete
to authenticated
using (public.current_app_role() in ('admin', 'editor'));

-- 충전소DB: 허용 사용자는 조회, admin만 교체/수정 가능
create policy "allowed users can read station db"
on public.station_db for select
to authenticated
using (public.is_allowed_user());

create policy "admins can insert station db"
on public.station_db for insert
to authenticated
with check (public.current_app_role() = 'admin');

create policy "admins can update station db"
on public.station_db for update
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "admins can delete station db"
on public.station_db for delete
to authenticated
using (public.current_app_role() = 'admin');
```

## Realtime 설정 SQL

Supabase Dashboard에서 **Database → Replication** 또는 SQL Editor로 Realtime publication을 활성화합니다.

```sql
alter publication supabase_realtime add table public.inspection_groups;
alter publication supabase_realtime add table public.inspection_items;
alter publication supabase_realtime add table public.station_db;
```

이미 추가되어 있다는 오류가 나오면 무시해도 됩니다. Realtime이 비활성화되어도 앱의 **새로고침/동기화** 버튼으로 최신 DB를 다시 불러올 수 있습니다.

## Auth 설정 방법

1. Supabase Dashboard에서 **Authentication → Providers → Email**을 엽니다.
2. **Email provider**를 활성화합니다.
3. 운영 방식에 따라 선택합니다.
   - 내부 초대만 사용할 경우: 관리자가 Supabase Dashboard에서 사용자를 생성하거나 초대합니다.
   - 직접 가입을 막고 싶을 경우: 공개 Sign up UI를 제공하지 않고, 앱은 로그인만 제공합니다.
4. **Authentication → Users**에서 팀원 계정을 생성하거나 초대합니다.
5. 초대/생성한 이메일을 `allowed_users`에도 등록합니다.

## 초대 사용자 또는 허용 사용자 관리 방법

최초 admin은 SQL Editor에서 직접 등록합니다.

```sql
insert into public.allowed_users (email, role)
values ('admin@example.com', 'admin')
on conflict (email) do update set role = excluded.role;
```

팀원 역할 예시:

```sql
insert into public.allowed_users (email, role)
values
  ('editor@example.com', 'editor'),
  ('viewer@example.com', 'viewer')
on conflict (email) do update set role = excluded.role;
```

역할별 권한:

| 역할 | 업무 데이터 조회 | 대상지/일정/완료 추가·수정·삭제·이동 | 충전소DB 업로드 | 허용 사용자 관리 |
| --- | --- | --- | --- | --- |
| admin | 가능 | 가능 | 가능 | 가능 |
| editor | 가능 | 가능 | 불가 | 불가 |
| viewer | 가능 | 불가 | 불가 | 불가 |

현재 앱 화면에서는 `viewer`에게 수정 버튼과 입력을 비활성화하고, `admin` 전용 충전소DB 업로드 버튼을 숨깁니다. RLS 정책도 같은 권한을 DB에서 한 번 더 제한합니다.

## `config.js` 설정 방법

`config.js` 파일에서 아래 값을 실제 Supabase 값으로 교체합니다.

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

설정값이 비어 있으면 앱은 로그인 화면에 “Supabase 설정 필요” 안내를 표시하고 업무 데이터를 보여주지 않습니다.

## 충전소목록 엑셀 업로드 파일 형식

admin 사용자는 대시보드의 **충전소목록 최신화** 버튼으로 `station_db`를 최신화할 수 있습니다.

- 우선 읽는 시트명: `충전소목록`
- `충전소목록` 시트가 없으면 첫 번째 시트를 읽습니다.
- 엑셀 표(Table)가 적용되어 있지 않아도 됩니다.
- 머리글은 파일 상단 50행 이내에서 자동 탐지합니다.
- 인식하는 주요 열 이름:
  - `충전소명`
  - `충전소 번호` 또는 `충전소번호`
  - `도로명 주소` 또는 `도로명주소`
  - `지번 주소` 또는 `지번주소`
  - `완속`, `완속(7kW)`, `완속(7kW)/CH`
  - `급속`, `급속(53kW)`, `급속(53kW)/CH`
  - `초급속`, `초급속(105kW)`, `초급속(105kW)/CH`
- 주소는 도로명 주소를 우선 사용하고, 없으면 지번 주소를 사용합니다.
- 업로드 방식은 안정성을 위해 **기존 `station_db` 전체 삭제 후 새 파일 전체 업로드**입니다.

## 충전기 종류별 행 분리 기준

정기검사 필증은 충전기 종류별로 1장씩 발급되므로 대상지 추가 시 다음 기준으로 행을 분리합니다.

- `완속(7kW)/CH`
- `급속(53kW)/CH`
- `초급속(105kW)/CH`

예를 들어 한 충전소에 완속 3, 급속 1, 초급속 2가 있으면 대상지_리스트에 3행이 생성됩니다. 수량이 0이거나 비어 있는 종류는 행을 만들지 않습니다.

## 엑셀 백업/복원 방법

### 백업

**엑셀 백업** 버튼을 누르면 다음 시트가 포함된 파일을 내려받습니다.

- `대상지_리스트`
- `검사_일정`
- `완료`
- `충전소DB`

업무 시트에는 다음 항목이 포함됩니다.

- 관리번호
- 등록일자
- 담당자
- 연락처
- 충전소명
- 충전소 번호
- 주소
- 충전기 종류
- CH
- 신청일자
- 검사예정일
- 검사시간
- 검사결과
- 필증수령일
- 메모

### 복원

복원 전 드롭다운에서 방식을 선택합니다.

- **기존 유지 후 추가**: 현재 Supabase 업무 데이터를 유지하고 엑셀 데이터를 추가합니다.
- **전체 삭제 후 복원**: 현재 Supabase 업무 데이터를 삭제한 뒤 엑셀 파일 기준으로 복원합니다.

admin이 복원하고 백업 파일에 `충전소DB` 시트가 있으면 충전소DB도 전체 교체 복원할지 추가로 선택할 수 있습니다.

## 기존 localStorage 데이터 마이그레이션

기존 버전을 사용한 브라우저에 `localStorage` 데이터가 남아 있으면 로그인 후 상단에 **로컬 데이터 Supabase로 이전** 버튼이 표시됩니다.

1. admin 또는 editor로 로그인합니다.
2. **로컬 데이터 Supabase로 이전** 버튼을 클릭합니다.
3. 기존 Supabase 데이터는 유지되고, 로컬 업무 데이터가 추가됩니다.
4. 이전 완료 후 원본 localStorage 값은 백업 키로 보관되고 기본 키에서는 제거됩니다.

## Netlify 배포 방법

1. GitHub에 저장소를 push합니다.
2. Netlify에서 **Add new site → Import an existing project**를 선택합니다.
3. GitHub 저장소를 연결합니다.
4. Build 설정:
   - Build command: 비워 둠
   - Publish directory: 저장소 루트 또는 `.`
5. 배포 전 `config.js`에 Supabase URL과 anon key가 입력되어 있어야 합니다.
6. 배포 후 Netlify URL에 접속해 로그인 화면이 표시되는지 확인합니다.
7. Supabase Auth의 Site URL/Redirect URL이 필요한 경우 Netlify 배포 URL을 추가합니다.

## 일반 사용자 사용 방법

1. 배포된 웹앱 링크에 접속합니다.
2. 이메일/비밀번호로 로그인합니다.
3. 좌측 탭에서 업무 단계를 선택합니다.
   - 대상지_리스트
   - 검사 일정
   - 완료
4. 충전소 검색 후 여러 충전소를 선택합니다.
5. 등록일자, 담당자, 연락처, 메모를 입력하고 대상지_리스트에 추가합니다.
6. 대상지_리스트에서 검사 일정으로 이동합니다.
7. 검사 일정에서 신청일자, 검사예정일, 검사시간, 검사결과, 필증수령일, 메모를 입력합니다.
8. 완료 처리하면 완료 탭에서 조회할 수 있습니다.
9. 다른 팀원의 변경사항은 Realtime으로 자동 반영되며, 필요 시 **새로고침/동기화**를 누릅니다.

## 관리자 사용 방법

1. Supabase SQL Editor에서 테이블과 RLS 정책을 생성합니다.
2. Auth 사용자와 `allowed_users`를 등록합니다.
3. `config.js`에 Supabase 설정을 입력합니다.
4. Netlify 등에 배포합니다.
5. admin 계정으로 로그인합니다.
6. **충전소목록 최신화**로 `station_db`를 업로드합니다.
7. 필요 시 **엑셀 백업**으로 정기 백업을 내려받습니다.
8. 팀원 역할 변경은 `allowed_users` 테이블에서 `role` 값을 수정합니다.

## 문제 해결

### “Supabase 설정이 필요합니다”가 표시됩니다

`config.js`의 `url`, `anonKey`가 비어 있습니다. Supabase Project Settings → API에서 값을 복사해 입력하세요.

### 로그인은 되지만 “허용되지 않은 사용자입니다”가 표시됩니다

Auth 사용자 이메일이 `allowed_users` 테이블에 없습니다. SQL Editor에서 해당 이메일과 역할을 추가하세요.

### 데이터가 보이지 않습니다

- RLS 정책이 누락되었는지 확인합니다.
- 현재 로그인 이메일이 `allowed_users`에 등록되어 있는지 확인합니다.
- Supabase 테이블명이 README와 동일한지 확인합니다.

### 다른 사용자 변경이 자동 반영되지 않습니다

- Realtime publication SQL을 실행했는지 확인합니다.
- Supabase Dashboard에서 Realtime이 활성화되어 있는지 확인합니다.
- 그래도 안 되면 앱의 **새로고침/동기화** 버튼을 사용하세요.

### 충전소목록 업로드가 실패합니다

- admin 계정인지 확인합니다.
- 파일 상단 50행 안에 `충전소명`, `충전소 번호` 머리글이 있는지 확인합니다.
- `station_db` RLS 정책에서 admin insert/delete 권한이 있는지 확인합니다.

### 관리번호가 중복된다는 오류가 납니다

`inspection_groups.management_no`는 unique입니다. 동시에 여러 사용자가 등록한 경우 새로고침 후 다시 추가하세요. 앱은 Supabase DB 기준으로 현재 연도의 마지막 `HEV_YYYY_N` 번호를 확인해 다음 번호를 생성합니다.
