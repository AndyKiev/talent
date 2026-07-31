import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import {
    createEmployeeFact,
    deleteEmployeeFact,
    linkEmployeeFact,
    reorderEmployeeFacts,
    unlinkEmployeeFact,
    updateEmployeeFact,
    FACT_KEY_FACT,
    FACT_KEY_IMPROVEMENT,
    type EmployeeFact,
    type EmployeeFactType,
} from '../../employeeFactApi';
import {
    DragItemKind,
    type LocalEval,
    type DraggedItem,
    type PendingMove,
    type PendingFactDelete,
} from '../evaluationHelpers';

interface Args {
    /** The reviewed employee — a fact is owned by them, not by the review. */
    employeeId: number | null | undefined;
    /** The seeded kinds, from the DB lookup — supplies each write's type id. */
    factTypes: EmployeeFactType[];
    /** Read side of the draft. Lookups happen OUTSIDE the state updater so a
     *  double-invoked updater (StrictMode) can never fire the request twice. */
    localEvals: LocalEval[];
    setLocalEvals: Dispatch<SetStateAction<LocalEval[]>>;
    onError: (message: string) => void;
    /** Re-read the unlinked pool (the badge count) after a link/unlink/create. */
    onPoolChanged: () => void;
}

/** The list of a competence that a kind maps to. */
const listKey = (kind: DragItemKind): 'facts' | 'improvements' =>
    kind === DragItemKind.Improvement ? 'improvements' : 'facts';

/**
 * Per-competence facts + directions-for-improvement editing: add / remove /
 * edit / reorder within a competence, move an item to another competence, and
 * move it to or from the employee's unlinked pool.
 *
 * These lines are ROWS now (`employee_facts`), each carrying its own id and its
 * author, so every operation is a direct call to /employee_facts rather than a
 * change to the autosaved draft. The draft is still updated optimistically so
 * the list re-numbers immediately; a failed call reports the error and asks the
 * page to reload, since the server is the source of truth for these rows.
 */
