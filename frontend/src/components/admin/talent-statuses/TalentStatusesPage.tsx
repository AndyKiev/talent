import AppShell from "../../layout/AppShell.tsx";
import {Box, Breadcrumbs, Typography} from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {Link} from "@tanstack/react-router";
import {TalentStatusCrud} from "./TalentStatusCrud.tsx";
import useString from "../../../hooks/useString.ts";
import str from "../../../strings/str.ts";
import cfl from "../../../utils/helpers.ts";

export function TalentStatusesPage() {
    const getString = useString({ str });
    return (
            <AppShell>
                <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1100, mx: 'auto' }}>
                {/* Breadcrumb */}
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{ mb: 3 }}
                >
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="body2" color="text.secondary">
                        {cfl(getString("admin"))}
                    </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString("talentStatuses"))}
                    </Typography>
                </Breadcrumbs>

                <TalentStatusCrud />
                </Box>
            </AppShell>
    );
}