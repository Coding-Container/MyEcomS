const test = require("node:test");
const assert = require("node:assert/strict");

const withResendConfig = async (fetchMock, run) => {
  const keys = ["RESEND_API_KEY", "EMAIL_FROM", "EMAIL_USER", "EMAIL_PASS"];
  const previousValues = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  const previousFetch = global.fetch;
  const modulePath = require.resolve("../utils/sendEmail");

  process.env.RESEND_API_KEY = "re_test_key";
  process.env.EMAIL_FROM = "MyEcomS <noreply@example.com>";
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  global.fetch = fetchMock;
  delete require.cache[modulePath];

  try {
    await run(require(modulePath));
  } finally {
    keys.forEach((key) => {
      if (previousValues[key] === undefined) delete process.env[key];
      else process.env[key] = previousValues[key];
    });
    global.fetch = previousFetch;
    delete require.cache[modulePath];
  }
};

test("sends OTP email through Resend over HTTPS", async () => {
  let request;
  await withResendConfig(
    async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: "email_123" }) };
    },
    async (sendEmail) => {
      await sendEmail("customer@example.com", "Your OTP", "<p>123456</p>");
    },
  );

  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer re_test_key");
  assert.deepEqual(JSON.parse(request.options.body), {
    from: "MyEcomS <noreply@example.com>",
    to: ["customer@example.com"],
    subject: "Your OTP",
    html: "<p>123456</p>",
  });
});

test("reports a rejected Resend request without exposing provider response", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    await withResendConfig(
      async () => ({ ok: false, status: 401 }),
      async (sendEmail) => {
        await assert.rejects(sendEmail("customer@example.com", "OTP", "<p>123456</p>"), {
          code: "RESEND_API_ERROR",
          statusCode: 502,
        });
      },
    );
  } finally {
    console.error = originalError;
  }
});
