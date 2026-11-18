// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  change: vi.fn()
}));
vi.mock("@/app/(auth)/password-actions", () => ({
  changeAccountPassword: mocks.change
}));
import { AccountSecurity } from "./account-security";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.change.mockResolvedValue({
    ok: true,
    message: "Your password is saved."
  });
});
afterEach(cleanup);
function fill() {
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: {
      value: "current phrase"
    }
  });
  fireEvent.change(screen.getByLabelText("New password", {
    exact: true
  }), {
    target: {
      value: "a new long phrase"
    }
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: {
      value: "a new long phrase"
    }
  });
}
function submit() {
  fireEvent.submit(screen.getByRole("button", {
    name: "Save password"
  }).closest("form")!);
}
describe("account security", () => {
  it("sends the three private fields, clears them after success and confirms accessibly", async () => {
    render(<AccountSecurity email="student@example.test" />);
    fill();
    submit();
    expect(await screen.findByRole("status")).toHaveTextContent("Your password is saved.");
    expect(mocks.change).toHaveBeenCalledWith("current phrase", "a new long phrase", "a new long phrase");
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password", {
      exact: true
    })).toHaveValue("");
  });
  it("shows passwords only on request", () => {
    render(<AccountSecurity />);
    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", {
      name: "Show passwords"
    }));
    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "text");
  });
  it("validates confirmation before sending", () => {
    render(<AccountSecurity />);
    fill();
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: {
        value: "another phrase"
      }
    });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("same new password");
    expect(mocks.change).not.toHaveBeenCalled();
  });
  it("retains private fields on a connection interruption and lets the student retry", async () => {
    mocks.change.mockRejectedValue(new Error("private diagnostic"));
    render(<AccountSecurity />);
    fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("connection paused");
    expect(screen.getByLabelText("Current password")).toHaveValue("current phrase");
    expect(screen.getByRole("button", {
      name: "Save password"
    })).toBeEnabled();
    expect(screen.queryByText("private diagnostic")).not.toBeInTheDocument();
  });
  it("guards repeated submissions while saving", async () => {
    let finish!: (value: {
      ok: boolean;
      message: string;
    }) => void;
    mocks.change.mockImplementation(() => new Promise(resolve => {
      finish = resolve;
    }));
    render(<AccountSecurity />);
    fill();
    submit();
    fireEvent.submit(screen.getByRole("button", {
      name: "Saving…"
    }).closest("form")!);
    expect(mocks.change).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", {
      name: "Saving…"
    })).toBeDisabled();
    finish({
      ok: true,
      message: "Saved."
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved."));
  });
});
