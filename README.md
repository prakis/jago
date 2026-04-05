# JaGo Language

**JaGo** is a JavaScript-like language that transpiles to Go code. Aim is to compile javascript code to native binaries for performance.

---

## Features (as of now)

-  Variable declarations with explicit types (`string`, `int`, `bool`)
-  Function declarations with typed parameters
-  Function calls
-  Go-style `print()` function (maps directly to Go's `print()`)
-  Transpiles to valid Go code
-  Generates `.go` file and compiles with Go compiler

---

## Example: JaGo Code

```jago
let name: string = "JaGo"
let age: int = 25

function greet(name: string) {
  print("Hello, " + name)
}

greet(name)

print(age)
print("Done")
```

## To compile .jago to .go file
After pulling the code and running npm install

``` npm start example.jago```

This will generate example.go file

To compile the example.go run (assuming you already have go compiler installed, if not get it from https://go.dev/dl/ )

```go build example.go```

this will produce a binary example.exe

