


# from backend.api_v1.base.errors import (
#     NotFoundError,
#     AlreadyExistsError,
#     DeleteError,
#     DomainError,
# )
#
#
# class JobGroupNotFound(NotFoundError):
#     message_key = "jobGroupNotFound"
#
#     def __init__(self, job_group_id: int) -> None:
#         self.template_vars = {"jobGroupId": job_group_id}
#         self.fallback = f"Job group with ID {job_group_id} not found"
#         super().__init__("JobGroup", "id", job_group_id)
#
#
# class JobGroupNameTaken(AlreadyExistsError):
#     message_key = "jobGroupNameTaken"
#
#     def __init__(self, name: str) -> None:
#         self.template_vars = {"name": name}
#         self.fallback = f"Job group with name '{name}' already exists"
#         super().__init__("JobGroup", "name", name)
#
#
# class JobGroupDeleteError(DeleteError):
#     message_key = "jobGroupDeleteError"
#
#     def __init__(self, name: str) -> None:
#         self.template_vars = {"name": name}
#         self.fallback = (
#             f"Job group '{name}' cannot be deleted because it is referenced by other records"
#         )
#         DomainError.__init__(self, self.fallback)


# from backend.api_v1.base.success import DomainSuccess, DeleteSuccess, CreateSuccess, UpdateSuccess
#
#
# class JobGroupDeleteSuccess(DeleteSuccess):
#     message_key = "jobGroupDeleteSuccess"
#
#     def __init__(self, name: str) -> None:
#         self.template_vars = {"name": name}
#         self.fallback = f"Job group '{name}' successfully deleted"
#         DomainSuccess.__init__(self, self.fallback)
#
#
# class JobGroupCreateSuccess(CreateSuccess):
#     message_key = "jobGroupCreateSuccess"
#
#     def __init__(self, name: str) -> None:
#         self.template_vars = {"name": name}
#         self.fallback = f"Job group '{name}' successfully created"
#         DomainSuccess.__init__(self, self.fallback)
#
#
# class JobGroupUpdateSuccess(UpdateSuccess):
#     message_key = "jobGroupUpdateSuccess"
#
#     def __init__(self, name: str) -> None:
#         self.template_vars = {"name": name}
#         self.fallback = f"Job group '{name}' successfully updated"
#         DomainSuccess.__init__(self, self.fallback)
