export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 45) return "Just now";
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const date = new Date(ts);
  const nowDate = new Date(now);

  const isYesterday = 
    date.getDate() === nowDate.getDate() - 1 &&
    date.getMonth() === nowDate.getMonth() &&
    date.getFullYear() === nowDate.getFullYear();
    
  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${date.toLocaleDateString("en-US", { weekday: "short" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }

  if (date.getFullYear() === nowDate.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatAbsolute(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Wrapper for legacy compatibility in notifications
export function formatTimeAgo(timestamp: number): string {
  return formatRelative(timestamp);
}
