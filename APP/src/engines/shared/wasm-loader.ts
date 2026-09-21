export class WasmLoader {
  static async loadWasm(url: string): Promise<WebAssembly.Module> {
    console.log(`[WasmLoader] Loading WASM from ${url}...`);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch WASM: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    const module = await WebAssembly.compile(buffer);
    return module;
  }

  static async instantiateWasm(
    module: WebAssembly.Module,
    importObject: Record<string, unknown> = {}
  ): Promise<WebAssembly.Instance> {
    return await WebAssembly.instantiate(module, importObject);
  }
}
