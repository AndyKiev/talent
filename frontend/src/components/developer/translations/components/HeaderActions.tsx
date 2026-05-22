// components/Customized/Admin/Locale/components/HeaderActions.tsx
import React from 'react';
import {
    Button,
    Tooltip,
    Stack,
    TextField,
    // CircularProgress,
    // Box,
    FormControlLabel,
    Switch,
    InputAdornment,
} from '@mui/material';
import {
    Add as AddIcon,
    // Download as DownloadIcon,
    // Upload as UploadIcon,
    // Code as CodeIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
// import {useTranslations} from "../../../../hooks/useTranslations.ts";
import useString from "../../../../hooks/useString.ts";



interface HeaderActionsProps {
    searchText: string;
    onSearchChange: (value: string) => void;
    onAddClick: () => void;
    // onExportClick: () => void;
    // onJsonExportClick: () => void;
    // onImportExcel: (event: React.ChangeEvent<HTMLInputElement>) => void;
    // onImportJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
    // onImportJsonTextClick: () => void;
    exactSearch: boolean; // Add this prop
    onExactSearchChange: (value: boolean) => void; // Add this prop
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
                                                                searchText,
                                                                onSearchChange,
                                                                onAddClick,
                                                                // onExportClick,
                                                                // onJsonExportClick,
                                                                // onImportExcel,
                                                                // onImportJson,
                                                                // onImportJsonTextClick,
                                                                exactSearch,
                                                                onExactSearchChange,
                                                            }) => {
    const getString = useString();
    // const {
    //     uploadExcelMutation,
    //     uploadJsonMutation,
    // } = useTranslations();

    return (
        <Stack direction="column" spacing={2} sx={{ mb: 3 }}>
            {/* Search row */}
            <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                    placeholder={getString("searchTranslations")}
                    value={searchText}
                    onChange={(e) => onSearchChange(e.target.value)}
                    size="small"
                    sx={{ minWidth: 300 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <Tooltip title={exactSearch ? getString("tooltipExactSearch") : getString("tooltipContainsSearch")}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    size="small"
                                                    checked={exactSearch}
                                                    onChange={(e) => onExactSearchChange(e.target.checked)}
                                                />
                                            }
                                            label={exactSearch ? getString("exact") : getString("contains")}
                                            sx={{ m: 0 }}
                                        />
                                    </Tooltip>
                                </InputAdornment>
                            ),
                        }
                    }}
                />

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAddClick}
                >
                    {getString("addTranslation")}
                </Button>
            </Stack>

            {/* Import/Export buttons row */}
            {/*<Stack direction="row" spacing={1} flexWrap="wrap">*/}
                {/* Excel Export Button */}
                {/*<Tooltip title={getString("tooltipExportToExcel")}>*/}
                {/*    <Button*/}
                {/*        variant="outlined"*/}
                {/*        startIcon={<DownloadIcon />}*/}
                {/*        onClick={onExportClick}*/}
                {/*    >*/}
                {/*        {getString("exportExcel")}*/}
                {/*    </Button>*/}
                {/*</Tooltip>*/}

                {/*/!* JSON Export Button *!/*/}
                {/*<Tooltip title={getString("tooltipExportToJson")}>*/}
                {/*    <Button*/}
                {/*        variant="outlined"*/}
                {/*        startIcon={<DownloadIcon />}*/}
                {/*        onClick={onJsonExportClick}*/}
                {/*    >*/}
                {/*        {getString("exportJson")}*/}
                {/*    </Button>*/}
                {/*</Tooltip>*/}

                {/*/!* Excel Import Button *!/*/}
                {/*<Tooltip title={getString("tooltipImportFromExcel")}>*/}
                {/*    <Button*/}
                {/*        variant="outlined"*/}
                {/*        component="label"*/}
                {/*        startIcon={uploadExcelMutation.isPending ? <CircularProgress size={16} /> : <UploadIcon />}*/}
                {/*        disabled={uploadExcelMutation.isPending}*/}
                {/*    >*/}
                {/*        {getString("importExcel")}*/}
                {/*        <input*/}
                {/*            type="file"*/}
                {/*            hidden*/}
                {/*            accept=".xlsx,.xls"*/}
                {/*            onChange={onImportExcel}*/}
                {/*            disabled={uploadExcelMutation.isPending}*/}
                {/*        />*/}
                {/*    </Button>*/}
                {/*</Tooltip>*/}

                {/* JSON Import Button */}
                {/*<Tooltip title={getString("tooltipImportFromJson")}>*/}
                {/*    <Button*/}
                {/*        variant="outlined"*/}
                {/*        component="label"*/}
                {/*        startIcon={uploadJsonMutation.isPending ? <CircularProgress size={16} /> : <UploadIcon />}*/}
                {/*        disabled={uploadJsonMutation.isPending}*/}
                {/*    >*/}
                {/*        {getString("importJson")}*/}
                {/*        <input*/}
                {/*            type="file"*/}
                {/*            hidden*/}
                {/*            accept=".json"*/}
                {/*            onChange={onImportJson}*/}
                {/*            disabled={uploadJsonMutation.isPending}*/}
                {/*        />*/}
                {/*    </Button>*/}
                {/*</Tooltip>*/}

                {/* JSON Text Import Button */}
                {/*<Tooltip title={getString("tooltipImportJsonFromText")}>*/}
                {/*    <Button*/}
                {/*        variant="outlined"*/}
                {/*        startIcon={<CodeIcon />}*/}
                {/*        onClick={onImportJsonTextClick}*/}
                {/*        disabled={uploadJsonMutation.isPending}*/}
                {/*    >*/}
                {/*        {getString("importJsonFromText")}*/}
                {/*    </Button>*/}
                {/*</Tooltip>*/}
            {/*</Stack>*/}
        </Stack>
    );
};