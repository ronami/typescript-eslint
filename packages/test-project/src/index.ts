// /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// /* eslint-disable @typescript-eslint/no-explicit-any */

// declare const _k: any;

// declare const _f: never;

// declare const _g: never[];

// // --- unsafe argument ---

export function bar<T extends string[]>(as: T): T {
  return as;
}

const a = bar([]);

// // export function doesSomething(arg: string): string {
// //   return arg.toUpperCase();
// // }

// // export function test(x: 'a' | 'b'): void {
// //   switch (x) {
// //     case 'a':
// //       return;
// //     case 'b':
// //       return;
// //     default:
// //       doesSomething(x);
// //   }
// // }

// // export function foo(...as: string[]): string[] {
// //   return as;
// // }

// // declare const xs: never[];

// // foo(...xs);

// // --- unsafe assignment ---

// // declare const _f: never;

// // declare const _g: never[];

// // declare const _j: [[never]];

// // declare const _h: { foo: never };

// // const _a = [..._f];

// // const _b = [..._g];

// // const { foo: _c } = _h;

// // const [_d] = _g;

// // const [[_e]] = _j;

// // // const [_d] = _f;

const _w: string[] = [];

const _y: never[] = [];

const _q: Record<string, string[]> = {
  foo: [],
};

const _e: { foo: never[] } = {
  foo: [],
};

const _r = {
  foo: [],
};

// const _t = [[]];

// // --- unsafe return ---

export const foo = (): string[] => [];

declare const bazz: <T>(callback: () => T[]) => void;
bazz(() => []);

declare const bass: (callback: () => string[]) => void;
bass(() => []);
