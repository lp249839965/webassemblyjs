// TODO(sven): add flow in here

const debug = require("debug")("webassemblyjs:modulecontext");

function assert(cond) {
  if (!cond) throw new Error("Assertion error");
}

export function moduleContextFromModuleAST(m) {
  const moduleContext = new ModuleContext();

  assert(m.type === "Module");

  m.fields.forEach(field => {
    switch (field.type) {
      case "Func": {
        moduleContext.addFunction(field);
        break;
      }
      case "Global": {
        moduleContext.defineGlobal(field);
        break;
      }
      case "ModuleImport": {
        switch (field.descr.type) {
          case "GlobalType": {
            moduleContext.importGlobal(field.descr.valtype);
            break;
          }
          case "Memory": {
            moduleContext.addMemory(
              field.descr.limits.min,
              field.descr.limits.max
            );
            break;
          }
          case "FuncImportDescr": {
            moduleContext.importFunction(field.descr);
            break;
          }

          case "Table": {
            // FIXME(sven): not implemented yet
            break;
          }

          default:
            throw new Error(
              "Unsupported ModuleImport of type " +
                JSON.stringify(field.descr.type)
            );
        }
        break;
      }
      case "Memory": {
        moduleContext.addMemory(field.limits.min, field.limits.max);
        break;
      }
    }
  });

  return moduleContext;
}

/**
 * Module context for type checking
 */
export class ModuleContext {
  constructor() {
    this.funcs = [];
    this.funcsOffsetByIdentifier = [];

    this.globals = [];
    this.globalsOffsetByIdentifier = [];

    this.mems = [];

    // Current stack frame
    this.locals = [];
    this.labels = [];
    this.return = [];

    this.debugName = "unknown";
  }

  /**
   * Reset the active stack frame
   */
  newContext(debugName, expectedResult) {
    debug("new context %s", debugName);

    this.locals = [];
    this.labels = [expectedResult];
    this.return = expectedResult;
    this.debugName = debugName;
  }

  /**
   * Functions
   */
  addFunction(func /*: Func*/) {
    // eslint-disable-next-line prefer-const
    let { params: args = [], results: result = [] } = func.signature;

    args = args.map(arg => arg.valtype);

    debug("add new function %s -> %s", args.join(" "), result.join(" "));

    this.funcs.push({ args, result });

    if (typeof func.name !== "undefined") {
      this.funcsOffsetByIdentifier[func.name.value] = this.funcs.length - 1;
    }
  }

  importFunction(funcimport) {
    // eslint-disable-next-line prefer-const
    let { params: args, results: result } = funcimport.signature;
    args = args.map(arg => arg.valtype);

    debug(
      "add new imported function %s -> %s",
      args.join(" "),
      result.join(" ")
    );

    this.funcs.unshift({ args, result });

    if (typeof funcimport.id !== "undefined") {
      // imports are first, we can assume their index in the array
      this.funcsOffsetByIdentifier[funcimport.id.value] = this.funcs.length - 1;
    }
  }

  hasFunction(index) {
    return typeof this.getFunction(index) !== "undefined";
  }

  getFunction(index) {
    if (typeof index !== "number") {
      throw new Error("getFunction only supported for number index");
    }

    return this.funcs[index];
  }

  getFunctionOffsetByIdentifier(name) {
    assert(typeof name === "string");

    return this.funcsOffsetByIdentifier[name];
  }

  /**
   * Labels
   */
  addLabel(result) {
    debug("add label");

    this.labels.unshift(result);
  }

  hasLabel(index) {
    return this.labels.length > index && index >= 0;
  }

  getLabel(index) {
    return this.labels[index];
  }

  popLabel() {
    this.labels.shift();
  }

  /**
   * Locals
   */
  hasLocal(index) {
    return typeof this.getLocal(index) !== "undefined";
  }

  getLocal(index) {
    return this.locals[index];
  }

  addLocal(type) {
    debug("add local t=%s index=%d", type, this.locals.length);

    this.locals.push(type);
  }

  /**
   * Globals
   */
  hasGlobal(index) {
    return this.globals.length > index && index >= 0;
  }

  getGlobal(index) {
    return this.globals[index].type;
  }

  getGlobalOffsetByIdentifier(name) {
    assert(typeof name === "string");

    return this.globalsOffsetByIdentifier[name];
  }

  defineGlobal(global /*: Global*/) {
    const type = global.globalType.valtype;
    const mutability = global.mutability;

    this.globals.push({ type, mutability });

    if (typeof global.name !== "undefined") {
      this.globalsOffsetByIdentifier[global.name.value] =
        this.globals.length - 1;
    }
  }

  importGlobal(type, mutability) {
    this.globals.unshift({ type, mutability });
  }

  isMutableGlobal(index) {
    return this.globals[index].mutability === "var";
  }

  /**
   * Memories
   */
  hasMemory(index) {
    return this.mems.length > index && index >= 0;
  }

  addMemory(min, max) {
    this.mems.push({ min, max });
  }

  getMemory(index) {
    return this.mems[index];
  }
}
