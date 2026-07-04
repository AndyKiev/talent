// src/components/admin/departments/DepartmentTreeNode.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Box,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import PublicIcon from '@mui/icons-material/Public';

import type { DepartmentNode, DepartmentType, DepartmentCategory } from './departmentApi';
import type { DepartmentRegionLink } from './departmentRegionLinkApi';
import { TextEditCell } from '../TextEditCell';
import { ReadonlyCell } from '../ReadonlyCell';
import type { PendingDepartmentEdit } from './DepartmentEditDialog';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

// ── Fixed column widths — every row at every depth uses the same values so
//    chips/selects/toggles stay aligned regardless of name length.
const COL = {
  expand:   28,   // expand/collapse icon
  name:     200,  // inline-editable name
  type:     180,  // department type select
  category: 180,  // department category select
  region:   150,  // region chip
  toggle:   48,   // active switch
  id:       48,   // #id badge
  addBtn:   32,   // + child button
  genBtn:   32,   // generate-subtree button
  regBtn:   32,   // assign-region button
  delBtn:   32,   // delete button
};

// Category KEYS (case-insensitive) eligible to hold a region.
// Matches on category.key (kept in English) — names are localized (e.g. Ukrainian).
// Mirrors backend guard; purely cosmetic here (server enforces).
const REGION_ALLOWED_CATEGORY_KEYS = new Set(['board', 'store', 'directorate']);

interface Props {
  node: DepartmentNode;
  depth: number;
  selectedId: number | null;
  allTypes: DepartmentType[];
  /** {parent_type_id: [child_type_id, ...]} — fetched ONCE by DepartmentTree. */
  typeChildMap: Record<number, number[]>;
  categories: DepartmentCategory[];
  /**
   * department_type_id of this node's parent.
   * null = root node → all types allowed.
   */
  parentTypeId: number | null;
  /** True while a search/filter is active — every visible branch opens. */
  forceExpand?: boolean;
  regionByDept: Map<number, DepartmentRegionLink>;
  updateIsPending: boolean;
  deleteIsPending: boolean;
  generateIsPending: boolean;
  onAddChild: (parentNode: DepartmentNode) => void;
  onDeleteClick: (node: DepartmentNode) => void;
  onGenerateSubtree: (node: DepartmentNode) => void;
  onPendingEdit: (edit: PendingDepartmentEdit) => void;
  onRegionClick: (node: DepartmentNode) => void;
}

