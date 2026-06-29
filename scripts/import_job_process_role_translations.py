"""
One-shot import of all job-process-role-link translations into the
TALENT database. Run while the backend is up:

    cd backend
    poetry run python ../scripts/import_job_process_role_translations.py

With BYPASS_LDAP=true, any creds work. The script uses the same upsert endpoint
as the developer Import JSON dialog — existing keys are updated, new keys inserted,
nothing deleted.
"""
import json
import sys
import httpx

BASE = "http://127.0.0.1:8004/api/v1"

# ── 1. Get a token ────────────────────────────────────────────────────────────
def login() -> str:
    r = httpx.post(
        f"{BASE}/jwt/login",
        data={"username": "admin", "password": "admin"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


# ── 2. All translations ───────────────────────────────────────────────────────
TRANSLATIONS = {
    # ═══════════════════════════════════════════════════════════════════════════
    # BACKEND — job_process_role_link (_errors.py / _success.py message_key values)
    # ═══════════════════════════════════════════════════════════════════════════

    "jobProcessRoleLinkNotFound": {
        "ukr": "Зв'язок між посадою ID ${jobId} та роллю процесу ID ${processRoleId} не знайдено",
        "eng": "Link between job ID ${jobId} and process role ID ${processRoleId} not found",
    },
    "jobAlreadyLinkedToProcessRole": {
        "ukr": "Посада '${jobName}' вже пов'язана з '${processName} / ${roleName}'",
        "eng": "Job '${jobName}' is already linked to '${processName} / ${roleName}'",
    },
    "jobProcessRoleLinkDeleteError": {
        "ukr": "Зв'язок посади з роллю процесу '${name}' не можна видалити, оскільки він використовується іншими записами",
        "eng": "Job process role link '${name}' cannot be deleted because it is referenced by other records",
    },
    "jobNotFoundForProcessRoleLink": {
        "ukr": "Посаду з ID ${jobId} не знайдено",
        "eng": "Job with ID ${jobId} not found",
    },
    "processRoleNotFoundForLink": {
        "ukr": "Роль процесу з ID ${processRoleId} не знайдено",
        "eng": "Process role with ID ${processRoleId} not found",
    },
    "jobProcessRoleLinkCreateSuccess": {
        "ukr": "Посаду '${jobName}' успішно пов'язано з роллю процесу '${processName} / ${roleName}'",
        "eng": "Job '${jobName}' successfully linked to process role '${processName} / ${roleName}'",
    },
    "jobProcessRoleLinkDeleteSuccess": {
        "ukr": "Посаду '${jobName}' успішно від'єднано від ролі процесу '${processName} / ${roleName}'",
        "eng": "Job '${jobName}' successfully removed from process role '${processName} / ${roleName}'",
    },

    # ═══════════════════════════════════════════════════════════════════════════
    # FRONTEND — job admin process-role dialog / column labels
    # ═══════════════════════════════════════════════════════════════════════════

    "assignedProcessRoles": {
        "ukr": "Призначені ролі процесів",
        "eng": "Assigned process roles",
    },
    "noProcessRolesAssigned": {
        "ukr": "Ролі процесів не призначено.",
        "eng": "No process roles assigned.",
    },
    "noProcessRoles": {
        "ukr": "Немає ролей процесів",
        "eng": "No process roles",
    },
    "processRoles": {
        "ukr": "Ролі процесів",
        "eng": "Process Roles",
    },
    "processRolesForJob": {
        "ukr": "Ролі процесів",
        "eng": "Process Roles",
    },
    "addProcessRole": {
        "ukr": "Додати роль процесу",
        "eng": "Add process role",
    },
}


# ── 3. POST the JSON ─────────────────────────────────────────────────────────
def main():
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    payload = json.dumps(TRANSLATIONS, ensure_ascii=False, indent=2).encode("utf-8")

    r = httpx.post(
        f"{BASE}/full_msgs/import_json",
        headers=headers,
        files={"file": ("t.json", payload, "application/json")},
        timeout=30,
    )
    r.raise_for_status()
    result = r.json()
    print(f"success_count: {result.get('success_count', '?')}")
    print(f"error_count:   {result.get('error_count', '?')}")
    if result.get("errors"):
        for err in result["errors"]:
            print(f"  - {err}")
    print("Done.")


if __name__ == "__main__":
    main()
