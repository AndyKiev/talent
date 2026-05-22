import AppShell from "../../layout/AppShell.tsx";
import EmployeeList from "./EmployeeList.tsx";

export function EmployeesPage() {
    return (
        <AppShell>
            <EmployeeList />
        </AppShell>
    );
}