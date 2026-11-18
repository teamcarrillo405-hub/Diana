// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  save: vi.fn()
}));
vi.mock("@/app/(auth)/password-actions", () => ({
  completePasswordReset: mocks.save
}));
import { ResetPasswordForm } from "./form";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.save.mockResolvedValue({
    ok: true,
    message: "Your password is saved.",
    next: "/calendar"
  });
});
afterEach(cleanup);
function fill(confirmation = "a new long phrase") {
  fireEvent.change(screen.getByLabelText("New password", {
    exact: true
  }), {
    target: {
      value: "a new long phrase"
    }
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: {
      value: confirmation
    }
  });
  fireEvent.submit(screen.getByRole("button", {
    name: "Save password"
  }).closest("form")!);
}
describe("recovered password form", () => {
  it("has no password form when the server has no valid recovery proof", () => {
    render(<ResetPasswordForm available={false} />);
    expect(screen.getByRole("heading", { name: "Request a fresh link" })).toBeInTheDocument();
    expect(screen.queryByLabelText("New password", { exact: true })).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("retains its success state when cookie updates refresh server availability during the action", async () => {
    let finish!: (value: {ok: boolean; message: string; next: string}) => void;
    mocks.save.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const {rerender} = render(<ResetPasswordForm available />);
    fill();
    rerender(<ResetPasswordForm available={false} />);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: "Request a fresh link" })).not.toBeInTheDocument();
    await act(async () => { finish({ok: true, message: "Your password is saved.", next: "/settings?section=security"}); });
    expect(screen.getByRole("heading", { name: "Password saved" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue to campus" })).toHaveAttribute("href", "/settings?section=security");
    expect(screen.queryByLabelText("New password", { exact: true })).not.toBeInTheDocument();
  });

  it("confirms a saved password and provides the safe continuation", async () => {
    render(<ResetPasswordForm />);
    fill();
    expect(await screen.findByRole("status")).toHaveTextContent("Your password is saved.");
    expect(screen.getByRole("link", {
      name: "Continue to campus"
    })).toHaveAttribute("href", "/calendar");
    expect(screen.queryByLabelText("New password", {
      exact: true
    })).not.toBeInTheDocument();
  });
  it("stops mismatched passwords before sending", () => {
    render(<ResetPasswordForm />);
    fill("a different phrase");
    expect(screen.getByRole("alert")).toHaveTextContent("same new password");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("preserves private fields for a calm retry after interrupted save", async () => {
    mocks.save.mockRejectedValue(new Error("private diagnostic"));
    render(<ResetPasswordForm />);
    fill();
    expect(await screen.findByRole("alert")).toHaveTextContent("connection paused");
    expect(screen.getByLabelText("New password", {
      exact: true
    })).toHaveValue("a new long phrase");
    expect(screen.getByRole("button", {
      name: "Save password"
    })).toBeEnabled();
  });
});
