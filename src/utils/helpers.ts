export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * YouTube-style accurate relative time formatter
 * Converts timestamps/ISO strings to "Just now", "2 minutes ago", "4 hours ago", "3 days ago", "2 weeks ago", "1 month ago", "1 year ago"
 */
export function formatRelativeTime(dateInput?: string | number | Date | null, fallback = 'Just now'): string {
  if (!dateInput) return fallback;

  try {
    let date: Date;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'number') {
      // If timestamp in seconds (Unix timestamp) vs milliseconds
      date = dateInput < 10000000000 ? new Date(dateInput * 1000) : new Date(dateInput);
    } else if (typeof dateInput === 'object' && 'seconds' in (dateInput as any)) {
      // Firestore Timestamp object
      date = new Date((dateInput as any).seconds * 1000);
    } else if (typeof dateInput === 'string') {
      const parsed = Date.parse(dateInput);
      if (isNaN(parsed)) {
        // If string is already a formatted label like "2 hours ago" or "Just now"
        if (dateInput.includes('ago') || dateInput.toLowerCase().includes('just now') || dateInput.toLowerCase().includes('today') || dateInput.toLowerCase().includes('yesterday')) {
          return dateInput;
        }
        return fallback;
      }
      date = new Date(parsed);
    } else {
      return fallback;
    }

    const now = Date.now();
    const diffMs = now - date.getTime();

    // If future date or under 10 seconds ago
    if (diffMs < 10000) {
      return 'Just now';
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30.44);
    const diffYears = Math.floor(diffDays / 365.25);

    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
    if (diffWeeks < 5) {
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    }
    if (diffMonths < 12) {
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    }
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  } catch (e) {
    return fallback;
  }
}