export function useDimensionFacts({
    employeeId, factTypes, localEvals, setLocalEvals, onError, onPoolChanged,
}: Args) {
    const [newFactTexts, setNewFactTexts] = useState<Record<number, string>>({});
    const [newImprovementTexts, setNewImprovementTexts] = useState<Record<number, string>>({});
    const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
    const [dragOverTab, setDragOverTab] = useState<number | null>(null);
    const [dragOverFactIndex, setDragOverFactIndex] = useState<number | null>(null);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [pendingFactDelete, setPendingFactDelete] = useState<PendingFactDelete | null>(null);

    const typeIdOf = useCallback((kind: DragItemKind): number | undefined => {
        const key = kind === DragItemKind.Improvement ? FACT_KEY_IMPROVEMENT : FACT_KEY_FACT;
        return factTypes.find(ft => ft.key === key)?.id;
    }, [factTypes]);

    const report = useCallback((err: unknown) => {
        onError(err instanceof Error ? err.message : String(err));
    }, [onError]);

    // --- draft mutators (optimistic; the server call runs alongside) ---

    const replaceList = useCallback((
        evalId: number,
        kind: DragItemKind,
        next: (current: EmployeeFact[]) => EmployeeFact[],
    ) => {
        const key = listKey(kind);
        setLocalEvals(prev => prev.map(e =>
            e.id === evalId ? { ...e, [key]: next(e[key]) } : e,
        ));
    }, [setLocalEvals]);

    const findItem = useCallback((
        evalId: number, kind: DragItemKind, index: number,
    ): EmployeeFact | undefined =>
        localEvals.find(e => e.id === evalId)?.[listKey(kind)][index],
    [localEvals]);

    // --- operations ---

    const addItem = useCallback((evalId: number, kind: DragItemKind, text: string) => {
        const trimmed = text.trim();
        const typeId = typeIdOf(kind);
        if (!trimmed || employeeId == null || typeId == null) return;
        const setter = kind === DragItemKind.Improvement ? setNewImprovementTexts : setNewFactTexts;
        setter(prev => ({ ...prev, [evalId]: '' }));
        void createEmployeeFact({
            employee_id: employeeId,
            employee_fact_type_id: typeId,
            text: trimmed,
            review_session_employee_evaluation_id: evalId,
        })
            .then(res => replaceList(evalId, kind, current => [...current, res.data]))
            .catch(report);
    }, [employeeId, typeIdOf, replaceList, report]);

    const removeItem = useCallback((evalId: number, kind: DragItemKind, index: number) => {
        const item = findItem(evalId, kind, index);
        if (!item) return;
        void deleteEmployeeFact(item.id).catch(report);
        replaceList(evalId, kind, current => current.filter((_, i) => i !== index));
    }, [findItem, replaceList, report]);

    const editItem = useCallback((evalId: number, kind: DragItemKind, index: number, text: string) => {
        const trimmed = text.trim();
        const item = findItem(evalId, kind, index);
        if (!trimmed || !item) return;
        void updateEmployeeFact(item.id, { text: trimmed }).catch(report);
        replaceList(evalId, kind, current =>
            current.map((f, i) => (i === index ? { ...f, text: trimmed } : f)),
        );
    }, [findItem, replaceList, report]);

    // Reorder within the same competence (drop it *before* the target row). The
    // sent array order becomes sort_order, so the numbering the reader sees and
    // the stored order can never disagree.
    const reorderItem = useCallback((evalId: number, kind: DragItemKind, from: number, toRow: number) => {
        const to = from < toRow ? toRow - 1 : toRow;
        if (from === to) return;
        const typeId = typeIdOf(kind);
        const current = localEvals.find(e => e.id === evalId)?.[listKey(kind)];
        if (typeId == null || !current) return;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        if (!moved) return;
        next.splice(to, 0, moved);
        void reorderEmployeeFacts(evalId, typeId, next.map(f => f.id)).catch(report);
        replaceList(evalId, kind, () => next);
    }, [localEvals, replaceList, typeIdOf, report]);

    // Move an item from one competence to another. Both lists re-number
    // automatically (the numbering is the render-time array index).
    const moveItem = useCallback((
        fromEvalId: number, kind: DragItemKind, index: number, toEvalId: number,
    ) => {
        const item = findItem(fromEvalId, kind, index);
        if (fromEvalId === toEvalId || !item) return;
        void linkEmployeeFact(item.id, toEvalId).catch(report);
        const key = listKey(kind);
        setLocalEvals(prev => prev.map(e => {
            if (e.id === fromEvalId) return { ...e, [key]: e[key].filter((_, i) => i !== index) };
            if (e.id === toEvalId) return { ...e, [key]: [...e[key], item] };
            return e;
        }));
    }, [setLocalEvals, findItem, report]);

    /** Drop a line from the unlinked pool onto a competence. Which of the two
     *  lists it joins comes from the SERVER's reply (the fact carries its kind),
     *  so the pool row never has to be looked up locally. */
    const linkFromPool = useCallback((factId: number, toEvalId: number) => {
        void linkEmployeeFact(factId, toEvalId)
            .then(res => {
                const kind = res.data.employee_fact_type_key === FACT_KEY_IMPROVEMENT
                    ? DragItemKind.Improvement
                    : DragItemKind.Fact;
                replaceList(toEvalId, kind, current => [...current, res.data]);
                onPoolChanged();
            })
            .catch(report);
    }, [replaceList, onPoolChanged, report]);

    // --- the unlinked pool's own CRUD (the quick-registration drawer) ---

    /** Quick registration: a line with a kind but NO competence. */
    const createPoolFact = useCallback((typeId: number, text: string) => {
        const trimmed = text.trim();
        if (employeeId == null || !trimmed) return;
        void createEmployeeFact({
            employee_id: employeeId,
            employee_fact_type_id: typeId,
            text: trimmed,
        }).then(onPoolChanged).catch(report);
    }, [employeeId, onPoolChanged, report]);

    const editPoolFact = useCallback((factId: number, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        void updateEmployeeFact(factId, { text: trimmed }).then(onPoolChanged).catch(report);
    }, [onPoolChanged, report]);

    /** Correct a line registered under the wrong kind, without retyping it. */
    const changePoolFactType = useCallback((factId: number, typeId: number) => {
        void updateEmployeeFact(factId, { employee_fact_type_id: typeId })
            .then(onPoolChanged)
            .catch(report);
    }, [onPoolChanged, report]);

    const deletePoolFact = useCallback((factId: number) => {
        void deleteEmployeeFact(factId).then(onPoolChanged).catch(report);
    }, [onPoolChanged, report]);

    // --- delete confirmation (shared by both places a line is shown) ---

    const requestDeleteFromList = useCallback((
        evalId: number, kind: DragItemKind, index: number,
    ) => {
        const item = findItem(evalId, kind, index);
        if (!item) return;
        setPendingFactDelete({
            text: item.text, source: 'list', evalId, kind, index, factId: item.id,
        });
    }, [findItem]);

    const requestDeleteFromPool = useCallback((fact: EmployeeFact) => {
        setPendingFactDelete({
            text: fact.text, source: 'pool', evalId: null, kind: null, index: null,
            factId: fact.id,
        });
    }, []);

    const confirmFactDelete = useCallback(() => {
        const pending = pendingFactDelete;
        setPendingFactDelete(null);
        if (!pending) return;
        if (pending.source === 'pool') {
            if (pending.factId != null) deletePoolFact(pending.factId);
            return;
        }
        if (pending.evalId != null && pending.kind != null && pending.index != null) {
            removeItem(pending.evalId, pending.kind, pending.index);
        }
    }, [pendingFactDelete, deletePoolFact, removeItem]);

    /** Send an item back to the pool. The link row goes; the text stays. */
    const unlinkToPool = useCallback((evalId: number, kind: DragItemKind, index: number) => {
        const item = findItem(evalId, kind, index);
        if (!item) return;
        void unlinkEmployeeFact(item.id).then(onPoolChanged).catch(report);
        replaceList(evalId, kind, current => current.filter((_, i) => i !== index));
    }, [findItem, replaceList, onPoolChanged, report]);

    // Kind-specific wrappers — the panel reads as two independent lists.
    const addFact = (evalId: number, text: string) => addItem(evalId, DragItemKind.Fact, text);
    const removeFact = (evalId: number, index: number) => requestDeleteFromList(evalId, DragItemKind.Fact, index);
    const editFact = (evalId: number, index: number, text: string) => editItem(evalId, DragItemKind.Fact, index, text);
    const reorderFact = (evalId: number, from: number, toRow: number) => reorderItem(evalId, DragItemKind.Fact, from, toRow);
    const moveFact = (fromEvalId: number, index: number, toEvalId: number) => moveItem(fromEvalId, DragItemKind.Fact, index, toEvalId);
    const unlinkFact = (evalId: number, index: number) => unlinkToPool(evalId, DragItemKind.Fact, index);

    const addImprovement = (evalId: number, text: string) => addItem(evalId, DragItemKind.Improvement, text);
    const removeImprovement = (evalId: number, index: number) => requestDeleteFromList(evalId, DragItemKind.Improvement, index);
    const editImprovement = (evalId: number, index: number, text: string) => editItem(evalId, DragItemKind.Improvement, index, text);
    const reorderImprovement = (evalId: number, from: number, toRow: number) => reorderItem(evalId, DragItemKind.Improvement, from, toRow);
    const moveImprovement = (fromEvalId: number, index: number, toEvalId: number) => moveItem(fromEvalId, DragItemKind.Improvement, index, toEvalId);
    const unlinkImprovement = (evalId: number, index: number) => unlinkToPool(evalId, DragItemKind.Improvement, index);

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
        linkFromPool, unlinkFact, unlinkImprovement,
        createPoolFact, editPoolFact, changePoolFactType,
        // Deleting always goes through the confirm dialog — `removeFact` /
        // `removeImprovement` / `requestDeleteFromPool` only ARM it.
        requestDeleteFromPool, pendingFactDelete, setPendingFactDelete, confirmFactDelete,
    };
}
