export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) {
    const v = Math.round(n / 100) / 10;
    return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'K';
  }
  if (n < 999_950) return Math.floor(n / 1000) + 'K';
  if (n < 1_000_000_000) {
    if (n < 10_000_000) {
      const v = Math.round(n / 100_000) / 10;
      return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'M';
    }
    if (n < 999_950_000) return Math.floor(n / 1_000_000) + 'M';
    return '1B';
  }
  const billions = n / 1_000_000_000;
  const v = billions < 10 ? Math.round(billions * 10) / 10 : Math.floor(billions);
  return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'B';
}
export default {};
