import { createFileRoute } from "@tanstack/react-router";
// import { createFileRoute, redirect } from "@tanstack/react-router";
// import { useAuthStore } from "../../store/authStore";
import {AdminPage} from "../../components/admin/AdminPage.tsx";

// const ADMIN_GROUP = "admin"; // keep in sync with AppShell.tsx

export const Route = createFileRoute("/admin/")({
    beforeLoad: () => {
        // const user = useAuthStore.getState().user;
        // const isAdmin = user?.groups?.some(
        //     (g) => g.toLowerCase() === ADMIN_GROUP
        // ) ?? false;
        //
        // if (!isAdmin) {
        //     throw redirect({ to: "/employees" });
        // }
        // throw redirect({ to: "/employees" });
    },
    component: AdminPage,
});
