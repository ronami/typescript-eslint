import type {
  InvalidTestCase,
  ValidTestCase,
} from '@typescript-eslint/rule-tester';

import { RuleTester } from '@typescript-eslint/rule-tester';

import type { MessageIds, Options } from '../../src/rules/no-unsafe-argument';

import rule from '../../src/rules/no-unsafe-argument';
import { getFixturesRootDir } from '../RuleTester';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: getFixturesRootDir(),
    },
  },
});

const commonValidCases = (
  type: string,
  options: Options,
): ValidTestCase<Options>[] => {
  return [
    // unknown function should be ignored
    {
      code: `
doesNotExist(1 as ${type});
      `,
      options,
    },
    // non-function call should be ignored
    {
      code: `
const foo = 1;
foo(1 as ${type});
      `,
      options,
    },
    // too many arguments should be ignored as this is a TS error
    {
      code: `
declare function foo(arg: number): void;
foo(1, 1 as ${type}, 2 as ${type});
      `,
      options,
    },
    {
      code: `
declare function foo(arg: number, arg2: string): void;
foo(1, 'a');
      `,
      options,
    },
    {
      code: `
declare function foo(arg: ${type}): void;
foo(1 as ${type});
      `,
      options,
    },
    {
      code: `
declare function foo(arg: unknown): void;
foo(1 as ${type});
      `,
      options,
    },
    {
      code: `
declare function foo(...arg: number[]): void;
foo(1, 2, 3);
      `,
      options,
    },
    {
      code: `
declare function foo(...arg: ${type}[]): void;
foo(1, 2, 3, 4 as ${type});
      `,
      options,
    },
    {
      code: `
declare function foo(arg: number, arg2: number): void;
const x = [1, 2] as const;
foo(...x);
      `,
      options,
    },
    {
      code: `
declare function foo(arg: ${type}, arg2: number): void;
const x = [1 as ${type}, 2] as const;
foo(...x);
      `,
      options,
    },
    {
      code: `
declare function foo(arg1: string, arg2: string): void;
const x: string[] = [];
foo(...x);
      `,
      options,
    },
    {
      code: `
function foo(arg1: number, arg2: number) {}
foo(...([1, 1, 1] as [number, number, number]));
      `,
      options,
    },
    {
      code: `
declare function foo(arg1: Set<string>, arg2: Map<string, string>): void;

const x = [new Map<string, string>()] as const;
foo(new Set<string>(), ...x);
      `,
      options,
    },
    {
      code: `
declare function foo(arg1: unknown, arg2: Set<unknown>, arg3: unknown[]): void;
foo(1 as ${type}, new Set<${type}>(), [] as ${type}[]);
      `,
      options,
    },
    {
      code: `
declare function foo(...params: [number, string, ${type}]): void;
foo(1, 'a', 1 as ${type});
      `,
      options,
    },
    // Unfortunately - we cannot handle this case because TS infers `params` to be a tuple type
    // that tuple type is the same as the type of
    {
      code: `
declare function foo<E extends string[]>(...params: E): void;

foo('a', 'b', 1 as ${type});
      `,
      options,
    },
    {
      code: `
declare function toHaveBeenCalledWith<E extends ${type}[]>(...params: E): void;
toHaveBeenCalledWith(1 as ${type});
      `,
      options,
    },
    // https://github.com/typescript-eslint/typescript-eslint/issues/2109
    {
      code: `
declare function acceptsMap(arg: Map<string, string>): void;
acceptsMap(new Map());
      `,
      options,
    },
    {
      code: `
type T = [number, T[]];
declare function foo(t: T): void;
declare const t: T;

foo(t);
      `,
      options,
    },
    {
      code: `
type T = Array<T>;
declare function foo<T>(t: T): T;
const t: T = [];
foo(t);
      `,
      options,
    },
    {
      code: `
function foo(templates: TemplateStringsArray) {}
foo\`\`;
      `,
      options,
    },
    {
      code: `
function foo(templates: TemplateStringsArray, arg: ${type}) {}
foo\`\${1 as ${type}}\`;
      `,
      options,
    },
  ];
};

