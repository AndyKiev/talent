// src/routes/employees/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import {EmployeesPage} from "../../components/employees/EmployeesPage.tsx";

export const Route = createFileRoute("/employees/")({
    component: EmployeesPage
});

