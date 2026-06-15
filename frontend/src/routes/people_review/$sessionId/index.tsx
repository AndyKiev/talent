import { createFileRoute } from '@tanstack/react-router';
import { SessionEmployeesPage } from "../../../components/people-review/SessionEmployeesPage.tsx";

export const Route = createFileRoute('/people_review/$sessionId/')({
    component: SessionEmployeesPage,
});
