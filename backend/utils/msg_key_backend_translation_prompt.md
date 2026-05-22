# Translation Prompt — Missing Message Keys

Generated: 2026-05-22 08:52
Missing keys: 232

---

## Task

Below is a list of i18n message keys that exist in the backend code but are not yet seeded in the database. For each key, produce a JSON object with two fields: `ukr` (Ukrainian) and `eng` (English).

### Rules

- Interpolation variables are written as `${varName}` — keep them verbatim in both translations.
- The English fallback string shown under each key is the exact wording already used in the code. Use it as the `eng` value, but convert `{variable}` to `${variable}`. Adjust grammar/capitalisation only if clearly wrong.
- For `ukr`, produce a natural Ukrainian translation that mirrors the English meaning and keeps all `${varName}` placeholders in the same logical position.
- verify twice not to forget to use $ in front of curly braces like `${variable}`.
- Keys with no variables get plain strings with no placeholders.
- Return **only** a single valid JSON object — no markdown fences, no commentary, no trailing commas.

---

## Keys to translate

### `departmentCategoryCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department category '${name}' successfully created

### `departmentCategoryDeleteError`
- **Variables:** `${name}`
- **English fallback:** Department category '${name}' cannot be deleted because it is referenced by other records

### `departmentCategoryDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Department category '${name}' successfully deleted

### `departmentCategoryKeyTaken`
- **Variables:** `${key}`
- **English fallback:** Department category with key '${key}' already exists

### `departmentCategoryNameTaken`
- **Variables:** `${name}`
- **English fallback:** Department category with name '${name}' already exists

### `departmentCategoryNotFound`
- **Variables:** `${categoryId}`
- **English fallback:** Department category with ID {category_id} not found

### `departmentCategoryNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Department category with name '${name}' not found

### `departmentCategoryUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department category '${name}' successfully updated

### `departmentCircularReference`
- **Variables:** `${name}`
- **English fallback:** Cannot set parent of department '${name}' — the selected parent is a descendant of this department

### `departmentCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department '${name}' successfully created

### `departmentDeleteError`
- **Variables:** `${name}`
- **English fallback:** Department '${name}' cannot be deleted because it is referenced by other records

### `departmentDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Department '${name}' successfully deleted

### `departmentNotFound`
- **Variables:** `${departmentId}`
- **English fallback:** Department with ID {department_id} not found

### `departmentNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Department with name '${name}' not found

### `departmentTypeCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type '${name}' successfully created

### `departmentTypeDeleteError`
- **Variables:** `${name}`
- **English fallback:** Department type '${name}' cannot be deleted because it is referenced by other records

### `departmentTypeDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type '${name}' successfully deleted

### `departmentTypeJobLinkAlreadyExists`
- **Variables:** `${departmentTypeId}`, `${jobId}`
- **English fallback:** Link between department type ID {department_type_id} and job ID {job_id} already exists

### `departmentTypeJobLinkCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type–job link '${name}' successfully created

### `departmentTypeJobLinkDeleteError`
- **Variables:** `${linkId}`
- **English fallback:** Department type–job link ID {link_id} cannot be deleted because it is referenced by other records

### `departmentTypeJobLinkDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type–job link '${name}' successfully deleted

### `departmentTypeJobLinkNotFound`
- **Variables:** `${linkId}`
- **English fallback:** Department type–job link with ID {link_id} not found

### `departmentTypeJobLinkNotFoundByCompositeKey`
- **Variables:** `${departmentTypeId}`, `${jobId}`
- **English fallback:** Department type–job link for department type ID {department_type_id} and job ID {job_id} not found

### `departmentTypeJobLinkUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type–job link '${name}' successfully updated

### `departmentTypeNameTaken`
- **Variables:** `${name}`
- **English fallback:** Department type with name '${name}' already exists

### `departmentTypeNotFound`
- **Variables:** `${typeId}`
- **English fallback:** Department type with ID {type_id} not found

### `departmentTypeNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Department type with name '${name}' not found

### `departmentTypeParentalLinkAlreadyExists`
- **Variables:** `${childId}`, `${parentId}`
- **English fallback:** Link between child {child_id} and parent {parent_id} already exists

### `departmentTypeParentalLinkCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type parental link '${name}' successfully created

### `departmentTypeParentalLinkDeleteError`
- **Variables:** `${name}`
- **English fallback:** Department type parental link '${name}' cannot be deleted

### `departmentTypeParentalLinkDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type parental link '${name}' successfully deleted

### `departmentTypeParentalLinkNotFound`
- **Variables:** `${linkId}`
- **English fallback:** Department type parental link with ID {link_id} not found

### `departmentTypeParentalLinkUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type parental link '${name}' successfully updated

### `departmentTypeUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department type '${name}' successfully updated

### `departmentUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Department '${name}' successfully updated

### `employeeAlreadyInGroup`
- **Variables:** `${employeeCode}`, `${groupName}`
- **English fallback:** Employee '{employee_code}' is already in group '{group_name}'

### `employeeCodeTaken`
- **Variables:** `${code}`
- **English fallback:** Employee with code '${code}' already exists

### `employeeDeleteError`
- **Variables:** `${code}`
- **English fallback:** Employee '{employee_code}' cannot be deleted because it is referenced by other records

### `employeeDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee '${name}' successfully deleted

### `employeeDepartmentAlreadyExists`
- **Variables:** `${employeeId}`, `${departmentId}`
- **English fallback:** Employee {employee_id} already has an assignment for department {department_id}

### `employeeDepartmentDeleteError`
- **Variables:** `${name}`
- **English fallback:** Assignment '${name}' cannot be deleted because it is referenced by other records

### `employeeDepartmentMainAlreadyExists`
- **Variables:** `${employeeId}`, `${existingMainId}`
- **English fallback:** Employee {employee_id} already has a main department (assignment ID: {existing_main_id}). Only one main department allowed.

### `employeeDepartmentMainDeleteError`
- **Variables:** `${linkId}`
- **English fallback:** Cannot delete main department assignment (ID: {link_id}). Please set another department as main first.

