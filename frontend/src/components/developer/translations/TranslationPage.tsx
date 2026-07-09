import AppShell from "../../layout/AppShell.tsx";
import { PageContainer } from '../../layout/PageContainer';
import { Breadcrumbs, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {Link} from "@tanstack/react-router";
import LocaleAdminReduced from "./LocaleAdminReduced.tsx";
import cfl from "../../../utils/capitalizeFirstLetter.ts";
import useString from "../../../hooks/useString.ts";
import str from "../../../strings/str.ts";


export function TranslationsPage() {
    const getString = useString({ str });
    return (
        <AppShell>
            <PageContainer>
                {/* Breadcrumb */}
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{ mb: 3 }}
                >
                    <Link to="/developer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString("developer"))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString("translations"))}
                    </Typography>
                </Breadcrumbs>
                <LocaleAdminReduced/>
            </PageContainer>
        </AppShell>
    );
}