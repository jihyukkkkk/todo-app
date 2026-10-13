// 순수 상태 로직. DOM과 저장소에 의존하지 않으며, 모든 함수는 새 배열을 반환한다.
// 할 일 항목 형태: { id: string, title: string, completed: boolean, createdAt: number }
(function (global) {
  'use strict';

  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function addTodo(todos, title) {
    const trimmed = String(title).trim();
    if (!trimmed) return todos;
    return todos.concat({ id: createId(), title: trimmed, completed: false, createdAt: Date.now() });
  }

  function toggleTodo(todos, id) {
    return todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t));
  }

  // 제목을 비우면 항목을 삭제한다.
  function updateTitle(todos, id, title) {
    const trimmed = String(title).trim();
    if (!trimmed) return removeTodo(todos, id);
    return todos.map(t => (t.id === id ? { ...t, title: trimmed } : t));
  }

  function removeTodo(todos, id) {
    return todos.filter(t => t.id !== id);
  }

  function clearCompleted(todos) {
    return todos.filter(t => !t.completed);
  }

  // 하나라도 미완료가 있으면 전부 완료로, 모두 완료 상태면 전부 미완료로 바꾼다.
  function toggleAll(todos) {
    const target = todos.some(t => !t.completed);
    return todos.map(t => ({ ...t, completed: target }));
  }

  function filterTodos(todos, filter) {
    if (filter === 'active') return todos.filter(t => !t.completed);
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  }

  // 저장소에서 읽은 값을 검증해 올바른 항목만 남긴다.
  function sanitize(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(t => t && typeof t.id === 'string' && typeof t.title === 'string' && t.title.trim())
      .map(t => ({
        id: t.id,
        title: t.title.trim(),
        completed: Boolean(t.completed),
        createdAt: Number(t.createdAt) || 0,
      }));
  }

  global.Todo = {
    addTodo,
    toggleTodo,
    updateTitle,
    removeTodo,
    clearCompleted,
    toggleAll,
    filterTodos,
    sanitize,
  };
})(typeof window !== 'undefined' ? window : globalThis);
