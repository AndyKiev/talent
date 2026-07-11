import { createFileRoute } from '@tanstack/react-router';
import { SettingsGroupView } from '../../../../components/developer/settings/SettingsGroupView';

export const Route = createFileRoute('/developer/settings/$groupKey/')({
    component: RouteComponent,
});

function RouteComponent() {
    const { groupKey } = Route.useParams();
    return <SettingsGroupView groupKey={groupKey} />;
}
