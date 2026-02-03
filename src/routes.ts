import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { MonthlyHistory } from "./pages/MonthlyHistory";
import { Settings } from "./pages/Settings";
import { MainLayout } from "./components/MainLayout";
import { AuthLayout } from "./components/AuthLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { index: true, Component: Login },
      { path: "register", Component: Register },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
    ],
  },
  {
    path: "/app",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "history", Component: MonthlyHistory },
      { path: "settings", Component: Settings },
    ],
  },
]);
