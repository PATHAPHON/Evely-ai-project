import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import ErrorOverlay from "./ErrorOverlay";
import { CameraError } from "../_lib/types";

describe("ErrorOverlay", () => {
  const onRetry = vi.fn();
  const onDismiss = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("displays Thai message for permission_denied error", () => {
    const error: CameraError = { type: "permission_denied", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    expect(
      screen.getByText("กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าอุปกรณ์")
    ).toBeInTheDocument();
  });

  it("displays Thai message for not_found error", () => {
    const error: CameraError = { type: "not_found", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    expect(screen.getByText("ไม่พบกล้องบนอุปกรณ์นี้")).toBeInTheDocument();
  });

  it("displays Thai message for stream_interrupted error", () => {
    const error: CameraError = { type: "stream_interrupted", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    expect(screen.getByText("การเชื่อมต่อกล้องขาดหาย")).toBeInTheDocument();
  });

  it("displays Thai message for capture_failed error", () => {
    const error: CameraError = { type: "capture_failed", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    expect(
      screen.getByText("ถ่ายภาพไม่สำเร็จ กรุณาลองอีกครั้ง")
    ).toBeInTheDocument();
  });

  it("shows retry button for stream_interrupted error", () => {
    const error: CameraError = { type: "stream_interrupted", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    const retryButton = screen.getByText("ลองอีกครั้ง");
    expect(retryButton).toBeInTheDocument();
    expect(screen.queryByText("ปิด")).not.toBeInTheDocument();
  });

  it("shows retry button for capture_failed error", () => {
    const error: CameraError = { type: "capture_failed", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    const retryButton = screen.getByText("ลองอีกครั้ง");
    expect(retryButton).toBeInTheDocument();
    expect(screen.queryByText("ปิด")).not.toBeInTheDocument();
  });

  it("shows dismiss button for permission_denied error", () => {
    const error: CameraError = { type: "permission_denied", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    const dismissButton = screen.getByText("ปิด");
    expect(dismissButton).toBeInTheDocument();
    expect(screen.queryByText("ลองอีกครั้ง")).not.toBeInTheDocument();
  });

  it("shows dismiss button for not_found error", () => {
    const error: CameraError = { type: "not_found", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    const dismissButton = screen.getByText("ปิด");
    expect(dismissButton).toBeInTheDocument();
    expect(screen.queryByText("ลองอีกครั้ง")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const error: CameraError = { type: "stream_interrupted", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    fireEvent.click(screen.getByText("ลองอีกครั้ง"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when dismiss button is clicked", () => {
    const error: CameraError = { type: "permission_denied", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    fireEvent.click(screen.getByText("ปิด"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders with role=alert for accessibility", () => {
    const error: CameraError = { type: "not_found", message: "" };
    render(
      <ErrorOverlay error={error} onRetry={onRetry} onDismiss={onDismiss} />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
