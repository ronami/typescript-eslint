import type { TSESTree } from '@typescript-eslint/utils';

// import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as tsutils from 'ts-api-utils';
import * as ts from 'typescript';

import {
  createRule,
  getConstrainedTypeAtLocation,
  getParserServices,
  // isPromiseLike,
  // isReferenceToGlobalFunction,
  isTypeAnyType,
  // isTypeFlagSet,
  // isTypeNeverType,
  isTypeUnknownType,
  isUnsafeAssignment,
} from '../util';

export default createRule({
  name: 'no-unsafe-type-assertion',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow type assertions that widen a type',
      requiresTypeChecking: true,
    },
    messages: {
      unsafeOfAnyTypeAssertion:
        "Unsafe cast from 'any' detected: consider using type guards or a safer cast.",
      unsafeToAnyTypeAssertion:
        "Unsafe cast to 'any' detected: consider using a more specific type to ensure safety.",
      unsafeTypeAssertion:
        "Unsafe type assertion: type '{{type}}' is more narrow than the original type.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = getParserServices(context);
    const checker = services.program.getTypeChecker();
    // const compilerOptions = services.program.getCompilerOptions();

    function checkExpression(
      node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
    ): boolean {
      const expressionType = getConstrainedTypeAtLocation(
        services,
        node.expression,
      );
      const assertedType = getConstrainedTypeAtLocation(
        services,
        node.typeAnnotation,
      );

      const nodeWidenedType =
        tsutils.isObjectType(expressionType) &&
        tsutils.isObjectFlagSet(expressionType, ts.ObjectFlags.ObjectLiteral)
          ? checker.getWidenedType(expressionType)
          : expressionType;

      if (isTypeAnyType(expressionType)) {
        if (isTypeAnyType(assertedType)) {
          return false;
        }

        // handle cases when we assign any ==> unknown.
        if (isTypeUnknownType(assertedType)) {
          return false;
        }

        context.report({
          node,
          messageId: 'unsafeOfAnyTypeAssertion',
        });

        return true;
      }

      const assertedAny = isUnsafeAssignment(
        expressionType,
        assertedType,
        checker,
        node.expression,
      );

      if (assertedAny) {
        context.report({
          node,
          messageId: 'unsafeOfAnyTypeAssertion',
        });

        return true;
      }

      const expressionAny = isUnsafeAssignment(
        assertedType,
        expressionType,
        checker,
        node.typeAnnotation,
      );

      if (expressionAny) {
        context.report({
          node,
          messageId: 'unsafeToAnyTypeAssertion',
        });

        return true;
      }

      const isAssertionSafe = checker.isTypeAssignableTo(
        nodeWidenedType,
        assertedType,
      );

      if (!isAssertionSafe) {
        context.report({
          node,
          messageId: 'unsafeTypeAssertion',
          data: {
            type: checker.typeToString(expressionType),
          },
        });

        return true;
      }

      return false;
    }

    return {
      'TSAsExpression, TSTypeAssertion'(
        node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
      ): void {
        checkExpression(node);
      },
    };
  },
});
