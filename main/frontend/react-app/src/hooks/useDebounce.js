// Feature: html-to-react-migration
// useDebounce — returns a debounced copy of `value` that only updates after
// `delay` ms of inactivity. Used by useFileManager for search (300 ms).

import { useEffect, useState } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
