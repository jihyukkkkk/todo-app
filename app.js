// UI 계층: 상태 보관, localStorage 저장, 렌더링, 이벤트 처리.
// 상태 변경은 항상 todo.js의 순수 함수로 하고, 변경 후 commit()으로 저장과 렌더링을 함께 한다.
(function () {
  'use strict';

  const STORAGE_KEY = 'todo-app.todos.v1';
  const FILTER_KEY = 'todo-app.filter.v1';
  const FILTERS = ['all', 'active', 'completed'];

  const els = {
    form: document.getElementById('new-todo-form'),
    input: document.getElementById('new-todo-input'),
    list: document.getElementById('todo-list'),
    empty: document.getElementById('empty-message'),
    summary: document.getElementById('summary'),
    filterButtons: document.querySelectorAll('[data-filter]'),
    toggleAll: document.getElementById('toggle-all'),
    clearCompleted: document.getElementById('clear-completed'),
  };

  // 개인 브라우저나 저장소 차단 환경에서는 localStorage 접근이 예외를 던질 수 있다.
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // 저장에 실패해도 현재 세션에서는 계속 동작한다.
    }
  }

  const state = {
    todos: Todo.sanitize(load(STORAGE_KEY, [])),
    filter: FILTERS.includes(load(FILTER_KEY, 'all')) ? load(FILTER_KEY, 'all') : 'all',
    editingId: null,
  };

  function commit(nextTodos) {
    state.todos = nextTodos;
    save(STORAGE_KEY, state.todos);
    render();
  }

  function setFilter(filter) {
    state.filter = filter;
    save(FILTER_KEY, filter);
    render();
  }

  function renderItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.dataset.id = todo.id;

    if (state.editingId === todo.id) {
      li.classList.add('editing');
      const edit = document.createElement('input');
      edit.type = 'text';
      edit.className = 'edit';
      edit.value = todo.title;
      edit.maxLength = 200;
      edit.setAttribute('aria-label', '할 일 수정');
      li.append(edit);
      return li;
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'toggle';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `"${todo.title}" 완료 표시`);

    const label = document.createElement('span');
    label.className = 'title';
    label.textContent = todo.title;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `"${todo.title}" 삭제`);

    li.append(checkbox, label, remove);
    return li;
  }

  function render() {
    const visible = Todo.filterTodos(state.todos, state.filter);
    els.list.replaceChildren(...visible.map(renderItem));

    const total = state.todos.length;
    const remaining = state.todos.filter(t => !t.completed).length;
    const done = total - remaining;

    els.summary.textContent = total === 0 ? '' : `남은 일 ${remaining}개 · 완료 ${done}개`;

    if (visible.length === 0) {
      els.empty.hidden = false;
      els.empty.textContent =
        total === 0 ? '할 일이 없습니다. 위에서 추가해 보세요.'
        : state.filter === 'active' ? '진행 중인 일이 없습니다.'
        : '완료한 일이 없습니다.';
    } else {
      els.empty.hidden = true;
    }

    els.filterButtons.forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.filter === state.filter));
    });

    els.toggleAll.disabled = total === 0;
    els.toggleAll.textContent = total > 0 && remaining === 0 ? '모두 미완료' : '모두 완료';
    els.clearCompleted.disabled = done === 0;

    const editInput = els.list.querySelector('.edit');
    if (editInput) {
      editInput.focus();
      editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    }
  }

  function finishEditing(shouldSave) {
    const input = els.list.querySelector('.edit');
    const id = state.editingId;
    if (!id) return;
    state.editingId = null;
    if (shouldSave && input) {
      commit(Todo.updateTitle(state.todos, id, input.value));
    } else {
      render();
    }
  }

  // --- 이벤트 ---

  els.form.addEventListener('submit', e => {
    e.preventDefault();
    const title = els.input.value;
    if (!title.trim()) return;
    commit(Todo.addTodo(state.todos, title));
    els.input.value = '';
    els.input.focus();
  });

  els.list.addEventListener('change', e => {
    if (!e.target.classList.contains('toggle')) return;
    const id = e.target.closest('.todo-item').dataset.id;
    commit(Todo.toggleTodo(state.todos, id));
  });

  els.list.addEventListener('click', e => {
    if (!e.target.classList.contains('remove')) return;
    const id = e.target.closest('.todo-item').dataset.id;
    commit(Todo.removeTodo(state.todos, id));
  });

  els.list.addEventListener('dblclick', e => {
    const title = e.target.closest('.title');
    if (!title) return;
    state.editingId = title.closest('.todo-item').dataset.id;
    render();
  });

  els.list.addEventListener('keydown', e => {
    if (!e.target.classList.contains('edit')) return;
    if (e.key === 'Enter' && !e.isComposing) finishEditing(true);
    else if (e.key === 'Escape') finishEditing(false);
  });

  // 다른 곳을 클릭해 포커스를 잃으면 저장한다. Enter/Esc로 이미 끝난 경우 editingId가 null이라 무시된다.
  els.list.addEventListener('focusout', e => {
    if (e.target.classList.contains('edit')) finishEditing(true);
  });

  els.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  els.toggleAll.addEventListener('click', () => commit(Todo.toggleAll(state.todos)));
  els.clearCompleted.addEventListener('click', () => commit(Todo.clearCompleted(state.todos)));

  // 다른 탭에서 바뀐 내용을 반영한다.
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY) return;
    state.todos = Todo.sanitize(load(STORAGE_KEY, []));
    state.editingId = null;
    render();
  });

  render();
})();
