// src/routes/employees/$employeeId/route.tsx
// Layout route for the employee detail card. Renders header + tab bar + <Outlet/>.
import { createFileRoute } from '@tanstack/react-router';
import {EmployeeCardLayout} from "../../../components/employees/EmployeeCardLayout.tsx";

export const Route = createFileRoute('/employees/$employeeId')({
    component: EmployeeCardLayout,
});
