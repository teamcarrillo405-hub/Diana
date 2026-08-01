// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { saveParentDigest } from "./digest-actions";
import { ParentDigestForm } from "./parent-digest-form";

vi.mock("./digest-actions", () => ({
  saveParentDigest: vi.fn(),
}));

describe("ParentDigestForm", () => {
  afterEach(cleanup);

  it("saves the selected weekly digest setting", async () => {
    vi.mocked(saveParentDigest).mockResolvedValue({ ok: true });
    render(<ParentDigestForm initialEmail="" initialEnabled={false} />);

    expect(screen.getByRole("heading", { name: "Weekly parent digest" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Parent email address"), {
      target: { value: "parent@example.com" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "Send weekly digest" }));
    fireEvent.click(screen.getByRole("button", { name: "Save digest" }));

    await waitFor(() => {
      expect(saveParentDigest).toHaveBeenCalledWith({
        email: "parent@example.com",
        enabled: true,
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent("each Sunday");
  });
});
