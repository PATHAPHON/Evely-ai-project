import { describe, it, expect } from "vitest";
import { findLastAssistantId } from "../utils/chatListHelpers";
import type { ChatMessage } from "@/shared/types/chatTypes";

const msg = (id: string, role: ChatMessage["role"], status?: string): ChatMessage =>
  ({ id, role, status } as ChatMessage);

describe("findLastAssistantId", () => {
  it("returns null when there are no messages", () => {
    expect(findLastAssistantId([])).toBeNull();
  });

  it("returns null when there are no assistant messages", () => {
    expect(findLastAssistantId([msg("1", "user"), msg("2", "user")])).toBeNull();
  });

  it("returns the id of the last settled assistant message", () => {
    expect(
      findLastAssistantId([msg("a", "assistant"), msg("u", "user"), msg("b", "assistant")])
    ).toBe("b");
  });

  it("ignores pending assistant messages", () => {
    expect(
      findLastAssistantId([msg("a", "assistant"), msg("b", "assistant", "pending")])
    ).toBe("a");
  });

  it("returns null when the only assistant message is pending", () => {
    expect(findLastAssistantId([msg("a", "assistant", "pending")])).toBeNull();
  });
});
