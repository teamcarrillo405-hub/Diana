// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  signin: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  next: "/calendar"
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    refresh: mocks.refresh
  }),
  useSearchParams: () => new URLSearchParams({
    next: mocks.next
  })
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mocks.signin
    }
  })
}));
import { LoginForm } from "./form";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.next = "/calendar";
  mocks.signin.mockResolvedValue({
    error: null
  });
});
afterEach(cleanup);
function fill() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: {
      value: "student@example.test"
    }
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "existing-password"
    }
  });
}
function submit() {
  fireEvent.submit(screen.getByRole("button", {
    name: "Sign in"
  }).closest("form")!);
}
describe("sign in", () => {
  it("opens the requested student page after successful sign-in", async () => {
    render(<LoginForm />);
    fill();
    submit();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/calendar"));
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });
  it("does not navigate outside the app", async () => {
    mocks.next = "//other.example";
    render(<LoginForm />);
    fill();
    submit();
    await vi.waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/dashboard"));
  });
  it("keeps the form usable after a connection interruption without exposing diagnostics", async () => {
    mocks.signin.mockRejectedValue(new Error("private diagnostic"));
    render(<LoginForm />);
    fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("connection paused");
    expect(screen.getByLabelText("Email")).toHaveValue("student@example.test");
    expect(screen.getByRole("button", {
      name: "Sign in"
    })).toBeEnabled();
  });
  it("lets the student reveal a password and request recovery", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", {
      name: "Show password"
    }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("link", {
      name: "Forgot password?"
    })).toHaveAttribute("href", "/forgot-password?next=%2Fcalendar");
  });
});
