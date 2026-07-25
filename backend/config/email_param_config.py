from pydantic import BaseModel, EmailStr


class LocalSmtpConfig(BaseModel):
    hostname: str
    port: int


class SenderMailConfig(BaseModel):
    confirmation_sender: str = "confirmation_DS@auchan.ua"
    ds_task_sender: str = "task_store_%s_DS@auchan.ua"
    delete_pallet_sender: str = "delete_pallet_%s_DS@auchan.ua"


class LogMailConfig(BaseModel):
    recipient: EmailStr


class LoaderErrorMailConfig(BaseModel):
    sender: EmailStr
    receiver: str


#
# class ReceiverMailConfig(BaseModel):
#     store_group_receivers: list[str] = [
#         "AdminStore",
#         "ManagerStore",
#         "CommerceStore",
#         "User",
#     ]
#     after_printed_ds_task: list[str] = [
#         "UserLSP",
#         "ManagerLogistic",
#         "AdminStore",
#         "ManagerStore",
#         "IT",
#     ]
#     after_transferred_ds_task: list[str] = [
#         "UserLSP",
#         "ManagerLogistic",
#         "AdminLogistic",
#         "AdminStore",
#         "ManagerStore",
#         "IT",
#     ]
#     delete_pallets: list[str] = [
#         "UserLSP",
#         "ManagerLogistic",
#         "AdminStore",
#         "ManagerStore",
#     ]
#     confirm_ds_task_user_groups: list[str] = [
#         "UserLSP",
#         "ManagerLogistic",
#         "AdminStore",
#         "ManagerStore",
#     ]
#     ds_task_group_mails: list[str] = [
#         "expedition@auchan.ua",
#         "claimfg_expedition@auchan.ua",
#         "receptionDS@auchan.ua",
#     ]
