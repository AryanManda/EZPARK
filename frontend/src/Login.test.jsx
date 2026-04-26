import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import Login from "./Login.jsx";

const navigateMock = vi.fn();
const loginUserMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("./api/parkingApi", () => ({
  loginUser: (...args) => loginUserMock(...args),
}));

describe("Login", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    loginUserMock.mockReset();
  });

  test("renders email/username and password fields", () => {
    render(<Login onLogin={vi.fn()} user={null} />);

    expect(screen.getByLabelText(/email\/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  test("logs in a driver and redirects to nearby lots", async () => {
    const onLogin = vi.fn();
    loginUserMock.mockResolvedValue({
      id: "driver-1",
      role: "driver",
      displayName: "Driver One",
    });

    render(<Login onLogin={onLogin} user={null} />);

    fireEvent.change(screen.getByLabelText(/email\/username/i), {
      target: { value: "driver@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(loginUserMock).toHaveBeenCalledWith({
        identifier: "driver@test.com",
        password: "password123",
      });
      expect(onLogin).toHaveBeenCalledWith({
        id: "driver-1",
        role: "driver",
        displayName: "Driver One",
      });
      expect(navigateMock).toHaveBeenCalledWith("/driver/find-parking");
    });
  });

  test("logs in an owner and redirects to the dashboard", async () => {
    const onLogin = vi.fn();
    loginUserMock.mockResolvedValue({
      id: "owner-1",
      role: "owner",
      displayName: "Owner One",
    });

    render(<Login onLogin={onLogin} user={null} />);

    fireEvent.change(screen.getByLabelText(/email\/username/i), {
      target: { value: "owner@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/owner/dashboard");
    });
  });

  test("shows backend login errors", async () => {
    loginUserMock.mockRejectedValue({
      response: {
        data: {
          error: "Invalid email/username or password.",
        },
      },
    });

    render(<Login onLogin={vi.fn()} user={null} />);

    fireEvent.change(screen.getByLabelText(/email\/username/i), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/invalid email\/username or password/i)).toBeInTheDocument();
  });
});