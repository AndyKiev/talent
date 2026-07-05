import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from "../../utils/eNums.ts"

// Maximum grade an evaluation score can take (must match the backend MAX_GRADE).
export const MAX_GRADE = 4;

const RS_BASE = `${BASE_URL}/review_sessions`;
const RSE_BASE = `${BASE_URL}/review_session_employees`;
const EVAL_BASE = `${BASE_URL}/review_evaluations`;
const LANG_LEVEL_BASE = `${BASE_URL}/language_levels`;
const ELP_BASE = `${BASE_URL}/employee_language_profiles`;
const LEVEL_BASE = `${BASE_URL}/review_levels`;
const LEVEL_REQ_BASE = `${BASE_URL}/review_level_requirements`;
const EMPLOYEE_BASE = `${BASE_URL}/employees`;

// --- Review Session Status types ---
export interface ReviewSessionStatus {
    id: number;
    key: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

// --- Review Session types ---
export interface ReviewSession {
    id: number;
    name: string;
    description: string | null;
    status_id: number;
    status: string;
    period_start: string | null;
    period_end: string | null;
    employee_count: number;
    department_name: string | null;
}

export interface ReviewSessionCreate {
    name: string;
    description?: string | null;
    period_start?: string | null;
    period_end?: string | null;
    department_id?: number | null;
}

export interface MutationResponse<T> {
    detail: string;
    data: T;
}

// --- Review Session Employee types ---
export interface ReviewSessionEmployeeList {
    id: number;
    session_id: number;
    employee_id: number;
    status: string;
    employee_name: string;
    employee_code: string;
    scored_count: number;
    facts_count: number;
    total_dimensions: number;
    queue_position: number | null;
}

export interface CriterionScore {
    criterion_index: number;
    score: number;
}

/** A behaviour descriptor frozen into the session at open time (text copy). */
export interface FrozenCriterion {
    id: number;
    text: string;
    sort_order: number;
}

export interface Evaluation {
    id: number;
    review_session_employee_id: number;
    dimension_id: number;
    score: number | null;
    mean_score: number | null;
    facts: string | null;
    improvement: string | null;
    criterion_scores: CriterionScore[];
    // Frozen descriptors for this dimension (display order). Empty for sessions
    // opened before the freeze existed — the store then falls back to the hint.
    criteria: FrozenCriterion[];
    dimension_name: string;
    dimension_key: string;
    dimension_description: string | null;
    dimension_is_active: boolean;
    dimension_color: string;
    dimension_sort_order: number;
}

export interface ReviewSessionEmployee {
    id: number;
    session_id: number;
    employee_id: number;
    status: string;
    employee_name: string;
    employee_code: string;
    session_name: string;
    session_status: string;
    // Employee-header facts, served by the people-review-scoped RSE detail so
    // the page never calls the admin-guarded GET /employees/{id}. ISO
    // 'YYYY-MM-DD' on the wire for the dates.
    current_level_id: number | null;
    birth_date: string | null;
    hire_date: string | null;
    job_assigned_date: string | null;
    sex: Sex | null;
    marital_status: MaritalStatus | null;
    job_name: string | null;
    main_department_name: string | null;
    employee_feedback: string | null;
    manager_feedback: string | null;
    results_achievements: string | null;
    development_plan: string | null;
    trainings: string | null;
    competence_summary: string | null;
    // Per-review opt-in for the full competence list in the summary selects (see
    // the backend column). Only honoured when the global setting allows it.
    summary_full_competence_list: boolean;
    evaluations: Evaluation[];
}

export interface RSEFieldsUpdate {
    employee_feedback?: string | null;
    manager_feedback?: string | null;
    results_achievements?: string | null;
    development_plan?: string | null;
    trainings?: string | null;
    competence_summary?: string | null;
    summary_full_competence_list?: boolean;
}

// --- Review Session API ---
const RSS_BASE = `${BASE_URL}/review_session_statuses`;

export const fetchReviewSessionStatuses = async (): Promise<ReviewSessionStatus[]> => {
    const res = await axiosInstance.get<ReviewSessionStatus[]>(RSS_BASE);
    return res.data ?? [];
};

export const fetchReviewSessions = async (): Promise<ReviewSession[]> => {
    const res = await axiosInstance.get<ReviewSession[]>(RS_BASE);
    return res.data ?? [];
};

export const createReviewSession = async (
    body: ReviewSessionCreate,
): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(RS_BASE, body);
    return res.data;
};

