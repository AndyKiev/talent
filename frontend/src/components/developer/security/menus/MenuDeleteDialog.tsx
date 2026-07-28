// src/components/developer/security/menus/MenuDeleteDialog.tsx
import type { MenuAdmin } from './menuAdminApi';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/helpers';
import ConfirmDeleteDialog from '../../../ui/ConfirmDeleteDialog';

interface Props {
    row: MenuAdmin | null;
    isPending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function MenuDeleteDialog({ row, isPending, onConfirm, onCancel }: Props) {
    const getString = useString();
    return (
        <ConfirmDeleteDialog
            open={!!row}
            title={cfl(getString('deleteMenu')) || 'Delete Menu'}
            message={
                getString('menuDeleteConfirm', { key: row?.key ?? '' }) ||
                `Delete menu "${row?.key ?? ''}"? This cannot be undone.`
            }
            isDeleting={isPending}
            onConfirm={onConfirm}
            onClose={onCancel}
        />
    );
}
