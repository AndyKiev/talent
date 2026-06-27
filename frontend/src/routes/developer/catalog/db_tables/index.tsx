import { createFileRoute } from '@tanstack/react-router'
import { DbTablesPage } from '../../../../components/developer/db_tables/DbTablesPage.tsx';

export const Route = createFileRoute('/developer/catalog/db_tables/')({
  component: DbTablesPage,
})
