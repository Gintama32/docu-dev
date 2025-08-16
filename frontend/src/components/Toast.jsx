import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

function ToastContainer({ toasts, dismiss }) {
  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      zIndex: 1000,
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          style={{
            minWidth: 260,
            maxWidth: 420,
            padding: '10px 12px',
            borderRadius: 8,
            background: t.type === 'error' ? '#fee' : t.type === 'success' ? '#efe' : t.type === 'warning' ? '#fff7e6' : 'var(--background-secondary)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
            <div style={{ fontWeight: 600, marginRight: 8 }}>
              {t.title || (t.type === 'error' ? 'Error' : t.type === 'success' ? 'Success' : t.type === 'warning' ? 'Warning' : 'Info')}
            </div>
            <button onClick={() => dismiss(t.id)} className="button-secondary" style={{ padding: '2px 6px' }}>×</button>
          </div>
          {t.message && (
            <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>{t.message}</div>
          )}
        </div>
      ))}
    </div>
  );
}

let idCounter = 1;

export function ToastProvider({ children, defaultDuration = 3000 }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((toast) => {
    const id = idCounter++;
    const normalized = { id, type: 'info', ...toast };
    setToasts((prev) => [...prev, normalized]);

    const duration = toast.duration ?? defaultDuration;
    if (duration && duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [defaultDuration, dismiss]);

  // convenience helpers
  const success = useCallback((message, opts = {}) => push({ type: 'success', message, ...opts }), [push]);
  const error = useCallback((message, opts = {}) => push({ type: 'error', message, ...opts }), [push]);
  const warning = useCallback((message, opts = {}) => push({ type: 'warning', message, ...opts }), [push]);
  const info = useCallback((message, opts = {}) => push({ type: 'info', message, ...opts }), [push]);

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}