### `employeeEmailTaken`
- **Variables:** `${email}`
- **English fallback:** Employee with email '${email}' already exists

### `employeeEventAlreadyApplied`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} is already applied

### `employeeEventApplySuccess`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} successfully applied

### `employeeEventChangeCreateSuccess`
- **Variables:** `${changeId}`
- **English fallback:** Employee event change with ID {change_id} successfully created

### `employeeEventChangeDeleteError`
- **Variables:** `${changeId}`
- **English fallback:** Employee event change with ID {change_id} cannot be deleted because it is referenced by other records

### `employeeEventChangeDeleteSuccess`
- **Variables:** `${changeId}`
- **English fallback:** Employee event change with ID {change_id} successfully deleted

### `employeeEventChangeDepartmentNotFound`
- **Variables:** `${recordId}`
- **English fallback:** Employee event change department with ID {record_id} not found

### `employeeEventChangeDeptTypeCodeTaken`
- **Variables:** `${code}`
- **English fallback:** Employee event change dept type with code '${code}' already exists

### `employeeEventChangeDeptTypeCreateSuccess`
- **Variables:** `${code}`
- **English fallback:** Employee event change dept type '${code}' successfully created

### `employeeEventChangeDeptTypeDeleteError`
- **Variables:** `${code}`
- **English fallback:** Employee event change dept type '${code}' cannot be deleted because it is referenced by other records

### `employeeEventChangeDeptTypeDeleteSuccess`
- **Variables:** `${code}`
- **English fallback:** Employee event change dept type '${code}' successfully deleted

### `employeeEventChangeDeptTypeNotFound`
- **Variables:** `${typeId}`
- **English fallback:** Employee event change dept type with ID {type_id} not found

### `employeeEventChangeDeptTypeNotFoundByCode`
- **Variables:** `${code}`
- **English fallback:** Employee event change dept type with code '${code}' not found

### `employeeEventChangeDeptTypeUpdateSuccess`
- **Variables:** `${code}`
- **English fallback:** Employee event change dept type '${code}' successfully updated

### `employeeEventChangeDirectionDuplicate`
- **Variables:** `${directionTypeId}`, `${eventId}`
- **English fallback:** A change for direction type ID {direction_type_id} already exists on event ID {event_id}

### `employeeEventChangeEventNotDraft`
- **Variables:** `${eventId}`
- **English fallback:** Cannot modify changes on event with ID {event_id} because it is not in draft status

### `employeeEventChangeNotFound`
- **Variables:** `${changeId}`
- **English fallback:** Employee event change with ID {change_id} not found

### `employeeEventChangeUpdateSuccess`
- **Variables:** `${changeId}`
- **English fallback:** Employee event change with ID {change_id} successfully updated

### `employeeEventCreateSuccess`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} successfully created

### `employeeEventDeleteError`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} cannot be deleted because it is referenced by other records

### `employeeEventDeleteSuccess`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} successfully deleted

### `employeeEventDirectionTypeCodeTaken`
- **Variables:** `${code}`
- **English fallback:** Employee event direction type with code '${code}' already exists

### `employeeEventDirectionTypeCreateSuccess`
- **Variables:** `${code}`
- **English fallback:** Employee event direction type '${code}' successfully created

### `employeeEventDirectionTypeDeleteError`
- **Variables:** `${code}`
- **English fallback:** Employee event direction type '${code}' cannot be deleted because it is referenced by other records

### `employeeEventDirectionTypeDeleteSuccess`
- **Variables:** `${code}`
- **English fallback:** Employee event direction type '${code}' successfully deleted

### `employeeEventDirectionTypeNotFound`
- **Variables:** `${typeId}`
- **English fallback:** Employee event direction type with ID {type_id} not found

### `employeeEventDirectionTypeNotFoundByCode`
- **Variables:** `${code}`
- **English fallback:** Employee event direction type with code '${code}' not found

### `employeeEventDirectionTypeUpdateSuccess`
- **Variables:** `${code}`
- **English fallback:** Employee event direction type '${code}' successfully updated

### `employeeEventNotDraft`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} cannot be modified because it is not in draft status

### `employeeEventNotFound`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} not found

### `employeeEventStatusCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee event status '${name}' successfully created

### `employeeEventStatusDeleteError`
- **Variables:** `${name}`
- **English fallback:** Employee event status '${name}' cannot be deleted because it is referenced by other records

### `employeeEventStatusDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee event status '${name}' successfully deleted

### `employeeEventStatusNameTaken`
- **Variables:** `${name}`
- **English fallback:** Employee event status with name '${name}' already exists

### `employeeEventStatusNotFound`
- **Variables:** `${statusId}`
- **English fallback:** Employee event status with ID {status_id} not found

### `employeeEventStatusNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Employee event status with name '${name}' not found

### `employeeEventStatusUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee event status '${name}' successfully updated

### `employeeEventTypeCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee event type '${name}' successfully created

### `employeeEventTypeDeleteError`
- **Variables:** `${name}`
- **English fallback:** Employee event type '${name}' cannot be deleted because it is referenced by other records

### `employeeEventTypeDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee event type '${name}' successfully deleted

### `employeeEventTypeDirectionCreateSuccess`
- **Variables:** `${directionId}`
- **English fallback:** Employee event type direction with ID {direction_id} successfully created

### `employeeEventTypeDirectionDeleteError`
- **Variables:** `${directionId}`
- **English fallback:** Employee event type direction with ID {direction_id} cannot be deleted because it is referenced by other records

### `employeeEventTypeDirectionDeleteSuccess`
- **Variables:** `${directionId}`
- **English fallback:** Employee event type direction with ID {direction_id} successfully deleted

### `employeeEventTypeDirectionDuplicate`
- **Variables:** `${eventTypeId}`, `${directionTypeId}`
- **English fallback:** Direction type ID {direction_type_id} is already configured for event type ID {event_type_id}

### `employeeEventTypeDirectionNotFound`
- **Variables:** `${directionId}`
- **English fallback:** Employee event type direction with ID {direction_id} not found