export const openReviewSession = async (id: number): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(`${RS_BASE}/${id}/open`);
    return res.data;
};

export const closeReviewSession = async (id: number): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(`${RS_BASE}/${id}/close`);
    return res.data;
};

export const revertReviewSession = async (id: number): Promise<MutationResponse<ReviewSession>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSession>>(`${RS_BASE}/${id}/revert`);
    return res.data;
};

export const deleteReviewSession = async (id: number): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(`${RS_BASE}/${id}`);
    return res.data;
};

// --- People-review scope (active mode / role switching) ---
const PR_SCOPE_BASE = `${BASE_URL}/people_review`;

export interface MyRole {
    process_role_id: number;
    key: string | null;
    name: string;
    link_target: 'employee' | 'department';
}
export interface MyDepartment {
    id: number;
    name: string;
    process_role_id: number;
}
export interface ActiveContext {
    process_role_id: number | null;
    department_id: number | null;
}
export interface MyScopes {
    roles: MyRole[];
    departments: MyDepartment[];
    active: ActiveContext;
}

export const fetchMyScopes = async (): Promise<MyScopes> => {
    const res = await axiosInstance.get<MyScopes>(`${PR_SCOPE_BASE}/my_scopes`);
    return res.data;
};

export const setActiveContext = async (body: ActiveContext): Promise<ActiveContext> => {
    const res = await axiosInstance.put<ActiveContext>(`${PR_SCOPE_BASE}/active_context`, body);
    return res.data;
};

// --- Session departments (for supervision scope cross-check) ---
export interface SessionDepartment {
    id: number;
    session_id: number;
    department_id: number;
    department_name: string | null;
}

/** Fetch the department-ids linked to a review session. Returns just the id list. */
export const fetchSessionDepartments = async (sessionId: number): Promise<number[]> => {
    const res = await axiosInstance.get<SessionDepartment[]>(`${RS_BASE}/${sessionId}/departments`);
    return (res.data ?? []).map((d) => d.department_id);
};

// --- Oversight manager (self-service: pick your own oversight reviewer) ---
export interface OversightManagerOption {
    process_role_holder_id: number;
    holder_employee_id: number;
    holder_code: string | null;
    holder_name: string | null;
    role_name: string | null;
}
export interface MyOversightManager {
    link_id: number;
    process_role_holder_id: number;
    holder_employee_id: number;
    holder_code: string | null;
    holder_name: string | null;
}

/** Existing oversight reviewers the current user may pick (excludes self).
 *  Pass `short: true` to get only managers from the user's department scope
 *  (same main department + parent department, with job linked to oversight). */
export const fetchOversightManagerOptions = async (
    short?: boolean,
): Promise<OversightManagerOption[]> => {
    const params = short ? { short: true } : undefined;
    const res = await axiosInstance.get<OversightManagerOption[]>(
        `${PR_SCOPE_BASE}/oversight_managers`,
        { params },
    );
    return res.data ?? [];
};

/** The current user's chosen oversight manager, or null if none picked. */
export const fetchMyOversightManager = async (): Promise<MyOversightManager | null> => {
    const res = await axiosInstance.get<MyOversightManager | null>(`${PR_SCOPE_BASE}/my_oversight_manager`);
    return res.data ?? null;
};

