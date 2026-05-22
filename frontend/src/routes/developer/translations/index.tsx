import { createFileRoute } from '@tanstack/react-router'
import {TranslationsPage} from "../../../components/developer/translations/TranslationPage.tsx";

export const Route = createFileRoute('/developer/translations/')({
  component: TranslationsPage,
})

