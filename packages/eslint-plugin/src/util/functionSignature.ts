import type * as ts from 'typescript';

import { isRestParameterDeclaration } from '.';

const enum RestTypeKind {
  Array,
  Tuple,
  Other,
}
type RestType =
  | {
      index: number;
      kind: RestTypeKind.Array;
      type: ts.Type;
    }
  | {
      index: number;
      kind: RestTypeKind.Other;
      type: ts.Type;
    }
  | {
      index: number;
      kind: RestTypeKind.Tuple;
      typeArguments: readonly ts.Type[];
    };

export class FunctionSignature {
  private hasConsumedArguments = false;

  private parameterTypeIndex = 0;

  private constructor(
    private paramTypes: ts.Type[],
    private restType: RestType | null,
  ) {}

  public static create(
    checker: ts.TypeChecker,
    tsNode: ts.CallLikeExpression,
  ): FunctionSignature | null {
    const signature = checker.getResolvedSignature(tsNode);
    if (!signature) {
      return null;
    }

    const paramTypes: ts.Type[] = [];
    let restType: RestType | null = null;

    const parameters = signature.getParameters();
    for (let i = 0; i < parameters.length; i += 1) {
      const param = parameters[i];
      const type = checker.getTypeOfSymbolAtLocation(param, tsNode);

      const decl = param.getDeclarations()?.[0];
      if (decl && isRestParameterDeclaration(decl)) {
        // is a rest param
        if (checker.isArrayType(type)) {
          restType = {
            index: i,
            kind: RestTypeKind.Array,
            type: checker.getTypeArguments(type)[0],
          };
        } else if (checker.isTupleType(type)) {
          restType = {
            index: i,
            kind: RestTypeKind.Tuple,
            typeArguments: checker.getTypeArguments(type),
          };
        } else {
          restType = {
            index: i,
            kind: RestTypeKind.Other,
            type,
          };
        }
        break;
      }

      paramTypes.push(type);
    }

    return new this(paramTypes, restType);
  }

  public consumeRemainingArguments(): void {
    this.hasConsumedArguments = true;
  }

  public getNextParameterType(): ts.Type | null {
    const index = this.parameterTypeIndex;
    this.parameterTypeIndex += 1;

    if (index >= this.paramTypes.length || this.hasConsumedArguments) {
      if (this.restType == null) {
        return null;
      }

      switch (this.restType.kind) {
        case RestTypeKind.Tuple: {
          const typeArguments = this.restType.typeArguments;
          if (this.hasConsumedArguments) {
            // all types consumed by a rest - just assume it's the last type
            // there is one edge case where this is wrong, but we ignore it because
            // it's rare and really complicated to handle
            // eg: function foo(...a: [number, ...string[], number])
            return typeArguments[typeArguments.length - 1];
          }

          const typeIndex = index - this.restType.index;
          if (typeIndex >= typeArguments.length) {
            return typeArguments[typeArguments.length - 1];
          }

          return typeArguments[typeIndex];
        }

        case RestTypeKind.Array:
        case RestTypeKind.Other:
          return this.restType.type;
      }
    }
    return this.paramTypes[index];
  }
}
