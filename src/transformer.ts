import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { File } from "@babel/types";

// IR type for JaGo
export type JaGoNode =
  | { type: "GoRoutine"; callee: string }
  | { type: "ChannelDeclaration"; varName: string }
  | { type: "FunctionCall"; name: string; args: string[] }
  | { type: "Other"; code: string };

export function transformAST(ast: File): JaGoNode[] {
  const output: JaGoNode[] = [];

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      // Handle: __go(worker());
      if (
        t.isIdentifier(callee, { name: "__go" }) &&
        path.node.arguments.length === 1 &&
        t.isCallExpression(path.node.arguments[0])
      ) {
        const innerCall = path.node.arguments[0];
        if (t.isIdentifier(innerCall.callee)) {
          output.push({
            type: "GoRoutine",
            callee: innerCall.callee.name,
          });
        }
        return;
      }

      // Handle: let ch = channel();
      if (t.isIdentifier(callee, { name: "channel" })) {
        const parent = path.parentPath?.node;
        if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
          output.push({
            type: "ChannelDeclaration",
            varName: parent.id.name,
          });
        }
        return;
      }

      // ✅ FIXED: Regular function calls like print(), greet()
      if (t.isIdentifier(callee)) {
        const id = callee as t.Identifier; // ✅ force cast to fix TS
        const args = path.node.arguments.map((arg) => {
          if (t.isStringLiteral(arg)) return `"${arg.value}"`;
          if (t.isIdentifier(arg)) return arg.name;
          return "/* complex */";
        });

        output.push({
          type: "FunctionCall",
          name: id.name,
          args,
        });
        return;
      }

      // ✅ FIXED: Member calls like fmt.Println()
      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object) &&
        t.isIdentifier(callee.property)
      ) {
        const object = callee.object as t.Identifier;
        const property = callee.property as t.Identifier;
        const fullName = `${object.name}.${property.name}`;

        const args = path.node.arguments.map((arg) => {
          if (t.isStringLiteral(arg)) return `"${arg.value}"`;
          if (t.isIdentifier(arg)) return arg.name;
          return "/* complex */";
        });

        output.push({
          type: "FunctionCall",
          name: fullName,
          args,
        });
        return;
      }
    },

    VariableDeclaration(path) {
      output.push({ type: "Other", code: path.toString() });
    },

    FunctionDeclaration(path) {
      output.push({ type: "Other", code: path.toString() });
    },

    ExpressionStatement(path) {
      output.push({ type: "Other", code: path.toString() });
    },
  });

  return output;
}
