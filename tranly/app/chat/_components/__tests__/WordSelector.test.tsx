import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import WordSelector from "../WordSelector";
import type { SavedWord } from "../../_lib/types";

vi.mock("@/app/_lib/useLanguagePreference", () => ({
  useLanguagePreference: () => ({
    language: "thai",
    setLanguage: vi.fn(),
  }),
}));

function makeWord(id: string, korean = `단어${id}`): SavedWord {
  return {
    id,
    korean,
    reading: `อ่าน${id}`,
    romanization: `rom${id}`,
    english: `meaning${id}`,
    thai: `ไทย${id}`,
    source: "word-store",
  };
}

describe("WordSelector", () => {
  const onSelectionChange = vi.fn();
  const onClose = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders saved words with Korean text and correct translation language rendering", () => {
    const words = [makeWord("1", "사과"), makeWord("2", "바นานา")];
    render(
      <WordSelector
        savedWords={words}
        selectedWords={[]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    expect(screen.getByText("사과")).toBeInTheDocument();
    expect(screen.getByText("바นานา")).toBeInTheDocument();
    expect(screen.getByText("ไทย1")).toBeInTheDocument();
    expect(screen.getByText("ไทย2")).toBeInTheDocument();
  });

  it("shows selected count as 0/10 when nothing selected", () => {
    render(
      <WordSelector
        savedWords={[makeWord("1")]}
        selectedWords={[]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    expect(screen.getByText("0/10")).toBeInTheDocument();
  });

  it("shows selected count reflecting current selection", () => {
    const words = [makeWord("1"), makeWord("2"), makeWord("3")];
    render(
      <WordSelector
        savedWords={words}
        selectedWords={[words[0], words[1]]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    expect(screen.getByText("2/10")).toBeInTheDocument();
  });

  it("calls onSelectionChange with added word when unselected word is clicked", () => {
    const words = [makeWord("1"), makeWord("2")];
    render(
      <WordSelector
        savedWords={words}
        selectedWords={[words[0]]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Select 단어2"));
    expect(onSelectionChange).toHaveBeenCalledWith([words[0], words[1]]);
  });

  it("calls onSelectionChange with removed word when selected word is clicked", () => {
    const words = [makeWord("1"), makeWord("2")];
    render(
      <WordSelector
        savedWords={words}
        selectedWords={[words[0], words[1]]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Deselect 단어1"));
    expect(onSelectionChange).toHaveBeenCalledWith([words[1]]);
  });

  it("disables further selection when at 10 word cap", () => {
    const selected = Array.from({ length: 10 }, (_, i) => makeWord(`s${i}`));
    const extra = makeWord("extra");
    render(
      <WordSelector
        savedWords={[...selected, extra]}
        selectedWords={selected}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    expect(screen.getByText("10/10")).toBeInTheDocument();
    // The extra word button should be disabled
    const extraButton = screen.getByLabelText("Select 단어extra");
    expect(extraButton).toBeDisabled();
  });

  it("does not call onSelectionChange when disabled word is clicked", () => {
    const selected = Array.from({ length: 10 }, (_, i) => makeWord(`s${i}`));
    const extra = makeWord("extra");
    render(
      <WordSelector
        savedWords={[...selected, extra]}
        selectedWords={selected}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Select 단어extra"));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("shows cap warning message when at maximum selection", () => {
    const selected = Array.from({ length: 10 }, (_, i) => makeWord(`s${i}`));
    render(
      <WordSelector
        savedWords={selected}
        selectedWords={selected}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    expect(screen.getByText("เลือกได้สูงสุด 10 คำแล้ว")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <WordSelector
        savedWords={[makeWord("1")]}
        selectedWords={[]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Close word selector"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when done button is clicked", () => {
    render(
      <WordSelector
        savedWords={[makeWord("1")]}
        selectedWords={[]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText("เสร็จสิ้น (0 คำ)"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no saved words available", () => {
    render(
      <WordSelector
        savedWords={[]}
        selectedWords={[]}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    expect(screen.getByText("ไม่มีคำศัพท์ที่บันทึกไว้")).toBeInTheDocument();
  });

  it("still allows deselecting when at cap", () => {
    const selected = Array.from({ length: 10 }, (_, i) => makeWord(`s${i}`));
    render(
      <WordSelector
        savedWords={selected}
        selectedWords={selected}
        onSelectionChange={onSelectionChange}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Deselect 단어s0"));
    expect(onSelectionChange).toHaveBeenCalledWith(
      selected.filter((w) => w.id !== "s0")
    );
  });
});
