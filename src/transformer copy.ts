import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { File } from "@babel/types";

// IR for Go code
export type JaGoNode =
  | { type: "GoRoutine"; callee: string }
  | { type: "ChannelDeclaration"; varName: string }
  | { type: "FunctionCall"; name: string; args: string[] }
  | { type: "FunctionDeclaration"; name: string; params: string[]; body: string[] }
  | { type: "VariableDeclaration"; name: string; value: string };

export function transformAST(ast: File): JaGoNode[] {
  const output: JaGoNode[] = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id?.name ?? "anon";
      const params = path.node.params.map(p =>
        t.isIdentifier(p) ? p.name : "param"
      );

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

          if (t.isIdentifier(call.callee)) {
            body.push(`${call.callee.name}(${args.join(", ")})`);
          } else if (
            t.isMemberExpression(call.callee) &&
            t.isIdentifier(call.callee.object) &&
            t.isIdentifier(call.callee.property)
          ) {
            const obj = call.callee.object.name;
            const prop = call.callee.property.name;
            body.push(`${obj}.${prop}(${args.join(", ")})`);
          } else {
            body.push("/* unknown function call */");
          }
        }
      }

      output.push({ type: "FunctionDeclaration", name, params, body });
    },

    VariableDeclaration(path) {
      for (const decl of path.node.declarations) {
        if (t.isIdentifier(decl.id)) {
          const name = decl.id.name;
          let value = "0";

          if (decl.init && t.isExpression(decl.init)) {
            value = printExpr(decl.init);
          }

          output.push({ type: "VariableDeclaration", name, value });
        }
      }
    },

    CallExpression(path) {
      const calleeNode = path.node.callee;

      // Handle __go(worker())
      if (
        t.isIdentifier(calleeNode, { name: "__go" }) &&
        path.node.arguments.length === 1 &&
        t.isCallExpression(path.node.arguments[0])
      ) {
        const inner = path.node.arguments[0];
        if (t.isCallExpression(inner) && t.isIdentifier(inner.callee)) {
          output.push({ type: "GoRoutine", callee: inner.callee.name });
        }
        return;
      }

      // Handle channel()
      if (t.isIdentifier(calleeNode, { name: "channel" })) {
        const parent = path.parentPath?.node;
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          output.push({ type: "ChannelDeclaration", varName: parent.id.name });
        }
        return;
      }

      // Handle normal calls
      const args = path.node.arguments.map(arg =>
        t.isExpression(arg) ? printExpr(arg) : "/* complex */"
      );

    if (t.isIdentifier(calleeNode)) {
    output.push({ type: "FunctionCall", name: (calleeNode as t.Identifier).name, args });
    } else if (
        t.isMemberExpression(calleeNode) &&
        t.isIdentifier(calleeNode.object) &&
        t.isIdentifier(calleeNode.property)
      ) {
        const obj = calleeNode.object.name;
        const prop = calleeNode.property.name;
        output.push({ type: "FunctionCall", name: `${obj}.${prop}`, args });
      }
    },
  });

  return output;
}

// Safely converts expressions to string
function printExpr(expr: t.Expression): string {
  if (t.isIdentifier(expr)) return expr.name;
  if (t.isStringLiteral(expr)) return `"${expr.value}"`;
  if (t.isNumericLiteral(expr)) return `${expr.value}`;
  if (t.isBinaryExpression(expr)) {
    const left = t.isExpression(expr.left) ? printExpr(expr.left) : "/* left */";
    const right = t.isExpression(expr.right) ? printExpr(expr.right) : "/* right */";
    return `${left} + ${right}`;
  }
  return "/* complex expr */";
}
