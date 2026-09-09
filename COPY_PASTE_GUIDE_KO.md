# 바로 붙여넣기용 안내

아래 방식 중 하나만 사용하세요. **GitHub의 변경내역(diff) 화면에서 `+`, `-`가 붙은 줄을 복사하지 마세요.**

## 방법 A: 가장 쉬운 방법 — `index.html` 원본 전체 교체

1. 이 저장소에서 `index.html` 파일을 클릭합니다.
2. **Raw** 또는 **원본 보기**를 누릅니다.
3. 화면에 보이는 내용을 전부 선택해서 복사합니다.
4. 배포 사이트의 기존 `index.html` 내용을 전부 지웁니다.
5. 방금 복사한 내용을 그대로 붙여넣고 저장/배포합니다.

정상적인 `index.html`은 첫 줄이 반드시 아래처럼 시작합니다.

```html
<!doctype html>
<html lang="ko">
```

아래처럼 시작하면 잘못 복사한 것입니다.

```text
diff --git a/index.html b/index.html
--- a/index.html
+++ b/index.html
@@
```

## 방법 B: 화면에 `+`, `-`만 보이고 버튼이 안 눌릴 때 임시 응급 코드

배포 화면 편집기에서 `</body>` 바로 위에 아래 코드를 붙여넣고 저장하세요.

> 단, 이 방법은 화면의 `+`, `-` 표시를 숨기는 응급 조치입니다. 버튼 코드 자체가 깨졌다면 **방법 A로 `index.html` 전체 교체**를 해야 합니다.

```html
<script>
(function(){
  function removeDiffText(){
    var markerLine = /^\s*(diff --git|index [0-9a-f]{7,}|---\s+a\/|\+\+\+\s+b\/|@@\s+-\d+)/i;
    function onlyDiffMarks(text){
      return String(text || '').split('\n').every(function(line){
        var t = line.trim();
        return !t || t === '+' || t === '-' || markerLine.test(t);
      });
    }
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var remove = [];
    while(walker.nextNode()){
      if(onlyDiffMarks(walker.currentNode.textContent)) remove.push(walker.currentNode);
    }
    remove.forEach(function(node){ node.remove(); });
  }
  removeDiffText();
  localStorage.removeItem('hev_access_session_v1');
  var app = document.getElementById('appMain');
  var access = document.getElementById('accessPanel');
  if(app) app.classList.add('hidden');
  if(access) access.classList.remove('hidden');
})();
</script>
```

## 저장 후 확인

배포 주소 뒤에 아래를 붙여 접속하세요.

```text
?logout=1
```

예시:

```text
https://내-배포주소/index.html?logout=1
```

정상이라면 첫 화면에 아래 문구가 보여야 합니다.

```text
접근 코드 입력
이용자 로그인
관리자 로그인
```
