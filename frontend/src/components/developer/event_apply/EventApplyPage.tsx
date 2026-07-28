// src/components/developer/event_apply/EventApplyPage.tsx
import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { useMutation } from '@tanstack/react-query';
import {
  applyDueEmployeeEvents,
  type EventApplyStats,
} from './eventApplyApi';
import useString from '../../../hooks/useString';
import cfl from '../../../utils/helpers.ts';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

export function EventApplyPage() {
  const getString = useString();
  const [stats, setStats] = useState<EventApplyStats | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => applyDueEmployeeEvents(),
    onSuccess: (data) => {
      setErrorMsg(null);
      setStats(data);
    },
    onError: (err: Error) => {
      setStats(null);
      setErrorMsg(err.message);
    },
  });

  return (
    <AppShell>
      <PageContainer>
        <PageBreadcrumbs
          items={[
            { to: '/', label: cfl(getString('home') || 'Home') },
            { to: '/developer', label: cfl(getString('devPanel') || 'Developer') },
            { label: cfl(getString('eventApply') || 'Apply due events') },
          ]}
        />

        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {cfl(getString('eventApply') || 'Apply due events')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {getString('eventApplyDesc') ||
            'Apply every ready event whose effective date is today or earlier.'}
        </Typography>

        <Button
          variant="contained"
          startIcon={
            mutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <PlayArrowIcon />
            )
          }
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          sx={{ mb: 3 }}
        >
          {mutation.isPending
            ? getString('eventApplyRunning') || 'Running…'
            : getString('eventApplyRun') || 'Run now'}
        </Button>

        {errorMsg && (
          <Paper
            variant="outlined"
            sx={{ p: 2, mb: 3, borderColor: 'error.main' }}
          >
            <Typography color="error.main" variant="body2">
              {errorMsg}
            </Typography>
          </Paper>
        )}

        {stats && (
          <Stack spacing={3}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap">
              <Chip
                label={`${getString('eventApplyChecked') || 'Checked'}: ${stats.checked}`}
              />
              <Chip
                color="success"
                label={`${getString('eventApplyApplied') || 'Applied'}: ${stats.applied}`}
              />
              <Chip
                color={stats.failed > 0 ? 'error' : 'default'}
                label={`${getString('eventApplyFailed') || 'Failed'}: ${stats.failed}`}
              />
            </Stack>

            {stats.failures.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {cfl(getString('eventApplyFailures') || 'Failures')}
                </Typography>
                <Paper variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          {getString('eventApplyEventId') || 'Event ID'}
                        </TableCell>
                        <TableCell>
                          {getString('eventApplyEmployeeId') || 'Employee ID'}
                        </TableCell>
                        <TableCell>
                          {getString('eventApplyError') || 'Error'}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.failures.map((f) => (
                        <TableRow key={f.event_id}>
                          <TableCell>{f.event_id}</TableCell>
                          <TableCell>{f.employee_id}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {f.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            {stats.applied_ids.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {cfl(getString('eventApplyAppliedIds') || 'Applied event IDs')}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {stats.applied_ids.map((id) => (
                    <Chip key={id} size="small" variant="outlined" label={id} />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </PageContainer>
    </AppShell>
  );
}
