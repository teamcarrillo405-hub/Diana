// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayStageLayout } from "./today-stage-layout";

const panels = ["Plan", "Week", "Upcoming", "Check-In", "Subjects", "Milestones"];

function renderStage(imageSrc?: string) {
  return render(<TodayStageLayout imageSrc={imageSrc}>{panels.map(label => <section key={label} aria-label={label}>{label}</section>)}</TodayStageLayout>);
}

function mockViewport(initialWidth: number) {
  const listeners = new Set<() => void>();
  const media = {
    matches: initialWidth >= 761,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return (width: number) => {
    act(() => {
      const matches = width >= 761;
      if (matches === media.matches) return;
      media.matches = matches;
      listeners.forEach(listener => listener());
    });
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Lobby phone shortcuts", () => {
  it("focuses and scrolls to the requested section without navigating", () => {
    mockViewport(320);
    const onSelectionChange = vi.fn();
    const originalUrl = window.location.href;
    render(<TodayStageLayout title="Lobby" modes={["now", "week", "milestones"]} labels={{ week: "Progress", milestones: "My Work" }} onSelectionChange={onSelectionChange}>
      <section aria-label="Today's Plan">Plan</section>
      <section aria-label="Study Progress">Progress</section>
      <section aria-label="My Work">Work</section>
    </TodayStageLayout>);
    const progress = screen.getByRole("region", { name: "Study Progress" });
    const scroll = vi.fn();
    Object.defineProperty(progress, "scrollIntoView", { configurable: true, value: scroll });

    const shortcut = screen.getByRole("button", { name: "Jump to Progress" });
    fireEvent.click(shortcut);

    expect(document.activeElement).toBe(progress);
    expect(scroll).toHaveBeenCalledOnce();
    expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
    expect(onSelectionChange).toHaveBeenCalledWith("week");
    expect(shortcut).toHaveAttribute("aria-current", "location");
    expect(shortcut).toHaveAttribute("aria-controls", progress.id);
    expect(screen.getByRole("button", { name: "Jump to Now" })).not.toHaveAttribute("aria-current");
    expect(window.location.href).toBe(originalUrl);
  });

  it("follows the sticky reading line and the last section while scrolling", async () => {
    const resize = mockViewport(390);
    const onSelectionChange = vi.fn();
    vi.stubGlobal("innerHeight", 720);
    vi.stubGlobal("scrollY", 0);
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(1710);
    render(<TodayStageLayout title="Lobby" modes={["now", "check-in", "week"]} onSelectionChange={onSelectionChange}>
      <section aria-label="Plan">Plan</section>
      <section aria-label="Check-In">Check-in</section>
      <section aria-label="This Week">Work</section>
    </TodayStageLayout>);
    const nav = screen.getByRole("navigation", { name: "Jump to Lobby section" });
    vi.spyOn(nav, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, Math.max(0, 120 - window.scrollY), 390, 58));
    for (const [name, top, height] of [["Plan", 196, 580], ["Check-In", 800, 470], ["This Week", 1300, 410]] as const) {
      vi.spyOn(screen.getByRole("region", { name }), "getBoundingClientRect").mockImplementation(() => new DOMRect(0, top - window.scrollY, 390, height));
    }
    const now = screen.getByRole("button", { name: "Jump to Now" });
    const checkIn = screen.getByRole("button", { name: "Jump to Check-In" });
    const week = screen.getByRole("button", { name: "Jump to This Week" });
    expect(now).toHaveAttribute("aria-current", "location");

    vi.stubGlobal("scrollY", 728);
    fireEvent.scroll(window);
    await waitFor(() => expect(checkIn).toHaveAttribute("aria-current", "location"));
    expect(now).not.toHaveAttribute("aria-current");

    vi.stubGlobal("scrollY", 990);
    fireEvent.scroll(window);
    await waitFor(() => expect(week).toHaveAttribute("aria-current", "location"));
    expect(checkIn).not.toHaveAttribute("aria-current");
    expect(onSelectionChange).not.toHaveBeenCalled();

    resize(1024);
    expect(week).not.toHaveAttribute("aria-current");
    vi.stubGlobal("scrollY", 0);
    resize(390);
    await waitFor(() => expect(now).toHaveAttribute("aria-current", "location"));
  });

  it("marks a section when keyboard or Check-in return moves focus there", () => {
    mockViewport(320);
    render(<TodayStageLayout title="Lobby" modes={["now", "check-in", "week"]}>
      <section aria-label="Plan">Plan</section>
      <section aria-label="Check-In"><button type="button">Save</button></section>
      <section aria-label="This Week">Work</section>
    </TodayStageLayout>);

    act(() => screen.getByRole("button", { name: "Save" }).focus());
    expect(screen.getByRole("button", { name: "Jump to Check-In" })).toHaveAttribute("aria-current", "location");
    act(() => screen.getByRole("region", { name: "Plan" }).focus({ preventScroll: true }));
    expect(screen.getByRole("button", { name: "Jump to Now" })).toHaveAttribute("aria-current", "location");
  });

  it("does not add Lobby shortcuts to another Today layout", () => {
    mockViewport(320);
    renderStage();
    expect(screen.queryByRole("navigation", { name: "Jump to Lobby section" })).toBeNull();
  });
});

