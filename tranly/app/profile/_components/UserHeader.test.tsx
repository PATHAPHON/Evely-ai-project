import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserHeader from "./UserHeader";

// Mock the useUserProfile hook
const mockSetDisplayName = vi.fn();
vi.mock("../_lib/useUserProfile", () => ({
  useUserProfile: () => ({
    displayName: "TestUser",
    setDisplayName: mockSetDisplayName,
    avatarInitial: "T",
  }),
}));

describe("UserHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders avatar with initial", () => {
    render(<UserHeader />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders display name", () => {
    render(<UserHeader />);
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("switches to edit mode on name click", () => {
    render(<UserHeader />);
    fireEvent.click(screen.getByLabelText("Tap to edit display name"));
    expect(screen.getByLabelText("Edit display name")).toBeInTheDocument();
  });

  it("shows current name in input when editing", () => {
    render(<UserHeader />);
    fireEvent.click(screen.getByLabelText("Tap to edit display name"));
    const input = screen.getByLabelText("Edit display name") as HTMLInputElement;
    expect(input.value).toBe("TestUser");
  });

  it("saves on Enter key", () => {
    render(<UserHeader />);
    fireEvent.click(screen.getByLabelText("Tap to edit display name"));
    const input = screen.getByLabelText("Edit display name");
    fireEvent.change(input, { target: { value: "NewName" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockSetDisplayName).toHaveBeenCalledWith("NewName");
  });

  it("saves on blur", () => {
    render(<UserHeader />);
    fireEvent.click(screen.getByLabelText("Tap to edit display name"));
    const input = screen.getByLabelText("Edit display name");
    fireEvent.change(input, { target: { value: "BlurName" } });
    fireEvent.blur(input);
    expect(mockSetDisplayName).toHaveBeenCalledWith("BlurName");
  });

  it("avatar has 64px dimensions and neobrutalist border", () => {
    render(<UserHeader />);
    const avatar = screen.getByText("T").parentElement!;
    expect(avatar.className).toContain("w-16");
    expect(avatar.className).toContain("h-16");
    expect(avatar.className).toContain("rounded-full");
    expect(avatar.className).toContain("border-3");
    expect(avatar.className).toContain("border-border-color");
    expect(avatar.className).toContain("shadow-nb-md");
  });
});
