import { JaGoNode } from "./transformer";
import { writeFileSync } from "fs";

export function emitGoCode(nodes: JaGoNode[], outFile: string) {
  const lines: string[] = [];
  const imports = new Set<string>();

  lines.push("package main");
  lines.push("");

  // Collect lines for main()
  const mainBody: string[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "FunctionCall":
        if (node.name.startsWith("fmt.")) {
          imports.add('"fmt"');
        }
        mainBody.push(`${node.name}(${node.args.join(", ")})`);
        break;

      case "ChannelDeclaration":
        mainBody.push(`${node.varName} := make(chan interface{})`);
        break;

      case "GoRoutine":
        mainBody.push(`go ${node.callee}()`);
        break;

      case "Other":
        if (node.code.startsWith("let ")) {
          // Convert: let x = 10 → x := 10
          const match = node.code.match(/^let\s+(\w+)\s*=\s*(.+);?$/);
          if (match) {
            const [, varName, value] = match;
            mainBody.push(`${varName} := ${value}`);
          } else {
            mainBody.push("// Could not parse: " + node.code);
          }
        } else if (node.code.startsWith("function ")) {
          mainBody.push("// Function declarations not yet supported");
        } else {
          mainBody.push("// Unknown code: " + node.code);
        }
        break;
    }
  }

  // Insert imports if needed
  if (imports.size > 0) {
    lines.push("import (");
    for (const imp of imports) {
      lines.push("  " + imp);
    }
    lines.push(")");
    lines.push("");
  }

  // Wrap everything in main()
  lines.push("func main() {");
  for (const stmt of mainBody) {
    lines.push("  " + stmt);
  }
  lines.push("}");

  // Write to file
  writeFileSync(outFile, lines.join("\n"), "utf-8");
  console.log(`✅ Go code written to ${outFile}`);
}
