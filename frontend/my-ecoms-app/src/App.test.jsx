import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Loginpage from "./Loginpage";

test("renders the sign-in form", () => {
  render(
    <MemoryRouter>
      <Loginpage />
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
});

test("opens password reset from the emailed reset link", async () => {
  render(
    <MemoryRouter initialEntries={["/login?resetToken=test-reset-token"]}>
      <Routes>
        <Route path="/login" element={<Loginpage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByLabelText("New password")).toBeInTheDocument();
  expect(screen.queryByLabelText("Password reset code")).not.toBeInTheDocument();
});
