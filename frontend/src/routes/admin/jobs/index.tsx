import { createFileRoute } from '@tanstack/react-router'
import {JobsPage} from "../../../components/admin/jobs/JobsPage.tsx";


export const Route = createFileRoute('/admin/jobs/')({
    component: JobsPage,
})

