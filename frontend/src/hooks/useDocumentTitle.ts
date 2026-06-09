import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · VideoCall` : 'VideoCall';
    return () => {
      document.title = 'VideoCall';
    };
  }, [title]);
}
