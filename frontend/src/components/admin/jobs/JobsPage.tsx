// src/components/admin/jobs/JobsPage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { JobCrud } from './JobCrud';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';
import {setPageTitle} from "../../../utils/setPageTitle.ts";

export function JobsPage() {
  const getString = useString({ str });
  setPageTitle(getString('jobs') || 'Jobs')

  return (
    <AppShell>
      <PageContainer>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 3 }}
        >
          <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="body2" color="text.secondary">
              {cfl(getString('admin'))}
            </Typography>
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {cfl(getString('jobs'))}
          </Typography>
        </Breadcrumbs>

        <JobCrud />
      </PageContainer>
    </AppShell>
  );
}
