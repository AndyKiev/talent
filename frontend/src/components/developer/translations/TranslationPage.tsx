import AppShell from "../../layout/AppShell.tsx";
import { PageContainer } from '../../layout/PageContainer';
import LocaleAdminReduced from "./LocaleAdminReduced.tsx";
import cfl from "../../../utils/capitalizeFirstLetter.ts";
import useString from "../../../hooks/useString.ts";
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';


export function TranslationsPage() {
    const getString = useString();
    return (
        <AppShell>
            <PageContainer>
                <PageBreadcrumbs
                    items={[
                        { to: '/developer', label: cfl(getString("developer")) },
                        { label: cfl(getString("translations")) },
                    ]}
                />
                <LocaleAdminReduced/>
            </PageContainer>
        </AppShell>
    );
}
