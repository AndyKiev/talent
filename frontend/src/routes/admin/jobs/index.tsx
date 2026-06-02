import { createFileRoute } from '@tanstack/react-router'
import {JobsPage} from "../../../components/admin/jobs/JobsPage.tsx";


// src/routes/admin/jobs/index.tsx
export const Route = createFileRoute('/admin/jobs/')({
    component: JobsPage,
    head: () => ({
        meta: [{ title: 'Jobs | Talent' }],
    }),
})
