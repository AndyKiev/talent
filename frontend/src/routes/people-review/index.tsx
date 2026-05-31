import { createFileRoute } from '@tanstack/react-router';
import { ReviewSessionsPage } from "../../components/people-review/ReviewSessionsPage.tsx";

export const Route = createFileRoute('/people-review/')({
    component: ReviewSessionsPage,
});
