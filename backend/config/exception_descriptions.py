from pydantic import BaseModel


# Fallback messages returned in HTTP `detail` — English only (project rule:
# never hardcode non-English text; localized text comes from the DB msg tables).
class GeneralExceptionDescription(BaseModel):
    exist: str = "Record already exists"
    current_exist: str = "this record already has that name"
    not_exist: str = "Data not found"
    delete: str = "Record deleted"
    update: str = "Updated %s records"
    archiving: str = "Archived %s records"
    rebranding: str = "Rebranding completed"
    added: str = "Data added/updated, %s records"
    margin_validation_error: str = "Error. The submitted data contains duplicates: %s"
    no_comment: str = "Comment cannot be an empty string"
    create_error: str = "Cannot create a record with this data"
    orig_type_error: str = "field origin_type_name is invalid"
    delete_failed_integrity_error: str = (
        "Cannot delete record '%s' because it is referenced by other records."
    )


class ServerExceptionDescription(BaseModel):
    internal_server_error: str = "Internal server error"
    service_unavailable: str = "Service unavailable"


class ClientExceptionDescription(BaseModel):
    unauthorized: str = "Invalid login or password"
    not_unauthorized: str = "Re-authentication required"
    forbidden: str = "Access denied"
