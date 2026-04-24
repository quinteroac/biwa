declare module 'inkjs/compiler/Compiler.js' {
  export class Compiler {
    constructor(content: string, options?: unknown)
    Compile(): { ToJson(): string }
  }
}

declare module 'inkjs/compiler/CompilerOptions.js' {
  export class CompilerOptions {
    constructor(...args: unknown[])
  }
}
