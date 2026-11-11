const test = require("node:test");
const assert = require("node:assert/strict");
const errorHandler = require("../middleware/errorHandler");

const response = () => ({
  headersSent: false,
  statusCode: undefined,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("maps duplicate-key errors to a safe conflict response", () => {
  const res = response();
  errorHandler(
    { code: 11000, message: "duplicate key includes private database details" },
    { id: "request-1", method: "POST", path: "/api/users" },
    res,
    assert.fail,
  );

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, {
    success: false,
    message: "A record with these details already exists",
  });
});

test("preserves client parser status and hides server error details", () => {
  const badRequest = response();
  errorHandler(
    { status: 400, message: "Invalid JSON" },
    { id: "request-2", method: "POST", path: "/api/test" },
    badRequest,
    assert.fail,
  );
  assert.equal(badRequest.statusCode, 400);
  assert.equal(badRequest.body.message, "Invalid JSON");

  const serverError = response();
  errorHandler(
    { message: "private database details" },
    { id: "request-3", method: "GET", path: "/api/test" },
    serverError,
    assert.fail,
  );
  assert.equal(serverError.statusCode, 500);
  assert.equal(serverError.body.message, "An unexpected error occurred");
});
