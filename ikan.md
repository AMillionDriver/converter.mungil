PS D:\Nanang Nurmansah\Coba-Cute\Converter_File\APP> npm run build

> flowy-converter@0.1.0 build
> tsc -b && vite build

src/engines/image-webp.ts:5:29 - error TS2307: Cannot find module 'jsquash' or its corresponding type declarations.

5 let _jsquash: typeof import('jsquash');
                              ~~~~~~~~~

src/engines/image-webp.ts:9:29 - error TS2307: Cannot find module 'jsquash' or its corresponding type declarations.

9     _jsquash = await import('jsquash');
                              ~~~~~~~~~

src/engines/image/image.worker.ts:43:7 - error TS2322: Type '"loading"' is not assignable to type '"success" | "fail" | "warn"'.

43       status: 'loading',
         ~~~~~~

  src/engines/shared/EngineLogger.ts:4:3
    4   status: 'success' | 'fail' | 'warn';
        ~~~~~~
    The expected type comes from property 'status' which is declared here on type 'LogEntry'

src/engines/image/image.worker.ts:60:30 - error TS2322: Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'.
  Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'ArrayBufferView<ArrayBuffer>'.
    Types of property 'buffer' are incompatible.
      Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'.
        Type 'SharedArrayBuffer' is not assignable to type 'ArrayBuffer'.
          Types of property '[Symbol.toStringTag]' are incompatible.
            Type '"SharedArrayBuffer"' is not assignable to type '"ArrayBuffer"'.

60       const blob = new Blob([encoded], { type: mimeType });
                                ~~~~~~~

src/engines/image/image.worker.ts:133:14 - error TS2322: Type '(data: ImageData, options?: Partial<EncodeOptions> | undefined) => Promise<ArrayBuffer>' is not assignable to type 'JsquashEncode'.
  Types of parameters 'data' and 'input' are incompatible.
    Property 'colorSpace' is missing in type 'ImageDataLike' but required in type 'ImageData'.

133     return { encode };
                 ~~~~~~

  node_modules/typescript/lib/lib.dom.d.ts:22790:14
    22790     readonly colorSpace: PredefinedColorSpace;
                       ~~~~~~~~~~
    'colorSpace' is declared here.
  src/engines/image/image.worker.ts:129:14
    129 ): Promise<{ encode: JsquashEncode }> {
                     ~~~~~~
    The expected type comes from property 'encode' which is declared here on type '{ encode: JsquashEncode; }'

src/engines/image/image.worker.ts:137:14 - error TS2322: Type '(data: ImageData, options?: Partial<EncodeOptions> | undefined) => Promise<ArrayBuffer>' is not assignable to type 'JsquashEncode'.
  Types of parameters 'data' and 'input' are incompatible.
    Property 'colorSpace' is missing in type 'ImageDataLike' but required in type 'ImageData'.

137     return { encode };
                 ~~~~~~

  node_modules/typescript/lib/lib.dom.d.ts:22790:14
    22790     readonly colorSpace: PredefinedColorSpace;
                       ~~~~~~~~~~
    'colorSpace' is declared here.
  src/engines/image/image.worker.ts:129:14
    129 ): Promise<{ encode: JsquashEncode }> {
                     ~~~~~~
    The expected type comes from property 'encode' which is declared here on type '{ encode: JsquashEncode; }'

src/engines/image/image.worker.ts:141:14 - error TS2322: Type '{ (data: ImageDataRGBA16, options: { bitDepth: 16; }): Promise<ArrayBuffer>; (data: ImageData, options?: { bitDepth?: 8 | undefined; } | undefined): Promise<...>; }' is not assignable to type 'JsquashEncode'.
  Types of parameters 'data' and 'input' are incompatible.
    Type 'ImageDataLike' is not assignable to type 'ImageDataRGBA16'.
      The types of 'data.filter(...)[Symbol.toStringTag]' are incompatible between these types.
        Type '"Uint8ClampedArray"' is not assignable to type '"Uint16Array"'.

141     return { encode };
                 ~~~~~~

  src/engines/image/image.worker.ts:129:14
    129 ): Promise<{ encode: JsquashEncode }> {
                     ~~~~~~
    The expected type comes from property 'encode' which is declared here on type '{ encode: JsquashEncode; }'

src/engines/image/image.worker.ts:232:7 - error TS2554: Expected 0-1 arguments, but got 2.

232       resolve
          ~~~~~~~

src/engines/shared/wasm-utils.ts:38:15 - error TS2339: Property 'captureStackTrace' does not exist on type 'ErrorConstructor'.

38     if (Error.captureStackTrace) {
                 ~~~~~~~~~~~~~~~~~

src/engines/shared/wasm-utils.ts:40:14 - error TS2339: Property 'captureStackTrace' does not exist on type 'ErrorConstructor'.

40       (Error.captureStackTrace as Function)(this, WasmEngineError);
                ~~~~~~~~~~~~~~~~~

src/lib/conversion-pipeline.ts:3:30 - error TS2307: Cannot find module '../engine-loader' or its corresponding type declarations.

3 import { EngineLoader } from '../engine-loader';
                               ~~~~~~~~~~~~~~~~~~

src/lib/conversion-pipeline.ts:12:27 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-webp")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-webp")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

12   'image:png:webp': () => import('./engines/image-webp'),
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:13:27 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-webp")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-webp")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

