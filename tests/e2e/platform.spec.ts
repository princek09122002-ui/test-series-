import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { db } from "../../src/lib/db";
import { mkdirSync } from "node:fs";
mkdirSync(".local/qa", { recursive: true });
if (process.env.TEST_DATABASE_READY !== "true")
  throw new Error(
    "Run npm run test:e2e to use an isolated local test database",
  );
const origin = "http://localhost:3100",
  tag = process.env.E2E_RUN_ID ?? Date.now(),
  email = `e2e-${tag}@example.test`,
  password =
    process.env.E2E_STUDENT_PASSWORD ?? `Practice-${crypto.randomUUID()}`;
async function login(
  page: Page,
  accountEmail = email,
  accountPassword = password,
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(accountEmail);
  await page.getByLabel("Password", { exact: true }).fill(accountPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 60000 });
}
const config = {
  name: "End-to-end partial chapter test",
  kind: "CUSTOM",
  topicIds: ["demo-atom-0", "demo-atom-2"],
  fullChapterIds: ["demo-mole"],
  count: 3,
  mode: "NEET",
  durationMinutes: 5,
  difficulty: { EASY: 100, MEDIUM: 0, HARD: 0 },
  exposure: "ALL",
  allocation: "AUTO",
  chapterCounts: {},
  language: "en",
  instantFeedback: false,
};
async function create(request: APIRequestContext, override = {}) {
  const r = await request.post("/api/tests", {
    headers: { Origin: origin },
    data: { ...config, ...override },
  });
  expect(r.status()).toBe(201);
  return r.json();
}
test.describe.serial("database-backed student & admin journey", () => {
  test("registers a real student and saves onboarding", async ({
    page,
    request,
  }) => {
    const response = await request.post("/api/register", {
      headers: { Origin: origin },
      data: { name: "Test Learner", email, password },
    });
    expect(response.status()).toBe(201);
    await login(page);
    await page.goto("/onboarding");
    await page.getByRole("button", { name: "Let’s get started" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Good to see you/ }),
    ).toBeVisible();
    await page.screenshot({
      path: ".local/qa/dashboard-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("complementary")).not.toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: ".local/qa/dashboard-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.screenshot({
      path: ".local/qa/dashboard-dark.png",
      fullPage: true,
    });
  });
  test("builder generates a mixed full/partial chapter test and persists an answer on refresh", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/tests/create");
    await page.getByRole("button", { name: /Continue/ }).click();
    await page
      .getByRole("button", { name: /Some Basic Concepts of Chemistry/ })
      .click();
    await page.getByLabel("Full chapter", { exact: false }).first().check();
    await page.getByRole("button", { name: /Structure of Atom/ }).click();
    await page.getByLabel("Atomic models", { exact: false }).check();
    await page.getByLabel("Bohr's model", { exact: false }).check();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByLabel("Number of questions").fill("3");
    await page.getByRole("button", { name: /Continue/ }).click();
    await page
      .getByRole("button", { name: "Check question availability" })
      .click();
    await page.getByRole("button", { name: "Generate & start test" }).click();
    await expect(page).toHaveURL(/\/tests\/(?!create$)[^/]+$/);
    await page.screenshot({
      path: ".local/qa/exam-desktop.png",
      fullPage: true,
    });
    await page.getByRole("radio").first().check();
    await expect(page.getByText("All changes saved").first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("radio").first()).toBeChecked();
    await page
      .getByRole("button", { name: "Mark for review", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Unmark review" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Submit test", exact: true })
      .first()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit test", exact: true })
      .click();
    await expect(page).toHaveURL(/\/result$/);
    await expect(
      page.getByRole("heading", { name: "Your test, understood." }),
    ).toBeVisible();
    await page.screenshot({
      path: ".local/qa/result-desktop.png",
      fullPage: true,
    });
  });
  test("automatically submits at the persisted deadline without a refresh", async ({
    page,
  }) => {
    await login(page);
    const { testId, attemptId } = await create(page.request);
    await db.testAttempt.update({
      where: { id: attemptId },
      data: { deadline: new Date(Date.now() + 5000) },
    });
    await page.goto(`/tests/${testId}`);
    await expect(page).toHaveURL(/\/result$/, { timeout: 20000 });
    expect(
      (await db.testAttempt.findUniqueOrThrow({ where: { id: attemptId } }))
        .status,
    ).toBe("SUBMITTED");
  });
  test("API refuses impossible mocks and strips active answer keys", async ({
    page,
  }) => {
    await login(page);
    const { testId } = await create(page.request);
    const r = await page.request.get(`/api/tests/${testId}`),
      data = await r.json();
    expect(data.questions[0]).not.toHaveProperty("correctOption");
    expect(data.questions[0]).not.toHaveProperty("explanation");
    const impossible = await page.request.post("/api/tests", {
      headers: { Origin: origin },
      data: { ...config, kind: "FULL_MOCK", count: 180, durationMinutes: 180 },
    });
    expect(impossible.status()).toBe(422);
  });
  test("deadline finalization survives refresh and incorrect answers create revision tasks", async ({
    page,
  }) => {
    await login(page);
    const { testId, attemptId } = await create(page.request),
      q = await db.testQuestion.findFirstOrThrow({
        where: { testId },
        orderBy: { position: "asc" },
      }),
      snapshot = q.snapshot as { correctOption: number };
    await page.request.put(`/api/tests/${testId}/answers`, {
      headers: { Origin: origin },
      data: {
        testQuestionId: q.id,
        selectedOption: (snapshot.correctOption + 1) % 4,
        marked: false,
        revision: 1,
      },
    });
    await db.testAttempt.update({
      where: { id: attemptId },
      data: { deadline: new Date(Date.now() - 1000) },
    });
    await page.goto(`/tests/${testId}`);
    await expect(page).toHaveURL(/result$/);
    await expect(page.getByText("INCORRECT", { exact: true })).toBeVisible();
    await page.goto("/mistakes");
    await expect(
      page.getByRole("heading", { name: "Your mistake notebook" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark reviewed" }).first().click();
    await page.goto("/revision");
    await expect(
      page.getByRole("button", { name: "I recalled the concept" }).first(),
    ).toBeVisible();
  });
  test("student cannot access admin APIs or pages and cannot save after submission", async ({
    page,
  }) => {
    await login(page);
    const r = await page.request.post("/api/admin", {
      headers: { Origin: origin },
      data: { action: "revisionSettings", intervals: [0, 1] },
    });
    expect(r.status()).toBe(403);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/dashboard/);
    const { testId } = await create(page.request);
    await page.request.post(`/api/tests/${testId}/submit`, {
      headers: { Origin: origin },
    });
    const data = await (await page.request.get(`/api/tests/${testId}`)).json();
    const save = await page.request.put(`/api/tests/${testId}/answers`, {
      headers: { Origin: origin },
      data: {
        testQuestionId: data.questions[0].testQuestionId,
        selectedOption: 0,
        marked: false,
        revision: 1,
      },
    });
    expect(save.status()).toBe(409);
  });
  test("admin creates and approves an original question", async ({ page }) => {
    const credentials = {
      admin: {
        email: process.env.SEED_ADMIN_EMAIL!,
        password: process.env.SEED_ADMIN_PASSWORD!,
      },
    };
    await login(page, credentials.admin.email, credentials.admin.password);
    await page.goto("/admin/questions/new");
    await page
      .getByLabel("Question text", { exact: false })
      .fill(
        `Original E2E content ${tag}: what is the mass of one mole of water using H=1 and O=16?`,
      );
    for (let i = 0; i < 4; i++)
      await page
        .getByLabel(`Option ${String.fromCharCode(65 + i)}`, { exact: true })
        .fill(["18 g", "9 g", "36 g", "2 g"][i]);
    await page
      .getByLabel("Educational explanation")
      .fill("One mole of water has mass 2 × 1 + 16 = 18 g.");
    await page.getByLabel("Chapter", { exact: true }).selectOption("demo-mole");
    await page.getByLabel("Mole concept", { exact: true }).first().check();
    await page.getByRole("button", { name: "Save question draft" }).click();
    await expect(page).toHaveURL(/edit$/);
    const id = page.url().split("/").at(-2)!;
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByText(/PENDING/).first()).toBeVisible();
    const r = await page.request.post("/api/admin", {
      headers: { Origin: origin },
      data: {
        action: "reviewQuestion",
        id,
        status: "APPROVED",
        notes: "Verified in E2E content approval flow",
      },
    });
    expect(r.status()).toBe(200);
    expect(
      (await db.question.findUniqueOrThrow({ where: { id } })).status,
    ).toBe("APPROVED");
  });
});
test("private common-paper challenge requires an invitation and embargoes results", async ({
  page,
}) => {
  const credentials = {
    admin: {
      email: process.env.SEED_ADMIN_EMAIL!,
      password: process.env.SEED_ADMIN_PASSWORD!,
    },
  };
  await login(page, credentials.admin.email, credentials.admin.password);
  const source = await create(page.request, { name: "Shared-paper fixture" });
  const r = await page.request.post("/api/challenges", {
    headers: { Origin: origin },
    data: {
      action: "create",
      name: "Private test challenge",
      description:
        "A controlled common-paper assessment with a private invitation.",
      sourceTestId: source.testId,
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      public: false,
    },
  });
  expect(r.status()).toBe(200);
  const { id } = await r.json(),
    challenge = await db.challenge.findUniqueOrThrow({ where: { id } });
  await login(page);
  const denied = await page.request.post("/api/challenges", {
    headers: { Origin: origin },
    data: { action: "join", id },
  });
  expect(denied.status()).toBe(403);
  const joined = await page.request.post("/api/challenges", {
    headers: { Origin: origin },
    data: { action: "join", id, inviteCode: challenge.inviteCode },
  });
  expect(joined.status()).toBe(200);
  const { testId } = await joined.json();
  expect(testId).not.toBe(source.testId);
  await page.request.post(`/api/tests/${testId}/submit`, {
    headers: { Origin: origin },
  });
  await page.goto(`/tests/${testId}/result`);
  await expect(
    page.getByRole("heading", { name: "Your challenge is submitted" }),
  ).toBeVisible();
  await db.challenge.update({
    where: { id },
    data: { endsAt: new Date(Date.now() - 1) },
  });
});
test.afterAll(async () => {
  await db.$disconnect();
});
