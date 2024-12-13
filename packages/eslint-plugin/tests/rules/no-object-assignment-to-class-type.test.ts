import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../../src/rules/no-object-assignment-to-class-type';
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

ruleTester.run('no-object-assignment-to-class-type', rule, {
  valid: [
    `
function foo() {
  return;
}
    `,
    `
function foo() {
  return { x: -1, y: -2 };
}
    `,
    `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Point {
  return { x: -1, y: -2 } as Point;
}
    `,
    `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Point | { a: number; b: number } {
  return { a: -1, b: -2 };
}
    `,
    `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Point | { a: number; b: number } {
  return new Point(1, 2);
}
    `,
    `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Point[] {
  return [new Point(1, 2)];
}
    `,
  ],
  invalid: [
    {
      code: `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Point {
  return { x: -1, y: -2 };
}
      `,
      errors: [
        {
          column: 3,
          data: { type: 'Point' },
          line: 10,
          messageId: 'objectToClassAssignment',
        },
      ],
    },
    {
      code: `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Point | boolean {
  return { x: -1, y: -2 };
}
      `,
      errors: [
        {
          column: 3,
          data: { type: 'Point' },
          line: 10,
          messageId: 'objectToClassAssignment',
        },
      ],
    },
    {
      code: `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

async function foo(): Promise<Point> {
  return { x: -1, y: -2 };
}
      `,
      errors: [
        {
          column: 3,
          data: { type: 'Point' },
          line: 10,
          messageId: 'objectToClassAssignment',
        },
      ],
    },
    {
      code: `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Promise<Point> {
  return Promise.resolve({ x: -1, y: -2 });
}
      `,
      errors: [
        {
          column: 3,
          data: { type: 'Point' },
          line: 10,
          messageId: 'objectToClassAssignment',
        },
      ],
    },
    {
      code: `
class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

function foo(): Point[] {
  return [{ x: -1, y: -2 }];
}
      `,
      errors: [
        {
          column: 3,
          data: { type: 'Point' },
          line: 10,
          messageId: 'objectToClassAssignment',
        },
      ],
    },
  ],
});
