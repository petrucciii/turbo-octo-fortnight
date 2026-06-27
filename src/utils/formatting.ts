export const formatSpeed = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '--';
  return Math.round(value).toString();
};

export const formatDistance = (valueKm: number): string => {
  if (valueKm < 1) {
    return `${(valueKm * 1000).toFixed(0)} m`;
  }
  return `${valueKm.toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  if (seconds <= 0 || isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');

  if (h > 0) {
    const hStr = h.toString().padStart(2, '0');
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
};
