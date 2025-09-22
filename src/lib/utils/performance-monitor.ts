import { useEffect, useRef, useState } from 'react';

/**
 * Hook to monitor component re-renders for performance debugging
 * Only use in development mode
 */
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);
    }
  });
  
  return renderCount.current;
};

/**
 * Hook to track when specific dependencies change
 */
export const useDependencyTracker = (dependencies: Record<string, unknown>, componentName: string) => {
  const prevDeps = useRef<Record<string, unknown>>({});
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const changedDeps: string[] = [];
      
      Object.keys(dependencies).forEach(key => {
        if (prevDeps.current[key] !== dependencies[key]) {
          changedDeps.push(key);
        }
      });
      
      if (changedDeps.length > 0) {
        console.log(`📊 ${componentName} dependencies changed:`, changedDeps);
      }
      
      prevDeps.current = { ...dependencies };
    }
  });
};

/**
 * Utility to measure function execution time
 */
export const measurePerformance = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string
): T => {
  return ((...args: Parameters<T>) => {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    }
    return fn(...args);
  }) as T;
};

/**
 * Hook to debounce state updates
 */
export const useDebouncedState = <T>(initialValue: T, delay: number) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);
  
  return [debouncedValue, setValue] as const;
};

