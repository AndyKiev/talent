import { createFileRoute } from '@tanstack/react-router';
import {UserGroupsPage} from "../../../components/admin/user-groups/UserGroupsPage.tsx";


export const Route = createFileRoute('/admin/user-groups/')({
    component: UserGroupsPage,
});




