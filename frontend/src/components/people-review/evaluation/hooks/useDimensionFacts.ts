import { useState, type Dispatch, type SetStateAction } from 'react';
import type { LocalEval, DraggedItem, PendingMove } from '../evaluationHelpers';

interface Args {
    setLocalEvals: Dispatch<SetStateAction<LocalEval[]>>;
}

/**
 * Per-competence facts + directions-for-improvement editing: add / remove /
 * edit / reorder within a competence, and move a numbered item to another
 * competence tab. Also owns the ephemeral input + drag state (not part of the
 * saved draft). All writes go through the passed-in `setLocalEvals` draft setter.
 */
export function useDimensionFacts({ setLocalEvals }: Args) {
    const [newFactTexts, setNewFactTexts] = useState<Record<number, string>>({});
    const [newImprovementTexts, setNewImprovementTexts] = useState<Record<number, string>>({});
    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
    const [dragOverTab, setDragOverTab] = useState<number | null>(null);
    const [dragOverFactIndex, setDragOverFactIndex] = useState<number | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

    const addFact = (evalId: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, facts: [...e.facts, trimmed] } : e,
        ));
        setNewFactTexts(prev => ({ ...prev, [evalId]: '' }));
    };

    const removeFact = (evalId: number, index: number) => {
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, facts: e.facts.filter((_, i) => i !== index) } : e,
        ));
    };

    // Edit an existing fact in place (text already trimmed by the inline editor).
    const editFact = (evalId: number, index: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, facts: e.facts.map((f, i) => (i === index ? trimmed : f)) } : e,
        ));
    };

    // Reorder a fact within the same competence (drop it *before* the target row).
    const reorderFact = (evalId: number, from: number, toRow: number) => {
        const to = from < toRow ? toRow - 1 : toRow;
        if (from === to) return;
        setLocalEvals(prev => prev.map(e => {
            if (e.id !== evalId) return e;
            const next = [...e.facts];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return { ...e, facts: next };
        }));
    };

    // --- Directions for improvement (a numbered list, like facts but per-competence only) ---
    const addImprovement = (evalId: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, improvements: [...e.improvements, trimmed] } : e,
        ));
        setNewImprovementTexts(prev => ({ ...prev, [evalId]: '' }));
    };

    const removeImprovement = (evalId: number, index: number) => {
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, improvements: e.improvements.filter((_, i) => i !== index) } : e,
        ));
    };

    // Edit an existing direction-for-improvement in place.
    const editImprovement = (evalId: number, index: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, improvements: e.improvements.map((imp, i) => (i === index ? trimmed : imp)) } : e,
        ));
    };

    // Reorder an improvement within the same competence (drop it *before* the target row).
    const reorderImprovement = (evalId: number, from: number, toRow: number) => {
        const to = from < toRow ? toRow - 1 : toRow;
        if (from === to) return;
        setLocalEvals(prev => prev.map(e => {
            if (e.id !== evalId) return e;
            const next = [...e.improvements];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return { ...e, improvements: next };
        }));
    };

    // Move a numbered fact from one competence to another. Both lists re-number
    // automatically (numbering is the render-time array index).
    const moveFact = (fromEvalId: number, index: number, toEvalId: number) => {
        if (fromEvalId === toEvalId) return;
        setLocalEvals(prev => {
            const fact = prev.find(e => e.id === fromEvalId)?.facts[index];
            if (fact == null) return prev;
            return prev.map(e => {
                if (e.id === fromEvalId) return { ...e, facts: e.facts.filter((_, i) => i !== index) };
                if (e.id === toEvalId) return { ...e, facts: [...e.facts, fact] };
                return e;
            });
        });
    };

    // Move a numbered improvement from one competence to another (mirrors moveFact).
    const moveImprovement = (fromEvalId: number, index: number, toEvalId: number) => {
        if (fromEvalId === toEvalId) return;
        setLocalEvals(prev => {
            const imp = prev.find(e => e.id === fromEvalId)?.improvements[index];
            if (imp == null) return prev;
            return prev.map(e => {
                if (e.id === fromEvalId) return { ...e, improvements: e.improvements.filter((_, i) => i !== index) };
                if (e.id === toEvalId) return { ...e, improvements: [...e.improvements, imp] };
                return e;
            });
        });
    };

    return {
        newFactTexts, setNewFactTexts,
        newImprovementTexts, setNewImprovementTexts,
        draggedItem, setDraggedItem,
        dragOverTab, setDragOverTab,
        dragOverFactIndex, setDragOverFactIndex,
        pendingMove, setPendingMove,
        addFact, removeFact, editFact, reorderFact,
        addImprovement, removeImprovement, editImprovement, reorderImprovement,
        moveFact, moveImprovement,
    };
}
