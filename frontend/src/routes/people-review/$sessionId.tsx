import { createFileRoute } from '@tanstack/react-router';
import { SessionEmployeesPage } from "../../components/people-review/SessionEmployeesPage.tsx";

export const Route = createFileRoute('/people-review/$sessionId')({
    component: SessionEmployeesPage,
});
