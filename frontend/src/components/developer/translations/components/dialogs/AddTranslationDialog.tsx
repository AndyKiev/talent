// components/developer/translations/components/dialogs/AddTranslationDialog.tsx
import React from 'react';
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
import type { TranslationFormData } from "../../types.ts";
import useString from "../../../../../hooks/useString.ts";
import { useTranslations } from "../../../../../hooks/useTranslations.ts";

interface AddTranslationDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: TranslationFormData) => Promise<void>;
}

// The form lives INSIDE the Dialog, so MUI unmounts it when the dialog closes
// and mounts it fresh on each open — useForm re-initializes from defaultValues
// and no reset-on-open effect is needed. Keyed on the langs count so the field
// list rebuilds if languages arrive while the dialog is already open.
export const AddTranslationDialog: React.FC<AddTranslationDialogProps> = ({
    open,
    onClose,
    onSubmit,
}) => {
    const getString = useString();
    const { langs } = useTranslations();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{getString("addNewTranslation")}</DialogTitle>
            <AddTranslationForm key={langs?.length ?? 0} onClose={onClose} onSubmit={onSubmit} />
        </Dialog>
    );
};

const AddTranslationForm: React.FC<Omit<AddTranslationDialogProps, 'open'>> = ({ onClose, onSubmit }) => {
    const getString = useString();
    const { langs, addKeyMutation } = useTranslations();

    const { control, register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<TranslationFormData>({
        defaultValues: {
            key: '',
            translations: (langs ?? []).map(lang => ({
                lang_id: lang.id,
                value: '',
            })),
        }
    });

    const { fields } = useFieldArray({
        control,
        name: 'translations',
    });

    // Auto-generate a camelCase key from the English value while the key field
    // is still empty (event-driven — no effect needed).
    const deriveKeyFromEnglish = (english: string) => {
        if (!english || getValues('key')) return;
        const camelCaseKey = english
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
        setValue('key', camelCaseKey);
    };

    return (
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

                        const isEnglish = lang.name.toLowerCase() === 'english';
                        return (
                            <TextField
                                key={field.id}
                                label={`${lang.name} ${getString("translation")}`}
                                {...register(`translations.${index}.value`, isEnglish ? {
                                    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                                        deriveKeyFromEnglish(e.target.value),
                                } : undefined)}
                                multiline
                                rows={2}
                                fullWidth
                            />
                        );
                    })}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{getString("cancel")}</Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={addKeyMutation.isPending}
                >
                    {addKeyMutation.isPending ? getString("adding") : getString("addTranslation")}
                </Button>
            </DialogActions>
        </form>
    );
};
