// src/components/admin/departments/StructurePage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { DepartmentTree } from './DepartmentTree';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

export function StructurePage() {
  const getString = useString({ str });

  return (
    <AppShell>
      <PageContainer>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 3 }}
        >
          <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="body2" color="text.secondary">
              {cfl(getString('admin') || 'Admin')}
            </Typography>
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {cfl(getString('structure') || 'Structure')}
          </Typography>
        </Breadcrumbs>

        <DepartmentTree selectedId={null} />
      </PageContainer>
    </AppShell>
  );
}
