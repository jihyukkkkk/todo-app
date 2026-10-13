# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

빌드 도구·의존성 없는 순수 HTML/CSS/JS 할 일 앱. UI 문구는 한국어. 이 머신에는 Node.js가 없고 `python3`만 있다.

## 실행

- 가장 간단한 방법: `index.html`을 브라우저에서 직접 연다 (ES 모듈을 쓰지 않으므로 `file://`에서도 동작).
- 브라우저 자동화(Claude in Chrome)는 `file://`을 열 수 없으므로 로컬 서버를 띄운다:
  `python3 -m http.server 8765 --bind 127.0.0.1`
  Claude Code 샌드박스는 포트 바인딩을 막으므로(`Operation not permitted`) 샌드박스 밖에서 실행하거나 `sandbox.network.allowLocalBinding: true`가 필요하다.
- 자동 테스트 스위트는 없다. 검증은 브라우저에서 DOM을 조작하는 스크립트로 한다. 자동화 창은 포커스가 없어 `element.blur()`가 `focusout`을 발생시키지 않으니, 수정 중 포커스 아웃 저장을 테스트할 때는 `focusout` 이벤트를 직접 dispatch한다.

## 구조

- `todo.js` — 순수 상태 로직(`window.Todo`). DOM·저장소에 의존하지 않고, 모든 함수는 기존 배열을 바꾸지 않고 새 배열을 반환한다. `sanitize()`는 localStorage에서 읽은 값을 검증한다.
- `app.js` — UI 계층. `state`(todos, filter, editingId)를 보관하고, 모든 변경은 `Todo.*` 함수 → `commit()`(저장 + 전체 다시 그리기) 흐름을 따른다. 리스트 이벤트는 `#todo-list`에 위임한다.
- 수정 모드는 `state.editingId`로 표현되고 `render()`가 해당 항목을 `<input class="edit">`로 그린다. Enter/Esc 처리 시 `editingId`를 먼저 `null`로 만들어, 다시 그릴 때 생기는 `focusout`이 중복 저장되지 않게 한다. 한글 IME 조합 중 Enter는 `isComposing`으로 무시한다.
- `script` 로드 순서가 중요하다: `index.html`에서 `todo.js`가 `app.js`보다 먼저 로드되어야 한다.

## 저장

- localStorage 키: `todo-app.todos.v1`(항목 배열), `todo-app.filter.v1`(현재 필터). 데이터 형태를 바꾸면 키의 버전을 올리거나 `sanitize()`에서 이전 형태를 변환한다.
- localStorage 접근은 모두 try/catch로 감싸져 있어, 저장이 막힌 환경에서도 세션 내에서는 동작한다. 다른 탭의 변경은 `storage` 이벤트로 반영한다.
