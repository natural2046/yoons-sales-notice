/* site-content.js  (2026-09-18 추가)
 * 매니저가 admin.html 에서 등록한 공지사항·자료를 지역 페이지에 표시한다.
 * - 데이터: content/<지역 slug>.json  (예: daejeon.html -> content/daejeon.json)
 * - 이 파일은 sync_to_github.ps1 이 배포용 페이지(<slug>.html)의 </body> 앞에 자동 삽입한다.
 * - 파이프라인(gen_html.py)이 만드는 실적 영역은 건드리지 않는다. JSON 이 없거나
 *   비어 있으면 페이지는 기존과 완전히 동일하게 보인다.
 * - 모든 사용자 입력은 textContent 로만 넣는다 (HTML 삽입 없음).
 */
(function () {
  "use strict";

  var file = (location.pathname.split("/").pop() || "").toLowerCase();
  var slug = file.replace(/\.html?$/, "");
  if (!slug || slug === "index" || slug === "admin") return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  // 본문 안의 http(s) 주소만 링크로 바꾼다. 나머지는 전부 일반 텍스트.
  function appendLinkified(parent, text) {
    var re = /(https?:\/\/[^\s<>"']+)/g;
    var last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement("a");
      a.href = m[1];
      a.textContent = m[1];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.color = "inherit";
      a.style.textDecoration = "underline";
      parent.appendChild(a);
      last = m.index + m[1].length;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function noticeBox(n) {
    var box = el("div", "notice-box dyn-notice");
    box.style.marginBottom = "10px";
    var head = el("div", "notice-head");
    var title = el("div", null, (n.pinned ? "📌 " : "") + (n.title || "공지"));
    title.style.fontWeight = "600";
    title.style.fontSize = "14.5px";
    var date = el("div", "notice-date", [n.date, n.author ? n.author + " 매니저" : ""].filter(Boolean).join(" · "));
    head.appendChild(title);
    head.appendChild(date);
    var body = el("div", "notice-body");
    body.style.fontSize = "14px";
    appendLinkified(body, String(n.body || ""));
    box.appendChild(head);
    box.appendChild(body);
    return box;
  }

  function fileCard(f) {
    var card = el("div", "file-card dyn-file");
    var href = String(f.path || "");
    // 같은 사이트의 library/ 아래 파일만 허용
    if (!/^library\/[A-Za-z0-9_\-\/.]+$/.test(href) || href.indexOf("..") !== -1) return null;
    var icon = "📄";
    if (f.kind === "image") {
      var img = el("img", "file-thumb");
      img.src = href;
      img.alt = f.name || "";
      img.loading = "lazy";
      card.appendChild(img);
      icon = "🖼️";
    } else if (f.kind === "video") {
      var v = document.createElement("video");
      v.controls = true;
      v.preload = "metadata";
      var s = document.createElement("source");
      s.src = href;
      if (f.mime) s.type = f.mime;
      v.appendChild(s);
      card.appendChild(v);
      icon = "🎬";
    } else {
      card.appendChild(el("div", "file-icon", "📄"));
    }
    card.appendChild(el("div", "file-title", icon + " " + (f.name || href.split("/").pop())));
    card.appendChild(el("div", "file-meta", [fmtSize(f.size), f.date].filter(Boolean).join(" · ")));
    var a = el("a", "file-download-btn", "다운로드");
    a.href = href;
    a.setAttribute("download", f.name || "");
    card.appendChild(a);
    return card;
  }

  function render(data) {
    var notices = (data.notices || []).slice().sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
      return String(b.date || "").localeCompare(String(a.date || "")) ||
             String(b.id || "").localeCompare(String(a.id || ""));
    });
    var baseBox = document.querySelector(".notice-box");
    if (baseBox && notices.length) {
      notices.forEach(function (n) {
        baseBox.parentNode.insertBefore(noticeBox(n), baseBox);
      });
    }

    var files = data.files || [];
    var grid = document.querySelector(".files-grid");
    if (grid && files.length) {
      var empty = grid.querySelector(".file-empty");
      if (empty) empty.remove();
      // files 는 등록순(오래된 것 먼저)으로 저장됨 -> 차례로 맨 앞에 넣으면 최신이 위로 온다
      files.forEach(function (f) {
        var c = fileCard(f);
        if (c) grid.insertBefore(c, grid.firstChild);
      });
    }
  }

  function start() {
    fetch("content/" + slug + ".json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) render(data); })
      .catch(function () { /* JSON 이 없으면 기존 페이지 그대로 */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
