export function asyncRouter(router) {
  for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
    const original = router[method].bind(router);
    router[method] = (...args) =>
      original(
        ...args.map((handler) => {
          if (typeof handler !== 'function' || handler.length === 4) return handler;
          return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
        })
      );
  }

  return router;
}
