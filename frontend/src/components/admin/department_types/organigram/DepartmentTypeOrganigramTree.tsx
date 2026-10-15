// src/components/admin/department_types/organigram/DepartmentTypeOrganigramTree.tsx
//
// Lays the type tree out with plain flexbox, branch by branch, so every
// branch may use its OWN layout (partial transpose):
//   - TOP_DOWN  -> children fan out in a ROW below the card ("fan"); when all
//     drawn children are leaves they stack in an indented column instead
//     ("stack"), so the bottom row never explodes sideways;
//   - LEFT_RIGHT -> children stack in a COLUMN right of the card ("side").
// A branch's layout = its type's override (tiny icons on the card) or else
// its parent's layout; the top card falls back to the global orientation.
//
// Connector lines can't be pure CSS once layouts mix, so they are drawn as
// one SVG overlay from the cards' measured positions (re-measured on every
// render and on resize). FOCUS view: the focused type is the single top card;
// TOP view: every root type heads its own tree, side by side.
//
// The tree lives in its own scroll box sized to the window, so both
// scrollbars are always on screen; dragging the empty background pans it,
// and on every view change the top card is scrolled into view.
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { Box, useTheme } from '@mui/material';
import { OrganigramOrientation } from '../../../organigram/organigramOrientation';
import { useDeptTypeOrganigramStore } from '../../../../store/deptTypeOrganigramStore';
import { DepartmentTypeOrganigramCard } from './DepartmentTypeOrganigramCard';
import type { OrgCtx } from './organigramDrag';
import type { TypeTreeNode } from './buildDeptTypeGraph';

type Arrangement = 'fan' | 'stack' | 'side';

interface Edge {
    parentKey: string;
    childKey: string;
    arrangement: Arrangement;
    dashed: boolean;
}

const STACK_INDENT = 32;
const STACK_RAIL = 16;

const arrangementOf = (node: TypeTreeNode, mode: OrganigramOrientation): Arrangement =>
    mode === OrganigramOrientation.LEFT_RIGHT
        ? 'side'
        : node.children.every((c) => c.children.length === 0)
          ? 'stack'
          : 'fan';

/** Every drawn parent→child edge with the arrangement it is drawn in. */
function collectEdges(
    node: TypeTreeNode,
    mode: OrganigramOrientation,
    overrides: Record<number, OrganigramOrientation>,
    out: Edge[],
): Edge[] {
    const own = overrides[node.type.id] ?? mode;
    const arrangement = arrangementOf(node, own);
    for (const c of node.children) {
        out.push({
            parentKey: node.key,
            childKey: c.key,
            arrangement,
            dashed: c.link != null && !c.link.is_active,
        });
        collectEdges(c, own, overrides, out);
    }
    return out;
}

/** SVG path of one edge from the two card boxes (content coordinates). */
function edgePath(p: DOMRect, c: DOMRect, arrangement: Arrangement): string {
    if (arrangement === 'side') {
        const x1 = p.right;
        const y1 = p.top + p.height / 2;
        const x2 = c.left;
        const y2 = c.top + c.height / 2;
        const mx = x1 + (x2 - x1) / 2;
        return `M${x1},${y1} H${mx} V${y2} H${x2}`;
    }
    if (arrangement === 'stack') {
        const x = p.left + STACK_RAIL;
        return `M${x},${p.bottom} V${c.top + c.height / 2} H${c.left}`;
    }
    const x1 = p.left + p.width / 2;
    const x2 = c.left + c.width / 2;
    const my = p.bottom + (c.top - p.bottom) / 2;
    return `M${x1},${p.bottom} V${my} H${x2} V${c.top}`;
}

/** Scroll `box` so `el` lands at its top-centre / left-middle / centre. */
function scrollCardIntoView(
    box: HTMLElement,
    el: HTMLElement,
    anchor: 'top' | 'left' | 'center',
    smooth = false,
) {
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = box.scrollLeft + r.left - b.left;
    const y = box.scrollTop + r.top - b.top;
    const left = anchor === 'left' ? x - 16 : x - (box.clientWidth - r.width) / 2;
    const top = anchor === 'top' ? y - 16 : y - (box.clientHeight - r.height) / 2;
    box.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
}

interface NodeProps {
    node: TypeTreeNode;
    /** Layout inherited from the parent branch (or the global one). */
    mode: OrganigramOrientation;
    ctx: OrgCtx;
    overrides: Record<number, OrganigramOrientation>;
    onLayoutChange: (typeId: number, mode: OrganigramOrientation, inherited: OrganigramOrientation) => void;
    top?: boolean;
    isFocus?: boolean;
}

function TreeNode({ node, mode, ctx, overrides, onLayoutChange, top = false, isFocus = false }: NodeProps) {
    const own = overrides[node.type.id] ?? mode;
    const arrangement = arrangementOf(node, own);
    const hasChildren = node.children.length > 0;

    const card = (
        <DepartmentTypeOrganigramCard
            node={node}
            ctx={ctx}
            emphasis={top}
            isFocus={isFocus}
            layout={
                hasChildren
                    ? { mode: own, onChange: (m) => onLayoutChange(node.type.id, m, mode) }
                    : undefined
            }
        />
    );
    if (!hasChildren) return card;

    const children = node.children.map((c) => (
        <TreeNode
            key={c.key}
            node={c}
            mode={own}
            ctx={ctx}
            overrides={overrides}
            onLayoutChange={onLayoutChange}
        />
    ));

    if (arrangement === 'side')
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
                {card}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                    {children}
                </Box>
            </Box>
        );
    if (arrangement === 'stack')
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                {card}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '10px',
                        pl: `${STACK_INDENT}px`,
                    }}
                >
                    {children}
                </Box>
            </Box>
        );
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
            {card}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>{children}</Box>
        </Box>
    );
}