### `employeeEventTypeDirectionUpdateSuccess`
- **Variables:** `${directionId}`
- **English fallback:** Employee event type direction with ID {direction_id} successfully updated

### `employeeEventTypeNameTaken`
- **Variables:** `${name}`
- **English fallback:** Employee event type with name '${name}' already exists

### `employeeEventTypeNotFound`
- **Variables:** `${typeId}`
- **English fallback:** Employee event type with ID {type_id} not found

### `employeeEventTypeNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Employee event type with name '${name}' not found

### `employeeEventTypeUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee event type '${name}' successfully updated

### `employeeEventUpdateSuccess`
- **Variables:** `${eventId}`
- **English fallback:** Employee event with ID {event_id} successfully updated

### `employeeNotFound`
- **Variables:** `${employeeId}`
- **English fallback:** Employee with ID {employee_id} not found

### `employeeNotFoundByCode`
- **Variables:** `${code}`
- **English fallback:** Employee with code '${code}' not found

### `employeeNotInGroup`
- **Variables:** `${employeeCode}`, `${groupName}`
- **English fallback:** Employee '{employee_code}' is not in group '{group_name}'

### `employeeOrgUnitDepartmentCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Assignment '${name}' successfully created

### `employeeOrgUnitDepartmentDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Assignment '${name}' successfully deleted

### `employeeOrgUnitDepartmentNotFound`
- **Variables:** `${linkId}`
- **English fallback:** Assignment with ID {link_id} not found

### `employeeOrgUnitDepartmentUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Assignment '${name}' successfully updated

### `employeeStatusCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee status '${name}' successfully created

### `employeeStatusDeleteError`
- **Variables:** `${name}`
- **English fallback:** Employee status '${name}' cannot be deleted because it is referenced by other records

### `employeeStatusDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee status '${name}' successfully deleted

### `employeeStatusNameTaken`
- **Variables:** `${name}`
- **English fallback:** Employee status with name '${name}' already exists

### `employeeStatusNotFound`
- **Variables:** `${typeId}`
- **English fallback:** Employee status with ID {status_id} not found

### `employeeStatusNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Employee status with name '${name}' not found

### `employeeStatusUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Employee status '${name}' successfully updated

### `groupNotFound`
- **Variables:** `${groupId}`
- **English fallback:** User group with ID {group_id} not found

### `groupsNotFound`
- **Variables:** `${ids}`
- **English fallback:** User groups with IDs {{ids_str}} not found

### `jobAlreadyInGroup`
- **Variables:** `${jobName}`, `${groupName}`
- **English fallback:** Job '{job_name}' is already linked to group '{group_name}'

### `jobAlreadyInJobGroup`
- **Variables:** `${jobName}`, `${groupName}`
- **English fallback:** Job '{job_name}' is already linked to job group '{group_name}'

### `jobCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Job '${name}' successfully created

### `jobDeleteError`
- **Variables:** `${name}`
- **English fallback:** Job '{job_name}' cannot be deleted because it is referenced by other records

### `jobDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Job '${name}' successfully deleted

### `jobGroupCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Job group '${name}' successfully created

### `jobGroupDeleteError`
- **Variables:** `${name}`
- **English fallback:** Job group '${name}' cannot be deleted because it is referenced by other records

### `jobGroupDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Job group '${name}' successfully deleted

### `jobGroupNameTaken`
- **Variables:** `${name}`
- **English fallback:** Job group with name '${name}' already exists

### `jobGroupNotFound`
- **Variables:** `${jobGroupId}`
- **English fallback:** Job group with ID {job_group_id} not found

### `jobGroupTypeSingletonViolation`
- **Variables:** `${jobName}`, `${typeName}`, `${existingGroupName}`
- **English fallback:** Job '{job_name}' already belongs to group '{existing_group_name}' of type '{type_name}', which does not allow multiple groups per job. Remove the existing group first.

### `jobGroupUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Job group '${name}' successfully updated

### `jobJobGroupNotFound`
- **Variables:** `${jobGroupId}`
- **English fallback:** Job group with ID {job_group_id} not found

### `jobJobGroupsNotFound`
- **Variables:** `${ids}`
- **English fallback:** Job groups with IDs {{ids_str}} not found

### `jobNameTaken`
- **Variables:** `${name}`
- **English fallback:** Job with name '${name}' already exists

### `jobNotFound`
- **Variables:** `${jobId}`
- **English fallback:** Job with ID {job_id} not found

### `jobNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Job with name '${name}' not found

### `jobNotInGroup`
- **Variables:** `${jobName}`, `${groupName}`
- **English fallback:** Job '{job_name}' is not linked to group '{group_name}'

### `jobNotInJobGroup`
- **Variables:** `${jobName}`, `${groupName}`
- **English fallback:** Job '{job_name}' is not linked to job group '{group_name}'

### `jobUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Job '${name}' successfully updated

### `langNotFound`
- **Variables:** `${langId}`
- **English fallback:** Job with ID {lang_id} not found

### `langNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Language with name '${name}' not found

### `msgAlreadyExists`
- **Variables:** `${msgKeyId}`, `${langId}`
- **English fallback:** Message for key ID {msg_key_id} and lang ID {lang_id} already exists

### `msgFullAlreadyExists`
- **Variables:** `${name}`
- **English fallback:** Message key '${name}' already exists

### `msgFullDeleteError`
- **Variables:** none

### `msgFullDeleteSuccess`
- **Variables:** none

### `msgFullNotFound`
- **Variables:** `${msgKeyId}`
- **English fallback:** Full message with key ID {msg_key_id} not found

### `msgKeyNotFound`
- **Variables:** `${msgKeyId}`
- **English fallback:** Message key with ID {mag_key_id} not found

### `msgKeyNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Message key with name '${name}' not found

### `msgNotFound`
- **Variables:** `${msgId}`
- **English fallback:** Message with ID {msg_id} not found

### `operationAlreadyInGroup`
- **Variables:** `${operationName}`, `${groupName}`
- **English fallback:** Operation '{operation_name}' is already linked to group '{group_name}'

### `operationCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Operation '${name}' successfully created

