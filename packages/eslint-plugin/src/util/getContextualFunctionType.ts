import type {
  ParserServicesWithTypeInformation,
  TSESTree,
} from '@typescript-eslint/utils';

import { getContextualType } from '@typescript-eslint/type-utils';
import * as ts from 'typescript';

export function getContextualFunctionType(
  services: ParserServicesWithTypeInformation,
  functionNode:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression,
): ts.Type {
  const functionTSNode = services.esTreeNodeToTSNodeMap.get(functionNode);

  // function expressions will not have their return type modified based on receiver typing
  // so we have to use the contextual typing in these cases, i.e.
  // const foo1: () => Set<string> = () => new Set<any>();
  // the return type of the arrow function is Set<any> even though the variable is typed as Set<string>
  let functionType =
    ts.isFunctionExpression(functionTSNode) ||
    ts.isArrowFunction(functionTSNode)
      ? getContextualType(services.program.getTypeChecker(), functionTSNode)
      : services.getTypeAtLocation(functionNode);

  if (!functionType) {
    functionType = services.getTypeAtLocation(functionNode);
  }

  return functionType;
}
