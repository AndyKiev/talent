import { createFileRoute } from '@tanstack/react-router';
import { EvaluationPage } from "../../../../components/people-review/EvaluationPage.tsx";

export const Route = createFileRoute('/people_review/$sessionId/employee/$employeeId')({
    component: EvaluationPage,
});
