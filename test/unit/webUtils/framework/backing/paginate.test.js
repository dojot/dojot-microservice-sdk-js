const { pagingMiddleware } = require('../../../../../lib/webUtils/framework/backing/paginate');

function mockRequest() {
  const req = {
    originalUrl: 'http://localhost:80/tests',
    query: {},
  };
  return req;
}

function mockResponse() {
  const res = {
    locals: {},
  };
  return res;
}

describe('Express Framework - paginate', () => {
  const limit = 10;
  const maxLimit = 20;
  let paginateMiddleware = null;
  let paginateControlMiddleware = null;

  beforeAll(() => {
    const paginate = pagingMiddleware(limit, maxLimit);
    expect(Array.isArray(paginate)).toBeTruthy();
    expect(paginate.length).toBe(2);
    [paginateMiddleware, paginateControlMiddleware] = paginate;
  });

  describe('middleware', () => {
    it('should inject paging control', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();

      req.query.limit = `${limit}`;
      req.query.page = '1';

      paginateMiddleware(req, res, next);
      paginateControlMiddleware(req, res, next);

      expect(next.mock.calls.length).toBe(2);
      expect(req.getPaging).toBeInstanceOf(Function);

      expect(req.getPaging(20)).toEqual({
        previous: null,
        current: { number: 1, url: `/tests?limit=${limit}&page=1` },
        next: { number: 2, url: `/tests?limit=${limit}&page=2` },
        totalItems: 20,
        totalPages: 2,
        limitPerPage: limit,
      });
    });

    it('should fix the page limit', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();

      req.query.limit = '0';
      req.query.page = '2';

      paginateMiddleware(req, res, next);
      paginateControlMiddleware(req, res, next);

      expect(req.query.limit).toBe(limit);
      expect(next.mock.calls.length).toBe(2);
      expect(req.getPaging).toBeInstanceOf(Function);

      expect(req.getPaging(10)).toEqual({
        previous: { number: 1, url: `/tests?limit=${limit}&page=1` },
        current: { number: 2, url: `/tests?limit=${limit}&page=2` },
        next: null,
        totalItems: 10,
        totalPages: 1,
        limitPerPage: limit,
      });
    });
  });
});
