type ClassValue = string | number | false | null | undefined | ClassValue[];

export function cn(...args: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === 'string' || typeof v === 'number') out.push(String(v));
  };
  args.forEach(walk);
  return out.join(' ');
}
