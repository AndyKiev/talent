import { createFileRoute } from '@tanstack/react-router';
import { MyReviewsPage } from "../../components/people-review/MyReviewsPage.tsx";

export const Route = createFileRoute('/people_review/my')({
    component: MyReviewsPage,
});
