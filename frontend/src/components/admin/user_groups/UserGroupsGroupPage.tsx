// // src/components/admin/user_groups/UserGroupsGroupPage.tsx
// import { useState } from 'react';
// import { Box, Breadcrumbs, Tab, Tabs, Typography } from '@mui/material';
// import NavigateNextIcon from '@mui/icons-material/NavigateNext';
// import { Link } from '@tanstack/react-router';
// import AppShell from '../../layout/AppShell';
// import { UserGroupCrud } from './UserGroupCrud';
// import { UserGroupTypeCrud } from '../user_group_types/UserGroupTypeCrud';
// import { EssenceCrud } from '../essences/EssenceCrud';
// import { OperationCrud } from '../operations/OperationCrud';
// import { OeslCrud } from '../operation_essence_set_links/OeslCrud';
// import cfl from '../../../utils/helpers.ts';
// import useString from '../../../hooks/useString';
// import str from '../../../strings/str';
//
// function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
//   return <Box hidden={value !== index} sx={{ pt: 3 }}>{value === index && children}</Box>;
// }
//
// export function UserGroupsGroupPage() {
//   const getString = useString({ str });
//   const [tab, setTab] = useState(0);
//
//   return (
//     <AppShell>
//       <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
//         <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
//           <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
//             <Typography variant="body2" color="text.secondary">{cfl(getString('admin'))}</Typography>
//           </Link>
//           <Typography variant="body2" color="text.primary" fontWeight={600}>
//             {cfl(getString('userGroups')) || 'User Groups'}
//           </Typography>
//         </Breadcrumbs>
//
//         <Tabs
//           value={tab}
//           onChange={(_, v) => setTab(v)}
//           variant="scrollable"
//           scrollButtons="auto"
//           sx={{ borderBottom: 1, borderColor: 'divider' }}
//         >
//           <Tab label={cfl(getString('userGroups')) || 'User Groups'} />
//           <Tab label={cfl(getString('userGroupTypes')) || 'User Group Types'} />
//           <Tab label={cfl(getString('essences')) || 'Essences'} />
//           <Tab label={cfl(getString('operations')) || 'Operations'} />
//           <Tab label={cfl(getString('permissions')) || 'Permissions'} />
//         </Tabs>
//
//         <TabPanel value={tab} index={0}><UserGroupCrud /></TabPanel>
//         <TabPanel value={tab} index={1}><UserGroupTypeCrud /></TabPanel>
//         <TabPanel value={tab} index={2}><EssenceCrud /></TabPanel>
//         <TabPanel value={tab} index={3}><OperationCrud /></TabPanel>
//         <TabPanel value={tab} index={4}><OeslCrud /></TabPanel>
//       </Box>
//     </AppShell>
//   );
// }
