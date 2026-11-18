// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  request: vi.fn()
}));
vi.mock("@/app/(auth)/password-actions", () => ({
  requestPasswordReset: mocks.request
}));
import { ForgotPasswordForm } from "./form";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.request.mockResolvedValue({
    ok: true,
    message: "If an account matches this email, a reset link will arrive shortly."
  });
});
afterEach(cleanup);
function submit() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: {
      value: "student@example.test"
    }
  });
  fireEvent.submit(screen.getByRole("button", {
    name: "Send reset link"
  }).closest("form")!);
}
describe("password recovery form", () => {
  it("shows the generic sent state and prevents rapid resend", async () => {
    render(<ForgotPasswordForm next="/calendar" />);
    submit();
    expect(await screen.findByRole("status")).toHaveTextContent("If an account matches");
    expect(mocks.request).toHaveBeenCalledWith("student@example.test", "/calendar");
    expect(screen.getByRole("button", {
      name: "Send again in 60s"
    })).toBeDisabled();
  });
  it("retains email and supports retry after a connection interruption", async () => {
    mocks.request.mockRejectedValue(new Error("private diagnostic"));
    render(<ForgotPasswordForm next="/calendar" />);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("connection paused");
    expect(screen.getByLabelText("Email")).toHaveValue("student@example.test");
    expect(screen.getByRole("button", {
      name: "Send reset link"
    })).toBeEnabled();
  });
});
