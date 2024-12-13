import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';
import type * as ts from 'typescript';

import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as tsutils from 'ts-api-utils';

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
import { ComparisonType, getComparisonType } from '../util/getComparisonType';
import { getContextualFunctionType } from '../util/getContextualFunctionType';
import { getParentFunctionNode } from '../util/getParentFunctionNode';

export default createRule({
  name: 'no-object-assignment-to-class-type',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow object literals from being assigned to class types',
      requiresTypeChecking: true,
    },
    fixable: 'code',
    messages: {
      objectToClassAssignment:
        "Assignment to class type '{{type}}' must be instantiated using the class constructor.",
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
      const unsafe = isLiteralToClassAssignment(
        actualType,
        expectedType,
        checker,
        node,
      );

      if (unsafe) {
        context.report({
          node,
          messageId: 'objectToClassAssignment',
          data: {
            type: checker.typeToString(unsafe.receiver),
          },
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

      const returnNodeType = getConstrainedTypeAtLocation(services, returnNode);
      const functionType = getContextualFunctionType(services, functionNode);

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

    const assignmentChecks: RuleListener = {
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
    };

    const returnChecks: RuleListener = {
      'ArrowFunctionExpression > :not(BlockStatement).body': checkReturn,
      ReturnStatement(node): void {
        const argument = node.argument;
        if (!argument) {
          return;
        }

        checkReturn(argument, node);
      },
    };

    const argumentChecks: RuleListener = {
      'CallExpression, NewExpression'(
        node: TSESTree.CallExpression | TSESTree.NewExpression,
      ): void {
        checkUnsafeArguments(node.arguments, node.callee, node);
      },
      TaggedTemplateExpression(node: TSESTree.TaggedTemplateExpression): void {
        checkUnsafeArguments(node.quasi.expressions, node.tag, node);
      },
    };

    return {
      ...argumentChecks,
      ...assignmentChecks,
      ...returnChecks,
    };
  },
});
