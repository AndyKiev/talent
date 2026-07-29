// src/components/people-review/evaluation/hooks/useSectionOrder.ts
//
// The evaluation page's section order: developer default (app setting) with a
// personal override (user setting). Reordering is a VIEW preference, so it is
// never gated on the review being editable — a closed session can still be
// re-stacked. It also never travels through the evaluation autosave, which is
// review-draft plumbing; this writes the user setting directly.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useJsonSetting } from '../../../../hooks/useAppSetting';
import { setUserSetting } from '../../../user_settings/userSettingsApi';
import { EFFECTIVE_SETTINGS_QK, USER_SETTINGS_EFFECTIVE_QK } from '../../../../utils/queryKeys';
import {
    EvaluationSection,
    SECTION_ORDER_SETTING_KEY,
    normalizeSectionOrder,
} from '../sectionOrder';

interface Args {
    onError: (message: string) => void;
}

export function useSectionOrder({ onError }: Args) {
    const qc = useQueryClient();
    const { value } = useJsonSetting(SECTION_ORDER_SETTING_KEY);

    // Reorder mode: the three sections collapse to draggable strips. Kept local
    // (per page visit) — only the resulting ORDER is persisted.
    const [reorderMode, setReorderMode] = useState(false);

    // Optimistic order, so flipping the switch back off shows the new stacking
    // before the settings refetch lands. Null until the user moves something.
    const [localOrder, setLocalOrder] = useState<EvaluationSection[] | null>(null);
    const order = localOrder ?? normalizeSectionOrder(value);

    const saveMut = useMutation({
        mutationFn: setUserSetting,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: USER_SETTINGS_EFFECTIVE_QK });
            await qc.invalidateQueries({ queryKey: EFFECTIVE_SETTINGS_QK });
            // The refetch has landed, so the setting is now the source of truth
            // again — drop the optimistic copy, otherwise a later reset from
            // /settings would stay invisible on this page.
            setLocalOrder(null);
        },
        onError: (err: Error) => onError(err.message),
    });

    const setOrder = (next: EvaluationSection[]) => {
        setLocalOrder(next);
        saveMut.mutate({ key: SECTION_ORDER_SETTING_KEY, value: next });
    };

    return { order, setOrder, reorderMode, setReorderMode, saving: saveMut.isPending };
}
