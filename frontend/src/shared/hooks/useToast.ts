// frontend/src/shared/hooks/useToast.ts
import { useToastStore } from '../store/toast.store';

export const useToast = () => {
  const { addToast } = useToastStore();
  return {
    success: (msg: string, d?: number) => addToast(msg, 'success', d),
    error: (msg: string, d?: number) => addToast(msg, 'error', d),
    info: (msg: string, d?: number) => addToast(msg, 'info', d),
    warning: (msg: string, d?: number) => addToast(msg, 'warning', d),
  };
};
