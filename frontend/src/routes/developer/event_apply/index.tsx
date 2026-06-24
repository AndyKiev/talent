
// src/routes/developer/event_apply/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EventApplyPage } from '../../../components/developer/event_apply/EventApplyPage';

export const Route = createFileRoute('/developer/event_apply/')({
    component: EventApplyPage,
});
 