### `operationDeleteError`
- **Variables:** `${name}`
- **English fallback:** Operation '{operation_name}' cannot be deleted because it is referenced by other records

### `operationDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Operation '${name}' successfully deleted

### `operationGroupNotFound`
- **Variables:** `${groupId}`
- **English fallback:** User group with ID {group_id} not found

### `operationGroupsNotFound`
- **Variables:** `${ids}`
- **English fallback:** User groups with IDs {{ids_str}} not found

### `operationHasGroups`
- **Variables:** `${name}`, `${groups}`
- **English fallback:** Operation '{operation_name}' cannot be deleted because it is linked to the following user groups: {groups_str}. Please unlink the user groups first before deleting the operation.

### `operationNameTaken`
- **Variables:** `${name}`
- **English fallback:** Operation with name '${name}' already exists

### `operationNotFound`
- **Variables:** `${operationId}`
- **English fallback:** Operation with ID {operation_id} not found

### `operationNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Operation with name '${name}' not found

### `operationNotInGroup`
- **Variables:** `${operationName}`, `${groupName}`
- **English fallback:** Operation '{operation_name}' is not linked to group '{group_name}'

### `operationUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Operation '${name}' successfully updated

### `talentAuditAlreadyExists`
- **Variables:** `${employeeId}`
- **English fallback:** Talent audit for employee ID {employee_id} already exists

### `talentAuditCreateSuccess`
- **Variables:** `${employeeId}`
- **English fallback:** Talent audit for employee ID {employee_id} successfully created

### `talentAuditDeleteError`
- **Variables:** `${auditId}`
- **English fallback:** Talent audit with ID {audit_id} cannot be deleted because it is referenced by other records

### `talentAuditDeleteSuccess`
- **Variables:** `${auditId}`
- **English fallback:** Talent audit with ID {audit_id} successfully deleted

### `talentAuditInterviewCreateSuccess`
- **Variables:** `${interviewId}`
- **English fallback:** Talent audit interview with ID {interview_id} successfully created

### `talentAuditInterviewDeleteError`
- **Variables:** `${interviewId}`
- **English fallback:** Talent audit interview with ID {interview_id} cannot be deleted because it is referenced by other records

### `talentAuditInterviewDeleteSuccess`
- **Variables:** `${interviewId}`
- **English fallback:** Talent audit interview with ID {interview_id} successfully deleted

### `talentAuditInterviewNotFound`
- **Variables:** `${interviewId}`
- **English fallback:** Talent audit interview with ID {interview_id} not found

### `talentAuditInterviewStatusCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit interview status '${name}' successfully created

### `talentAuditInterviewStatusDeleteError`
- **Variables:** `${name}`
- **English fallback:** Talent audit interview status '${name}' cannot be deleted because it is referenced by other records

### `talentAuditInterviewStatusDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit interview status '${name}' successfully deleted

### `talentAuditInterviewStatusNameTaken`
- **Variables:** `${name}`
- **English fallback:** Talent audit interview status with name '${name}' already exists

### `talentAuditInterviewStatusNotFound`
- **Variables:** `${statusId}`
- **English fallback:** Talent audit interview status with ID {status_id} not found

### `talentAuditInterviewStatusNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Talent audit interview status with name '${name}' not found

### `talentAuditInterviewStatusUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit interview status '${name}' successfully updated

### `talentAuditInterviewUpdateSuccess`
- **Variables:** `${interviewId}`
- **English fallback:** Talent audit interview with ID {interview_id} successfully updated

### `talentAuditJobCreateSuccess`
- **Variables:** `${jobId}`
- **English fallback:** Talent audit job with ID {job_id} successfully created

### `talentAuditJobDeleteError`
- **Variables:** `${jobId}`
- **English fallback:** Talent audit job with ID {job_id} cannot be deleted because it is referenced by other records

### `talentAuditJobDeleteSuccess`
- **Variables:** `${jobId}`
- **English fallback:** Talent audit job with ID {job_id} successfully deleted

### `talentAuditJobNotFound`
- **Variables:** `${jobId}`
- **English fallback:** Talent audit job with ID {job_id} not found

### `talentAuditJobStatusCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit job status '${name}' successfully created

### `talentAuditJobStatusDeleteError`
- **Variables:** `${name}`
- **English fallback:** Talent audit job status '${name}' cannot be deleted because it is referenced by other records

### `talentAuditJobStatusDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit job status '${name}' successfully deleted

### `talentAuditJobStatusNameTaken`
- **Variables:** `${name}`
- **English fallback:** Talent audit job status with name '${name}' already exists

### `talentAuditJobStatusNotFound`
- **Variables:** `${statusId}`
- **English fallback:** Talent audit job status with ID {status_id} not found

### `talentAuditJobStatusNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Talent audit job status with name '${name}' not found

### `talentAuditJobStatusUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit job status '${name}' successfully updated

### `talentAuditJobUpdateSuccess`
- **Variables:** `${jobId}`
- **English fallback:** Talent audit job with ID {job_id} successfully updated

### `talentAuditNotFound`
- **Variables:** `${auditId}`
- **English fallback:** Talent audit with ID {audit_id} not found

### `talentAuditStatusCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit status '${name}' successfully created

### `talentAuditStatusDeleteError`
- **Variables:** `${name}`
- **English fallback:** Talent audit status '${name}' cannot be deleted because it is referenced by other records

### `talentAuditStatusDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit status '${name}' successfully deleted

### `talentAuditStatusNameTaken`
- **Variables:** `${name}`
- **English fallback:** Talent audit status with name '${name}' already exists

### `talentAuditStatusNotFound`
- **Variables:** `${statusId}`
- **English fallback:** Talent audit status with ID {status_id} not found

### `talentAuditStatusNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Talent audit status with name '${name}' not found

### `talentAuditStatusUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent audit status '${name}' successfully updated

### `talentAuditUpdateSuccess`
- **Variables:** `${auditId}`
- **English fallback:** Talent audit with ID {audit_id} successfully updated

### `talentPeriodCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent period '${name}' successfully created

