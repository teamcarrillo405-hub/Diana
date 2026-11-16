// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LobbyPreviewPage from "./page";

vi.mock("@/components/dashboard/lobby/diana-idle-character", () => ({ DianaIdleCharacter: () => null }));

describe("public Lobby preview", () => {
  it("uses sample data and exposes no live links or enabled controls", () => {
    const { container } = render(<LobbyPreviewPage />);
    expect(screen.getByText(/Lobby design preview · Sample data · Read-only/)).toBeTruthy();
    expect(screen.getByText(/Linear equations practice set/i)).toBeTruthy();
    expect(container.querySelectorAll("a[href], form")).toHaveLength(0);
    expect([...container.querySelectorAll("button")].every(button => button.disabled)).toBe(true);
  });
});
