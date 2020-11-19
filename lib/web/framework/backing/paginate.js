const paginate = require('express-paginate');

function inject(req, res) {
  /**
   * It injects an auxiliary function that builds the paging control object.
   *
   * @param {number} itemCount total number of items to apply for pagination
   *
   * @returns a paging control object.
   */
  req.getPaging = (itemCount) => {
    const pageCount = Math.ceil(itemCount / req.query.limit);

    const previousPage = (!res.locals.paginate.hasPreviousPages) ? null
      : {
        number: req.query.page - 1,
        url: res.locals.paginate.href(true),
      };

    const currentPage = {
      number: req.query.page,
      url: res.locals.paginate.href()
        .replace(`page=${req.query.page + 1}`, `page=${req.query.page}`),
    };

    const nextPage = (!res.locals.paginate.hasNextPages(pageCount)) ? null
      : {
        number: req.query.page + 1,
        url: res.locals.paginate.href(false),
      };

    return {
      previous: previousPage,
      current: currentPage,
      next: nextPage,
      totalItems: itemCount,
      totalPages: pageCount,
      limitPerPage: req.query.limit,
    };
  };
}


/**
 * This function returns an array with middlewares for pagination control
 *
 * @param {number} limit a Number to limit results returned per page (defaults to 10)
 * @param {number} maxLimit a Number to restrict the number of results returned to
 *                     per page (defaults to 50) – through this, users will not
 *                     be able to override this limit (e.g. they can't pass
 *                     "?limit=10000" and crash the server).
 *
 * @returns an array with middlewares for pagination control.
 */
const pagingMiddleware = (limit, maxLimit) => ([
  // https://www.npmjs.com/package/express-paginate#paginatemiddlewarelimit-maxlimit
  paginate.middleware(limit, maxLimit),

  // a quick middleware fix to to prevent a "?limit=0"
  // from being passed to get infinite (all) results.
  (req, res, next) => {
    if (req.query.limit < 1) req.query.limit = limit;
    inject(req, res);
    next();
  },
]);

module.exports = { pagingMiddleware };
