// src/routes/auth/login.tsx
import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "../../components/auth/LoginPage.tsx";


export const Route = createFileRoute("/auth/login")({
    component: LoginPage,
});
