import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
