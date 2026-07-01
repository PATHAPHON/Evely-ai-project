// ponytail: relative time พื้นฐานพอสำหรับ list, อัปเกรดเป็น Intl.RelativeTimeFormat ถ้าต้องการ i18n เต็ม
export function relativeTimeTh(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return 'เมื่อสักครู่';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่ผ่านมา`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่ผ่านมา`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'เมื่อวานซืน';
  return `${days} วันที่ผ่านมา`;
}
