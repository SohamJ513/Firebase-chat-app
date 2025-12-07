// src/hooks/useImageCache.js
import { useState, useEffect } from 'react';

const imageCache = new Map();

export const useImageCache = (url) => {
  const [cachedUrl, setCachedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setIsLoading(false);
      return;
    }

    // Check cache
    if (imageCache.has(url)) {
      setCachedUrl(imageCache.get(url));
      setIsLoading(false);
      return;
    }

    // Preload image
    const img = new Image();
    img.src = url;
    
    img.onload = () => {
      imageCache.set(url, url);
      setCachedUrl(url);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return { cachedUrl, isLoading };
};