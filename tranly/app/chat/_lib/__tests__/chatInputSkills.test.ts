import { describe, it, expect } from "vitest";
import {
  getMatchingSkills,
  composeMessage,
  parseInlineExam,
  SKILLS,
} from "../chatInputSkills";

const enabled = { skillsEnabled: true, allowInlineSkill: true, committedSkill: null };

describe("getMatchingSkills", () => {
  it("matches /exam by its slash prefix", () => {
    expect(getMatchingSkills({ ...enabled, inputValue: "/e" })).toEqual(SKILLS.filter((s) => s.command.startsWith("/e")));
    expect(getMatchingSkills({ ...enabled, inputValue: "/exam" }).map((s) => s.command)).toEqual(["/exam"]);
  });

  it("returns [] once a space is typed", () => {
    expect(getMatchingSkills({ ...enabled, inputValue: "/exam topic" })).toEqual([]);
  });

  it("returns [] when input does not start with /", () => {
    expect(getMatchingSkills({ ...enabled, inputValue: "hello" })).toEqual([]);
  });

  it("returns [] when a skill is already committed", () => {
    expect(getMatchingSkills({ ...enabled, committedSkill: "/exam", inputValue: "/e" })).toEqual([]);
  });

  it("returns [] when skills disabled or inline disallowed", () => {
    expect(getMatchingSkills({ ...enabled, skillsEnabled: false, inputValue: "/e" })).toEqual([]);
    expect(getMatchingSkills({ ...enabled, allowInlineSkill: false, inputValue: "/e" })).toEqual([]);
  });

  it("returns [] when the query matches no skill", () => {
    expect(getMatchingSkills({ ...enabled, inputValue: "/zzz" })).toEqual([]);
  });
});

describe("composeMessage", () => {
  it("prepends the skill chip and trims", () => {
    expect(composeMessage("/exam", "  food  ")).toBe("/exam food");
  });

  it("trims the topic to empty when no input", () => {
    expect(composeMessage("/exam", "   ")).toBe("/exam");
  });

  it("returns just the trimmed input when no skill", () => {
    expect(composeMessage(null, "  hi ")).toBe("hi");
  });
});

describe("parseInlineExam", () => {
  it("extracts the topic after '/exam '", () => {
    expect(parseInlineExam("/exam food")).toBe("food");
    expect(parseInlineExam("/EXAM travel")).toBe("travel");
  });

  it("returns empty topic for '/exam ' with nothing after", () => {
    expect(parseInlineExam("/exam ")).toBe("");
  });

  it("returns null without a trailing space", () => {
    expect(parseInlineExam("/exam")).toBeNull();
    expect(parseInlineExam("hello")).toBeNull();
  });
});
