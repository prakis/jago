import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { File } from "@babel/types";

// Intermediate representation for Go
export type JaGoNode =
  | { type: "GoRoutine"; callee: string }
  | { type: "ChannelDeclaration"; varName: string }
  | { type: "FunctionCall"; name: string; args: string[] }
  | {
      type: "FunctionDeclaration";
      name: string;
      params: { name: string; type: string }[];
      body: string[];
    }
  | { type: "VariableDeclaration"; name: string; varType: string; value: string };

export function transformAST(ast: File): JaGoNode[] {
  const output: JaGoNode[] = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name ?? "anon";

      const params = path.node.params.map(p => {
        if (!t.isIdentifier(p)) {
          throw new Error(`Parameter is not an identifier`);
        }

        const id = p as t.Identifier;

        const annotation = id.typeAnnotation;
        if (!annotation || !t.isTSTypeAnnotation(annotation)) {
          throw new Error(`Missing or unsupported type for parameter: ${id.name}`);
        }

        const tsType = annotation.typeAnnotation;

        let type: string;
        if (t.isTSStringKeyword(tsType)) {
          type = "string";
        } else if (t.isTSNumberKeyword(tsType)) {
          type = "int";
        } else if (t.isTSBooleanKeyword(tsType)) {
          type = "bool";
        } else if (t.isTSTypeReference(tsType) && t.isIdentifier(tsType.typeName)) {
          type = tsType.typeName.name;
        } else {
          throw new Error(`Unsupported type annotation for parameter: ${id.name}`);
        }

        return {
          name: id.name,
          type,
        };
      });

      const body: string[] = [];

      for (const stmt of path.node.body.body) {
        if (
          t.isExpressionStatement(stmt) &&
          t.isCallExpression(stmt.expression)
        ) {
          const call = stmt.expression;
          const args = call.arguments.map(arg =>
            t.isExpression(arg) ? printExpr(arg) : "/* complex */"
          );

          const callee = call.callee;
          if (t.isIdentifier(callee)) {
            body.push(`${callee.name}(${args.join(", ")})`);
          } else if (
            t.isMemberExpression(callee) &&
            t.isIdentifier(callee.object) &&
            t.isIdentifier(callee.property)
          ) {
            body.push(
              `${callee.object.name}.${callee.property.name}(${args.join(", ")})`
            );
          }
        }
      }

      output.push({ type: "FunctionDeclaration", name, params, body });
    },

    VariableDeclaration(path) {
      if (path.getFunctionParent()) return;

      for (const decl of path.node.declarations) {
        if (
          t.isIdentifier(decl.id) &&
          decl.id.typeAnnotation &&
          t.isTSTypeAnnotation(decl.id.typeAnnotation)
        ) {
          const tsType = decl.id.typeAnnotation.typeAnnotation;

          let varType: string;

          if (t.isTSStringKeyword(tsType)) {
            varType = "string";
          } else if (t.isTSNumberKeyword(tsType)) {
            varType = "int";
          } else if (t.isTSBooleanKeyword(tsType)) {
            varType = "bool";
          } else if (t.isTSTypeReference(tsType) && t.isIdentifier(tsType.typeName)) {
            varType = tsType.typeName.name;
          } else {
            throw new Error(`Unsupported type annotation`);
          }

          const name = decl.id.name;
          const value = decl.init && t.isExpression(decl.init)
            ? printExpr(decl.init)
            : "0";

          output.push({ type: "VariableDeclaration", name, varType, value });
        } else {
          throw new Error(`Missing or unsupported type in variable declaration`);
        }
      }
    },

CallExpression(path) {
  if (path.getFunctionParent()) return;

  const { callee, arguments: argsList } = path.node;

  const args = argsList.map(arg =>
    t.isExpression(arg) ? printExpr(arg) : "/* complex */"
  );

  if (t.isIdentifier(callee)) {
    output.push({
      type: "FunctionCall",
      name: callee.name,
      args,
    });
  } else if (
    t.isMemberExpression(callee) &&
    t.isIdentifier(callee.object) &&
    t.isIdentifier(callee.property)
  ) {
    const name = `${callee.object.name}.${callee.property.name}`;
    output.push({
      type: "FunctionCall",
      name,
      args,
    });
  }
}

,
  });

  return output;
}

function printExpr(expr: t.Expression): string {
  if (t.isIdentifier(expr)) return expr.name;
  if (t.isStringLiteral(expr)) return `"${expr.value}"`;
  if (t.isNumericLiteral(expr)) return `${expr.value}`;
  if (t.isBooleanLiteral(expr)) return `${expr.value}`;
  if (t.isBinaryExpression(expr)) {
    const left = t.isExpression(expr.left) ? printExpr(expr.left) : "/* left */";
    const right = t.isExpression(expr.right) ? printExpr(expr.right) : "/* right */";
    return `${left} ${expr.operator} ${right}`;
  }
  return "/* complex expr */";
}
