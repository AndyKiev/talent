import { createFileRoute } from '@tanstack/react-router';
import {UserGroupTypePage} from "../../../components/admin/user-group-types/UserGroupTypesPage.tsx";

export const Route = createFileRoute('/admin/user-group-types/')({
    component: UserGroupTypePage,
});