export const DepartmentTreeNode = React.memo(function DepartmentTreeNode({
                                     node,
                                     depth,
                                     selectedId,
                                     allTypes,
                                     typeChildMap,
                                     categories,
                                     parentTypeId,
                                     forceExpand = false,
                                     regionByDept,
                                     updateIsPending,
                                     deleteIsPending,
                                     generateIsPending,
                                     onAddChild,
                                     onDeleteClick,
                                     onGenerateSubtree,
                                     onPendingEdit,
                                     onRegionClick,
                                   }: Props) {
  const getString = useString({ str });
  const navigate = useNavigate();

  // Collapsed by default — only the visible level mounts (children render
  // inside <Collapse unmountOnExit>, so a collapsed tree is cheap even when
  // large). A search/filter forces every pruned branch open.
  const [expanded, setExpanded] = useState(false);
  const isExpanded = forceExpand || expanded;
  const [editingField, setEditingField] = useState<string | null>(null);

  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const indentPx = depth * 24;

  // Region link for this department (if any) + whether category allows one.
  const regionLink = regionByDept.get(node.id) ?? null;
  const nodeCategory = categories.find((c) => c.id === node.department_category_id);
  const regionAllowed = REGION_ALLOWED_CATEGORY_KEYS.has(
    (nodeCategory?.key ?? '').trim().toLowerCase(),
  );

  // Types allowed for THIS node = children of its parent's type, resolved from
  // the map the tree fetched once (root → all types). No per-node API call.
  const allowedTypes =
      parentTypeId == null
          ? allTypes
          : (typeChildMap[parentTypeId] ?? [])
              .map((id) => allTypes.find((t) => t.id === id))
              .filter((t): t is DepartmentType => t !== undefined);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNodeClick = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, .MuiSelect-root')) return;
    await navigate({ to: '/admin/structure/$departmentId', params: { departmentId: String(node.id) } });
  };

  const handleNameSave = useCallback(
      (val: string) => {
        onPendingEdit({
          id: node.id,
          fieldLabel: getString('name') || 'Name',
          field: 'name',
          rawValue: val,
          newValue: val,
          oldValue: node.name,
        });
        setEditingField(null);
      },
      [node, getString, onPendingEdit],
  );

  const handleToggleActive = useCallback(() => {
    onPendingEdit({
      id: node.id,
      fieldLabel: getString('isActive') || 'Active',
      field: 'is_active',
      rawValue: !node.is_active,
      newValue: !node.is_active,
      oldValue: node.is_active,
    });
  }, [node, getString, onPendingEdit]);

  const handleTypeChange = useCallback(
      (newTypeId: number) => {
        const oldType = allTypes.find((t) => t.id === node.department_type_id);
        const newType = allTypes.find((t) => t.id === newTypeId);
        onPendingEdit({
          id: node.id,
          fieldLabel: getString('departmentType') || 'Department Type',
          field: 'department_type_id',
          rawValue: newTypeId,
          newValue: newType?.name ?? String(newTypeId),
          oldValue: oldType?.name ?? String(node.department_type_id),
        });
      },
      [node, allTypes, getString, onPendingEdit],
  );

  const handleCategoryChange = useCallback(
      (newCatId: number) => {
        const oldCat = categories.find((c) => c.id === node.department_category_id);
        const newCat = categories.find((c) => c.id === newCatId);
        onPendingEdit({
          id: node.id,
          fieldLabel: getString('departmentCategory') || 'Department Category',
          field: 'department_category_id',
          rawValue: newCatId,
          newValue: newCat?.name ?? String(newCatId),
          oldValue: oldCat?.name ?? String(node.department_category_id),
        });
      },
      [node, categories, getString, onPendingEdit],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
      <Box>
        {/* ── Node row ──────────────────────────────────────────────────────── */}
        <Box
            onClick={handleNodeClick}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',   // top-align so wrapped text doesn't push chips
              gap: 0.5,
              pl: `${indentPx + 8}px`,
              pr: 1,
              py: 0.75,
              minHeight: 48,
              cursor: 'pointer',
              borderRadius: 1,
              borderLeft: isSelected ? '3px solid' : '3px solid transparent',
              borderLeftColor: isSelected ? 'primary.main' : 'transparent',
              bgcolor: isSelected ? 'action.selected' : 'transparent',
              '&:hover': { bgcolor: 'action.hover' },
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
        >
          {/* ── Expand / collapse ─────────────────────────────────────────── */}
          <Box sx={{ width: COL.expand, flexShrink: 0, pt: '2px' }}>
            <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setExpanded((p) => !p); }}
                sx={{ p: 0.25, visibility: hasChildren ? 'visible' : 'hidden' }}
            >
              {isExpanded
                  ? <ExpandMoreIcon sx={{ fontSize: 18 }} />
                  : <ChevronRightIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Box>

          {/* Leaf icon (no children) */}
          {!hasChildren && (
              <Box sx={{ width: 0, overflow: 'visible', flexShrink: 0 }}>
                <AccountTreeIcon sx={{ fontSize: 14, color: 'text.disabled', position: 'relative', left: -18, top: 4 }} />
              </Box>
          )}

          {/* ── Name ─────────────────────────────────────────────────────── */}
          <Box
              sx={{ width: COL.name, flexShrink: 0, pt: '2px' }}
              onClick={(e) => e.stopPropagation()}
          >
            {editingField === 'name' ? (
                <TextEditCell
                    value={node.name}
                    onSave={handleNameSave}
                    onCancel={() => setEditingField(null)}
                    isPending={updateIsPending}
                />
            ) : (
                <ReadonlyCell
                    value={node.name}
                    onEdit={(e) => { e.stopPropagation(); setEditingField('name'); }}
                    editTitle={getString('editName') || 'Edit name'}
                />
            )}
          </Box>

          {/* ── Type select ───────────────────────────────────────────────── */}
          <Box
              onClick={(e) => e.stopPropagation()}
              sx={{ width: COL.type, flexShrink: 0 }}
          >
            <FormControl size="small" fullWidth>
              <Select
                  value={node.department_type_id}
                  onChange={(e) => handleTypeChange(Number(e.target.value))}
                  disabled={updateIsPending}
                  variant="standard"
                  disableUnderline
                  sx={{ fontSize: '0.8125rem' }}
                  renderValue={(val) => {
                    // Always resolve from allTypes so current value renders even if
                    // it's outside allowedTypes (stale data edge-case)
                    const t = allTypes.find((x) => x.id === val);
                    return (
                        <Chip
                            label={t?.name ?? String(val)}
                            size="small"
                            sx={{
                              height: 30,
                              fontSize: '0.75rem',
                              bgcolor: 'info.light',
                              color: 'info.contrastText',
                              // Allow chip label to wrap on narrow columns
                              '& .MuiChip-label': { whiteSpace: 'normal', lineHeight: 1.3 },
                            }}
                        />
                    );
                  }}
              >
                {allowedTypes.map((t) => (
                    <MenuItem key={t.id} value={t.id} sx={{ fontSize: '0.875rem' }}>
                      {t.name}
                    </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* ── Category select ───────────────────────────────────────────── */}
          <Box
              onClick={(e) => e.stopPropagation()}
              sx={{ width: COL.category, flexShrink: 0 }}
          >
            <FormControl size="small" fullWidth>
              <Select
                  value={node.department_category_id}
                  onChange={(e) => handleCategoryChange(Number(e.target.value))}
                  disabled={updateIsPending}
                  variant="standard"
                  disableUnderline
                  sx={{ fontSize: '0.8125rem' }}
                  renderValue={(val) => {
                    const c = categories.find((x) => x.id === val);
                    return (
                        <Chip
                            label={c?.name ?? String(val)}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.75rem',
                              bgcolor: 'success.light',
                              color: 'success.contrastText',
                              '& .MuiChip-label': { whiteSpace: 'normal', lineHeight: 1.3 },
                            }}
                        />
                    );
                  }}
              >
                {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.875rem' }}>
                      {c.name}
                    </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* ── Region chip ───────────────────────────────────────────────── */}
          <Box
              onClick={(e) => e.stopPropagation()}
              sx={{ width: COL.region, flexShrink: 0, pt: '4px', display: 'flex', alignItems: 'center' }}
          >
            {regionLink?.region ? (
                <Tooltip title={getString('region') || 'Region'}>
                  <Chip
                      icon={<PublicIcon sx={{ fontSize: 14 }} />}
                      label={regionLink.region.name}
                      size="small"
                      onClick={() => regionAllowed && onRegionClick(node)}
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        cursor: regionAllowed ? 'pointer' : 'default',
                        '& .MuiChip-label': { whiteSpace: 'normal', lineHeight: 1.2 },
                      }}
                  />
                </Tooltip>
            ) : regionAllowed ? (
                <Typography variant="caption" color="text.disabled">
                  {getString('noRegion') || '— no region —'}
                </Typography>
            ) : null}
          </Box>

          {/* ── Active toggle ─────────────────────────────────────────────── */}
          <Box onClick={(e) => e.stopPropagation()} sx={{ width: COL.toggle, flexShrink: 0, pt: '4px' }}>
            <Tooltip title={getString('isActive') || 'Active'}>
              <Switch
                  size="small"
                  checked={node.is_active}
                  onChange={handleToggleActive}
                  disabled={updateIsPending}
              />
            </Tooltip>
          </Box>

          {/* ── Spacer pushes id + buttons to the right ───────────────────── */}
          <Box sx={{ flex: 1 }} />

          {/* ── ID badge ─────────────────────────────────────────────────── */}
          <Typography
              variant="caption"
              sx={{
                width: COL.id,
                flexShrink: 0,
                color: 'text.disabled',
                fontFamily: 'monospace',
                textAlign: 'right',
                pt: '6px',
              }}
          >
            #{node.id}
          </Typography>

          {/* ── Add child ─────────────────────────────────────────────────── */}
          <Box sx={{ width: COL.addBtn, flexShrink: 0 }}>
            <Tooltip title={getString('addChildDepartment') || 'Add child department'}>
              <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => { e.stopPropagation(); onAddChild(node); }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* ── Assign region ─────────────────────────────────────────────── */}
          <Box sx={{ width: COL.regBtn, flexShrink: 0 }}>
            {regionAllowed && (
                <Tooltip title={getString('assignRegion') || 'Assign region'}>
                  <IconButton
                      size="small"
                      color={regionLink ? 'primary' : 'default'}
                      onClick={(e) => { e.stopPropagation(); onRegionClick(node); }}
                  >
                    <PublicIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
            )}
          </Box>

          {/* ── Generate subtree ──────────────────────────────────────────── */}
          <Box sx={{ width: COL.genBtn, flexShrink: 0 }}>
            <Tooltip title={getString('generateSubtree') || 'Generate subtree from types'}>
            <span>
              <IconButton
                  size="small"
                  color="secondary"
                  disabled={generateIsPending}
                  onClick={(e) => { e.stopPropagation(); onGenerateSubtree(node); }}
              >
                <AutoAwesomeMotionIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
            </Tooltip>
          </Box>

          {/* ── Delete ────────────────────────────────────────────────────── */}
          <Box sx={{ width: COL.delBtn, flexShrink: 0 }}>
            <Tooltip title={getString('delete') || 'Delete'}>
            <span>
              <IconButton
                  size="small"
                  color="error"
                  disabled={deleteIsPending}
                  onClick={(e) => { e.stopPropagation(); onDeleteClick(node); }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Children ──────────────────────────────────────────────────────── */}
        {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              {node.children.map((child) => (
                  <DepartmentTreeNode
                      key={child.id}
                      node={child}
                      depth={depth + 1}
                      selectedId={selectedId}
                      allTypes={allTypes}
                      typeChildMap={typeChildMap}
                      categories={categories}
                      // Each child's allowed types = types linked under THIS node's type
                      parentTypeId={node.department_type_id}
                      forceExpand={forceExpand}
                      regionByDept={regionByDept}
                      updateIsPending={updateIsPending}
                      deleteIsPending={deleteIsPending}
                      generateIsPending={generateIsPending}
                      onAddChild={onAddChild}
                      onDeleteClick={onDeleteClick}
                      onGenerateSubtree={onGenerateSubtree}
                      onPendingEdit={onPendingEdit}
                      onRegionClick={onRegionClick}
                  />
              ))}
            </Collapse>
        )}
      </Box>
  );
});