13   'image:jpg:webp': () => import('./engines/image-webp'),
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:14:28 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-webp")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-webp")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

14   'image:jpeg:webp': () => import('./engines/image-webp'),
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:16:27 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-png")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-png")' is not assignable totype '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

16   'image:webp:png': () => import('./engines/image-png'),
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:17:26 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-png")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-png")' is not assignable totype '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

17   'image:jpg:png': () => import('./engines/image-png'),
                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:18:27 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-png")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-png")' is not assignable totype '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

18   'image:jpeg:png': () => import('./engines/image-png'),
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:20:27 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

20   'image:png:jpeg': () => import('./engines/image-jpeg'),
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:21:28 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

21   'image:webp:jpeg': () => import('./engines/image-jpeg'),
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:22:27 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

22   'image:jpg:jpeg': () => import('./engines/image-jpeg'),
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:23:27 - error TS2322: Type 'Promise<typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")>' is not assignable to type 'Promise<{ runConversion: (...args: unknown[]) => Promise<unknown>; }>'.
  Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
    Types of property 'runConversion' are incompatible.
      Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
        Types of parameters 'file' and 'args' are incompatible.
          Type 'unknown' is not assignable to type 'File'.

23   'image:jpeg:jpg': () => import('./engines/image-jpeg'),
                             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  src/lib/conversion-pipeline.ts:9:3
    9   () => Promise<{ runConversion: (...args: unknown[]) => Promise<unknown> }>
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from the return type of this signature.

src/lib/conversion-pipeline.ts:54:7 - error TS2322: Type '(file: File, options?: Record<string, unknown>) => Promise<unknown>' is not assignable to type '(file: File, options?: ConversionOptions | undefined) => Promise<Blob>'.
  Type 'Promise<unknown>' is not assignable to type 'Promise<Blob>'.
    Type 'unknown' is not assignable to type 'Blob'.

