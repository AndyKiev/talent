// src/components/admin/persons/personApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums.ts';
import type { MutationResponse } from '../../../types/mutationResponse';
export type { MutationResponse };
import { createCrudApi } from '../../../api/createCrudApi';

const BASE = `${BASE_URL}/persons`;

/** Biological sex stored on a person. Values are the wire/persisted form. */
export enum PersonSex {
    Male = 'male',
    Female = 'female',
}
export type PersonMaritalStatus = 'married' | 'not_married';

/** Gender suffix used to inflect sex-dependent words (e.g. marital status). */
export const sexKeySuffix = (sex: PersonSex): 'Male' | 'Female' =>
    sex === PersonSex.Female ? 'Female' : 'Male';
/** Message key for a sex label ('sexMale' / 'sexFemale'). */
export const sexLabelKey = (sex: PersonSex): string =>
    sex === PersonSex.Female ? 'sexFemale' : 'sexMale';
/** Message key for the short sex tag ('sexMaleShort' / 'sexFemaleShort'). */
export const sexShortLabelKey = (sex: PersonSex): string =>
    sex === PersonSex.Female ? 'sexFemaleShort' : 'sexMaleShort';

// The marital-status word is sex-dependent (заміжня/незаміжня vs одружений/
// неодружений) — same keys people-review uses.
export const maritalWordKey = (sex: PersonSex, marital: PersonMaritalStatus): string => {
    const suffix = sexKeySuffix(sex);
    return marital === 'married' ? `maritalMarried${suffix}` : `maritalNotMarried${suffix}`;
};

// Slim employee info nested in person responses (grid + duplicate modal).
export interface PersonEmployeeSlim {
    id: number;
    code: string;
    name: string;
    job_name: string | null;
    department_name: string | null;
}

export interface Person {
    id: number;
    first_name: string;
    last_name: string;
    patronymic: string | null;
    sex: PersonSex | null;
    marital_status: PersonMaritalStatus | null;
    birth_date: string | null;
    name_dedupe_no: number;
    created_at: string;
    employees: PersonEmployeeSlim[];
}

export interface PersonCreate {
    first_name: string;
    last_name: string;
    patronymic?: string | null;
    sex?: PersonSex | null;
    marital_status?: PersonMaritalStatus | null;
    birth_date?: string | null;
    // true = caller confirmed the namesake conflict (backend assigns dedupe no)
    allow_duplicate?: boolean;
}

export interface PersonUpdate {
    first_name?: string;
    last_name?: string;
    patronymic?: string | null;
    sex?: PersonSex | null;
    marital_status?: PersonMaritalStatus | null;
    birth_date?: string | null;
    allow_duplicate?: boolean;
}

export interface PersonNameMatch {
    person_id: number;
    first_name: string | null;
    last_name: string | null;
    patronymic: string | null;
    name_dedupe_no: number;
    employees: PersonEmployeeSlim[];
}

export interface PersonCheckNameResponse {
    matches: PersonNameMatch[];
}

const crud = createCrudApi<Person, PersonCreate, PersonUpdate>(BASE);

export const fetchPersons = crud.fetchList;

export const fetchPersonByEmployeeId = async (employeeId: number): Promise<Person> => {
    const res = await axiosInstance.get<Person>(`${BASE}/by_employee/${employeeId}`);
    return res.data;
};

export const fetchPersonByEmployeeCode = async (code: string): Promise<Person> => {
    const res = await axiosInstance.get<Person>(`${BASE}/by_employee_code/${code}`);
    return res.data;
};

// Pre-check for the employee-create dialog: existing persons with the same
// (last, first) pair plus their employees' job & department for the modal.
export const checkPersonName = async (
    firstName: string,
    lastName: string,
): Promise<PersonCheckNameResponse> => {
    const res = await axiosInstance.get<PersonCheckNameResponse>(`${BASE}/check_name`, {
        params: { first_name: firstName, last_name: lastName },
    });
    return res.data;
};

export const createPerson = crud.create;

export const updatePerson = crud.update;

export const deletePerson = crud.remove;