/** Set/replace the current user's oversight manager (by holder id). */
export const setMyOversightManager = async (
    processRoleHolderId: number,
): Promise<MutationResponse<MyOversightManager>> => {
    const res = await axiosInstance.put<MutationResponse<MyOversightManager>>(
        `${PR_SCOPE_BASE}/my_oversight_manager`,
        { process_role_holder_id: processRoleHolderId },
    );
    return res.data;
};

/** Disconnect (clear) the current user's oversight manager. */
export const clearMyOversightManager = async (): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(
        `${PR_SCOPE_BASE}/my_oversight_manager`,
    );
    return res.data;
};

// --- Review Session Employee API ---
export const fetchSessionEmployees = async (
    sessionId: number,
): Promise<ReviewSessionEmployeeList[]> => {
    const res = await axiosInstance.get<ReviewSessionEmployeeList[]>(RSE_BASE, {
        params: { session_id: sessionId },
    });
    return res.data ?? [];
};

export const fetchMyReviews = async (): Promise<ReviewSessionEmployeeList[]> => {
    const res = await axiosInstance.get<ReviewSessionEmployeeList[]>(`${RSE_BASE}/my`);
    return res.data ?? [];
};

/** The user's row in the most-recently-created open session, or null if not listed. */
export const fetchMyLatestOpenReview = async (): Promise<ReviewSessionEmployeeList | null> => {
    const res = await axiosInstance.get<ReviewSessionEmployeeList | null>(`${RSE_BASE}/my_latest`);
    return res.data ?? null;
};

export const addSessionEmployee = async (
    sessionId: number,
    employeeId: number,
): Promise<MutationResponse<ReviewSessionEmployeeList>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployeeList>>(
        RSE_BASE,
        { session_id: sessionId, employee_id: employeeId },
    );
    return res.data;
};

export const fetchRSEDetail = async (rseId: number): Promise<ReviewSessionEmployee> => {
    const res = await axiosInstance.get<ReviewSessionEmployee>(`${RSE_BASE}/${rseId}`);
    return res.data;
};

/**
 * Fetch the TEMPO album as a PNG and return an object URL for an <img>. We show a
 * PNG (not a PDF iframe) because browsers reliably render images inline, whereas
 * an application/pdf iframe is downloaded in many browsers. Authenticated via the
 * axios instance (the JWT goes in the header; a plain src can't send it). Revoke
 * the URL when done to avoid leaking the blob.
 */
export const fetchTempoPngUrl = async (rseId: number): Promise<string> => {
    const res = await axiosInstance.get<Blob>(`${RSE_BASE}/${rseId}/tempo_png`, {
        responseType: 'blob',
        timeout: 0,
    });
    return URL.createObjectURL(res.data);
};

/**
 * Download the TEMPO album as a PDF (the print artifact). Fetched as a blob so
 * the JWT is sent, then triggers a browser download via a temporary anchor.
 */
