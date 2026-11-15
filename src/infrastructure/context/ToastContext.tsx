import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface ToastContextValue {
  toast: ToastState;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_HIDE_MS = 3000;


export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShown = useRef<{ message: string; type: ToastType; at: number } | null>(null);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    const last = lastShown.current;
    const repeated = last !== null
      && last.message === message
      && last.type === type
      && Date.now() - last.at < AUTO_HIDE_MS;
    lastShown.current = { message, type, at: Date.now() };
    if (!repeated) {
      setToast({ message, type, visible: true });
    } else {
      setToast((current) => (current.visible ? current : { message, type, visible: true }));
    }
    timer.current = setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
      timer.current = null;
    }, AUTO_HIDE_MS);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo(() => ({ toast, show, hide }), [toast, show, hide]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>.');
  return ctx;
}
