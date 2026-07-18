import { useState, type Dispatch, type SetStateAction } from 'react';
import type { LocalEval, Mission, SummaryOption } from '../evaluationHelpers';

interface Args {
    missions: Mission[];
    setMissions: Dispatch<SetStateAction<Mission[]>>;
    maxMissions: number;
    developOptions: SummaryOption[];
    visibleEvals: LocalEval[];
    competenceLabel: (key: string) => string;
    competenceColor: (key: string) => string;
}

/**
 * Development-plan mission list handlers + the add-row input state. A numbered
 * add/remove list bounded by the developer max; the add row sets the linked
 * competence in parallel with the text.
 */
export function useMissions({
    missions, setMissions, maxMissions,
    developOptions, visibleEvals, competenceLabel, competenceColor,
}: Args) {
    const [newMissionText, setNewMissionText] = useState('');
    const [newMissionKpi, setNewMissionKpi] = useState('');
    const [newMissionCompetence, setNewMissionCompetence] = useState<string | null>(null);

    const addMission = (text: string, dimensionKey: string | null) => {
        const trimmed = text.trim();
        const trimmedKpi = newMissionKpi.trim();
        if (!trimmed) return;
        if (!trimmedKpi) return; // KPI is required
        if (missions.length >= maxMissions) return;
        setMissions(prev => [...prev, { text: trimmed, kpi: trimmedKpi, dimension_key: dimensionKey }]);
        setNewMissionText('');
        setNewMissionKpi('');
        setNewMissionCompetence(null);
    };
    const removeMission = (index: number) => {
        setMissions(prev => prev.filter((_, i) => i !== index));
    };
    const updateMission = (index: number, value: string) => {
        setMissions(prev => prev.map((m, i) => (i === index ? { ...m, text: value } : m)));
    };
    const setMissionCompetence = (index: number, dimension_key: string | null) => {
        setMissions(prev => prev.map((m, i) => (i === index ? { ...m, dimension_key } : m)));
    };
    const updateMissionKpi = (index: number, value: string) => {
        setMissions(prev => prev.map((m, i) => (i === index ? { ...m, kpi: value } : m)));
    };

    // Competences a mission may target: the "to develop" shortlist by default,
    // or every competence when the developer setting allows it AND the user opts
    // in. Each option carries its translated name + color, mirroring the page.
    const developCompetenceOptions = developOptions.map(o => ({
        key: o.dimension_key,
        name: competenceLabel(o.dimension_key),
        color: competenceColor(o.dimension_key),
    }));
    const allCompetenceOptions = visibleEvals.map(e => ({
        key: e.dimension_key,
        name: competenceLabel(e.dimension_key),
        color: competenceColor(e.dimension_key),
    }));

    return {
        newMissionText, setNewMissionText,
        newMissionKpi, setNewMissionKpi,
        newMissionCompetence, setNewMissionCompetence,
        addMission, removeMission, updateMission, setMissionCompetence, updateMissionKpi,
        developCompetenceOptions, allCompetenceOptions,
    };
}