export function DepartmentTypeOrganigramTree({
    focus,
    roots,
    orientation,
    highlightKey,
    ctx,
}: {
    /** The focused node (focus view) — or null for the top view. */
    focus: TypeTreeNode | null;
    /** Top-view root nodes (ignored when focused). */
    roots: TypeTreeNode[];
    orientation: OrganigramOrientation;
    /** Card currently found by the types panel (scrolled to + highlighted). */
    highlightKey: string | null;
    ctx: OrgCtx;
}) {
    const theme = useTheme();
    const overrides = useDeptTypeOrganigramStore((s) => s.layoutOverrides);
    const setLayoutOverride = useDeptTypeOrganigramStore((s) => s.setLayoutOverride);

    const boxRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
    const [paths, setPaths] = useState<{ d: string; dashed: boolean }[]>([]);
    const [size, setSize] = useState({ w: 0, h: 0 });

    const side = orientation === OrganigramOrientation.LEFT_RIGHT;
    const tops = focus ? [focus] : roots;

    // Choosing the inherited layout removes the override instead of pinning it.
    const onLayoutChange = (
        typeId: number,
        mode: OrganigramOrientation,
        inherited: OrganigramOrientation,
    ) => setLayoutOverride(typeId, mode === inherited ? null : mode);

    // ── Measure cards → connector paths (after every render + on resize) ──
    useLayoutEffect(() => {
        const content = contentRef.current;
        if (!content) return;
        const measure = () => {
            const origin = content.getBoundingClientRect();
            const rects = new Map<string, DOMRect>();
            content.querySelectorAll<HTMLElement>('[data-org-key]').forEach((el) => {
                const r = el.getBoundingClientRect();
                rects.set(
                    el.dataset.orgKey!,
                    new DOMRect(r.left - origin.left, r.top - origin.top, r.width, r.height),
                );
            });
            const edges = tops.flatMap((t) => collectEdges(t, orientation, overrides, []));
            const next = edges.flatMap((e) => {
                const p = rects.get(e.parentKey);
                const c = rects.get(e.childKey);
                return p && c ? [{ d: edgePath(p, c, e.arrangement), dashed: e.dashed }] : [];
            });
            setPaths((prev) =>
                prev.length === next.length && prev.every((x, i) => x.d === next[i].d && x.dashed === next[i].dashed)
                    ? prev
                    : next,
            );
            // Size the overlay from the CARDS, never from content.scrollWidth:
            // the absolute SVG itself counts in scrollWidth, so an overlay sized
            // from it would keep a shrunken tree's box at the old, huge size.
            let w = 0;
            let h = 0;
            rects.forEach((r) => {
                w = Math.max(w, r.right);
                h = Math.max(h, r.bottom);
            });
            setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(content);
        return () => ro.disconnect();
    });

    // Bring the top card into view whenever the drawn tree changes: centered
    // horizontally in a top-down tree, vertically in a side one. Aimed at the
    // card itself (not the mid-scroll), so a stale overlay size can't skew it.
    const topKey = tops[0]?.key;
    const viewKey = `${focus?.key ?? 'top'}|${orientation}|${roots.length}`;
    useLayoutEffect(() => {
        const box = boxRef.current;
        const el = topKey ? box?.querySelector<HTMLElement>(`[data-org-key="${topKey}"]`) : null;
        if (!box || !el) return;
        scrollCardIntoView(box, el, side ? 'left' : 'top');
    }, [viewKey, side, topKey]);

    // Find-next target: centre it in the box (never scrolls the page itself).
    useLayoutEffect(() => {
        const box = boxRef.current;
        const el = highlightKey
            ? box?.querySelector<HTMLElement>(`[data-org-key="${highlightKey}"]`)
            : null;
        if (box && el) scrollCardIntoView(box, el, 'center', true);
    }, [highlightKey]);

    // Pan by dragging the empty background (cards keep their own clicks/drag).
    const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        const box = boxRef.current;
        if (!box || e.button !== 0 || (e.target as HTMLElement).closest('.org-card')) return;
        pan.current = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop };
        e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const box = boxRef.current;
        if (!box || !pan.current) return;
        box.scrollLeft = pan.current.left - (e.clientX - pan.current.x);
        box.scrollTop = pan.current.top - (e.clientY - pan.current.y);
    };
    const stopPan = () => {
        pan.current = null;
    };

    const stroke = theme.palette.text.disabled;

    return (
        <Box
            ref={boxRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopPan}
            onMouseLeave={stopPan}
            sx={{
                overflow: 'auto',
                maxHeight: 'calc(100vh - 220px)',
                minHeight: 320,
                pb: 1,
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
            }}
        >
            <Box
                ref={contentRef}
                sx={{
                    position: 'relative',
                    width: 'max-content',
                    mx: 'auto',
                    p: 1,
                    display: 'flex',
                    flexDirection: side ? 'column' : 'row',
                    alignItems: 'flex-start',
                    gap: '48px',
                }}
            >
                <svg
                    width={size.w}
                    height={size.h}
                    style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 0 }}
                >
                    {paths.map((p, i) => (
                        <path
                            key={i}
                            d={p.d}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={1}
                            strokeDasharray={p.dashed ? '4 3' : undefined}
                        />
                    ))}
                </svg>
                {tops.map((t) => (
                    <TreeNode
                        key={t.key}
                        node={t}
                        mode={orientation}
                        ctx={ctx}
                        overrides={overrides}
                        onLayoutChange={onLayoutChange}
                        top
                        isFocus={focus != null}
                    />
                ))}
            </Box>
        </Box>
    );
}
