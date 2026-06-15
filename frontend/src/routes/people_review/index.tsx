import { createFileRoute } from '@tanstack/react-router';
import { PeopleReviewEntry } from "../../components/people-review/PeopleReviewEntry.tsx";

export const Route = createFileRoute('/people_review/')({
    component: PeopleReviewEntry,
});
