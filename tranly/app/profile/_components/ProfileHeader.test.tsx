import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProfileHeader from "./ProfileHeader";
import type { UseUserProfileReturn } from "../_lib/useUserProfile";

function makeProfile(overrides: Partial<UseUserProfileReturn> = {}): UseUserProfileReturn {
  return {
    displayName: "TestUser",
    handle: "tester",
    role: "Learning Korean",
    bio: "Hello there",
    location: "Bangkok",
    avatarInitial: "T",
    setDisplayName: vi.fn(),
    updateProfile: vi.fn(),
    ...overrides,
  };
}

describe("ProfileHeader", () => {
  it("renders avatar initial, name, handle and role", () => {
    render(
      <ProfileHeader
        profile={makeProfile()}
        onEdit={vi.fn()}
        onShare={vi.fn()}
        onOpenViewer={vi.fn()}
      />
    );
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("TestUser")).toBeInTheDocument();
    expect(screen.getByText("@tester")).toBeInTheDocument();
    expect(screen.getByText("Learning Korean")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("opens the viewer when the identity row is tapped", () => {
    const onOpenViewer = vi.fn();
    render(
      <ProfileHeader
        profile={makeProfile()}
        onEdit={vi.fn()}
        onShare={vi.fn()}
        onOpenViewer={onOpenViewer}
      />
    );
    fireEvent.click(screen.getByText("TestUser"));
    expect(onOpenViewer).toHaveBeenCalledOnce();
  });

  it("fires edit and share callbacks", () => {
    const onEdit = vi.fn();
    const onShare = vi.fn();
    render(
      <ProfileHeader
        profile={makeProfile()}
        onEdit={onEdit}
        onShare={onShare}
        onOpenViewer={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("แก้ไขโปรไฟล์"));
    fireEvent.click(screen.getByText("แชร์"));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
  });
});
