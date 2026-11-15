// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DianaMotionControls } from "./diana-motion-controls";

afterEach(cleanup);
const handlers = () => ({ onMode: vi.fn(), onPause: vi.fn(), onRestart: vi.fn() });

describe("Diana review controls", () => {
  it("changes modes in place and exposes pause and restart", () => {
    const callbacks = handlers();
    render(<DianaMotionControls enabled paused={false} status="playing" {...callbacks} />);
    expect(screen.getByRole("button", { name: "Motion" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Still" }));
    expect(callbacks.onMode).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Pause Diana motion" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart Diana motion" }));
    expect(callbacks.onPause).toHaveBeenCalledOnce();
    expect(callbacks.onRestart).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("allows recovery after unavailable video without a page reload", () => {
    const callbacks = handlers();
    render(<DianaMotionControls enabled paused={false} status="unavailable" {...callbacks} />);
    expect((screen.getByRole("button", { name: "Diana motion unavailable" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Restart Diana motion" }));
    expect(callbacks.onRestart).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toContain("still image");
  });

  it("treats performance still as a smooth-device fallback with restart", () => {
    const callbacks = handlers();
    render(<DianaMotionControls enabled paused={false} status="performance-still" {...callbacks} />);
    expect((screen.getByRole("button", { name: "Diana still image" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Restart Diana motion" }));
    expect(callbacks.onRestart).toHaveBeenCalledOnce();
    expect(screen.getByRole("status").textContent).toContain("keep this device smooth");
  });

  it("keeps reduced motion on the still and disables motion actions", () => {
    render(<DianaMotionControls enabled paused={false} status="reduced-motion" {...handlers()} />);
    expect(screen.getByRole("button", { name: "Still" }).getAttribute("aria-pressed")).toBe("true");
    for (const name of ["Motion", "Diana motion off for reduced motion", "Restart Diana motion"]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("disables playback actions in still mode", () => {
    render(<DianaMotionControls enabled={false} paused status="still" {...handlers()} />);
    expect((screen.getByRole("button", { name: "Diana motion off" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Restart Diana motion" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("can delegate its status announcement to the surrounding toolbar", () => {
    render(<DianaMotionControls enabled paused={false} status="unavailable" hideStatus {...handlers()} />);
    expect(screen.queryByRole("status", { hidden: true })).toBeNull();
    expect(screen.getByRole("button", { name: "Restart Diana motion" })).toBeTruthy();
  });

  it("clears a fallback announcement when the student chooses still mode", () => {
    const callbacks = handlers();
    const { rerender } = render(<DianaMotionControls enabled paused={false} status="performance-still" {...callbacks} />);
    const announcement = screen.getByRole("status");
    expect(announcement.textContent).toContain("keep this device smooth");
    rerender(<DianaMotionControls enabled={false} paused={false} status="performance-still" {...callbacks} />);
    expect(screen.getByRole("status")).toBe(announcement);
    expect(announcement.textContent).toBe("");
  });
});
