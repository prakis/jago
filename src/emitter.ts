import * as fs from "fs";
import { JaGoNode } from "./transformer";

export function emitGoCode(nodes: JaGoNode[], outputPath: string) {
  const lines: string[] = [];
  lines.push("package main", "");

  const functions: string[] = [];
  const main: string[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "VariableDeclaration":
        main.push(`${node.name} := ${node.value}`);
        break;

      case "FunctionDeclaration":
        const params = node.params.map(p => `${p.name} ${p.type}`).join(", ");
        const body = node.body.map(line => `  ${line}`);
        functions.push(`func ${node.name}(${params}) {\n${body.join("\n")}\n}`);
        break;

      case "FunctionCall":
        main.push(`${node.name}(${node.args.join(", ")})`);
        break;

      case "GoRoutine":
        main.push(`go ${node.callee}()`);
        break;

      case "ChannelDeclaration":
        main.push(`${node.varName} := make(chan int)`); // default type is int for now
        break;
    }
  }

  lines.push(...functions, "", "func main() {");
  main.forEach(line => lines.push(`  ${line}`));
  lines.push("}");

  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
}
