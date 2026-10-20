// src/hooks/useElementWidth.ts
import { useCallback, useRef, useState } from 'react';

/**
 * Live content width of an element (ResizeObserver). Attach the returned
 * callback ref to the element; width is 0 until it mounts. React calls the
 * ref with null on unmount, which disconnects the observer.
 */
export function useElementWidth<T extends HTMLElement>() {
    const [width, setWidth] = useState(0);
    const observerRef = useRef<ResizeObserver | null>(null);

    const ref = useCallback((node: T | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (!node) return;
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(node);
        observerRef.current = observer;
    }, []);

    return { ref, width };
}
