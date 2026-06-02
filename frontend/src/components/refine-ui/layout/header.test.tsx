// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stub Radix-based dropdown so content always renders (no trigger needed)
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

vi.mock("@/components/refine-ui/layout/user-avatar", () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));

vi.mock("@/components/refine-ui/theme/theme-toggle", () => ({
  ThemeToggle: () => <div />,
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => <div />,
  useSidebar: () => ({ isMobile: false, open: false }),
}));

vi.mock("@refinedev/core", () => ({
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
  useActiveAuthProvider: () => ({ getIdentity: vi.fn() }),
  useGetIdentity: vi.fn(),
  useRefineOptions: () => ({ title: { icon: null, text: "App" } }),
}));

import * as RefineCore from "@refinedev/core";

function mockIdentity(full_name: string | null) {
  vi.mocked(RefineCore.useGetIdentity).mockReturnValue({
    data: full_name ? { id: "u1", full_name } : null,
    isLoading: false,
  } as ReturnType<typeof RefineCore.useGetIdentity>);
}

import { Header } from "./header";

describe("UserDropdown — full_name display", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the current user's full name as the first item in the dropdown", () => {
    mockIdentity("Alice Smith");
    render(<Header />);
    expect(screen.getByTestId("dropdown-label")).toHaveTextContent(
      "Alice Smith"
    );
  });

  it("shows a separator between the name and logout", () => {
    mockIdentity("Bob Jones");
    render(<Header />);
    expect(screen.getAllByTestId("dropdown-separator")).toHaveLength(1);
  });

  it("shows the logout button after the user name", () => {
    mockIdentity("Carol White");
    render(<Header />);
    const label = screen.getByTestId("dropdown-label");
    const logout = screen.getByRole("button", { name: /logout/i });
    // label appears before logout in the DOM
    expect(
      label.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
