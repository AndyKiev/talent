import { createFileRoute } from '@tanstack/react-router';
import { UserSettingsPage } from '../../components/user_settings/UserSettingsPage';

export const Route = createFileRoute('/settings/')({
    component: UserSettingsPage,
});
