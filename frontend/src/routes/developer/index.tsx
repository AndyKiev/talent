import { createFileRoute } from '@tanstack/react-router'
import {DeveloperPage} from "../../components/developer/DeveloperPage.tsx";

export const Route = createFileRoute('/developer/')({
  component: DeveloperPage,
})

