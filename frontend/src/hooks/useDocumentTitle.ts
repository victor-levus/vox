import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Vōx` : 'Vōx';
    return () => {
      document.title = 'Vōx';
    };
  }, [title]);
}
