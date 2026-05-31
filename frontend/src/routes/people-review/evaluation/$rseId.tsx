import { createFileRoute } from '@tanstack/react-router';
import { EvaluationPage } from "../../../components/people-review/EvaluationPage.tsx";

export const Route = createFileRoute('/people-review/evaluation/$rseId')({
    component: EvaluationPage,
});
