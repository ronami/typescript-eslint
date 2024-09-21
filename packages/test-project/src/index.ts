class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

export const point: Promise<Point> = Promise.resolve(new Point(-1, -2));

declare const a: { point: boolean | Point };

a.point = { x: -1, y: -2 };

export function foo(): boolean;
export function foo(_?: boolean | Point): Point[];
export function foo(_?: boolean | Point): boolean | (boolean | Point)[] {
  if (!_) {
    return true;
  }

  return [true, false, { x: -1, y: -2 }];
}

declare const callback: (callback: () => Point) => void;

callback(() => {
  return { x: -1, y: -2 };
});

foo({ x: -1, y: -2 });

const m = new Map<string, { a: number; b: number } | Point>();

m.set('', { a: -1, b: -2 });

export async function bar(): Promise<Point> {
  return { x: -1, y: -2 };
}

const s = new Set<{ p: Point }>();

s.add({ p: { x: 1, y: 2 } });