### `talentPeriodDeleteError`
- **Variables:** `${name}`
- **English fallback:** Talent period '${name}' cannot be deleted because it is referenced by other records

### `talentPeriodDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent period '${name}' successfully deleted

### `talentPeriodNameTaken`
- **Variables:** `${name}`
- **English fallback:** Talent period with name '${name}' already exists

### `talentPeriodNotFound`
- **Variables:** `${periodId}`
- **English fallback:** Talent period with ID {period_id} not found

### `talentPeriodNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Talent period with name '${name}' not found

### `talentPeriodUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent period '${name}' successfully updated

### `talentStatusCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent status '${name}' successfully created

### `talentStatusDeleteError`
- **Variables:** `${name}`
- **English fallback:** Talent status '${name}' cannot be deleted because it is referenced by other records

### `talentStatusDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent status '${name}' successfully deleted

### `talentStatusKeyTaken`
- **Variables:** `${key}`
- **English fallback:** Talent status with key '${key}' already exists

### `talentStatusNameTaken`
- **Variables:** `${name}`
- **English fallback:** Talent status with name '${name}' already exists

### `talentStatusNotFound`
- **Variables:** `${statusId}`
- **English fallback:** Talent status with ID {status_id} not found

### `talentStatusNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** Talent status with name '${name}' not found

### `talentStatusPeriodLinkAlreadyExists`
- **Variables:** `${statusId}`, `${periodId}`
- **English fallback:** Link between talent status ID {status_id} and talent period ID {period_id} already exists

### `talentStatusPeriodLinkCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent status–period link '${name}' successfully created

### `talentStatusPeriodLinkDeleteError`
- **Variables:** `${linkId}`
- **English fallback:** Talent status–period link ID {link_id} cannot be deleted because it is referenced by other records

### `talentStatusPeriodLinkDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent status–period link '${name}' successfully deleted

### `talentStatusPeriodLinkNotFound`
- **Variables:** `${linkId}`
- **English fallback:** Talent status–period link with ID {link_id} not found

### `talentStatusPeriodLinkNotFoundByCompositeKey`
- **Variables:** `${statusId}`, `${periodId}`
- **English fallback:** Talent status–period link for status ID {status_id} and period ID {period_id} not found

### `talentStatusPeriodLinkUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent status–period link '${name}' successfully updated

### `talentStatusUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** Talent status '${name}' successfully updated

### `userAlreadyInGroup`
- **Variables:** `${userCode}`, `${groupName}`
- **English fallback:** User '{user_code}' is already in group '{group_name}'

### `userCodeTaken`
- **Variables:** `${code}`
- **English fallback:** User with code '${code}' already exists

### `userDeleteError`
- **Variables:** `${code}`
- **English fallback:** User '{user_code}' cannot be deleted because it is referenced by other records

### `userEmailTaken`
- **Variables:** `${email}`
- **English fallback:** User with email '${email}' already exists

### `userGroupCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** User group '${name}' successfully created

### `userGroupDeleteError`
- **Variables:** `${name}`
- **English fallback:** User group '${name}' cannot be deleted because it is referenced by other records

### `userGroupDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** User group '${name}' successfully deleted

### `userGroupNameTaken`
- **Variables:** `${name}`
- **English fallback:** User Group with name '${name}' already exists

### `userGroupNotFound`
- **Variables:** `${groupId}`
- **English fallback:** User Group with ID {group_id} not found

### `userGroupTypeCreateSuccess`
- **Variables:** `${name}`
- **English fallback:** User group type '${name}' successfully created

### `userGroupTypeDeleteError`
- **Variables:** `${name}`
- **English fallback:** User group type '${name}' cannot be deleted because it is referenced by other records

### `userGroupTypeDeleteSuccess`
- **Variables:** `${name}`
- **English fallback:** User group type '${name}' successfully deleted

### `userGroupTypeNameTaken`
- **Variables:** `${name}`
- **English fallback:** User group type with name '${name}' already exists

### `userGroupTypeNotFound`
- **Variables:** `${typeId}`
- **English fallback:** User group type with ID {type_id} not found

### `userGroupTypeNotFoundByName`
- **Variables:** `${name}`
- **English fallback:** User group type with name '${name}' not found

### `userGroupTypeUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** User group type '${name}' successfully updated

### `userGroupUpdateSuccess`
- **Variables:** `${name}`
- **English fallback:** User group '${name}' successfully updated

### `userGroupsNotFound`
- **Variables:** `${missingGroupIds}`
- **English fallback:** User Groups with IDs {...} not found

### `userNotFound`
- **Variables:** `${userId}`
- **English fallback:** User with ID {user_id} not found

### `userNotFoundByCode`
- **Variables:** `${code}`
- **English fallback:** User with code '${code}' not found

### `userNotInGroup`
- **Variables:** `${userCode}`, `${groupName}`
- **English fallback:** User '{user_code}' is not in group '{group_name}'

---

## Expected output format

