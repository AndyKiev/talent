import { createFileRoute } from '@tanstack/react-router';
import { ReviewDimensionsPage } from "../../../components/admin/review-dimensions/ReviewDimensionsPage.tsx";

export const Route = createFileRoute('/admin/review-dimensions/')({
    component: ReviewDimensionsPage,
});