54       convert: async (file: File, options?: Record<string, unknown>) => {
         ~~~~~~~

  src/lib/engine-types.ts:30:3
    30   convert(file: File, options?: ConversionOptions): Promise<Blob>;
         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The expected type comes from property 'convert' which is declared here on type 'ConversionEngine'

src/lib/conversion-pipeline.ts:81:5 - error TS2322: Type '(file: File, options: Record<string, unknown>, onProgress: ((p:number) => void) | undefined) => Promise<unknown>' is not assignable to type '(file: File, options: Record<string, unknown>, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>'.
  Type 'Promise<unknown>' is not assignable to type 'Promise<Blob>'.
    Type 'unknown' is not assignable to type 'Blob'.

81     return async (file, options, onProgress) => {
       ~~~~~~

src/lib/engines/image-jpeg.ts:1:18 - error TS2305: Module '"@jsquash/jpeg"' has no exported member 'ParseImage'.

1 import { encode, ParseImage } from '@jsquash/jpeg';
                   ~~~~~~~~~~

src/lib/engines/image-png.ts:1:18 - error TS2305: Module '"@jsquash/png"' has no exported member 'ParseImage'.

1 import { encode, ParseImage } from '@jsquash/png';
                   ~~~~~~~~~~

src/lib/engines/image-png.ts:2:1 - error TS6133: 'ConversionOptions' is declared but its value is never read.

2 import type { ConversionOptions } from '../engine-types';
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

src/lib/engines/image-webp.ts:1:18 - error TS2305: Module '"@jsquash/webp"' has no exported member 'ParseImage'.

1 import { encode, ParseImage } from '@jsquash/webp';
                   ~~~~~~~~~~

src/lib/engines/image-webp.ts:47:51 - error TS2345: Argument of type '{ quality: number; lossless: boolean; method: number; }' is not assignable to parameter of type 'Partial<EncodeOptions>'.
  Types of property 'lossless' are incompatible.
    Type 'boolean' is not assignable to type 'number'.

47     const webpOutput = await encode(decodedImage, encodeOptions);
                                                     ~~~~~~~~~~~~~

src/workers/conversion.worker.ts:21:9 - error TS2322: Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-webp")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
  Types of property 'runConversion' are incompatible.
    Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
      Types of parameters 'file' and 'args' are incompatible.
        Type 'unknown' is not assignable to type 'File'.

21         engineModules[engineId] = await import('../lib/engines/image-webp');
           ~~~~~~~~~~~~~~~~~~~~~~~

src/workers/conversion.worker.ts:26:9 - error TS2322: Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-png")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
  Types of property 'runConversion' are incompatible.
    Type '(file: File, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
      Types of parameters 'file' and 'args' are incompatible.
        Type 'unknown' is not assignable to type 'File'.

26         engineModules[engineId] = await import('../lib/engines/image-png');
           ~~~~~~~~~~~~~~~~~~~~~~~

src/workers/conversion.worker.ts:32:9 - error TS2322: Type 'typeof import("D:/Nanang Nurmansah/Coba-Cute/Converter_File/APP/src/lib/engines/image-jpeg")' is not assignable to type '{ runConversion: (...args: unknown[]) => Promise<unknown>; }'.
  Types of property 'runConversion' are incompatible.
    Type '(file: File, options?: ConversionOptions, onProgress?: ((p: number) => void) | undefined) => Promise<Blob>' is not assignable to type '(...args: unknown[]) => Promise<unknown>'.
      Types of parameters 'file' and 'args' are incompatible.
        Type 'unknown' is not assignable to type 'File'.

32         engineModules[engineId] = await import('../lib/engines/image-jpeg');
           ~~~~~~~~~~~~~~~~~~~~~~~

vite.config.ts:14:11 - error TS2769: No overload matches this call.
  The last overload gave the following error.
    Type '{ assetFileNames: { wasm: string; default: string; }; }' is not assignable to type 'OutputOptions | OutputOptions[] | undefined'.
      Types of property 'assetFileNames' are incompatible.
        Object literal may only specify known properties, and '['wasm']' does not exist in type 'AssetFileNamesFunction'.

14           ['wasm']: 'wasm/[name][extname]',
             ~~~~~~~~

  node_modules/vite/dist/node/index.d.ts:3353:25
    3353 export declare function defineConfig(config: UserConfigExport): UserConfigExport;
                                 ~~~~~~~~~~~~
    The last overload is declared here.


Found 32 errors.

PS D:\Nanang Nurmansah\Coba-Cute\Converter_File\APP> 