export const downloadTempoPdf = async (rseId: number, fileName: string): Promise<void> => {
    const res = await axiosInstance.get<Blob>(`${RSE_BASE}/${rseId}/tempo_pdf`, {
        responseType: 'blob',
        timeout: 0,
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

/**
 * Open a server-built TEMPO HTML artifact in a new tab. Fetched as a blob so the
 * JWT is sent (a plain window.open can't), then the already-open tab is navigated
 * to the blob URL — all in-page links/navigation are self-contained, so no
 * further auth is needed.
 *
 * The tab MUST be opened synchronously by the CALLER on the click and passed in
 * as `win`. Building a whole session's deck can take many seconds; a window.open
 * issued AFTER the await has lost the click's user-activation token, so the
 * browser silently blocks it (returns null, no error) — that's the bug where the
 * button reactivated but no tab ever appeared. We only redirect the existing tab.
 */
const openHtmlBlob = async (url: string, win: Window): Promise<void> => {
    try {
        // No timeout: building the deck server-side can far exceed the global 30s.
        const res = await axiosInstance.get<Blob>(url, { responseType: 'blob', timeout: 0 });
        const blob = new Blob([res.data], { type: 'text/html' });
        const objUrl = URL.createObjectURL(blob);
        if (!win.closed) win.location.href = objUrl;
        // Revoke after the new tab has had time to load the document.
        setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
    } catch (err) {
        // The blank placeholder tab is useless now — close it so it doesn't linger.
        if (!win.closed) win.close();
        throw err;
    }
};

export const openTempoHtml = (rseId: number, win: Window): Promise<void> =>
    openHtmlBlob(`${RSE_BASE}/${rseId}/tempo_html`, win);

export const openTempoPresentation = (sessionId: number, win: Window): Promise<void> =>
    openHtmlBlob(`${RSE_BASE}/tempo_presentation?session_id=${sessionId}`, win);

/**
 * Persist the presentation-queue order for a session (oversight mode only). Sends
 * the full top-to-bottom RSE id order; the server assigns positions 10, 20, 30 …
 */
export const reorderSessionEmployees = async (
    sessionId: number,
    orderedIds: number[],
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.post<MutationResponse<null>>(`${RSE_BASE}/reorder`, {
        session_id: sessionId,
        ordered_ids: orderedIds,
    });
    return res.data;
};

/**
 * Resolve a single review record by (session, employee) for the nested
 * /people_review/$sessionId/employee/$employeeId route. Gated on the backend by
 * the people-review visibility resolver: an out-of-scope employee returns 404.
 */
export const fetchRSEBySessionEmployee = async (
    sessionId: number,
    employeeId: number,
): Promise<ReviewSessionEmployee> => {
    const res = await axiosInstance.get<ReviewSessionEmployee>(
        `${RSE_BASE}/by_session/${sessionId}/employee/${employeeId}`,
    );
    return res.data;
};

export const saveRSEFields = async (
    rseId: number,
    fields: RSEFieldsUpdate,
): Promise<ReviewSessionEmployee> => {
    const res = await axiosInstance.patch<ReviewSessionEmployee>(
        `${RSE_BASE}/${rseId}/fields`,
        fields,
    );
    return res.data;
};

export const markReviewed = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/reviewed`,
    );
    return res.data;
};

export const closeRSE = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/close`,
    );
    return res.data;
};

export const revertRSE = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/revert`,
    );
    return res.data;
};

export const reopenRSE = async (rseId: number): Promise<MutationResponse<ReviewSessionEmployee>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewSessionEmployee>>(
        `${RSE_BASE}/${rseId}/reopen`,
    );
    return res.data;
};

// --- Evaluation API ---
export const fetchEvaluations = async (rseId: number): Promise<Evaluation[]> => {
    const res = await axiosInstance.get<Evaluation[]>(EVAL_BASE, {
        params: { review_session_employee_id: rseId },
    });
    return res.data ?? [];
};

export interface EvaluationBulkUpdate {
    id: number;
    facts?: string | null;
    improvement?: string | null;
    criterion_scores?: CriterionScore[];
}

export const bulkUpdateEvaluations = async (
    updates: EvaluationBulkUpdate[],
): Promise<MutationResponse<Evaluation[]>> => {
    const res = await axiosInstance.put<MutationResponse<Evaluation[]>>(`${EVAL_BASE}/bulk`, updates);
    return res.data;
};

// Atomically re-rate a competence so it moves to the opposite summary list:
// in ONE backend transaction the descriptor score is set, the leaving side's dim
// column (facts for "strong", improvement for "develop") is cleared, and the
// competence is stripped from the RSE competence_summary. Rolls back on failure.
export interface EvaluationFlipCompetence {
    criterion_index: number;
    new_score: number;
    leaving_side: 'strong' | 'develop';
}

export const flipCompetence = async (
    evaluationId: number,
    payload: EvaluationFlipCompetence,
): Promise<MutationResponse<Evaluation>> => {
    const res = await axiosInstance.post<MutationResponse<Evaluation>>(
        `${EVAL_BASE}/${evaluationId}/flip_competence`,
        payload,
    );
    return res.data;
};

// --- Foreign languages ---
export interface LanguageLevel {
    id: number;
    code: string;
    label: string;
    hint: string;
    sort_order: number;
}

export interface EmployeeLanguageItem {
    id: number;
    language: string;
    level_id: number | null;
    level_code: string | null;
    level_hint: string | null;
}

export interface EmployeeLanguageProfile {
    id: number;
    employee_id: number;
    languages: EmployeeLanguageItem[];
}

export interface EmployeeLanguageInput {
    language: string;
    level_id: number | null;
}

export const fetchLanguageLevels = async (): Promise<LanguageLevel[]> => {
    const res = await axiosInstance.get<LanguageLevel[]>(LANG_LEVEL_BASE);
    return res.data ?? [];
};

export const fetchEmployeeLanguageProfile = async (
    employeeId: number,
): Promise<EmployeeLanguageProfile> => {
    const res = await axiosInstance.get<EmployeeLanguageProfile>(
        `${ELP_BASE}/by_employee/${employeeId}`,
    );
    return res.data;
};

export const saveEmployeeLanguageProfile = async (
    employeeId: number,
    languages: EmployeeLanguageInput[],
): Promise<MutationResponse<EmployeeLanguageProfile>> => {
    const res = await axiosInstance.put<MutationResponse<EmployeeLanguageProfile>>(
        `${ELP_BASE}/by_employee/${employeeId}`,
        { languages },
    );
    return res.data;
};

// --- Competency levels ---
export interface ReviewLevelRequirementLite {
    id: number;
    level_id: number;
    text_key: string;
    sort_order: number;
    is_active: boolean;
}

export interface ReviewLevelLite {
    id: number;
    name_key: string;
    description_key: string | null;
    sort_order: number;
    is_active: boolean;
    requirements: ReviewLevelRequirementLite[];
}

export interface ProposedLevelAnswer {
    id: number;
    requirement_id: number;
    facts: string | null;
}

export type ProposedLevelStatus = 'proposed' | 'validated' | 'rejected';

export interface ProposedLevel {
    id: number;
    review_session_employee_id: number;
    level_id: number;
    status: ProposedLevelStatus;
    answers: ProposedLevelAnswer[];
}

export interface ProposedLevelAnswerInput {
    requirement_id: number;
    facts: string | null;
}

export interface ProposedLevelUpsert {
    level_id: number;
    answers: ProposedLevelAnswerInput[];
}

export const fetchReviewLevels = async (activeOnly = true): Promise<ReviewLevelLite[]> => {
    const res = await axiosInstance.get<ReviewLevelLite[]>(LEVEL_BASE, {
        params: activeOnly ? { is_active: true } : undefined,
    });
    return res.data ?? [];
};

/**
 * The session's FROZEN competency levels (+ requirements) selectable for this
 * employee review, in the same shape as `fetchReviewLevels`. The backend exposes
 * each frozen row under its live id, so callers keep working in live-id space;
 * pre-freeze sessions fall back to the live active levels server-side.
 */
export const fetchSessionLevels = async (rseId: number): Promise<ReviewLevelLite[]> => {
    const res = await axiosInstance.get<ReviewLevelLite[]>(
        `${RSE_BASE}/${rseId}/available_levels`,
    );
    return res.data ?? [];
};

export const fetchLevelRequirements = async (
    levelId: number,
    activeOnly = true,
): Promise<ReviewLevelRequirementLite[]> => {
    const res = await axiosInstance.get<ReviewLevelRequirementLite[]>(LEVEL_REQ_BASE, {
        params: { level_id: levelId, ...(activeOnly ? { is_active: true } : {}) },
    });
    return res.data ?? [];
};

export const fetchProposedLevel = async (rseId: number): Promise<ProposedLevel | null> => {
    const res = await axiosInstance.get<ProposedLevel | null>(
        `${RSE_BASE}/${rseId}/proposed_level`,
    );
    return res.data ?? null;
};

export const saveProposedLevel = async (
    rseId: number,
    payload: ProposedLevelUpsert,
): Promise<MutationResponse<ProposedLevel>> => {
    const res = await axiosInstance.put<MutationResponse<ProposedLevel>>(
        `${RSE_BASE}/${rseId}/proposed_level`,
        payload,
    );
    return res.data;
};

export const setProposedLevelStatus = async (
    rseId: number,
    status: ProposedLevelStatus,
): Promise<MutationResponse<ProposedLevel>> => {
    const res = await axiosInstance.patch<MutationResponse<ProposedLevel>>(
        `${RSE_BASE}/${rseId}/proposed_level/status`,
        { status },
    );
    return res.data;
};

export const deleteProposedLevel = async (
    rseId: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(
        `${RSE_BASE}/${rseId}/proposed_level`,
    );
    return res.data;
};

// --- Review comments (per-employee reviewer notes) ---
// Visibility audience is role-dependent (see backend): oversight-public = subject +
// oversighters; supervision-public = supervisors + oversighters. Private = author only.
// 'to_oversight' is a supervision-only scope: author + oversight reviewers, hidden
// from the reviewed employee and from other supervisors.
export type CommentVisibility = 'private' | 'public' | 'to_oversight';
export type CommentAuthorRole = 'oversight' | 'supervision';

export interface ReviewComment {
    id: number;
    review_session_employee_id: number;
    author_id: number;
    author_name: string;
    author_role: CommentAuthorRole;
    visibility: CommentVisibility;
    body: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface ReviewCommentCreate {
    body: string;
    visibility: CommentVisibility;
}

export interface ReviewCommentUpdate {
    body?: string;
    visibility?: CommentVisibility;
}

export const fetchReviewComments = async (rseId: number): Promise<ReviewComment[]> => {
    const res = await axiosInstance.get<ReviewComment[]>(`${RSE_BASE}/${rseId}/comments`);
    return res.data ?? [];
};

export const createReviewComment = async (
    rseId: number,
    payload: ReviewCommentCreate,
): Promise<MutationResponse<ReviewComment>> => {
    const res = await axiosInstance.post<MutationResponse<ReviewComment>>(
        `${RSE_BASE}/${rseId}/comments`,
        payload,
    );
    return res.data;
};

export const updateReviewComment = async (
    rseId: number,
    commentId: number,
    payload: ReviewCommentUpdate,
): Promise<MutationResponse<ReviewComment>> => {
    const res = await axiosInstance.patch<MutationResponse<ReviewComment>>(
        `${RSE_BASE}/${rseId}/comments/${commentId}`,
        payload,
    );
    return res.data;
};

export const deleteReviewComment = async (
    rseId: number,
    commentId: number,
): Promise<MutationResponse<null>> => {
    const res = await axiosInstance.delete<MutationResponse<null>>(
        `${RSE_BASE}/${rseId}/comments/${commentId}`,
    );
    return res.data;
};

// --- Employee current level ---
// NOTE: the current level (and the personal-data facts below) are READ off the
// people-review-scoped RSE detail (fetchRSEBySessionEmployee) — there is no
// GET /employees/{id} call from people-review, so a self-reviewer without the
// admin "view employee" grant is never 403'd. Only the WRITE paths below remain.
export interface EmployeeCurrentLevel {
    id: number;
    current_level_id: number | null;
}

export const setEmployeeCurrentLevel = async (
    employeeId: number,
    levelId: number,
): Promise<EmployeeCurrentLevel> => {
    const res = await axiosInstance.patch<EmployeeCurrentLevel>(
        `${EMPLOYEE_BASE}/${employeeId}/current_level/${levelId}`,
    );
    return res.data;
};

// --- Employee personal data (birth date, hire date, job-assigned date, ...) ---
// ISO 'YYYY-MM-DD' on the wire; displayed DD.MM.YYYY.
export type Sex = 'male' | 'female';
export type MaritalStatus = 'married' | 'not_married';

export interface EmployeePersonalData {
    id: number;
    birth_date: string | null;
    hire_date: string | null;
    job_assigned_date: string | null;
    sex: Sex | null;
    marital_status: MaritalStatus | null;
    // Read-only derived facts (from employees.job_id and the main department link).
    job_name: string | null;
    main_department_name: string | null;
}

// Only the editable fields can be patched.
export type EmployeePersonalDataPatch = Partial<{
    birth_date: string | null;
    hire_date: string | null;
    job_assigned_date: string | null;
    sex: Sex | null;
    marital_status: MaritalStatus | null;
}>;


export const patchEmployeePersonalData = async (
    employeeId: number,
    patch: EmployeePersonalDataPatch,
): Promise<EmployeePersonalData> => {
    const res = await axiosInstance.patch<EmployeePersonalData>(
        `${EMPLOYEE_BASE}/${employeeId}/personal_data`,
        patch,
    );
    return res.data;
};

// --- Education ---
const DEGREE_BASE = `${BASE_URL}/education_degrees`;
const EDUCATION_BASE = `${BASE_URL}/employee_educations`;

export interface EducationDegree {
    id: number;
    name_key: string;
    sort_order: number;
    is_active: boolean;
}

export interface EmployeeEducation {
    id: number;
    employee_id: number;
    institution: string;
    degree_id: number | null;
    speciality: string | null;
    graduation_year: number | null;
}

export interface EmployeeEducationInput {
    institution: string;
    degree_id: number | null;
    speciality: string | null;
    graduation_year: number | null;
}

export const fetchEducationDegrees = async (): Promise<EducationDegree[]> => {
    const res = await axiosInstance.get<EducationDegree[]>(DEGREE_BASE, {
        params: { is_active: true },
    });
    return res.data;
};

export const fetchEmployeeEducations = async (
    employeeId: number,
): Promise<EmployeeEducation[]> => {
    const res = await axiosInstance.get<EmployeeEducation[]>(EDUCATION_BASE, {
        params: { employee_id: employeeId },
    });
    return res.data;
};

export const createEmployeeEducation = async (
    employeeId: number,
    input: EmployeeEducationInput,
): Promise<MutationResponse<EmployeeEducation>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeEducation>>(
        EDUCATION_BASE,
        { employee_id: employeeId, ...input },
    );
    return res.data;
};

export const updateEmployeeEducation = async (
    educationId: number,
    input: EmployeeEducationInput,
): Promise<MutationResponse<EmployeeEducation>> => {
    const res = await axiosInstance.patch<MutationResponse<EmployeeEducation>>(
        `${EDUCATION_BASE}/${educationId}`,
        input,
    );
    return res.data;
};

export const deleteEmployeeEducation = async (educationId: number): Promise<void> => {
    await axiosInstance.delete(`${EDUCATION_BASE}/${educationId}`);
};

// --- Children (1:N, birth date only) ---
const CHILD_BASE = `${BASE_URL}/employee_children`;

export interface EmployeeChild {
    id: number;
    employee_id: number;
    birth_date: string; // ISO 'YYYY-MM-DD'
}

export const fetchEmployeeChildren = async (
    employeeId: number,
): Promise<EmployeeChild[]> => {
    const res = await axiosInstance.get<EmployeeChild[]>(CHILD_BASE, {
        params: { employee_id: employeeId },
    });
    return res.data;
};

export const createEmployeeChild = async (
    employeeId: number,
    birthDate: string,
): Promise<MutationResponse<EmployeeChild>> => {
    const res = await axiosInstance.post<MutationResponse<EmployeeChild>>(
        CHILD_BASE,
        { employee_id: employeeId, birth_date: birthDate },
    );
    return res.data;
};

export const deleteEmployeeChild = async (childId: number): Promise<void> => {
    await axiosInstance.delete(`${CHILD_BASE}/${childId}`);
};
