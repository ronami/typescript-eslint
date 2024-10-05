import * as tsutils from 'ts-api-utils';
import type * as ts from 'typescript';

export function hasPrimitiveRepresentation(
  checker: ts.TypeChecker,
  type: ts.Type,
): boolean {
  return (
    tsutils.getWellKnownSymbolPropertyOfType(type, 'toPrimitive', checker) !=
    null
  );
}
