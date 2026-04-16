# backend/utils/enums.py
from enum import Enum, auto


class ParameterDefaults(Enum):
    DELIVERY_TYPE_ANEE_CODES = "DEL1,DEL2,DEL3"
    EDI_SERVICES_ANEE_CODES = "EDIW,EDI2"
    EDI_PROVIDERS_ANEE_CODES = "EDI1,EDI2,EDI3,EDI4"

    @classmethod
    def get_default(cls, parameter_name: str) -> str:
        """Get default value for parameter name"""
        mapping = {
            "delivery_type_anee_codes_list": cls.DELIVERY_TYPE_ANEE_CODES.value,
            "edi_services_anee_codes_list": cls.EDI_SERVICES_ANEE_CODES.value,
            "edi_providers_anee_codes_list": cls.EDI_PROVIDERS_ANEE_CODES.value,
        }
        return mapping.get(parameter_name, "")


class OperationTypes(Enum):

    CREATE_EDI_TASK = "create_edi_task"
    LINK_USER_GROUP_TO_OPERATION = "link_user_group_to_operation"
    REMOVE_OPERATION_FROM_USER_GROUP = "remove_operation_from_user_group"
    SET_ACTUAL_EDI_PROVIDER = "set_actual_edi_provider"
    SET_ACTUAL_DELIVERY_TYPE = "set_actual_delivery_type"
    SET_CONNECTION_STATUS = "set_connection_status"
    SET_CONNECTION_DATE = "set_connection_date"
    SET_OPERATION_USER_GROUPS = "set_operation_user_groups"
    MODIFY_EDI_TASK = "modify_edi_task"
    SET_GLN = "set_status"
    SET_EDI_TASK_STATUS = "set_edi_task_status"
    DELETE_EDI_TASK = "delete_edi_task"
    CREATE_EMAIL_TASK = "create_email_task"
    MODIFY_EMAIL_TASK = "modify_email_task"
    CREATE_SUPPLIER = "create_supplier"
    MODIFY_SUPPLIER = "modify_supplier"
    SET_SUPPLIER_HAS_EDI = "set_supplier_has_edi"
    DELETE_SUPPLIER = "delete_supplier"
    DELETE_EMAIL_TASK = "delete_email_task"
    MODIFY_CLOSE_NEGO_DATE = "modify_close_nego_date"
    DELETE_OPERATION = "delete_operation"
    CREATE_USER = "create_user"
    DELETE_USER = "delete_user"
    CREATE_USER_GROUP = "create_user_group"
    CREATE_JOB = "create_job"

    CREATE_DELIVERY_TYPE = "create_delivery_type"
    MODIFY_DELIVERY_TYPE = "modify_delivery_type"
    DELETE_DELIVERY_TYPE = "delete_delivery_type"
    SET_USER_IS_ACTIVE = "set_user_is_active"
    CLOSE_EDI_TASK = "close_edi_task"
    DELETE_NOTIFICATIONS = "delete_notifications"

    MULTIPLE_PROVIDERS = "multiple_providers"
    MISSING_EDI_PROVIDER = "missing_edi_provider"
    MISSING_PROVIDER_IN_DIRECTORY = "missing_provider_in_directory"
    MISSING_DELIVERY_TYPE = "missing_delivery_type"
    MISSING_DELIVERY_TYPE_IN_DIRECTORY = "missing_delivery_type_in_directory"
    MISSING_BUYER_MATRICULE = "missing_buyer_matricule"
    MISSING_BUYER_NAME = "missing_buyer_name"
    MISSING_OR_INCORRECT_BUYER_EMAIL = "missing_or_incorrect_buyer_email"
    INVALID_BUYER_EMAIL = "invalid_buyer_email"
    EMAIL_ASSIGNMENT_CONFLICT = "email_assignment_conflict"
    MISSING_TELEPHONE_LIST = "missing_telephone_list"
    MISSING_EMAIL_LIST = "missing_email_list"
    INVALID_EMAIL_LIST = "invalid_email_list"
    REGISTRATION_NUMBER_VALIDATION = "registration_number_validation"
    NEW_DELIVERY_TYPE_FOR_SUPPLIER = "new_delivery_type_for_supplier"
    REPLACE_EDI_PROVIDER_FOR_SUPPLIER = "replace_edi_provider_for_supplier"
    REPLACE_DELIVERY_TYPE_FOR_SUPPLIER = "replace_delivery_type_for_supplier"
    CREATE_OPERATION = "create_operation"
    MODIFY_OPERATION = "modify_operation"


class MoveDirection(str, Enum):
    UP = "up"
    DOWN = "down"
    TOP = "top"
    BOTTOM = "bottom"
