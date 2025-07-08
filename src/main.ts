import { program } from "commander";
import { readFileSync } from "fs";
import { parseJaGoCode } from "./parser";
import { transformAST, JaGoNode } from "./transformer";
import { emitGoCode } from "./emitter";
import { resolve } from "path";

export function jagocompiler() {
  program
    .name("jago")
    .description("JaGo Transpiler CLI")
    .argument("<file>", "JaGo source file (.jago)")
    .action((file) => {
      try {
        const code = readFileSync(file, "utf-8");
        const ast = parseJaGoCode(code);
        const transformed: JaGoNode[] = transformAST(ast);

        const fullPath = resolve(file);
        const fullPathNoExt = fullPath.replace(/\.[^/.]+$/, "");
        const goFilePath = fullPathNoExt + ".go";
        console.log("Generated Go-Code:", goFilePath);

        // After printing transformed nodes:
        emitGoCode(transformed, goFilePath);


        /*console.log("=== Parsed JaGo Program ===\n");

        for (const node of transformed) {
          switch (node.type) {
            case "FunctionCall":
              console.log(`FunctionCall: ${node.name}(${node.args.join(", ")})`);
              break;
            case "ChannelDeclaration":
              console.log(`Channel: ${node.varName} := make(chan interface{})`);
              break;
            case "GoRoutine":
              console.log(`GoRoutine: go ${node.callee}()`);
              break;
            case "Other":
              console.log(`Other: ${node.code}`);
              break;
          }
        }*/
      } catch (err) {
        console.error("Failed to parse/transform JaGo source:", err);
      }
    });

  program.parse();
}
