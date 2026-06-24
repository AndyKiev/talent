// src/components/developer/security/permissions_overview/PermissionManifestPage.tsx
import { useQuery } from '@tanstack/react-query';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';

import useString from '../../../../hooks/useString';
import str from '../../../../strings/str';
import cfl, { snakeToCamel } from '../../../../utils/helpers.ts';
import type { GetStringFn } from '../../../../types/getStringFn';
import {
    fetchPermissionManifest,
    PERMISSION_MANIFEST_QK,
    type PermissionEntry,
} from './permissionManifestApi';

// Logical verb order for display (read -> build -> relate -> remove).
const VERB_RANK: Record<string, number> = {
    view: 0,
    create: 1,
    copy: 2,
    modify: 3,
    approve: 4,
    assign: 5,
    link: 6,
    sync: 7,
    export: 8,
    delete: 9,
};

const byVerb = (a: PermissionEntry, b: PermissionEntry) =>
    (VERB_RANK[a.operation] ?? 99) - (VERB_RANK[b.operation] ?? 99) ||
    a.operation.localeCompare(b.operation);

interface PermGroup {
    key: string;
    title: string;
    perms: PermissionEntry[];
}

// Single-essence permissions are grouped under their resource; multi-essence
// (link) permissions are gathered into one "Links" section at the end.
const groupPermissions = (perms: PermissionEntry[], getString: GetStringFn): PermGroup[] => {
    const single = new Map<string, PermissionEntry[]>();
    const links: PermissionEntry[] = [];

    for (const p of perms) {
        if (p.essences.length === 1) {
            const k = p.essences[0];
            if (!single.has(k)) single.set(k, []);
            single.get(k)!.push(p);
        } else {
            links.push(p);
        }
    }

    const groups: PermGroup[] = [];
    [...single.keys()].sort().forEach((essence) => {
        groups.push({
            key: essence,
            title: cfl(getString(snakeToCamel(essence)) || essence.replace(/_/g, ' ')),
            perms: single.get(essence)!.slice().sort(byVerb),
        });
    });

    if (links.length) {
        links.sort(
            (a, b) => a.essences.join('+').localeCompare(b.essences.join('+')) || byVerb(a, b),
        );
        groups.push({
            key: '__links__',
            title: cfl(getString('links') || 'links'),
            perms: links,
        });
    }

    return groups;
};

const StatTile = ({
    label,
    value,
    warning = false,
}: {
    label: string;
    value: number;
    warning?: boolean;
}) => (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 140 }}>
        <Typography variant="h4" fontWeight={700} color={warning ? 'warning.main' : 'text.primary'}>
            {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
    </Paper>
);

const PermissionRow = ({
    perm,
    getString,
}: {
    perm: PermissionEntry;
    getString: GetStringFn;
}) => (
    <Accordion
        disableGutters
        elevation={0}
        sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            '&:before': { display: 'none' },
            mb: 1,
        }}
    >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ rowGap: 0.5 }}>
                <Chip label={perm.operation} color="primary" size="small" />
                <Typography variant="body2" color="text.disabled">
                    ·
                </Typography>
                {perm.essences.map((e) => (
                    <Chip key={e} label={e} size="small" variant="outlined" />
                ))}
                <Chip label={String(perm.endpoint_count)} size="small" variant="outlined" sx={{ ml: 1 }} />
            </Stack>
        </AccordionSummary>
        <AccordionDetails>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {cfl(getString('coveredEndpoints') || 'Covered endpoints')}
            </Typography>
            <Stack spacing={0.5}>
                {perm.endpoints.map((ep) => (
                    <Typography
                        key={ep}
                        variant="body2"
                        sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                    >
                        {ep}
                    </Typography>
                ))}
            </Stack>
        </AccordionDetails>
    </Accordion>
);

export function PermissionManifestPage() {
    const getString = useString({ str });

    const { data, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: PERMISSION_MANIFEST_QK,
        queryFn: () => fetchPermissionManifest(),
        staleTime: 30 * 1000,
    });

    const missingOps = data?.seed.missing_operations ?? [];
    const missingEss = data?.seed.missing_essences ?? [];
    const anyMissing = missingOps.length > 0 || missingEss.length > 0;
    const groups = data ? groupPermissions(data.permissions, getString) : [];

    return (
        <Box>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 3 }}
            >
                <Typography variant="h5" fontWeight={700}>
                    {cfl(getString('permissionsOverview') || 'Permissions overview')}
                </Typography>
                <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    {cfl(getString('refresh') || 'Refresh')}
                </Button>
            </Stack>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {isError && <Alert severity="error">{getString('loadFailed') || 'Failed to load'}</Alert>}

            {data && (
                <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                        <StatTile
                            label={cfl(getString('guardedEndpoints') || 'Guarded endpoints')}
                            value={data.summary.guarded_endpoints}
                        />
                        <StatTile
                            label={cfl(getString('unguardedEndpoints') || 'Not yet guarded')}
                            value={data.summary.unguarded_endpoints}
                            warning
                        />
                        <StatTile
                            label={cfl(getString('distinctPermissions') || 'Distinct permissions')}
                            value={data.summary.distinct_permissions}
                        />
                    </Stack>

                    {anyMissing ? (
                        <Stack spacing={1} sx={{ mb: 3 }}>
                            {missingOps.length > 0 && (
                                <Alert severity="warning">
                                    {cfl(getString('missingOperations') || 'Missing operations')}:{' '}
                                    {missingOps.join(', ')}
                                </Alert>
                            )}
                            {missingEss.length > 0 && (
                                <Alert severity="warning">
                                    {cfl(getString('missingEssences') || 'Missing essences')}:{' '}
                                    {missingEss.join(', ')}
                                </Alert>
                            )}
                        </Stack>
                    ) : (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {getString('catalogComplete') || 'Catalog complete — nothing to seed'}
                        </Alert>
                    )}

                    <Divider sx={{ mb: 2 }} />

                    {groups.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            {getString('noGuardedEndpoints') || 'No guarded endpoints yet'}
                        </Typography>
                    ) : (
                        groups.map((g) => (
                            <Box key={g.key} sx={{ mb: 3 }}>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                    sx={{ mb: 1, ml: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                                >
                                    {g.title}
                                </Typography>
                                {g.perms.map((perm) => (
                                    <PermissionRow key={perm.key} perm={perm} getString={getString} />
                                ))}
                            </Box>
                        ))
                    )}
                </>
            )}
        </Box>
    );
}
