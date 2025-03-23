export function debounce<T extends unknown[]>(
  func: (...args: T) => void,
  delay: number,
) {
  let timer: NodeJS.Timeout | undefined;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
