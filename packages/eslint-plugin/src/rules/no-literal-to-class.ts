import type { TSESTree } from '@typescript-eslint/utils';

import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as tsutils from 'ts-api-utils';
import * as ts from 'typescript';

import {
  createRule,
  getConstrainedTypeAtLocation,
  getContextualType,
  getParserServices,
  isTypeAnyType,
  FunctionSignature,
  nullThrows,
  isLiteralToClassAssignment,
  NullThrowsReasons,
} from '../util';
import { getParentFunctionNode } from '../util/getParentFunctionNode';

const enum ComparisonType {
  /** Do no assignment comparison */
  None,
  /** Use the receiver's type for comparison */
  Basic,
  /** Use the sender's contextual type for comparison */
  Contextual,
}

export default createRule({
  name: 'no-literal-to-class',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow object literals from being assigned to class types',
      requiresTypeChecking: true,
    },
    fixable: 'code',
    messages: {
      noLiteralToClass:
        'Object literal assignment to class type is not allowed. Use the class constructor instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = getParserServices(context);
    const checker = services.program.getTypeChecker();

    function checkNode(
      node: TSESTree.Node,
      expectedType: ts.Type,
      actualType: ts.Type,
    ): void {
      if (isLiteralToClassAssignment(actualType, expectedType, checker, node)) {
        context.report({
          node,
          messageId: 'noLiteralToClass',
        });
      }
    }

    function checkAssignment(
      receiverNode: TSESTree.Node,
      senderNode: TSESTree.Expression,
      reportingNode: TSESTree.Node,
      comparisonType: ComparisonType,
    ) {
      const receiverTsNode = services.esTreeNodeToTSNodeMap.get(receiverNode);

      const receiverType =
        comparisonType === ComparisonType.Contextual
          ? getContextualType(checker, receiverTsNode as ts.Expression) ??
            services.getTypeAtLocation(receiverNode)
          : services.getTypeAtLocation(receiverNode);

      const senderType = services.getTypeAtLocation(senderNode);

      checkNode(reportingNode, receiverType, senderType);
    }

    function checkUnsafeArguments(
      args: TSESTree.CallExpressionArgument[] | TSESTree.Expression[],
      callee: TSESTree.Expression,
      node:
        | TSESTree.CallExpression
        | TSESTree.NewExpression
        | TSESTree.TaggedTemplateExpression,
    ): void {
      if (args.length === 0) {
        return;
      }

      // ignore any-typed calls as these are caught by no-unsafe-call
      if (isTypeAnyType(services.getTypeAtLocation(callee))) {
        return;
      }

      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      const signature = nullThrows(
        FunctionSignature.create(checker, tsNode),
        'Expected to a signature resolved',
      );

      if (node.type === AST_NODE_TYPES.TaggedTemplateExpression) {
        // Consumes the first parameter (TemplateStringsArray) of the function called with TaggedTemplateExpression.
        signature.getNextParameterType();
      }

      for (const argument of args) {
        switch (argument.type) {
          // spreads consume
          case AST_NODE_TYPES.SpreadElement: {
            break;
          }

          default: {
            const parameterType = signature.getNextParameterType();

            if (parameterType == null) {
              continue;
            }

            const argumentType = services.getTypeAtLocation(argument);

            checkNode(argument, parameterType, argumentType);
          }
        }
      }
    }

    function checkReturn(
      returnNode: TSESTree.Node,
      reportingNode: TSESTree.Node = returnNode,
    ): void {
      const functionNode = getParentFunctionNode(returnNode);
      /* istanbul ignore if */ if (!functionNode) {
        return;
      }

      // function has an explicit return type, so ensure it's a safe return
      const returnNodeType = getConstrainedTypeAtLocation(services, returnNode);
      const functionTSNode = services.esTreeNodeToTSNodeMap.get(functionNode);

      // function expressions will not have their return type modified based on receiver typing
      // so we have to use the contextual typing in these cases, i.e.
      // const foo1: () => Set<string> = () => new Set<any>();
      // the return type of the arrow function is Set<any> even though the variable is typed as Set<string>
      let functionType =
        ts.isFunctionExpression(functionTSNode) ||
        ts.isArrowFunction(functionTSNode)
          ? getContextualType(checker, functionTSNode)
          : services.getTypeAtLocation(functionNode);

      if (!functionType) {
        functionType = services.getTypeAtLocation(functionNode);
      }

      const callSignatures = tsutils.getCallSignaturesOfType(functionType);

      for (const signature of callSignatures) {
        let functionReturnType = signature.getReturnType();

        if (functionNode.async) {
          functionReturnType =
            checker.getAwaitedType(functionReturnType) ?? functionReturnType;
        }

        checkNode(reportingNode, functionReturnType, returnNodeType);
      }
    }

    return {
      'AssignmentExpression[operator = "="], AssignmentPattern'(
        node: TSESTree.AssignmentExpression | TSESTree.AssignmentPattern,
      ): void {
        checkAssignment(
          node.left,
          node.right,
          node,
          // the variable already has some form of a type to compare against
          ComparisonType.Basic,
        );
      },
      'CallExpression, NewExpression'(
        node: TSESTree.CallExpression | TSESTree.NewExpression,
      ): void {
        checkUnsafeArguments(node.arguments, node.callee, node);
      },
      // object pattern props are checked via assignments
      ':not(ObjectPattern) > Property'(node: TSESTree.Property): void {
        if (
          node.value.type === AST_NODE_TYPES.AssignmentPattern ||
          node.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression
        ) {
          // handled by other selector
          return;
        }

        checkAssignment(node.key, node.value, node, ComparisonType.Contextual);
      },
      'ArrowFunctionExpression > :not(BlockStatement).body': checkReturn,
      ReturnStatement(node): void {
        const argument = node.argument;
        if (!argument) {
          return;
        }

        checkReturn(argument, node);
      },
      'VariableDeclarator[init != null]'(
        node: TSESTree.VariableDeclarator,
      ): void {
        const init = nullThrows(
          node.init,
          NullThrowsReasons.MissingToken(node.type, 'init'),
        );

        checkAssignment(
          node.id,
          init,
          node,
          getComparisonType(node.id.typeAnnotation),
        );
      },
    };
  },
});

function getComparisonType(
  typeAnnotation: TSESTree.TSTypeAnnotation | undefined,
): ComparisonType {
  return typeAnnotation
    ? // if there's a type annotation, we can do a comparison
      ComparisonType.Basic
    : // no type annotation means the variable's type will just be inferred, thus equal
      ComparisonType.None;
}
