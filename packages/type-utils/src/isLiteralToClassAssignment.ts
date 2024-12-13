import type { TSESTree } from '@typescript-eslint/utils';

import * as tsutils from 'ts-api-utils';
import * as ts from 'typescript';

export function isLiteralToClassAssignment(
  type: ts.Type,
  receiver: ts.Type,
  checker: ts.TypeChecker,
  senderNode: TSESTree.Node | null,
): boolean {
  return isLiteralToClassAssignmentWorker(
    type,
    receiver,
    checker,
    senderNode,
    new Map(),
  );
}

function isLiteralToClassAssignmentWorker(
  type: ts.Type,
  receiver: ts.Type,
  checker: ts.TypeChecker,
  senderNode: TSESTree.Node | null,
  visited: Map<ts.Type, Set<ts.Type>>,
): boolean {
  if (isTypeClass(receiver) && isObjectAnonymousType(type)) {
    return checker.isTypeAssignableTo(type, receiver);
  }

  if (tsutils.isUnionType(type)) {
    for (const part of tsutils.unionTypeParts(type)) {
      const unsafe = isLiteralToClassAssignmentWorker(
        part,
        receiver,
        checker,
        senderNode,
        visited,
      );

      if (unsafe) {
        return true;
      }
    }

    return false;
  }

  if (tsutils.isUnionType(receiver)) {
    for (const part of tsutils.unionTypeParts(receiver)) {
      const unsafe = isLiteralToClassAssignmentWorker(
        type,
        part,
        checker,
        senderNode,
        visited,
      );

      if (unsafe) {
        return true;
      }
    }

    return false;
  }

  const typeAlreadyVisited = visited.get(type);

  if (typeAlreadyVisited) {
    if (typeAlreadyVisited.has(receiver)) {
      return false;
    }
    typeAlreadyVisited.add(receiver);
  } else {
    visited.set(type, new Set([receiver]));
  }

  if (tsutils.isTypeReference(type) && tsutils.isTypeReference(receiver)) {
    // TODO - figure out how to handle cases like this,
    // where the types are assignable, but not the same type
    /*
    function foo(): ReadonlySet<number> { return new Set<any>(); }

    // and

    type Test<T> = { prop: T }
    type Test2 = { prop: string }
    declare const a: Test<any>;
    const b: Test2 = a;
    */

    if (type.target !== receiver.target) {
      // if the type references are different, assume safe, as we won't know how to compare the two types
      // the generic positions might not be equivalent for both types
      return false;
    }

    const typeArguments = type.typeArguments ?? [];
    const receiverTypeArguments = receiver.typeArguments ?? [];

    for (let i = 0; i < typeArguments.length; i += 1) {
      const arg = typeArguments[i];
      const receiverArg = receiverTypeArguments[i];

      const unsafe = isLiteralToClassAssignmentWorker(
        arg,
        receiverArg,
        checker,
        senderNode,
        visited,
      );
      if (unsafe) {
        return true;
      }
    }

    return false;
  }

  return false;
}

function isTypeClass(type: ts.Type): boolean {
  return (
    tsutils.isObjectType(type) &&
    tsutils.isObjectFlagSet(type, ts.ObjectFlags.Class)
  );
}

function isObjectAnonymousType(type: ts.Type): boolean {
  return (
    tsutils.isObjectType(type) &&
    tsutils.isObjectFlagSet(type, ts.ObjectFlags.Anonymous)
  );
}
