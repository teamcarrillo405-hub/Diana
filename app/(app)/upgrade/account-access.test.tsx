// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/components/screen-design/student-desktop-nav", () => ({ StudentDesktopNav: () => <nav aria-label="Primary" /> }));
import { AccountAccess } from "./account-access";
afterEach(cleanup);

describe("authenticated Diana access", () => {
  it("only offers checkout when a configured billing destination exists", () => {
    render(<AccountAccess billingEnabled />);
    expect(screen.getByRole("link",{name:"Continue to secure checkout"})).toHaveAttribute("href","/api/billing/checkout");
    expect(screen.queryByText(/create your account/i)).toBeNull();
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });
  it("keeps account access truthful when checkout is unavailable", () => {
    render(<AccountAccess billingEnabled={false} />);
    expect(screen.getByText(/Your current account access has not changed/)).toBeInTheDocument();
    expect(screen.queryByRole("link",{name:"Continue to secure checkout"})).toBeNull();
    expect(screen.getByRole("link",{name:"Manage access in Settings"})).toHaveAttribute("href","/settings");
    expect(screen.getByRole("link",{name:"Back to More"})).toHaveAttribute("href","/more");
  });
});
