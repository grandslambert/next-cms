/**
 * Get the appropriate image URL from media sizes
 * Falls back to original URL if size not available
 */
export function getImageUrl(
  originalUrl: string, 
  sizes: string | null | undefined, 
  preferredSize: 'thumbnail' | 'medium' | 'large' | 'full' = 'full'
): string {
  if (!sizes) {
    return originalUrl;
  }

  try {
    const sizesObj = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    return sizesObj[preferredSize]?.url || originalUrl;
  } catch {
    return originalUrl;
  }
}

/**
 * Get responsive image srcset for better performance
 */
export function getImageSrcSet(sizes: string | null | undefined): string | undefined {
  if (!sizes) return undefined;

  try {
    const sizesObj = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
    const srcSet: string[] = [];

    if (sizesObj.thumbnail) {
      srcSet.push(`${sizesObj.thumbnail.url} ${sizesObj.thumbnail.width}w`);
    }
    if (sizesObj.medium) {
      srcSet.push(`${sizesObj.medium.url} ${sizesObj.medium.width}w`);
    }
    if (sizesObj.large) {
      srcSet.push(`${sizesObj.large.url} ${sizesObj.large.width}w`);
    }
    if (sizesObj.full) {
      srcSet.push(`${sizesObj.full.url} ${sizesObj.full.width}w`);
    }

    return srcSet.length > 0 ? srcSet.join(', ') : undefined;
  } catch {
    return undefined;
  }
}

