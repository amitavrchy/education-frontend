import { beforeEach, describe, expect, it } from "vitest";
import { resetMockDb } from "@/lib/mock-db";
import { books } from "@/mock-data/books";
import { answerFromBook, isBangla, toSpoken } from "@/services/ai/book-avatar-engine";
import { avatarService, avatarsRepo, defaultAppearance, defaultAvatarFor } from "@/services/avatar.service";

beforeEach(async () => {
  await resetMockDb();
});

const physics = books.find((b) => b.id === "book-ssc-physics-bn")!;
const avatar = defaultAvatarFor(physics);

describe("book avatar engine (answers only from its book)", () => {
  it("answers an in-book question with a page citation from that book", () => {
    const a = answerFromBook({ book: physics, avatar, query: "ত্বরণ কাকে বলে?" });
    expect(a.grounded).toBe("book");
    expect(a.citations.length).toBeGreaterThan(0);
    expect(a.citations[0].page).toBeGreaterThan(0);
  });

  it("declines out-of-book questions under strict scope and suggests book topics", () => {
    const a = answerFromBook({ book: physics, avatar: { ...avatar, strictBookScope: true }, query: "বাংলাদেশের রাজধানীর নাম কী?" });
    expect(a.grounded).toBe("out_of_scope");
    expect(a.citations).toHaveLength(0);
    expect(a.followUps.length).toBeGreaterThan(0);
  });

  it("replies in the question's language", () => {
    expect(isBangla(answerFromBook({ book: physics, avatar, query: "ত্বরণ কাকে বলে?" }).text)).toBe(true);
    expect(isBangla(answerFromBook({ book: physics, avatar, query: "What is acceleration?" }).text)).toBe(false);
  });

  it("produces speakable text without markdown/LaTeX markup", () => {
    const spoken = toSpoken("**বল**: $F = ma$ — [পৃষ্ঠা ১২](/x)", "bn");
    expect(spoken).not.toMatch(/[*$[\]]/);
  });
});

describe("avatar defaults", () => {
  it("is deterministic and varies across books (names and genders)", () => {
    expect(defaultAppearance("x")).toEqual(defaultAppearance("x"));
    const all = books.map((b) => defaultAvatarFor(b));
    expect(new Set(all.map((a) => a.name.bn)).size).toBeGreaterThan(3);
    expect(new Set(all.map((a) => a.appearance.gender)).size).toBe(2);
  });
});

describe("avatar service", () => {
  it("creates exactly one avatar per uploaded book (idempotent)", async () => {
    const book = { id: "book-upload-test", title: { bn: "ডেমো", en: "Demo" }, language: "bn" as const, subjectId: "ssc-physics" };
    const a1 = await avatarService.ensureForBook(book);
    const a2 = await avatarService.ensureForBook(book);
    expect(a1.id).toBe(a2.id);
    expect((await avatarsRepo.raw()).filter((a) => a.bookId === book.id)).toHaveLength(1);
  });

  it("rejects saving without a name", async () => {
    const a = await avatarService.forBook(physics.id);
    await expect(avatarService.save({ ...a, name: { bn: " ", en: "x" } })).rejects.toThrow(/AVATAR_NAME_REQUIRED/);
  });

  it("runs a class session: greeting, grounded answer, stats and session counters", async () => {
    const { session, greeting } = await avatarService.startSession("u-test", physics.id);
    expect(greeting.grounded).toBe("greeting");
    const before = await avatarService.forBook(physics.id);
    const { reply } = await avatarService.ask("u-test", session.id, "নিউটনের দ্বিতীয় সূত্র বুঝিয়ে দাও", "voice");
    expect(reply.grounded).toBe("book");
    expect(reply.citations.length).toBeGreaterThan(0);
    const after = await avatarService.forBook(physics.id);
    expect(after.stats.questions).toBe(before.stats.questions + 1);
    const [s] = (await avatarService.sessions("u-test")).filter((x) => x.id === session.id);
    expect(s.voiceTurns).toBe(1);
    expect(await avatarService.messages("u-test", session.id)).toHaveLength(3);
  });

  it("hides avatars an institution has switched off", async () => {
    const all = await avatarService.availableForStudents();
    const off = all[0].avatar.id;
    await avatarService.setInstitutionAvailability("inst-test", [off]);
    const visible = await avatarService.availableForStudents("inst-test");
    expect(visible.some((x) => x.avatar.id === off)).toBe(false);
    expect(visible.length).toBe(all.length - 1);
  });
});
