import { createFileRoute } from "@tanstack/react-router";
import EmployeeForm from "../../components/employees/old/EmployeeForm.tsx";
import AppShell from "../../components/layout/AppShell.tsx";


export const Route = createFileRoute("/employees/new")({
    component: function NewEmployee() {
        console.log("New employee route rendered"); // Debug log
        // return <EmployeeForm />;
        return (        <AppShell>       <EmployeeForm /> </AppShell>);
    },
});