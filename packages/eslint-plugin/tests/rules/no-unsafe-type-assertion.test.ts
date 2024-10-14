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
a as string | number;
      `,
      `
declare const a: string;
<string | number>a;
      `,
      `
declare const a: string;
a as string | number as string | number | boolean;
      `,
      `
declare const a: string;
a as string;
      `,
      `
declare const a: { hello: 'world' };
a as { hello: string };
      `,
      `
'hello' as const;
      `,
      `
function foo<T extends boolean>(a: T) {
  return a as T | number;
}
      `,
    ],
    invalid: [
      {
        code: `
declare const a: string | number;
a as string;
        `,
        errors: [
          {
            column: 1,
            data: {
              type: 'string | number',
            },
            endColumn: 12,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: string | number;
<string>a;
        `,
        errors: [
          {
            column: 1,
            data: {
              type: 'string | number',
            },
            endColumn: 10,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: string | undefined;
a as string | boolean;
        `,
        errors: [
          {
            column: 1,
            data: {
              type: 'string | undefined',
            },
            endColumn: 22,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      // multiple failures
      {
        code: `
declare const a: string;
a as 'foo' as 'bar';
        `,
        errors: [
          {
            column: 1,
            data: {
              type: '"foo"',
            },
            endColumn: 20,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
          {
            column: 1,
            data: {
              type: 'string',
            },
            endColumn: 11,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      // type constraint
      {
        code: `
function foo<T extends boolean>(a: T) {
  return a as true;
}
        `,
        errors: [
          {
            column: 10,
            data: {
              type: 'boolean',
            },
            endColumn: 19,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      // long/complex original type
      {
        code: `
declare const a: Omit<
  Required<Readonly<{ hello: 'world'; foo: 'bar' }>>,
  'foo'
>;
a as string;
        `,
        errors: [
          {
            column: 1,
            data: {
              type: 'Omit<Required<Readonly<{ hello: "world"; foo: "bar"; }>>, "foo">',
            },
            endColumn: 12,
            endLine: 6,
            line: 6,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const foo: readonly number[];
const bar = foo as number[];
        `,
        errors: [
          {
            column: 13,
            data: {
              type: 'readonly number[]',
            },
            endColumn: 28,
            endLine: 3,
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
_any_ as any;
      `,
      `
declare const _any_: any;
_any_ as unknown;
      `,
    ],
    invalid: [
      {
        code: `
declare const _any_: any;
_any_ as string;
        `,
        errors: [
          {
            column: 1,
            endColumn: 16,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _any_: any;
_any_ as Function;
        `,
        errors: [
          {
            column: 1,
            endColumn: 18,
            endLine: 3,
            line: 3,
            messageId: 'unsafeFunctionTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _any_: any;
_any_ as never;
        `,
        errors: [
          {
            column: 1,
            endColumn: 15,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
'foo' as any;
        `,
        errors: [
          {
            column: 1,
            endColumn: 13,
            endLine: 2,
            line: 2,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      // an error type `any`
      {
        code: `
const bar = foo as number;
        `,
        errors: [
          {
            column: 13,
            endColumn: 26,
            endLine: 2,
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
_never_ as never;
      `,
      `
declare const _never_: never;
_never_ as unknown;
      `,
    ],
    invalid: [
      {
        code: `
declare const _never_: never;
_never_ as string;
        `,
        errors: [
          {
            column: 1,
            endColumn: 18,
            endLine: 3,
            line: 3,
            messageId: 'unsafeNeverTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _never_: never;
_never_ as Function;
        `,
        errors: [
          {
            column: 1,
            endColumn: 20,
            endLine: 3,
            line: 3,
            messageId: 'unsafeFunctionTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _never_: never;
_never_ as any;
        `,
        errors: [
          {
            column: 1,
            endColumn: 15,
            endLine: 3,
            line: 3,
            messageId: 'unsafeNeverTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _string_: string;
_string_ as never;
        `,
        errors: [
          {
            column: 1,
            endColumn: 18,
            endLine: 3,
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
_function_ as Function;
      `,
      `
declare const _function_: Function;
_function_ as unknown;
      `,
    ],
    invalid: [
      {
        code: `
declare const _function_: Function;
_function_ as () => void;
        `,
        errors: [
          {
            column: 1,
            endColumn: 25,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _function_: Function;
_function_ as any;
        `,
        errors: [
          {
            column: 1,
            endColumn: 18,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const _function_: Function;
_function_ as never;
        `,
        errors: [
          {
            column: 1,
            endColumn: 20,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
(() => {}) as Function;
        `,
        errors: [
          {
            column: 1,
            endColumn: 23,
            endLine: 2,
            line: 2,
            messageId: 'unsafeFunctionTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('object assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
// additional properties should be allowed
export const foo = { bar: 1, bazz: 1 } as {
  bar: number;
};
      `,
      `
declare const a: { hello: string } & { world: string };
a as { hello: string };
      `,
      `
declare const a: { hello: any };
a as { hello: unknown };
      `,
      `
declare const a: { hello: string };
a as { hello?: string };
      `,
    ],
    invalid: [
      {
        code: `
var foo = {} as {
  bar: number;
  bas: string;
};
        `,
        errors: [
          {
            column: 11,
            data: {
              type: '{}',
            },
            endColumn: 2,
            endLine: 5,
            line: 2,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: { hello: string };
a as { hello: any };
        `,
        errors: [
          {
            column: 1,
            endColumn: 20,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: { hello: 'string'; foo: { bar: number } };
a as { hello: string; foo: { bar: any } };
        `,
        errors: [
          {
            column: 1,
            endColumn: 42,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: { hello: any };
a as { hello: string };
        `,
        errors: [
          {
            column: 1,
            endColumn: 23,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: { hello?: string };
a as { hello: string };
        `,
        errors: [
          {
            column: 1,
            endColumn: 23,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('array assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const a: string[];
a as (string | number)[];
      `,
      `
declare const a: number[];
a as unknown[];
      `,
      `
declare const a: { hello: 'world'; foo: 'bar' }[];
a as { hello: 'world' }[];
      `,
    ],
    invalid: [
      {
        code: `
declare const a: (string | number)[];
a as string[];
        `,
        errors: [
          {
            column: 1,
            data: {
              type: '(string | number)[]',
            },
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: any[];
a as number[];
        `,
        errors: [
          {
            column: 1,
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: number[];
a as any[];
        `,
        errors: [
          {
            column: 1,
            endColumn: 11,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: unknown[];
a as number[];
        `,
        errors: [
          {
            column: 1,
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: number[];
a as never[];
        `,
        errors: [
          {
            column: 1,
            endColumn: 13,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: never[];
a as number[];
        `,
        errors: [
          {
            column: 1,
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeNeverTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('tuple assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const a: [string];
a as [string | number];
      `,
      `
declare const a: [string, number];
a as [string, string | number];
      `,
      `
declare const a: [string];
a as [unknown];
      `,
      `
declare const a: [{ hello: 'world'; foo: 'bar' }];
a as [{ hello: 'world' }];
      `,
    ],
    invalid: [
      {
        code: `
declare const a: [string | number];
a as [string];
        `,
        errors: [
          {
            column: 1,
            data: {
              type: '[string | number]',
            },
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [string, number];
a as [string, string];
        `,
        errors: [
          {
            column: 1,
            data: {
              type: '[string, number]',
            },
            endColumn: 22,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [string];
a as [string, number];
        `,
        errors: [
          {
            column: 1,
            data: {
              type: '[string]',
            },
            endColumn: 22,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [string, number];
a as [string];
        `,
        errors: [
          {
            column: 1,
            data: {
              type: '[string, number]',
            },
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [any];
a as [number];
        `,
        errors: [
          {
            column: 1,
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [number, any];
a as [number, number];
        `,
        errors: [
          {
            column: 1,
            endColumn: 22,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [number];
a as [any];
        `,
        errors: [
          {
            column: 1,
            endColumn: 11,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [unknown];
a as [number];
        `,
        errors: [
          {
            column: 1,
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [number];
a as [never];
        `,
        errors: [
          {
            column: 1,
            endColumn: 13,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [never];
a as [number];
        `,
        errors: [
          {
            column: 1,
            endColumn: 14,
            endLine: 3,
            line: 3,
            messageId: 'unsafeNeverTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: [Promise<string | number>];
a as [Promise<string>];
        `,
        errors: [
          {
            column: 1,
            endColumn: 23,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe.skip('promise assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const a: Promise<string>;
a as Promise<string | number>;
      `,
      `
declare const a: Promise<number>;
a as Promise<unknown>;
      `,
      `
declare const a: Promise<{ hello: 'world'; foo: 'bar' }>;
a as Promise<{ hello: 'world' }>;
      `,
      `
declare const a: Promise<string>;
a as Promise<string> | string;
      `,
    ],
    invalid: [
      {
        code: `
declare const a: Promise<string | number>;
a as Promise<string>;
        `,
        errors: [
          {
            column: 1,
            data: {
              type: 'Promise<string | number>',
            },
            endColumn: 21,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: Promise<any>;
a as Promise<number>;
        `,
        errors: [
          {
            column: 1,
            endColumn: 21,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: Promise<number>;
a as Promise<any>;
        `,
        errors: [
          {
            column: 1,
            endColumn: 18,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: Promise<unknown>;
a as Promise<number>;
        `,
        errors: [
          {
            column: 1,
            endColumn: 21,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: Promise<number>;
a as Promise<never>;
        `,
        errors: [
          {
            column: 1,
            endColumn: 20,
            endLine: 3,
            line: 3,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: Promise<never>;
a as Promise<number>;
        `,
        errors: [
          {
            column: 1,
            endColumn: 21,
            endLine: 3,
            line: 3,
            messageId: 'unsafeNeverTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('union assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
declare const a: 'hello' | 'world';
a as string;
      `,
      `
declare const a: string;
a as string | number;
      `,
    ],
    invalid: [
      {
        code: `
declare const a: 'hello' | any[];
export const foo = a as string[];
        `,
        errors: [
          {
            column: 20,
            endColumn: 33,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
      {
        code: `
declare const a: 'hello'[];
export const foo = a as string | any[];
        `,
        errors: [
          {
            column: 20,
            endColumn: 39,
            endLine: 3,
            line: 3,
            messageId: 'unsafeAnyTypeAssertion',
          },
        ],
      },
    ],
  });
});

describe('class assertions', () => {
  ruleTester.run('no-unsafe-type-assertion', rule, {
    valid: [
      `
class Foo {}
declare const a: Foo;
a as Foo | number;
      `,
      `
class Foo {}
class Bar {}
declare const a: Foo;
a as Bar;
      `,
      `
class Foo {
  hello() {}
}
class Bar {}
declare const a: Foo;
a as Bar;
      `,
      `
class Foo {
  hello() {}
}
class Bar extends Foo {}
declare const a: Bar;
a as Foo;
      `,
      `
class Foo {
  hello() {}
}
class Bar extends Foo {}
declare const a: Foo;
a as Bar;
      `,
    ],
    invalid: [
      {
        code: `
class Foo {
  hello() {}
}
class Bar extends Foo {
  world() {}
}
declare const a: Foo;
a as Bar;
        `,
        errors: [
          {
            column: 1,
            endColumn: 9,
            endLine: 9,
            line: 9,
            messageId: 'unsafeTypeAssertion',
          },
        ],
      },
    ],
  });
});
