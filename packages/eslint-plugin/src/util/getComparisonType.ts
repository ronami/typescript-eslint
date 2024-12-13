import type { TSESTree } from '@typescript-eslint/utils';

export const enum ComparisonType {
  /** Do no assignment comparison */
  None,
  /** Use the receiver's type for comparison */
  Basic,
  /** Use the sender's contextual type for comparison */
  Contextual,
}

export function getComparisonType(
  typeAnnotation: TSESTree.TSTypeAnnotation | undefined,
): ComparisonType {
  return typeAnnotation
    ? // if there's a type annotation, we can do a comparison
      ComparisonType.Basic
    : // no type annotation means the variable's type will just be inferred, thus equal
      ComparisonType.None;
}
