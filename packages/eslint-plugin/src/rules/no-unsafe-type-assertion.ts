import type { TSESTree } from '@typescript-eslint/utils';

import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as tsutils from 'ts-api-utils';
import * as ts from 'typescript';

import {
  createRule,
  getConstrainedTypeAtLocation,
  getParserServices,
  isReferenceToGlobalFunction,
  isTypeAnyType,
  isTypeFlagSet,
  isTypeNeverType,
  isTypeUnknownType,
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
      unsafeAnyTypeAssertion:
        "Unsafe type assertion: an 'any' type is wider than any other type.",
      unsafeFunctionTypeAssertion:
        "Unsafe type assertion: a 'never' type is more narrow than any other type.",
      unsafeNeverTypeAssertion:
        "Unsafe type assertion: the 'Function' type is wider than many other types.",
      unsafeTypeAssertion:
        "Unsafe type assertion: type '{{type}}' is more narrow than the original type.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = getParserServices(context);
    const checker = services.program.getTypeChecker();
    const compilerOptions = services.program.getCompilerOptions();

    function isTypeUnchanged(uncast: ts.Type, cast: ts.Type): boolean {
      if (uncast === cast) {
        return true;
      }

      if (
        isTypeFlagSet(uncast, ts.TypeFlags.Undefined) &&
        isTypeFlagSet(cast, ts.TypeFlags.Undefined) &&
        tsutils.isCompilerOptionEnabled(
          compilerOptions,
          'exactOptionalPropertyTypes',
        )
      ) {
        const uncastParts = tsutils
          .unionTypeParts(uncast)
          .filter(part => !isTypeFlagSet(part, ts.TypeFlags.Undefined));

        const castParts = tsutils
          .unionTypeParts(cast)
          .filter(part => !isTypeFlagSet(part, ts.TypeFlags.Undefined));

        if (uncastParts.length !== castParts.length) {
          return false;
        }

        const uncastPartsSet = new Set(uncastParts);
        return castParts.every(part => uncastPartsSet.has(part));
      }

      return false;
    }

    function compareTypes(
      node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
      type: ts.Type,
      assertedType: ts.Type,
    ): boolean {
      if (isTypeUnchanged(type, assertedType)) {
        return false;
      }

      if (isTypeUnknownType(assertedType)) {
        return false;
      }

      if (tsutils.isUnionType(type)) {
        return tsutils.unionTypeParts(type).some(typePart => {
          return compareTypes(node, typePart, assertedType);
        });
      }

      if (tsutils.isUnionType(assertedType)) {
        return tsutils.unionTypeParts(assertedType).some(assertedTypePart => {
          return compareTypes(node, type, assertedTypePart);
        });
      }

      if (checker.isArrayType(type) && checker.isArrayType(assertedType)) {
        return compareTypes(
          node,
          checker.getTypeArguments(type)[0],
          checker.getTypeArguments(assertedType)[0],
        );
      }

      if (tsutils.isObjectType(type) && tsutils.isObjectType(assertedType)) {
        // const typeProperties = type.getProperties();
        const assertedTypeProperties = assertedType.getProperties();

        for (const assertedSymbol of assertedTypeProperties) {
          const symbol = type.getProperty(assertedSymbol.name);

          if (!symbol) {
            return false;
          }

          const typeProperty = checker.getTypeOfSymbol(symbol);
          const assertedTypeProperty = checker.getTypeOfSymbol(assertedSymbol);

          const incompatible = compareTypes(
            node,
            typeProperty,
            assertedTypeProperty,
          );

          if (incompatible) {
            return true;
          }
        }
      }

      if (checker.isTupleType(type) && checker.isTupleType(assertedType)) {
        const typeArguments = checker.getTypeArguments(type);
        const assertedTypeArguments = checker.getTypeArguments(assertedType);

        if (typeArguments.length !== assertedTypeArguments.length) {
          return false;
        }

        for (const [index, type] of typeArguments.entries()) {
          const assertedType = assertedTypeArguments[index];

          const incompatible = compareTypes(node, type, assertedType);

          if (incompatible) {
            return true;
          }
        }
      }

      const tsNode = services.esTreeNodeToTSNodeMap.get(node.expression);
      const tsAssertedNode = services.esTreeNodeToTSNodeMap.get(
        node.typeAnnotation,
      );

      if (
        tsutils.isThenableType(checker, tsNode, type) &&
        tsutils.isTypeReference(type) &&
        tsutils.isThenableType(checker, tsAssertedNode, assertedType) &&
        tsutils.isTypeReference(assertedType)
      ) {
        return compareTypes(
          node,
          checker.getTypeArguments(type)[0],
          checker.getTypeArguments(assertedType)[0],
        );
      }

      if (
        node.typeAnnotation.type === AST_NODE_TYPES.TSTypeReference &&
        node.typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier &&
        node.typeAnnotation.typeName.name === 'Function' &&
        isReferenceToGlobalFunction(
          'Function',
          node.typeAnnotation.typeName,
          context.sourceCode,
        )
      ) {
        context.report({
          node,
          messageId: 'unsafeFunctionTypeAssertion',
        });
        return true;
      }

      if (isTypeAnyType(type)) {
        context.report({
          node,
          messageId: 'unsafeAnyTypeAssertion',
        });
        return true;
      }

      if (isTypeNeverType(type)) {
        context.report({
          node,
          messageId: 'unsafeNeverTypeAssertion',
        });
        return true;
      }

      if (isTypeAnyType(assertedType)) {
        context.report({
          node,
          messageId: 'unsafeAnyTypeAssertion',
        });
        return true;
      }

      return false;
    }

    function checkExpression(
      node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
    ): void {
      const nodeType = getConstrainedTypeAtLocation(services, node.expression);

      const assertedType = getConstrainedTypeAtLocation(
        services,
        node.typeAnnotation,
      );

      const incompatible = compareTypes(node, nodeType, assertedType);

      if (!incompatible) {
        const nodeWidenedType = checker.getWidenedType(nodeType);

        const isAssertionSafe = checker.isTypeAssignableTo(
          nodeWidenedType,
          assertedType,
        );

        if (!isAssertionSafe) {
          return context.report({
            node,
            messageId: 'unsafeTypeAssertion',
            data: {
              type: checker.typeToString(nodeType),
            },
          });
        }
      }
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
