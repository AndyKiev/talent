import { createFileRoute } from '@tanstack/react-router';
import { UserSettingsGroupView } from '../../../components/user_settings/UserSettingsGroupView';

export const Route = createFileRoute('/settings/$groupKey/')({
    component: RouteComponent,
});

function RouteComponent() {
    const { groupKey } = Route.useParams();
    return <UserSettingsGroupView groupKey={groupKey} />;
}
