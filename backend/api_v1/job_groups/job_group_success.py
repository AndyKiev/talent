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
