# backend/seeds/seed_group_access.py
#
# Idempotent group-access seeder driven by the live guard manifest.
#
#   * admin  -> FULL access: granted every distinct (operation, essence-set)
#               permission that any endpoint guards on.
#   * HRM/HRS -> granted the review-setup + language essences (their people-
#               review / employee domain) with full CRUD. Developer-tier
#               essences (app_setting, setting_value_type, process*) stay
#               admin-only and are NOT granted here.
#
# Re-runnable: every step is get-or-create, running twice adds nothing.
#
import asyncio

from sqlalchemy import select

from backend.api_v1.operation.operation_model import Operation
from backend.api_v1.permission_manifest.permission_manifest_service import (
    PermissionManifestService,
)
from backend.api_v1.user_group.user_group_model import UserGroup
from backend.database.db_helper import db_helper
from backend.main import app
from backend.seeds.access_graph import AccessGraph

# HRM/HRS get these essences (single-essence sets) with full CRUD.
HR_ESSENCES = [
    "review_dimension",
    "review_dimension_criterion",
    "review_level",
    "review_level_requirement",
    "language_level",
    "department_job_target",
    # Recruitment module — HRM/HRS create tasks, manage per-job requirements and
    # the recruitment dimensions; recruitment_task_status is read-only (VIEW).
    "recruitment_task",
    "recruitment_task_status",
    "recruitment_dimension",
    "job_requirement",
    # Candidates / hiring pipeline — HRM/HRS manage sources, candidates and the
    # per-task applications (drag cards through stages).
    "recruitment_candidate_source",
    "candidate",
    "recruitment_application",
    # Interviews — HRM/HRS schedule them and may write feedback directly.
    "interview",
    "recruitment_interview_feedback",
    # Person events (surname change today). HRM is additionally narrowed to
    # their department scope inside PersonEventService — the grant only opens
    # the endpoint. `apply_due` guards on APPLY and stays admin-only: that one
    # is the scheduler's sweep, while a single event is applied through the
    # status PATCH (modify).
    "person_event",
]
# Read-only reference essences HRM/HRS may VIEW but must not mutate (e.g. pick a
# department for a recruitment task, or read the fixed pipeline stages).
HR_VIEW_ONLY_ESSENCES = [
    "department",
    "recruitment_application_status",
    # Employee development missions: HR reads the plans and the KPI change trail
    # but never edits them — only the employee's oversight manager (or admin) may
    # write. employee_mission_history is a dedicated read-only essence so HR does
    # NOT need change_log, which would expose the whole system audit trail.
    "employee_mission",
    "employee_mission_kpi",
    "employee_mission_history",
]
HR_VERBS = ["view", "create", "modify", "delete"]
HR_GROUPS = ["HRM", "HRS"]

# The Interviewer group (employees auto-added when assigned to an interview):
# read the interviews/candidates they work with, write interview feedback.
INTERVIEWER_GRANTS: dict[str, list[str]] = {
    "interview": ["view"],
    "candidate": ["view"],
    "recruitment_application": ["view"],
    "recruitment_application_status": ["view"],
    "recruitment_interview_feedback": ["view", "create"],
}


async def main():
    async with db_helper.session_factory() as s:
        # Column selects, not entity selects — see AccessGraph.
        groups = {n: i for n, i in (await s.execute(select(UserGroup.name, UserGroup.id)))}
        ops = {n: i for n, i in (await s.execute(select(Operation.name, Operation.id)))}
        acc = AccessGraph(s)
        await acc.load()

        # ── admin: full access to every guarded permission ────────────────────
        manifest = await PermissionManifestService(s).build(app)
        admin_id = groups["admin"]
        admin_added = 0
        for perm in manifest["permissions"]:
            op_id = ops.get(perm["operation"])
            if not op_id:
                raise SystemExit(f"operation {perm['operation']!r} missing")
            eids = [await acc.essence_id(n) for n in perm["essences"]]
            set_id = await acc.set_id(eids)
            oesl_id = await acc.oesl_id(op_id, set_id)
            admin_added += acc.grant(admin_id, oesl_id)
        print(f"admin: +{admin_added} grants (now full access, {len(manifest['permissions'])} perms)")

        # ── HRM/HRS: review-setup + language essences, full CRUD ──────────────
        for gname in HR_GROUPS:
            group_id = groups.get(gname)
            if not group_id:
                print(f"  (group {gname} not found, skipped)")
                continue
            added = 0
            for ename in HR_ESSENCES:
                set_id = await acc.set_id([await acc.essence_id(ename)])
                for verb in HR_VERBS:
                    oesl_id = await acc.oesl_id(ops[verb], set_id)
                    added += acc.grant(group_id, oesl_id)
            # View-only reference essences (no create/modify/delete).
            for ename in HR_VIEW_ONLY_ESSENCES:
                set_id = await acc.set_id([await acc.essence_id(ename)])
                oesl_id = await acc.oesl_id(ops["view"], set_id)
                added += acc.grant(group_id, oesl_id)
            print(f"{gname}: +{added} grants (review-setup + language, CRUD)")

        # ── Interviewer: read interviews/candidates, write feedback ───────────
        interviewer_id = next(
            (i for name, i in groups.items() if name and name.lower() == "interviewer"),
            None,
        )
        if interviewer_id:
            added = 0
            for ename, verbs in INTERVIEWER_GRANTS.items():
                set_id = await acc.set_id([await acc.essence_id(ename)])
                for verb in verbs:
                    oesl_id = await acc.oesl_id(ops[verb], set_id)
                    added += acc.grant(interviewer_id, oesl_id)
            print(f"Interviewer: +{added} grants (interviews view + feedback)")
        else:
            print("  (group Interviewer not found, skipped — run the Phase B migration)")

        await s.commit()
        print("done.")


if __name__ == "__main__":
    asyncio.run(main())
