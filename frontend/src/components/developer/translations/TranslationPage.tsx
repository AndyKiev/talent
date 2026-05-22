import AppShell from "../../layout/AppShell.tsx";
import {Box, Breadcrumbs, Typography} from "@mui/material";
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
            <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
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
            </Box>
        </AppShell>
    );
}