
import { createFileRoute } from "@tanstack/react-router";
import AppShell from "../../../components/layout/AppShell.tsx";
import EmployeeForm from "../../../components/employees/old/EmployeeForm.tsx";


export const Route = createFileRoute("/employees/$employeeId/edit")({
    component: function EditEmployee() {
        const { employeeId } = Route.useParams();
        console.log("Edit route rendered, employeeId:", employeeId); // Debug log
        return (        <AppShell>       <EmployeeForm employeeId={Number(employeeId)} /> </AppShell>);
    },
});