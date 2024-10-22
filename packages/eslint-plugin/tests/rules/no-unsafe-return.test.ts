import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../../src/rules/no-unsafe-return';
import { getFixturesRootDir } from '../RuleTester';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      project: './tsconfig.noImplicitThis.json',
      projectService: false,
      tsconfigRootDir: getFixturesRootDir(),
    },
  },
});

ruleTester.run('no-unsafe-return', rule, {
  valid: [
    `
function foo() {
  return;
}
    `,
    `
function foo() {
  return 1;
}
    `,
    `
function foo() {
  return '';
}
    `,
    `
function foo() {
  return true;
}
    `,
    // this actually types as `never[]`
    `
function foo() {
  return [];
}
    `,
    // explicit any return type is allowed, if you want to be unsafe like that
    `
function foo(): any {
  return {} as any;
}
    `,
    `
declare function foo(arg: () => any): void;
foo((): any => 'foo' as any);
    `,
    `
declare function foo(arg: null | (() => any)): void;
foo((): any => 'foo' as any);
    `,
    // explicit any array return type is allowed, if you want to be unsafe like that
    `
function foo(): any[] {
  return [] as any[];
}
    `,
    // explicit any generic return type is allowed, if you want to be unsafe like that
    `
function foo(): Set<any> {
  return new Set<any>();
}
    `,
    `
async function foo(): Promise<any> {
  return Promise.resolve({} as any);
}
    `,
    `
async function foo(): Promise<any> {
  return {} as any;
}
    `,
    `
function foo(): object {
  return Promise.resolve({} as any);
}
    `,
    // TODO - this should error, but it's hard to detect, as the type references are different
    `
function foo(): ReadonlySet<number> {
  return new Set<any>();
}
    `,
    `
function foo(): Set<number> {
  return new Set([1]);
}
    `,
    `
      type Foo<T = number> = { prop: T };
      function foo(): Foo {
        return { prop: 1 } as Foo<number>;
      }
    `,
    `
      type Foo = { prop: any };
      function foo(): Foo {
        return { prop: '' } as Foo;
      }
    `,
    // TS 3.9 changed this to be safe
    `
      function fn<T extends any>(x: T) {
        return x;
      }
    `,
    `
      function fn<T extends any>(x: T): unknown {
        return x as any;
      }
    `,
    `
      function fn<T extends any>(x: T): unknown[] {
        return x as any[];
      }
    `,
    `
      function fn<T extends any>(x: T): Set<unknown> {
        return x as Set<any>;
      }
    `,
    `
      async function fn<T extends any>(x: T): Promise<unknown> {
        return x as any;
      }
    `,
    `
      function fn<T extends any>(x: T): Promise<unknown> {
        return Promise.resolve(x as any);
      }
    `,
    // https://github.com/typescript-eslint/typescript-eslint/issues/2109
    `
      function test(): Map<string, string> {
        return new Map();
      }
    `,
    // https://github.com/typescript-eslint/typescript-eslint/issues/3549
    `
      function foo(): any {
        return [] as any[];
      }
    `,
    `
      function foo(): unknown {
        return [] as any[];
      }
    `,
    `
      declare const value: Promise<any>;
      function foo() {
        return value;
      }
    `,
    'const foo: (() => void) | undefined = () => 1;',
  ],
  invalid: [
    {
      code: `
function foo() {
  return 1 as any;
}
      `,
      errors: [
        {
          data: {
            type: '`any`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo() {
  return Object.create(null);
}
      `,
      errors: [
        {
          data: {
            type: '`any`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
const foo = () => {
  return 1 as any;
};
      `,
      errors: [
        {
          data: {
            type: '`any`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: 'const foo = () => Object.create(null);',
      errors: [
        {
          data: {
            type: '`any`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo() {
  return [] as any[];
}
      `,
      errors: [
        {
          data: {
            type: '`any[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo() {
  return [] as Array<any>;
}
      `,
      errors: [
        {
          data: {
            type: '`any[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo() {
  return [] as readonly any[];
}
      `,
      errors: [
        {
          data: {
            type: '`any[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo() {
  return [] as Readonly<any[]>;
}
      `,
      errors: [
        {
          data: {
            type: '`any[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
const foo = () => {
  return [] as any[];
};
      `,
      errors: [
        {
          data: {
            type: '`any[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: 'const foo = () => [] as any[];',
      errors: [
        {
          data: {
            type: '`any[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo(): Set<string> {
  return new Set<any>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<any>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
    },
    {
      code: `
function foo(): Map<string, string> {
  return new Map<string, any>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Map<string, string>',
            sender: 'Map<string, any>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
    },
    {
      code: `
function foo(): Set<string[]> {
  return new Set<any[]>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string[]>',
            sender: 'Set<any[]>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
    },
    {
      code: `
function foo(): Set<Set<Set<string>>> {
  return new Set<Set<Set<any>>>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Set<Set<Set<string>>>',
            sender: 'Set<Set<Set<any>>>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
    },

    {
      code: `
type Fn = () => Set<string>;
const foo1: Fn = () => new Set<any>();
const foo2: Fn = function test() {
  return new Set<any>();
};
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<any>',
          },
          line: 3,
          messageId: 'unsafeReturnAssignment',
        },
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<any>',
          },
          line: 5,
          messageId: 'unsafeReturnAssignment',
        },
      ],
    },
    {
      code: `
type Fn = () => Set<string>;
function receiver(arg: Fn) {}
receiver(() => new Set<any>());
receiver(function test() {
  return new Set<any>();
});
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<any>',
          },
          line: 4,
          messageId: 'unsafeReturnAssignment',
        },
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<any>',
          },
          line: 6,
          messageId: 'unsafeReturnAssignment',
        },
      ],
    },
    {
      code: `
function foo() {
  return this;
}

function bar() {
  return () => this;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`any`',
          },
          endColumn: 15,
          line: 3,
          messageId: 'unsafeReturnThis',
        },
        {
          column: 16,
          data: {
            type: '`any`',
          },
          endColumn: 20,
          line: 7,
          messageId: 'unsafeReturnThis',
        },
      ],
    },
    {
      code: `
declare function foo(arg: null | (() => any)): void;
foo(() => 'foo' as any);
      `,
      errors: [
        {
          column: 11,
          data: {
            type: '`any`',
          },
          endColumn: 23,
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
let value: NotKnown;

function example() {
  return value;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: 'error',
          },
          endColumn: 16,
          line: 5,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
declare const value: any;
async function foo() {
  return value;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`any`',
          },
          line: 4,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
declare const value: Promise<any>;
async function foo(): Promise<number> {
  return value;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 4,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo(arg: number) {
  return arg as Promise<any>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo(): Promise<any> {
  return {} as any;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`any`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
function foo(): Promise<object> {
  return {} as any;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`any`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo(): Promise<object> {
  return Promise.resolve<any>({});
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo(): Promise<object> {
  return Promise.resolve<Promise<Promise<any>>>({} as Promise<any>);
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo(): Promise<object> {
  return {} as Promise<Promise<Promise<Promise<any>>>>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo() {
  return {} as Promise<Promise<Promise<Promise<any>>>>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo() {
  return {} as Promise<any> | Promise<object>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo() {
  return {} as Promise<any | object>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
async function foo() {
  return {} as Promise<any> & { __brand: 'any' };
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
    },
    {
      code: `
interface Alias<T> extends Promise<any> {
  foo: 'bar';
}

declare const value: Alias<number>;
async function foo() {
  return value;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<any>`',
          },
          line: 8,
          messageId: 'unsafeReturn',
        },
      ],
    },
  ],
});

ruleTester.run('no-unsafe-return: allowUnsafeNever: false', rule, {
  valid: [
    // `[]` is inferred as `never[]` without an explicit return type annotation
    {
      code: `
function foo() {
  return [];
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    // explicit `never` return type is allowed, if you want to be unsafe like that
    {
      code: `
function foo(): never {
  return {} as never;
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
declare function foo(arg: () => never): void;
foo((): never => 'foo' as never);
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
declare function foo(arg: null | (() => never)): void;
foo((): never => 'foo' as never);
      `,
      options: [{ allowUnsafeNever: false }],
    },
    // explicit `never` array return type is allowed, if you want to be unsafe like that
    {
      code: `
function foo(): never[] {
  return [] as never[];
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    // explicit `never` generic return type is allowed, if you want to be unsafe like that
    {
      code: `
function foo(): Set<never> {
  return new Set<never>();
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo(): Promise<never> {
  return Promise.resolve({} as never);
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo(): Promise<never> {
  return {} as never;
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): object {
  return Promise.resolve({} as never);
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
type Foo = { prop: never };
function foo(): Foo {
  return { prop: '' } as Foo;
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function fn<T extends never>(x: T): unknown {
  return x as never;
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function fn<T extends never>(x: T): unknown[] {
  return x as never[];
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function fn<T extends never>(x: T): Set<unknown> {
  return x as Set<never>;
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function fn<T extends never>(x: T): Promise<unknown> {
  return x as never;
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function fn<T extends never>(x: T): Promise<unknown> {
  return Promise.resolve(x as never);
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): unknown {
  return [] as never[];
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
declare const value: Promise<never>;
function foo() {
  return value;
}
      `,
      options: [{ allowUnsafeNever: false }],
    },
  ],
  invalid: [
    {
      code: `
function foo() {
  return 1 as never;
}
      `,
      errors: [
        {
          data: {
            type: '`never`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
const foo = () => {
  return 1 as never;
};
      `,
      errors: [
        {
          data: {
            type: '`never`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo() {
  return [] as never[];
}
      `,
      errors: [
        {
          data: {
            type: '`never[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo() {
  return [] as Array<never>;
}
      `,
      errors: [
        {
          data: {
            type: '`never[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo() {
  return [] as readonly never[];
}
      `,
      errors: [
        {
          data: {
            type: '`never[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo() {
  return [] as Readonly<never[]>;
}
      `,
      errors: [
        {
          data: {
            type: '`never[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
const foo = () => {
  return [] as never[];
};
      `,
      errors: [
        {
          data: {
            type: '`never[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: 'const foo = () => [] as never[];',
      errors: [
        {
          data: {
            type: '`never[]`',
          },
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): Set<string> {
  return new Set<never>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<never>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): Map<string, string> {
  return new Map<string, never>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Map<string, string>',
            sender: 'Map<string, never>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): Set<string[]> {
  return new Set<never[]>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string[]>',
            sender: 'Set<never[]>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): Set<Set<Set<string>>> {
  return new Set<Set<Set<never>>>();
}
      `,
      errors: [
        {
          data: {
            receiver: 'Set<Set<Set<string>>>',
            sender: 'Set<Set<Set<never>>>',
          },
          messageId: 'unsafeReturnAssignment',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },

    {
      code: `
type Fn = () => Set<string>;
const foo1: Fn = () => new Set<never>();
const foo2: Fn = function test() {
  return new Set<never>();
};
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<never>',
          },
          line: 3,
          messageId: 'unsafeReturnAssignment',
        },
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<never>',
          },
          line: 5,
          messageId: 'unsafeReturnAssignment',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
type Fn = () => Set<string>;
function receiver(arg: Fn) {}
receiver(() => new Set<never>());
receiver(function test() {
  return new Set<never>();
});
      `,
      errors: [
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<never>',
          },
          line: 4,
          messageId: 'unsafeReturnAssignment',
        },
        {
          data: {
            receiver: 'Set<string>',
            sender: 'Set<never>',
          },
          line: 6,
          messageId: 'unsafeReturnAssignment',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
declare function foo(arg: null | (() => never)): void;
foo(() => 'foo' as never);
      `,
      errors: [
        {
          column: 11,
          data: {
            type: '`never`',
          },
          endColumn: 25,
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
declare const value: never;
async function foo() {
  return value;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`never`',
          },
          line: 4,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
declare const value: Promise<never>;
async function foo(): Promise<number> {
  return value;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 4,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo(arg: number) {
  return arg as Promise<never>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): Promise<never> {
  return {} as never;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`never`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
function foo(): Promise<object> {
  return {} as never;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`never`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo(): Promise<object> {
  return Promise.resolve<never>({});
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo(): Promise<object> {
  return Promise.resolve<Promise<Promise<never>>>({} as Promise<never>);
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo(): Promise<object> {
  return {} as Promise<Promise<Promise<Promise<never>>>>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo() {
  return {} as Promise<Promise<Promise<Promise<never>>>>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
async function foo() {
  return {} as Promise<never> | Promise<object>;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 3,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
    {
      code: `
interface Alias<T> extends Promise<never> {
  foo: 'bar';
}

declare const value: Alias<number>;
async function foo() {
  return value;
}
      `,
      errors: [
        {
          column: 3,
          data: {
            type: '`Promise<never>`',
          },
          line: 8,
          messageId: 'unsafeReturn',
        },
      ],
      options: [{ allowUnsafeNever: false }],
    },
  ],
});
