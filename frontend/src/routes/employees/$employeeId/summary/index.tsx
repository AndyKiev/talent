import { createFileRoute } from '@tanstack/react-router';
import {SummaryTab} from "../../../../components/employees/SummaryTab.tsx";


export const Route = createFileRoute('/employees/$employeeId/summary/')({
    component: SummaryTab,
});