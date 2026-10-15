// src/components/organigram/organigramOrientation.ts
//
// Which way an organigram grows: TOP_DOWN = one row per level (classic org
// chart); LEFT_RIGHT = one column per level (transposed — a wide level grows
// downward instead of sideways).
import type { GetStringFn } from '../../types/getStringFn';

export enum OrganigramOrientation {
    TOP_DOWN = 'top_down',
    LEFT_RIGHT = 'left_right',
}

const LABEL_KEY: Record<OrganigramOrientation, string> = {
    [OrganigramOrientation.TOP_DOWN]: 'organigramOrientationTopDown',
    [OrganigramOrientation.LEFT_RIGHT]: 'organigramOrientationLeftRight',
};

export const organigramOrientationLabel = (
    orientation: OrganigramOrientation,
    getString: GetStringFn,
): string => getString(LABEL_KEY[orientation]);
