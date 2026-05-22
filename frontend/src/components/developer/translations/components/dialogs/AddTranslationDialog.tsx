// components/Customized/Admin/Locale/dialogs/AddTranslationDialog.tsx
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
import type {TranslationFormData} from "../../types.ts";
import useString from "../../../../../hooks/useString.ts";
import {useTranslations} from "../../../../../hooks/useTranslations.ts";

interface AddTranslationDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: TranslationFormData) => Promise<void>;
}

export const AddTranslationDialog: React.FC<AddTranslationDialogProps> = ({
                                                                              open,
                                                                              onClose,
                                                                              onSubmit,
                                                                          }) => {
    const getString = useString();
    const { langs, addKeyMutation } = useTranslations();

    const { control, register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TranslationFormData>({
        defaultValues: {
            key: '',
            translations: [],
        }
    });

    const { fields } = useFieldArray({
        control,
        name: 'translations',
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open && langs && langs.length > 0) {
            reset({
                key: '',
                translations: langs.map(lang => ({
                    lang_id: lang.id,
                    value: '',
                })),
            });
        }
    }, [open, langs, reset]);

    // Watch for English field changes to auto-generate key
    const englishField = watch('translations')?.find(t => {
        const lang = langs?.find(l => l.id === t.lang_id);
        return lang?.name.toLowerCase() === 'english';
    });

    useEffect(() => {
        if (englishField?.value && !watch('key')) {
            const camelCaseKey = englishField.value
                .toLowerCase()
                .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
                .replace(/[^a-zA-Z0-9]/g, '');
            setValue('key', camelCaseKey);
        }
    }, [englishField?.value, setValue, watch]);

    const handleClose = () => {
        onClose();
        reset();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>{getString("addNewTranslation")}</DialogTitle>
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
                        disabled={addKeyMutation.isPending}
                    >
                        {addKeyMutation.isPending ? getString("adding") : getString("addTranslation")}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};