```json
{
  "departmentCategoryCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category '${name}' successfully created"
  },
  "departmentCategoryDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category '${name}' cannot be deleted because it is referenced by other records"
  },
  "departmentCategoryDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category '${name}' successfully deleted"
  },
  "departmentCategoryKeyTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category with key '${key}' already exists"
  },
  "departmentCategoryNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category with name '${name}' already exists"
  },
  "departmentCategoryNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category with ID {category_id} not found"
  },
  "departmentCategoryNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category with name '${name}' not found"
  },
  "departmentCategoryUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department category '${name}' successfully updated"
  },
  "departmentCircularReference": {
    "ukr": "<Ukrainian translation>",
    "eng": "Cannot set parent of department '${name}' — the selected parent is a descendant of this department"
  },
  "departmentCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department '${name}' successfully created"
  },
  "departmentDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department '${name}' cannot be deleted because it is referenced by other records"
  },
  "departmentDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department '${name}' successfully deleted"
  },
  "departmentNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department with ID {department_id} not found"
  },
  "departmentNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department with name '${name}' not found"
  },
  "departmentTypeCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type '${name}' successfully created"
  },
  "departmentTypeDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type '${name}' cannot be deleted because it is referenced by other records"
  },
  "departmentTypeDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type '${name}' successfully deleted"
  },
  "departmentTypeJobLinkAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Link between department type ID {department_type_id} and job ID {job_id} already exists"
  },
  "departmentTypeJobLinkCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type–job link '${name}' successfully created"
  },
  "departmentTypeJobLinkDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type–job link ID {link_id} cannot be deleted because it is referenced by other records"
  },
  "departmentTypeJobLinkDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type–job link '${name}' successfully deleted"
  },
  "departmentTypeJobLinkNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type–job link with ID {link_id} not found"
  },
  "departmentTypeJobLinkNotFoundByCompositeKey": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type–job link for department type ID {department_type_id} and job ID {job_id} not found"
  },
  "departmentTypeJobLinkUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type–job link '${name}' successfully updated"
  },
  "departmentTypeNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type with name '${name}' already exists"
  },
  "departmentTypeNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type with ID {type_id} not found"
  },
  "departmentTypeNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type with name '${name}' not found"
  },
  "departmentTypeParentalLinkAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Link between child {child_id} and parent {parent_id} already exists"
  },
  "departmentTypeParentalLinkCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type parental link '${name}' successfully created"
  },
  "departmentTypeParentalLinkDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type parental link '${name}' cannot be deleted"
  },
  "departmentTypeParentalLinkDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type parental link '${name}' successfully deleted"
  },
  "departmentTypeParentalLinkNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type parental link with ID {link_id} not found"
  },
  "departmentTypeParentalLinkUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type parental link '${name}' successfully updated"
  },
  "departmentTypeUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department type '${name}' successfully updated"
  },
  "departmentUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Department '${name}' successfully updated"
  },
  "employeeAlreadyInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee '{employee_code}' is already in group '{group_name}'"
  },
  "employeeCodeTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee with code '${code}' already exists"
  },
  "employeeDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee '{employee_code}' cannot be deleted because it is referenced by other records"
  },
  "employeeDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee '${name}' successfully deleted"
  },
  "employeeDepartmentAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee {employee_id} already has an assignment for department {department_id}"
  },
  "employeeDepartmentDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Assignment '${name}' cannot be deleted because it is referenced by other records"
  },
  "employeeDepartmentMainAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee {employee_id} already has a main department (assignment ID: {existing_main_id}). Only one main department allowed."
  },
  "employeeDepartmentMainDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Cannot delete main department assignment (ID: {link_id}). Please set another department as main first."
  },
  "employeeEmailTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee with email '${email}' already exists"
  },
  "employeeEventAlreadyApplied": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} is already applied"
  },
  "employeeEventApplySuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} successfully applied"
  },
  "employeeEventChangeCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change with ID {change_id} successfully created"
  },
  "employeeEventChangeDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change with ID {change_id} cannot be deleted because it is referenced by other records"
  },
  "employeeEventChangeDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change with ID {change_id} successfully deleted"
  },
  "employeeEventChangeDepartmentNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change department with ID {record_id} not found"
  },
  "employeeEventChangeDeptTypeCodeTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change dept type with code '${code}' already exists"
  },
  "employeeEventChangeDeptTypeCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change dept type '${code}' successfully created"
  },
  "employeeEventChangeDeptTypeDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change dept type '${code}' cannot be deleted because it is referenced by other records"
  },
  "employeeEventChangeDeptTypeDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change dept type '${code}' successfully deleted"
  },
  "employeeEventChangeDeptTypeNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change dept type with ID {type_id} not found"
  },
  "employeeEventChangeDeptTypeNotFoundByCode": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change dept type with code '${code}' not found"
  },
  "employeeEventChangeDeptTypeUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change dept type '${code}' successfully updated"
  },
  "employeeEventChangeDirectionDuplicate": {
    "ukr": "<Ukrainian translation>",
    "eng": "A change for direction type ID {direction_type_id} already exists on event ID {event_id}"
  },
  "employeeEventChangeEventNotDraft": {
    "ukr": "<Ukrainian translation>",
    "eng": "Cannot modify changes on event with ID {event_id} because it is not in draft status"
  },
  "employeeEventChangeNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change with ID {change_id} not found"
  },
  "employeeEventChangeUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event change with ID {change_id} successfully updated"
  },
  "employeeEventCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} successfully created"
  },
  "employeeEventDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} cannot be deleted because it is referenced by other records"
  },
  "employeeEventDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} successfully deleted"
  },
  "employeeEventDirectionTypeCodeTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event direction type with code '${code}' already exists"
  },
  "employeeEventDirectionTypeCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event direction type '${code}' successfully created"
  },
  "employeeEventDirectionTypeDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event direction type '${code}' cannot be deleted because it is referenced by other records"
  },
  "employeeEventDirectionTypeDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event direction type '${code}' successfully deleted"
  },
  "employeeEventDirectionTypeNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event direction type with ID {type_id} not found"
  },
  "employeeEventDirectionTypeNotFoundByCode": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event direction type with code '${code}' not found"
  },
  "employeeEventDirectionTypeUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event direction type '${code}' successfully updated"
  },
  "employeeEventNotDraft": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} cannot be modified because it is not in draft status"
  },
  "employeeEventNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} not found"
  },
  "employeeEventStatusCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event status '${name}' successfully created"
  },
  "employeeEventStatusDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event status '${name}' cannot be deleted because it is referenced by other records"
  },
  "employeeEventStatusDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event status '${name}' successfully deleted"
  },
  "employeeEventStatusNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event status with name '${name}' already exists"
  },
  "employeeEventStatusNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event status with ID {status_id} not found"
  },
  "employeeEventStatusNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event status with name '${name}' not found"
  },
  "employeeEventStatusUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event status '${name}' successfully updated"
  },
  "employeeEventTypeCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type '${name}' successfully created"
  },
  "employeeEventTypeDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type '${name}' cannot be deleted because it is referenced by other records"
  },
  "employeeEventTypeDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type '${name}' successfully deleted"
  },
  "employeeEventTypeDirectionCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type direction with ID {direction_id} successfully created"
  },
  "employeeEventTypeDirectionDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type direction with ID {direction_id} cannot be deleted because it is referenced by other records"
  },
  "employeeEventTypeDirectionDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type direction with ID {direction_id} successfully deleted"
  },
  "employeeEventTypeDirectionDuplicate": {
    "ukr": "<Ukrainian translation>",
    "eng": "Direction type ID {direction_type_id} is already configured for event type ID {event_type_id}"
  },
  "employeeEventTypeDirectionNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type direction with ID {direction_id} not found"
  },
  "employeeEventTypeDirectionUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type direction with ID {direction_id} successfully updated"
  },
  "employeeEventTypeNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type with name '${name}' already exists"
  },
  "employeeEventTypeNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type with ID {type_id} not found"
  },
  "employeeEventTypeNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type with name '${name}' not found"
  },
  "employeeEventTypeUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event type '${name}' successfully updated"
  },
  "employeeEventUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee event with ID {event_id} successfully updated"
  },
  "employeeNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee with ID {employee_id} not found"
  },
  "employeeNotFoundByCode": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee with code '${code}' not found"
  },
  "employeeNotInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee '{employee_code}' is not in group '{group_name}'"
  },
  "employeeOrgUnitDepartmentCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Assignment '${name}' successfully created"
  },
  "employeeOrgUnitDepartmentDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Assignment '${name}' successfully deleted"
  },
  "employeeOrgUnitDepartmentNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Assignment with ID {link_id} not found"
  },
  "employeeOrgUnitDepartmentUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Assignment '${name}' successfully updated"
  },
  "employeeStatusCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee status '${name}' successfully created"
  },
  "employeeStatusDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee status '${name}' cannot be deleted because it is referenced by other records"
  },
  "employeeStatusDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee status '${name}' successfully deleted"
  },
  "employeeStatusNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee status with name '${name}' already exists"
  },
  "employeeStatusNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee status with ID {status_id} not found"
  },
  "employeeStatusNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee status with name '${name}' not found"
  },
  "employeeStatusUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Employee status '${name}' successfully updated"
  },
  "groupNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group with ID {group_id} not found"
  },
  "groupsNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User groups with IDs {{ids_str}} not found"
  },
  "jobAlreadyInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '{job_name}' is already linked to group '{group_name}'"
  },
  "jobAlreadyInJobGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '{job_name}' is already linked to job group '{group_name}'"
  },
  "jobCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '${name}' successfully created"
  },
  "jobDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '{job_name}' cannot be deleted because it is referenced by other records"
  },
  "jobDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '${name}' successfully deleted"
  },
  "jobGroupCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job group '${name}' successfully created"
  },
  "jobGroupDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job group '${name}' cannot be deleted because it is referenced by other records"
  },
  "jobGroupDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job group '${name}' successfully deleted"
  },
  "jobGroupNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job group with name '${name}' already exists"
  },
  "jobGroupNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job group with ID {job_group_id} not found"
  },
  "jobGroupTypeSingletonViolation": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '{job_name}' already belongs to group '{existing_group_name}' of type '{type_name}', which does not allow multiple groups per job. Remove the existing group first."
  },
  "jobGroupUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job group '${name}' successfully updated"
  },
  "jobJobGroupNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job group with ID {job_group_id} not found"
  },
  "jobJobGroupsNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job groups with IDs {{ids_str}} not found"
  },
  "jobNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job with name '${name}' already exists"
  },
  "jobNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job with ID {job_id} not found"
  },
  "jobNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job with name '${name}' not found"
  },
  "jobNotInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '{job_name}' is not linked to group '{group_name}'"
  },
  "jobNotInJobGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '{job_name}' is not linked to job group '{group_name}'"
  },
  "jobUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job '${name}' successfully updated"
  },
  "langNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Job with ID {lang_id} not found"
  },
  "langNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Language with name '${name}' not found"
  },
  "msgAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Message for key ID {msg_key_id} and lang ID {lang_id} already exists"
  },
  "msgFullAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Message key '${name}' already exists"
  },
  "msgFullDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": ""
  },
  "msgFullDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": ""
  },
  "msgFullNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Full message with key ID {msg_key_id} not found"
  },
  "msgKeyNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Message key with ID {mag_key_id} not found"
  },
  "msgKeyNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Message key with name '${name}' not found"
  },
  "msgNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Message with ID {msg_id} not found"
  },
  "operationAlreadyInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation '{operation_name}' is already linked to group '{group_name}'"
  },
  "operationCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation '${name}' successfully created"
  },
  "operationDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation '{operation_name}' cannot be deleted because it is referenced by other records"
  },
  "operationDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation '${name}' successfully deleted"
  },
  "operationGroupNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group with ID {group_id} not found"
  },
  "operationGroupsNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User groups with IDs {{ids_str}} not found"
  },
  "operationHasGroups": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation '{operation_name}' cannot be deleted because it is linked to the following user groups: {groups_str}. Please unlink the user groups first before deleting the operation."
  },
  "operationNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation with name '${name}' already exists"
  },
  "operationNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation with ID {operation_id} not found"
  },
  "operationNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation with name '${name}' not found"
  },
  "operationNotInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation '{operation_name}' is not linked to group '{group_name}'"
  },
  "operationUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Operation '${name}' successfully updated"
  },
  "talentAuditAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit for employee ID {employee_id} already exists"
  },
  "talentAuditCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit for employee ID {employee_id} successfully created"
  },
  "talentAuditDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit with ID {audit_id} cannot be deleted because it is referenced by other records"
  },
  "talentAuditDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit with ID {audit_id} successfully deleted"
  },
  "talentAuditInterviewCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview with ID {interview_id} successfully created"
  },
  "talentAuditInterviewDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview with ID {interview_id} cannot be deleted because it is referenced by other records"
  },
  "talentAuditInterviewDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview with ID {interview_id} successfully deleted"
  },
  "talentAuditInterviewNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview with ID {interview_id} not found"
  },
  "talentAuditInterviewStatusCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview status '${name}' successfully created"
  },
  "talentAuditInterviewStatusDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview status '${name}' cannot be deleted because it is referenced by other records"
  },
  "talentAuditInterviewStatusDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview status '${name}' successfully deleted"
  },
  "talentAuditInterviewStatusNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview status with name '${name}' already exists"
  },
  "talentAuditInterviewStatusNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview status with ID {status_id} not found"
  },
  "talentAuditInterviewStatusNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview status with name '${name}' not found"
  },
  "talentAuditInterviewStatusUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview status '${name}' successfully updated"
  },
  "talentAuditInterviewUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit interview with ID {interview_id} successfully updated"
  },
  "talentAuditJobCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job with ID {job_id} successfully created"
  },
  "talentAuditJobDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job with ID {job_id} cannot be deleted because it is referenced by other records"
  },
  "talentAuditJobDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job with ID {job_id} successfully deleted"
  },
  "talentAuditJobNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job with ID {job_id} not found"
  },
  "talentAuditJobStatusCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job status '${name}' successfully created"
  },
  "talentAuditJobStatusDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job status '${name}' cannot be deleted because it is referenced by other records"
  },
  "talentAuditJobStatusDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job status '${name}' successfully deleted"
  },
  "talentAuditJobStatusNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job status with name '${name}' already exists"
  },
  "talentAuditJobStatusNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job status with ID {status_id} not found"
  },
  "talentAuditJobStatusNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job status with name '${name}' not found"
  },
  "talentAuditJobStatusUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job status '${name}' successfully updated"
  },
  "talentAuditJobUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit job with ID {job_id} successfully updated"
  },
  "talentAuditNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit with ID {audit_id} not found"
  },
  "talentAuditStatusCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit status '${name}' successfully created"
  },
  "talentAuditStatusDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit status '${name}' cannot be deleted because it is referenced by other records"
  },
  "talentAuditStatusDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit status '${name}' successfully deleted"
  },
  "talentAuditStatusNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit status with name '${name}' already exists"
  },
  "talentAuditStatusNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit status with ID {status_id} not found"
  },
  "talentAuditStatusNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit status with name '${name}' not found"
  },
  "talentAuditStatusUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit status '${name}' successfully updated"
  },
  "talentAuditUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent audit with ID {audit_id} successfully updated"
  },
  "talentPeriodCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent period '${name}' successfully created"
  },
  "talentPeriodDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent period '${name}' cannot be deleted because it is referenced by other records"
  },
  "talentPeriodDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent period '${name}' successfully deleted"
  },
  "talentPeriodNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent period with name '${name}' already exists"
  },
  "talentPeriodNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent period with ID {period_id} not found"
  },
  "talentPeriodNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent period with name '${name}' not found"
  },
  "talentPeriodUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent period '${name}' successfully updated"
  },
  "talentStatusCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status '${name}' successfully created"
  },
  "talentStatusDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status '${name}' cannot be deleted because it is referenced by other records"
  },
  "talentStatusDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status '${name}' successfully deleted"
  },
  "talentStatusKeyTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status with key '${key}' already exists"
  },
  "talentStatusNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status with name '${name}' already exists"
  },
  "talentStatusNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status with ID {status_id} not found"
  },
  "talentStatusNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status with name '${name}' not found"
  },
  "talentStatusPeriodLinkAlreadyExists": {
    "ukr": "<Ukrainian translation>",
    "eng": "Link between talent status ID {status_id} and talent period ID {period_id} already exists"
  },
  "talentStatusPeriodLinkCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status–period link '${name}' successfully created"
  },
  "talentStatusPeriodLinkDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status–period link ID {link_id} cannot be deleted because it is referenced by other records"
  },
  "talentStatusPeriodLinkDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status–period link '${name}' successfully deleted"
  },
  "talentStatusPeriodLinkNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status–period link with ID {link_id} not found"
  },
  "talentStatusPeriodLinkNotFoundByCompositeKey": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status–period link for status ID {status_id} and period ID {period_id} not found"
  },
  "talentStatusPeriodLinkUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status–period link '${name}' successfully updated"
  },
  "talentStatusUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "Talent status '${name}' successfully updated"
  },
  "userAlreadyInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "User '{user_code}' is already in group '{group_name}'"
  },
  "userCodeTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "User with code '${code}' already exists"
  },
  "userDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "User '{user_code}' cannot be deleted because it is referenced by other records"
  },
  "userEmailTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "User with email '${email}' already exists"
  },
  "userGroupCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group '${name}' successfully created"
  },
  "userGroupDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group '${name}' cannot be deleted because it is referenced by other records"
  },
  "userGroupDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group '${name}' successfully deleted"
  },
  "userGroupNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "User Group with name '${name}' already exists"
  },
  "userGroupNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User Group with ID {group_id} not found"
  },
  "userGroupTypeCreateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group type '${name}' successfully created"
  },
  "userGroupTypeDeleteError": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group type '${name}' cannot be deleted because it is referenced by other records"
  },
  "userGroupTypeDeleteSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group type '${name}' successfully deleted"
  },
  "userGroupTypeNameTaken": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group type with name '${name}' already exists"
  },
  "userGroupTypeNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group type with ID {type_id} not found"
  },
  "userGroupTypeNotFoundByName": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group type with name '${name}' not found"
  },
  "userGroupTypeUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group type '${name}' successfully updated"
  },
  "userGroupUpdateSuccess": {
    "ukr": "<Ukrainian translation>",
    "eng": "User group '${name}' successfully updated"
  },
  "userGroupsNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User Groups with IDs {...} not found"
  },
  "userNotFound": {
    "ukr": "<Ukrainian translation>",
    "eng": "User with ID {user_id} not found"
  },
  "userNotFoundByCode": {
    "ukr": "<Ukrainian translation>",
    "eng": "User with code '${code}' not found"
  },
  "userNotInGroup": {
    "ukr": "<Ukrainian translation>",
    "eng": "User '{user_code}' is not in group '{group_name}'"
  }
}
```
