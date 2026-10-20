import { createFileRoute } from '@tanstack/react-router';
import { TalentEmployeesPage } from '../../components/employees/talent_employees/TalentEmployeesPage';
import { HasTalentFilter } from '../../components/employees/talent_employees/hasTalentFilter';

// Every filter, the page and the sort live in the URL so Back returns to the
// previous view (and a reload/bookmark restores it):
// ?dept&all&subdept&job&status&emp&q (same meaning as /employees, but ids)
// &talent=<yes|no|all> (absent = yes) &tstatus&tperiod &page&size&sort&desc.
export interface TalentEmployeesSearch {
    dept?: number;
    all?: boolean;
    subdept?: number;
    job?: number;
    status?: number;
    emp?: number;
    q?: string;
    talent?: HasTalentFilter;
    tstatus?: number;
    tperiod?: number;
    page?: number;
    size?: number;
    sort?: string;
    desc?: boolean;
}

const toId = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : undefined;
};

const toText = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v : undefined;

const toFlag = (v: unknown): true | undefined =>
    v === true || v === 1 || v === '1' || v === 'true' ? true : undefined;

const toPage = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : undefined;
};

const toHasTalent = (v: unknown): HasTalentFilter | undefined =>
    Object.values(HasTalentFilter).includes(v as HasTalentFilter) && v !== HasTalentFilter.Yes
        ? (v as HasTalentFilter)
        : undefined;

export const Route = createFileRoute('/employees/talent_employees')({
    component: TalentEmployeesPage,
    validateSearch: (search: Record<string, unknown>): TalentEmployeesSearch => ({
        dept: toId(search.dept),
        all: toFlag(search.all),
        subdept: toId(search.subdept),
        job: toId(search.job),
        status: toId(search.status),
        emp: toId(search.emp),
        q: toText(search.q),
        talent: toHasTalent(search.talent),
        tstatus: toId(search.tstatus),
        tperiod: toId(search.tperiod),
        page: toPage(search.page),
        size: toId(search.size),
        sort: toText(search.sort),
        desc: toFlag(search.desc),
    }),
});
