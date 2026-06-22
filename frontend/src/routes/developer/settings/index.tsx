import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '../../../components/developer/settings/SettingsPage';

export const Route = createFileRoute('/developer/settings/')({
    component: SettingsPage,
});
