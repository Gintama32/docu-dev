import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="toast-container"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`toast-item ${t.type || 'info'}`}
        >
          <div className="toast-header">
            <div className="toast-title">
              {t.title || (t.type === 'error' ? 'Error' : t.type === 'success' ? 'Success' : t.type === 'warning' ? 'Warning' : 'Info')}
            </div>
            <button onClick={() => dismiss(t.id)} className="toast-close">×</button>
          </div>
          {t.message && (
            <div className="toast-message">{t.message}</div>
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
