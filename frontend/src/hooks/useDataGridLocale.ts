// useDataGridLocale.ts
import { useMemo } from 'react';
import { type GridLocaleText } from '@mui/x-data-grid';

import useString from "./useString.ts";
import str from "../strings/str.ts";
import cfl from "../utils/capitalizeFirstLetter.ts";

export function useDataGridLocale(): Partial<GridLocaleText> {
    const getString = useString({ str });

    return useMemo(() => ({
        //'noEmployeesFound'
        noRowsLabel: getString('noDocumentsFound') || 'No items found',
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
    }), [getString]);
}