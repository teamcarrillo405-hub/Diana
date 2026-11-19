// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ConnectionChoices } from "./connection-choices";
afterEach(cleanup);
it("collects the Canvas school address required by OAuth and keeps Calendar separate", () => {
  render(<ConnectionChoices options={[{ id: "canvas", label: "Connect Canvas LMS", href: "/api/lms/canvas-oauth/start" }, { id: "google-calendar", label: "Connect Google Calendar", href: "/api/lms/google-oauth/start?calendar=1&return_to=/calendar" }]} />);
  const address = screen.getByRole("textbox", { name: "Canvas school address" });
  expect(address).toBeRequired();
  expect(address).toHaveAttribute("type", "url");
  expect(address).toHaveAttribute("name", "base_url");
  expect(address.closest("form")).toHaveAttribute("action", "/api/lms/canvas-oauth/start");
  expect(address.closest("form")).toHaveAttribute("method", "get");
  expect(screen.getByRole("link", { name: "Connect Google Calendar" })).toHaveAttribute("href", "/api/lms/google-oauth/start?calendar=1&return_to=/calendar");
});
