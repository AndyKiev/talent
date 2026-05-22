// components/Customized/Admin/Locale/dialogs/EditTranslationDialog.tsx
import React, { useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
} from '@mui/material';
import { useForm, useFieldArray } from 'react-hook-form';

import useString from "../../../../../hooks/useString";
import {useTranslations} from "../../../../../hooks/useTranslations.ts";
import type {TranslationFormData} from "../../types.ts";
import type {TableTranslation} from "../../translations.ts";


interface EditTranslationDialogProps {
    open: boolean;
    editingTranslation: TableTranslation | null;
    onClose: () => void;
    onSubmit: (data: TranslationFormData) => Promise<void>;
}

export const EditTranslationDialog: React.FC<EditTranslationDialogProps> = ({
                                                                                open,
                                                                                editingTranslation,
                                                                                onClose,
                                                                                onSubmit,
                                                                            }) => {
    const getString = useString();
    const { langs, updateStringMutation } = useTranslations();

    const { control, register, handleSubmit, reset, formState: { errors } } = useForm<TranslationFormData>({
        defaultValues: {
            key: '',
            translations: [],
        }
    });

    const { fields } = useFieldArray({
        control,
        name: 'translations',
    });

    // Reset form with editing data when dialog opens
    useEffect(() => {
        if (open && editingTranslation && langs) {
            const translationsWithValues = langs.map(lang => ({
                lang_id: lang.id,
                value: editingTranslation[lang.short_name] as string || '',
            }));

            reset({
                key: editingTranslation.key,
                translations: translationsWithValues,
            });
        }
    }, [open, editingTranslation, langs, reset]);

    const handleClose = () => {
        onClose();
        reset();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>{getString("editTranslation")}</DialogTitle>
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    <Stack spacing={2}>
                        <TextField
                            label={getString("keyName")}
                            {...register('key', { required: getString("keyNameIsRequired") })}
                            error={!!errors.key}
                            helperText={errors.key?.message}
                            fullWidth
                        />

                        {fields.map((field, index) => {
                            const lang = langs?.find(l => l.id === field.lang_id);
                            if (!lang) return null;

                            return (
                                <TextField
                                    key={field.id}
                                    label={`${lang.name} ${getString("translation")}`}
                                    {...register(`translations.${index}.value`)}
                                    multiline
                                    rows={2}
                                    fullWidth
                                />
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>{getString("cancel")}</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={updateStringMutation.isPending}
                    >
                        {updateStringMutation.isPending ? getString("updating") : getString("updateTranslation")}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};