const commonInvalidCases = (
  type: string,
  options: Options,
): InvalidTestCase<MessageIds, Options>[] => {
  const length = type.length;

  return [
    {
      code: `
declare function foo(arg: number): void;
foo(1 as ${type});
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`number`',
            sender: `\`${type}\``,
          },
          endColumn: 10 + length,
          line: 3,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg1: number, arg2: string): void;
foo(1, 1 as ${type});
      `,
      errors: [
        {
          column: 8,
          data: {
            receiver: '`string`',
            sender: `\`${type}\``,
          },
          endColumn: 13 + length,
          line: 3,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(...arg: number[]): void;
foo(1, 2, 3, 1 as ${type});
      `,
      errors: [
        {
          column: 14,
          data: {
            receiver: '`number`',
            sender: `\`${type}\``,
          },
          endColumn: 19 + length,
          line: 3,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg: string, ...arg: number[]): void;
foo(1 as ${type}, 1 as ${type});
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`string`',
            sender: `\`${type}\``,
          },
          endColumn: 10 + length,
          line: 3,
          messageId: 'unsafeArgument',
        },
        {
          column: 12 + length,
          data: {
            receiver: '`number`',
            sender: `\`${type}\``,
          },
          endColumn: 17 + (length * 2),
          line: 3,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

foo(...(x as ${type}[]));
      `,
      errors: [
        {
          column: 5,
          data: { sender: `\`${type}[]\`` },
          endColumn: 17 + length,
          line: 4,
          messageId: 'unsafeArraySpread',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

const x = ['a', 1 as ${type}] as const;
foo(...x);
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`number`',
            sender: `of type \`${type}\``,
          },
          endColumn: 9,
          line: 5,
          messageId: 'unsafeTupleSpread',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;
foo(...(['foo', 1, 2] as [string, ${type}, number]));
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`number`',
            sender: `of type \`${type}\``,
          },
          endColumn: 45 + length,
          line: 3,
          messageId: 'unsafeTupleSpread',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg1: string, arg2: number, arg2: string): void;

const x = [1] as const;
foo('a', ...x, 1 as ${type});
      `,
      errors: [
        {
          column: 16,
          data: {
            receiver: '`string`',
            sender: `\`${type}\``,
          },
          endColumn: 21 + length,
          line: 5,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg1: string, arg2: number, ...rest: string[]): void;

const x = [1, 2] as [number, ...number[]];
foo('a', ...x, 1 as ${type});
      `,
      errors: [
        {
          column: 16,
          data: {
            receiver: '`string`',
            sender: `\`${type}\``,
          },
          endColumn: 21 + length,
          line: 5,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(arg1: Set<string>, arg2: Map<string, string>): void;

const x = [new Map<${type}, string>()] as const;
foo(new Set<${type}>(), ...x);
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`Set<string>`',
            sender: `\`Set<${type}>\``,
          },
          endColumn: 16 + length,
          line: 5,
          messageId: 'unsafeArgument',
        },
        {
          column: 18 + length,
          data: {
            receiver: '`Map<string, string>`',
            sender: `of type \`Map<${type}, string>\``,
          },
          endColumn: 22 + length,
          line: 5,
          messageId: 'unsafeTupleSpread',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(...params: [number, string, ${type}]): void;
foo(1 as ${type}, 'a' as ${type}, 1 as ${type});
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`number`',
            sender: `\`${type}\``,
          },
          endColumn: 10 + length,
          line: 3,
          messageId: 'unsafeArgument',
        },
        {
          column: 12 + length,
          data: {
            receiver: '`string`',
            sender: `\`${type}\``,
          },
          endColumn: 19 + (length * 2),
          line: 3,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
declare function foo(param1: string, ...params: [number, string, ${type}]): void;
foo('a', 1 as ${type}, 'a' as ${type}, 1 as ${type});
      `,
      errors: [
        {
          column: 10,
          data: {
            receiver: '`number`',
            sender: `\`${type}\``,
          },
          endColumn: 15 + length,
          line: 3,
          messageId: 'unsafeArgument',
        },
        {
          column: 17 + length,
          data: {
            receiver: '`string`',
            sender: `\`${type}\``,
          },
          endColumn: 24 + (length * 2),
          line: 3,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
type T = [number, T[]];
declare function foo(t: T): void;
declare const t: T;
foo(t as ${type});
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`T`',
            sender: `\`${type}\``,
          },
          endColumn: 10 + length,
          line: 5,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
