import { writeFileSync } from "fs";
import { JaGoNode } from "./transformer";

export function emitGoCode(nodes: JaGoNode[], outFile: string) {
  const lines: string[] = [];
  const imports = new Set<string>();
  const mainBody: string[] = [];

  // Collect top-level functions first
  for (const node of nodes) {
    if (node.type === "FunctionDeclaration") {
      lines.push(`func ${node.name}(${node.params.join(", ")}) {`);
      for (const stmt of node.body) {
        lines.push("  " + stmt);
        if (stmt.startsWith("fmt.")) {
          imports.add('"fmt"');
        }
      }
      lines.push("}\n");
    }
  }

  // Collect main() content
  for (const node of nodes) {
    switch (node.type) {
      case "VariableDeclaration":
        mainBody.push(`${node.name} := ${node.value}`);
        break;

      case "FunctionCall":
        mainBody.push(`${node.name}(${node.args.join(", ")})`);
        if (node.name.startsWith("fmt.")) {
          imports.add('"fmt"');
        }
        break;

      case "GoRoutine":
        mainBody.push(`go ${node.callee}()`);
        break;

      case "ChannelDeclaration":
        mainBody.push(`${node.varName} := make(chan interface{})`);
        break;

      default:
        break;
    }
  }

  lines.unshift("package main\n");

  if (imports.size > 0) {
    lines.push("import (");
    imports.forEach((imp) => lines.push("  " + imp));
    lines.push(")\n");
  }

  lines.push("func main() {");
  mainBody.forEach((line) => lines.push("  " + line));
  lines.push("}");

  writeFileSync(outFile, lines.join("\n"), "utf-8");
  console.log(`✅ Go code written to ${outFile}`);
}
