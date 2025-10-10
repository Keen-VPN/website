import { useState, useCallback, useRef } from 'react';

/**
 * Debounce hook to prevent double-clicks on auth buttons
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): [T, boolean] {
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (isDebouncing) {
        console.warn('⚠️ Action debounced - please wait');
        return;
      }

      setIsDebouncing(true);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Execute callback
      const result = callback(...args);

      // Set timeout to reset debouncing state
      timeoutRef.current = setTimeout(() => {
        setIsDebouncing(false);
      }, delay);

      return result;
    }) as T,
    [callback, delay, isDebouncing]
  );

  return [debouncedCallback, isDebouncing];
}