function foo(
  templates: TemplateStringsArray,
  arg1: number,
  arg2: ${type},
  arg3: string,
) {}
declare const arg: ${type};
foo<number>\`\${arg}\${arg}\${arg}\`;
      `,
      errors: [
        {
          column: 15,
          data: {
            receiver: '`number`',
            sender: `\`${type}\``,
          },
          endColumn: 18,
          line: 9,
          messageId: 'unsafeArgument',
        },
        {
          column: 27,
          data: {
            receiver: '`string`',
            sender: `\`${type}\``,
          },
          endColumn: 30,
          line: 9,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
function foo(templates: TemplateStringsArray, arg: number) {}
declare const arg: ${type};
foo\`\${arg}\`;
      `,
      errors: [
        {
          column: 7,
          data: {
            receiver: '`number`',
            sender: `\`${type}\``,
          },
          endColumn: 10,
          line: 4,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
    {
      code: `
type T = [number, T[]];
function foo(templates: TemplateStringsArray, arg: T) {}
declare const arg: ${type};
foo\`\${arg}\`;
      `,
      errors: [
        {
          column: 7,
          data: {
            receiver: '`T`',
            sender: `\`${type}\``,
          },
          endColumn: 10,
          line: 5,
          messageId: 'unsafeArgument',
        },
      ],
      options,
    },
  ];
};

const allowUnsafeNeverTrueOptions: Options = [{ allowUnsafeNever: true }];

ruleTester.run('allowUnsafeNever: true', rule, {
  valid: [...commonValidCases('any', allowUnsafeNeverTrueOptions)],
  invalid: [
    ...commonInvalidCases('any', allowUnsafeNeverTrueOptions),
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

foo(...(x as any));
      `,
      errors: [
        {
          column: 5,
          endColumn: 18,
          line: 4,
          messageId: 'unsafeSpread',
        },
      ],
      options: allowUnsafeNeverTrueOptions,
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

declare const errors: error[];

foo(...errors);
      `,
      errors: [
        {
          column: 5,
          data: { sender: 'error' },
          endColumn: 14,
          line: 6,
          messageId: 'unsafeArraySpread',
        },
      ],
      options: allowUnsafeNeverTrueOptions,
    },
    {
      code: `
declare function foo(arg1: string, arg2: number): void;

const x = ['a', error] as const;
foo(...x);
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`number`',
            sender: 'error typed',
          },
          endColumn: 9,
          line: 5,
          messageId: 'unsafeTupleSpread',
        },
      ],
      options: allowUnsafeNeverTrueOptions,
    },
    {
      code: `
declare function foo(arg: number): void;
foo(error);
      `,
      errors: [
        {
          column: 5,
          data: {
            receiver: '`number`',
            sender: 'error typed',
          },
          endColumn: 10,
          line: 3,
          messageId: 'unsafeArgument',
        },
      ],
      options: allowUnsafeNeverTrueOptions,
    },
  ],
});

const allowUnsafeNeverFalseOptions: Options = [{ allowUnsafeNever: false }];

ruleTester.run('allowUnsafeNever: false', rule, {
  valid: [
    ...commonValidCases('never', allowUnsafeNeverFalseOptions),
    {
      code: `
declare const bar: (x: string[]) => void;

bar([]);
      `,
      options: allowUnsafeNeverFalseOptions,
    },
  ],
  invalid: [
    ...commonInvalidCases('never', allowUnsafeNeverFalseOptions),
    {
      code: `
declare const bar: <T>(x: T[]) => void;

bar([]);
      `,
      errors: [{ messageId: 'unsafeArgument' }],
      options: allowUnsafeNeverFalseOptions,
    },
    {
      code: `
declare const bar: <T>(...x: T[]) => void;

bar([]);
      `,
      errors: [{ messageId: 'unsafeArgument' }],
      options: allowUnsafeNeverFalseOptions,
    },
  ],
});
