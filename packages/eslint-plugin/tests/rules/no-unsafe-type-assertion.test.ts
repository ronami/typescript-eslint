import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../../src/rules/no-unsafe-type-assertion';
import { getFixturesRootDir } from '../RuleTester';

const rootPath = getFixturesRootDir();

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: rootPath,
    },
  },
});

describe('basic assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const a: string;
const b = a as string | number;
      `,
      `
declare const a: string;
const b = a as string | number as string | number | boolean;
      `,
      `
declare const a: string;
const b = a as string;
      `,
      `
declare const a: { hello: 'world' };
const b = a as { hello: string };
      `,
    ],
    invalid: [
      {
        code: `
declare const a: string | number;
const b = a as string;
        `,
        errors: [
          {
            column: 11,
            data: {
              type: 'string | number',
            },
            endColumn: 22,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: string | undefined;
const b = a as string | boolean;
        `,
        errors: [
          {
            column: 11,
            data: {
              type: 'string | undefined',
            },
            endColumn: 32,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: string;
const b = a as 'foo' as 'bar';
        `,
        errors: [
          {
            column: 11,
            data: {
              type: '"foo"',
            },
            endColumn: 30,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
          {
            column: 11,
            data: {
              type: 'string',
            },
            endColumn: 21,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('any assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const _any_: any;
const b = _any_ as any;
      `,
      `
declare const _any_: any;
const b = _any_ as unknown;
      `,
    ],
    invalid: [
      {
        code: `
declare const _any_: any;
const b = _any_ as string;
        `,
        errors: [
          {
            column: 11,
            endColumn: 26,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _any_: any;
const b = _any_ as Function;
        `,
        errors: [
          {
            column: 11,
            endColumn: 28,
            line: 3,
            messageId: 'unsafeFunctionTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _any_: any;
const b = _any_ as never;
        `,
        errors: [
          {
            column: 11,
            endColumn: 25,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
const b = 'foo' as any;
        `,
        errors: [
          {
            column: 11,
            endColumn: 23,
            line: 2,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('never assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const _never_: never;
const b = _never_ as never;
      `,
      `
declare const _never_: never;
const b = _never_ as unknown;
      `,
    ],
    invalid: [
      {
        code: `
declare const _never_: never;
const b = _never_ as string;
        `,
        errors: [
          {
            column: 11,
            endColumn: 28,
            line: 3,
            messageId: 'unsafeNeverTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _never_: never;
const b = _never_ as Function;
        `,
        errors: [
          {
            column: 11,
            endColumn: 30,
            line: 3,
            messageId: 'unsafeFunctionTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _never_: never;
const b = _never_ as any;
        `,
        errors: [
          {
            column: 11,
            endColumn: 25,
            line: 3,
            messageId: 'unsafeNeverTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _string_: string;
const b = _string_ as never;
        `,
        errors: [
          {
            column: 11,
            endColumn: 28,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('function assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const _function_: Function;
const b = _function_ as unknown;
      `,
    ],
    invalid: [
      {
        code: `
declare const _function_: Function;
const b = _function_ as () => void;
        `,
        errors: [
          {
            column: 11,
            endColumn: 35,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _function_: Function;
const b = _function_ as never;
        `,
        errors: [
          {
            column: 11,
            endColumn: 30,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
const b = (() => {}) as Function;
        `,
        errors: [
          {
            column: 11,
            endColumn: 33,
            line: 2,
            messageId: 'unsafeFunctionTypeAssertion',
          },
        ],
      },
    ],
  });
});

// ruleTester.run('no-unsafe-type-assertion', rule, {
//   valid: [
//     `
// declare const a: string;
// const b = a as unknown;
//     `,
//     `
// declare const a: string;
// const b = a as any;
//     `,
//     `
// declare const a: string;
// const b = a as any as number;
//     `,
//     `
// declare const a: () => boolean;
// const b = a() as boolean | number;
//     `,
//     `
// declare const a: () => boolean;
// const b = a() as boolean | number as boolean | number | string;
//     `,
//     `
// declare const a: () => string;
// const b = a() as string;
//     `,
//     `
// declare const a: () => string;
// const b = a as (() => string) | (() => number);
//     `,
//     `
// declare const a: () => string;
// const b = a as (() => string) | ((x: number) => string);
//     `,
//     `
// declare const a: () => string;
// const b = a as () => string | number;
//     `,
//     `
// declare const foo = 'hello' as const;
// foo() as string;
//     `,
//     `
// declare const foo: () => string | undefined;
// foo()!;
//     `,
//     `
// declare const foo: { bar?: { bazz: string } };
// (foo.bar as { bazz: string | boolean } | undefined)?.bazz;
//     `,
//     `
// function foo(a: string) {
//   return a as string | number;
// }
//     `,
//     `
// function foo<T extends boolean>(a: T) {
//   return a as boolean | number;
// }
//     `,
//     `
// function foo<T extends boolean>(a: T) {
//   return a as T | number;
// }
//     `,
//     `
// declare const a: { hello: string } & { world: string };
// const b = a as { hello: string };
//     `,
//     `
// interface Foo {
//   bar: number;
// }

// // no additional properties are allowed
// export const foo = { bar: 1, bazz: 1 } as Foo;
//     `,
//   ],
//   invalid: [
//     {
//       code: `
// declare const a: string;
// const b = a as unknown as number;
//       `,
//       errors: [
//         {
//           column: 11,
//           data: {
//             type: 'unknown',
//           },
//           endColumn: 33,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// declare const a: string;
// const b = a as string | boolean as boolean;
//       `,
//       errors: [
//         {
//           column: 11,
//           data: {
//             type: 'string | boolean',
//           },
//           endColumn: 43,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// function f(t: number | string) {
//   return t as number | boolean;
// }
//       `,
//       errors: [
//         {
//           column: 10,
//           data: {
//             type: 'string | number',
//           },
//           endColumn: 31,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// function f<T extends number | string>(t: T) {
//   return t as number | boolean;
// }
//       `,
//       errors: [
//         {
//           column: 10,
//           data: {
//             type: 'string | number',
//           },
//           endColumn: 31,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// function f<T extends number | string>(t: T) {
//   return t as Omit<T, number>;
// }
//       `,
//       errors: [
//         {
//           column: 10,
//           data: {
//             type: 'string | number',
//           },
//           endColumn: 30,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// declare const a: () => string | boolean;
// const b = a as () => string | number;
//       `,
//       errors: [
//         {
//           column: 11,
//           data: {
//             type: '() => string | boolean',
//           },
//           endColumn: 37,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// interface Foo {
//   bar: number;
//   bas: string;
// }

// var foo = {} as Foo;
//       `,
//       errors: [
//         {
//           column: 11,
//           data: {
//             type: '{}',
//           },
//           endColumn: 20,
//           line: 7,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// declare const foo: string | number;
// const bar = foo as string | boolean as string | null;
//       `,
//       errors: [
//         {
//           column: 13,
//           data: {
//             type: 'string | boolean',
//           },
//           endColumn: 53,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//         {
//           column: 13,
//           data: {
//             type: 'string | number',
//           },
//           endColumn: 36,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// declare const foo: { bar?: { bazz: string } };
// (foo.bar as { bazz: string | boolean }).bazz;
//       `,
//       errors: [
//         {
//           column: 2,
//           data: {
//             type: '{ bazz: string; } | undefined',
//           },
//           endColumn: 39,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// declare const foo: 'hello' | 'world';
// const bar = foo as 'hello';
//       `,
//       errors: [
//         {
//           column: 13,
//           data: {
//             type: '"hello" | "world"',
//           },
//           endColumn: 27,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// interface Foo {
//   type: 'foo';
// }

// interface Bar {
//   type: 'bar';
// }

// type Bazz = Foo | Bar;

// declare const foo: Bazz;
// const bar = foo as Foo;
//       `,
//       errors: [
//         {
//           column: 13,
//           data: {
//             type: 'Bazz',
//           },
//           endColumn: 23,
//           line: 13,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// type Foo = Readonly<Required<{ hello?: string }>>;

// declare const foo: {};
// const bar = foo as Foo;
//       `,
//       errors: [
//         {
//           column: 13,
//           data: {
//             type: '{}',
//           },
//           endColumn: 23,
//           line: 5,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// declare const foo: readonly number[];
// const bar = foo as number[];
//       `,
//       errors: [
//         {
//           column: 13,
//           data: {
//             type: 'readonly number[]',
//           },
//           endColumn: 28,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//     {
//       code: `
// declare const foo: { hello: string } & { world: string };
// const bar = foo as { hello: string; world: 'world' };
//       `,
//       errors: [
//         {
//           column: 13,
//           data: {
//             type: '{ hello: string; } & { world: string; }',
//           },
//           endColumn: 53,
//           line: 3,
//           messageId: 'unsafeTypeAssertion',
//         },
//       ],
//     },
//   ],
// });
