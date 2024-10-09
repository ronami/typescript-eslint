import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import * as ts from 'typescript';

import { createRule, getParserServices, getTypeName } from '../util';

enum Usefulness {
  Always = 'always',
  Never = 'will',
  Sometimes = 'may',
}

type Options = [
  {
    ignoredTypeNames?: string[];
  },
];
type MessageIds = 'baseToString';

export default createRule<Options, MessageIds>({
  name: 'no-base-to-string',
  meta: {
    docs: {
      description:
        'Require `.toString()` to only be called on objects which provide useful information when stringified',
      recommended: 'recommended',
      requiresTypeChecking: true,
    },
    messages: {
      baseToString:
        "'{{name}}' {{certainty}} use Object's default stringification format ('[object Object]') when stringified.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoredTypeNames: {
            description:
              'Stringified regular expressions of type names to ignore.',
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    type: 'suggestion',
  },
  defaultOptions: [
    {
      ignoredTypeNames: ['Error', 'RegExp', 'URL', 'URLSearchParams'],
    },
  ],
  create(context, [option]) {
    const services = getParserServices(context);
    const checker = services.program.getTypeChecker();
    const ignoredTypeNames = option.ignoredTypeNames ?? [];

    function checkExpression(
      node: TSESTree.Expression,
      type?: ts.Type | ts.Type[],
    ): void {
      if (node.type === AST_NODE_TYPES.Literal) {
        return;
      }

      const ty = type ?? services.getTypeAtLocation(node);

      const certainty = Array.isArray(ty)
        ? ty.map(collectToStringCertainty)
        : collectToStringCertainty(ty);

      if (
        Array.isArray(certainty)
          ? certainty.every(usefulness => usefulness === Usefulness.Always)
          : certainty === Usefulness.Always
      ) {
        return;
      }

      context.report({
        data: {
          certainty: Array.isArray(certainty)
            ? certainty.some(x => x === Usefulness.Sometimes)
              ? Usefulness.Sometimes
              : Usefulness.Never
            : certainty,
          name: context.sourceCode.getText(node),
        },
        messageId: 'baseToString',
        node,
      });
    }

    function collectToStringCertainty(type: ts.Type): Usefulness {
      const toString = checker.getPropertyOfType(type, 'toString');
      const declarations = toString?.getDeclarations();
      if (!toString || !declarations || declarations.length === 0) {
        return Usefulness.Always;
      }

      // Patch for old version TypeScript, the Boolean type definition missing toString()
      if (
        type.flags & ts.TypeFlags.Boolean ||
        type.flags & ts.TypeFlags.BooleanLiteral
      ) {
        return Usefulness.Always;
      }

      if (ignoredTypeNames.includes(getTypeName(checker, type))) {
        return Usefulness.Always;
      }

      if (
        declarations.every(
          ({ parent }) =>
            !ts.isInterfaceDeclaration(parent) || parent.name.text !== 'Object',
        )
      ) {
        return Usefulness.Always;
      }

      if (type.isIntersection()) {
        for (const subType of type.types) {
          const subtypeUsefulness = collectToStringCertainty(subType);

          if (subtypeUsefulness === Usefulness.Always) {
            return Usefulness.Always;
          }
        }

        return Usefulness.Never;
      }

      if (!type.isUnion()) {
        return Usefulness.Never;
      }

      let allSubtypesUseful = true;
      let someSubtypeUseful = false;

      for (const subType of type.types) {
        const subtypeUsefulness = collectToStringCertainty(subType);

        if (subtypeUsefulness !== Usefulness.Always && allSubtypesUseful) {
          allSubtypesUseful = false;
        }

        if (subtypeUsefulness !== Usefulness.Never && !someSubtypeUseful) {
          someSubtypeUseful = true;
        }
      }

      if (allSubtypesUseful && someSubtypeUseful) {
        return Usefulness.Always;
      }

      if (someSubtypeUseful) {
        return Usefulness.Sometimes;
      }

      return Usefulness.Never;
    }

    function getArrayOrTupleType(type: ts.Type): ts.Type | ts.Type[] | null {
      if (checker.isArrayType(type)) {
        return checker.getTypeArguments(type)[0];
      }

      if (checker.isTupleType(type)) {
        return checker.getTypeArguments(type) as ts.Type[];
      }

      return null;
    }

    return {
      'AssignmentExpression[operator = "+="], BinaryExpression[operator = "+"]'(
        node: TSESTree.AssignmentExpression | TSESTree.BinaryExpression,
      ): void {
        const leftType = services.getTypeAtLocation(node.left);
        const rightType = services.getTypeAtLocation(node.right);

        if (getTypeName(checker, leftType) === 'string') {
          checkExpression(node.right, rightType);
        } else if (
          getTypeName(checker, rightType) === 'string' &&
          node.left.type !== AST_NODE_TYPES.PrivateIdentifier
        ) {
          checkExpression(node.left, leftType);
        }
      },
      'CallExpression > MemberExpression.callee > Identifier[name = "toString"].property'(
        node: TSESTree.Expression,
      ): void {
        const memberExpr = node.parent as TSESTree.MemberExpression;
        checkExpression(memberExpr.object);
      },
      'CallExpression > MemberExpression.callee > Identifier[name = "join"].property'(
        node: TSESTree.Expression,
      ): void {
        const memberExpr = node.parent as TSESTree.MemberExpression;
        const maybeArrayType = services.getTypeAtLocation(memberExpr.object);
        const type = getArrayOrTupleType(maybeArrayType);

        if (!type) {
          return;
        }

        // if (
        //   !checker.isArrayType(maybeArrayType) &&
        //   !checker.isTupleType(maybeArrayType)
        // ) {
        //   return;
        // }

        // const arrayType = checker.getTypeArguments(maybeArrayType)[0];

        const CallExpression = memberExpr.parent as TSESTree.CallExpression;
        checkExpression(CallExpression, type);
      },
      TemplateLiteral(node: TSESTree.TemplateLiteral): void {
        if (node.parent.type === AST_NODE_TYPES.TaggedTemplateExpression) {
          return;
        }
        for (const expression of node.expressions) {
          checkExpression(expression);
        }
      },
    };
  },
});
