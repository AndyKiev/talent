// useDataGridLocale.ts
import { useMemo } from 'react';
import { type GridLocaleText } from '@mui/x-data-grid';
import { ukUA } from '@mui/x-data-grid/locales';

import useString from "./useString.ts";
import str from "../strings/str.ts";
import cfl from "../utils/capitalizeFirstLetter.ts";
import { useAuthStore } from "../store/authStore.ts";
import { defaultLangShortName } from "../utils/eNums.ts";

// MUI's built-in grid translations (column menu, filter panel, toolbar, ...)
// per our lang short_name. A lang missing here falls back to MUI's English.
const MUI_GRID_LOCALES: Record<string, Partial<GridLocaleText>> = {
    ukr: ukUA.components.MuiDataGrid.defaultProps.localeText,
};

export function useDataGridLocale(): Partial<GridLocaleText> {
    const getString = useString({ str });
    const userLang = useAuthStore(
        (state) => state.user?.lang?.short_name || defaultLangShortName,
    );

    return useMemo(() => ({
        ...MUI_GRID_LOCALES[userLang],
        //'noEmployeesFound'
        noRowsLabel: getString('noRecordsFound') || 'No items found',
        footerRowSelected: (count: number) =>
            count !== 1
                ? `${count} ${getString('rowsSelected') || 'rows selected'}`
                : `${count} ${getString('rowSelected') || 'row selected'}`,
        paginationRowsPerPage: cfl(getString('rowsPerPage')) || 'Rows per page:',
        paginationDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
            `${from}-${to} ${getString('of') || 'of'} ${
                count !== -1
                    ? count
                    : `${cfl(getString('moreThan')) || 'more than'} ${to}`
            }`,
    }), [getString, userLang]);
}
