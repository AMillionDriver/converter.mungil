// Polyfill Promise.withResolvers for Node.js environments < 22 (e.g. Node 20 runner)
if (typeof Promise.withResolvers === 'undefined') {
  // @ts-expect-error Polyfill for ES2024 Promise.withResolvers
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
