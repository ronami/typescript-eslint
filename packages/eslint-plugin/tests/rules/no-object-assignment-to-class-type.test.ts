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
  ],
});