describe("Today stage breakpoint focus", () => {
  it("can rename a category without changing its panel identity or keyboard order", () => {
    mockViewport(1024);
    render(<TodayStageLayout labels={{ subjects: "Study Mix" }}>{panels.map(label => <section key={label} aria-label={label}>{label}</section>)}</TodayStageLayout>);
    const mix = screen.getByRole("tab", { name: "Study Mix" });
    expect(screen.queryByRole("tab", { name: "Subjects" })).toBeNull();
    fireEvent.click(mix);
    const panel = screen.getByRole("tabpanel", { name: "Study Mix" });
    expect(mix.getAttribute("aria-controls")).toBe(panel.id);
    fireEvent.keyDown(mix, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Check-In" }));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(mix);
    expect(mix.getAttribute("aria-selected")).toBe("true");
  });

  it.each(["Now", "This Week", "Upcoming", "Check-In", "Subjects", "Milestones"])("moves a focused %s rail tab to its phone section at 761 -> 760", name => {
    const resize = mockViewport(761);
    const { container } = renderStage();
    const tab = screen.getByRole("tab", { name });
    fireEvent.click(tab);
    tab.focus();
    const panel = document.getElementById(tab.getAttribute("aria-controls")!)!;
    const focus = vi.spyOn(panel, "focus");

    resize(760);

    expect(document.activeElement).toBe(panel);
    expect(focus).toHaveBeenCalledExactlyOnceWith();
    expect(panel.tabIndex).toBe(-1);
    expect(screen.getAllByRole("region").map(section => section.getAttribute("aria-label"))).toEqual(panels);
    expect(container.querySelectorAll("section[inert], section[aria-hidden=\"true\"]")).toHaveLength(0);
  });

  it.each(panels.slice(1))("rescues focus from the phone %s panel at 760 -> 761 without changing Now", label => {
    const resize = mockViewport(760);
    const onSelectionChange = vi.fn();
    render(<TodayStageLayout onSelectionChange={onSelectionChange}>{panels.map(name => <section key={name} aria-label={name}>
      <input aria-label={`${name} value`} defaultValue="8" />
    </section>)}</TodayStageLayout>);
    const input = screen.getByRole("textbox", { name: `${label} value` });
    fireEvent.change(input, { target: { value: "8.5" } });
    input.focus();

    resize(761);

    const now = screen.getByRole("tab", { name: "Now" });
    expect(document.activeElement).toBe(now);
    expect(now.getAttribute("aria-selected")).toBe("true");
    expect(input.closest("section")).toHaveAttribute("inert");
    expect(onSelectionChange).not.toHaveBeenCalled();

    resize(760);
    expect(screen.getByRole("textbox", { name: `${label} value` })).toBe(input);
    expect(input).toHaveValue("8.5");
  });

  it("rescues focus to the current desktop selection instead of resetting it", () => {
    const resize = mockViewport(761);
    render(<TodayStageLayout>{panels.map(label => <section key={label} aria-label={label}>
      {label === "Check-In" ? <input aria-label="Sleep" defaultValue="8" /> : label}
    </section>)}</TodayStageLayout>);
    const subjects = screen.getByRole("tab", { name: "Subjects" });
    fireEvent.click(subjects);
    resize(760);
    const input = screen.getByRole("textbox", { name: "Sleep" });
    input.focus();
    fireEvent.change(input, { target: { value: "8.5" } });

    resize(761);

    expect(document.activeElement).toBe(subjects);
    expect(subjects.getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Check-In" }));
    expect(screen.getByRole("textbox", { name: "Sleep" })).toBe(input);
    expect(input).toHaveValue("8.5");
  });

  it.each([760, 761])("leaves an accessible panel control focused when crossing from %i", width => {
    const resize = mockViewport(width);
    render(<TodayStageLayout>{panels.map(label => <section key={label} aria-label={label}>
      {label === "Plan" ? <button type="button">Start</button> : label}
    </section>)}</TodayStageLayout>);
    const button = screen.getByRole("button", { name: "Start" });
    button.focus();

    resize(width === 760 ? 761 : 760);

    expect(document.activeElement).toBe(button);
    expect(button.closest("section")).not.toHaveAttribute("inert");
  });

  it.each([760, 761])("does not take outside focus on mount or resize from %i", width => {
    const resize = mockViewport(width);
    render(<button type="button">Outside</button>);
    const outside = screen.getByRole("button", { name: "Outside" });
    outside.focus();
    renderStage();
    expect(document.activeElement).toBe(outside);

    for (const nextWidth of [759, 760, 761, 900, 760]) {
      resize(nextWidth);
      expect(document.activeElement).toBe(outside);
    }
    expect(screen.getByRole("tab", { name: "Now" })).toHaveAttribute("aria-selected", "true");
  });

  it("does not restore previously focused rail controls after an intentional blur", () => {
    const resize = mockViewport(761);
    renderStage();
    const tab = screen.getByRole("tab", { name: "Now" });
    tab.focus();
    tab.blur();

    resize(760);
    resize(761);

    expect(document.activeElement).toBe(document.body);
  });

  it("does not override focus moved elsewhere before the breakpoint update commits", () => {
    const resize = mockViewport(761);
    render(<button type="button">Outside</button>);
    renderStage();
    const outside = screen.getByRole("button", { name: "Outside" });
    screen.getByRole("tab", { name: "Now" }).focus();

    act(() => {
      resize(760);
      outside.focus();
    });

    expect(document.activeElement).toBe(outside);
  });

  it("restores affected focus if the browser clears it before the breakpoint update commits", () => {
    const resize = mockViewport(761);
    renderStage();
    const tab = screen.getByRole("tab", { name: "Now" });
    const panel = document.getElementById(tab.getAttribute("aria-controls")!)!;
    const focus = vi.spyOn(panel, "focus");
    tab.focus();

    act(() => {
      resize(760);
      tab.blur();
    });

    expect(document.activeElement).toBe(panel);
    expect(focus).toHaveBeenCalledExactlyOnceWith();
  });

  it.each([760, 761])("does not invent focus on mount or crossing from %i", width => {
    const resize = mockViewport(width);
    renderStage();
    expect(document.activeElement).toBe(document.body);

    resize(width === 760 ? 761 : 760);

    expect(document.activeElement).toBe(document.body);
  });
});

describe("Today stage artwork", () => {
  it("only emits optional feedback for an actual user selection change", () => {
    const onSelectionChange = vi.fn();
    render(<TodayStageLayout onSelectionChange={onSelectionChange}>{panels.map(label => <section key={label}>{label}</section>)}</TodayStageLayout>);
    expect(onSelectionChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Now" }));
    expect(onSelectionChange).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Now" }), { key: "ArrowDown" });
    expect(onSelectionChange).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("tab", { name: "This Week" }));
    expect(onSelectionChange).toHaveBeenCalledOnce();
  });
  it("only adds the moving selector when explicitly enabled", () => {
    const { container, rerender } = renderStage();
    expect(container.querySelector("[data-today-rail-indicator]")).toBeNull();
    rerender(<TodayStageLayout railIndicator>{panels.map(label => <section key={label}>{label}</section>)}</TodayStageLayout>);
    const indicator = container.querySelector<HTMLElement>("[data-today-rail-indicator]")!;
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Milestones" }));
    expect(indicator.style.getPropertyValue("--selected-index")).toBe("5");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Milestones" }), { key: "Home" });
    expect(indicator.style.getPropertyValue("--selected-index")).toBe("0");
  });
  it("keeps the existing live artwork when no preview image is provided", () => {
    const { container } = renderStage();
    expect(container.querySelector("[data-today-stage-image] img")?.getAttribute("src")).toContain("today-future-academy-4k");
  });

  it("keeps the decorative character mounted across category changes", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const { container } = renderStage("/images/today-diana-cutout.png");
    const image = container.querySelector("[data-today-stage-image] img");
    expect(image?.getAttribute("src")).toContain("today-diana-cutout");
    expect(image?.getAttribute("alt")).toBe("");
    for (const name of ["This Week", "Upcoming", "Check-In", "Subjects", "Milestones", "Now"]) {
      fireEvent.click(screen.getByRole("tab", { name }));
      expect(container.querySelector("[data-today-stage-image] img")).toBe(image);
      expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
      expect(container.querySelectorAll("section[inert]")).toHaveLength(5);
    }
  });

  it("keeps all six phone sections accessible in reading order", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    renderStage("/images/today-diana-cutout.png");
    expect(screen.getAllByRole("region").map(section => section.getAttribute("aria-label"))).toEqual(panels);
    expect(screen.queryAllByRole("tabpanel")).toHaveLength(0);
  });

  it("moves selection and focus together with arrows, Home, and End", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    renderStage("/images/today-diana-cutout.png");
    for (const [from, key, to] of [
      ["Now", "ArrowDown", "This Week"],
      ["This Week", "End", "Milestones"],
      ["Milestones", "ArrowRight", "Now"],
      ["Now", "ArrowLeft", "Milestones"],
      ["Milestones", "Home", "Now"],
    ]) {
      fireEvent.keyDown(screen.getByRole("tab", { name: from }), { key });
      const selected = screen.getByRole("tab", { name: to });
      expect(selected.getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(selected);
    }
  });

  it("preserves unfinished Check-In input while hidden", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<TodayStageLayout imageSrc="/images/today-diana-cutout.png">{panels.map(label => <section key={label} aria-label={label}>
      {label === "Check-In" ? <input aria-label="Sleep" defaultValue="8" /> : label}
    </section>)}</TodayStageLayout>);
    fireEvent.click(screen.getByRole("tab", { name: "Check-In" }));
    const input = screen.getByRole("textbox", { name: "Sleep" });
    fireEvent.change(input, { target: { value: "8.5" } });
    fireEvent.click(screen.getByRole("tab", { name: "Subjects" }));
    expect(screen.queryByRole("textbox", { name: "Sleep" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Check-In" }));
    expect(screen.getByRole("textbox", { name: "Sleep" })).toBe(input);
    expect((input as HTMLInputElement).value).toBe("8.5");
  });
});
