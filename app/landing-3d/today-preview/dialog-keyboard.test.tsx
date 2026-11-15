// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { containDialogTab } from "./dialog-keyboard";

afterEach(cleanup);

it("wraps Tab in both directions and excludes unavailable controls", () => {
  render(<dialog open onKeyDown={containDialogTab}><button>Back</button><textarea aria-label="Notes" /><button>Finish</button><button disabled>Unavailable</button><button tabIndex={-1}>Excluded</button><div hidden><button>Hidden</button></div></dialog>);
  const first = screen.getByRole("button", { name: "Back" });
  const last = screen.getByRole("button", { name: "Finish" });
  last.focus();
  fireEvent.keyDown(last, { key: "Tab" });
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(last);
});

it("keeps Tab on the single Back control during a readiness wait", () => {
  render(<dialog open onKeyDown={containDialogTab}><button>Back</button><h2 tabIndex={-1}>Opening session...</h2></dialog>);
  const back = screen.getByRole("button", { name: "Back" });
  const heading = screen.getByRole("heading");
  heading.focus();
  expect(fireEvent.keyDown(heading, { key: "Tab" })).toBe(false);
  expect(document.activeElement).toBe(back);
  heading.focus();
  expect(fireEvent.keyDown(heading, { key: "Tab", shiftKey: true })).toBe(false);
  expect(document.activeElement).toBe(back);
  expect(fireEvent.keyDown(back, { key: "Tab" })).toBe(false);
  expect(document.activeElement).toBe(back);
  expect(fireEvent.keyDown(back, { key: "Tab", shiftKey: true })).toBe(false);
});

it("recovers Tab after the focused Retry becomes disabled", () => {
  const { rerender } = render(<dialog open onKeyDown={containDialogTab}><button>Back</button><button>Retry</button></dialog>);
  const retry = screen.getByRole("button", { name: "Retry" });
  retry.focus();
  rerender(<dialog open onKeyDown={containDialogTab}><button>Back</button><button disabled>Retry</button></dialog>);
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Back" }));
});
