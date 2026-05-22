import { create } from 'zustand';

export interface Employee {
    talentStatusPeriodLinkId: number | undefined;
    id: number;
    name: string;
    matricule: string;
    orgUnit: string;
    department: string;
    position: string;
    companyStatus: string;
    talentStatus: string;
    talentStatusLabel: string;
    talentPeriod: string;
    targetPosition: string;
    email: string;
}

interface EmployeeStore {
    employees: Employee[];
    addEmployee: (employee: Omit<Employee, 'id'>) => void;
    updateEmployee: (id: number, updates: Partial<Employee>) => void;
    getEmployee: (id: number) => Employee | undefined;
}

const initialEmployees: Employee[] = [
    {
        id: 1, name: "Olena Kovalenko", matricule: "UA-00412", orgUnit: "Central Office",
        department: "IT", position: "Analyst", companyStatus: "Active",
        talentStatus: "PA", talentStatusLabel: "Confirmed Talent", talentPeriod: "24 months",
        targetPosition: "Team Lead", email: "o.kovalenko@company.com", talentStatusPeriodLinkId:-1
    },
    {
        id: 2, name: "Dmytro Bondar", matricule: "UA-00398", orgUnit: "Central Office",
        department: "IT", position: "Team Lead", companyStatus: "Active",
        talentStatus: "PO", talentStatusLabel: "Potential", talentPeriod: "12 months",
        targetPosition: "Manager", email: "d.bondar@company.com", talentStatusPeriodLinkId:-1
    },
    {
        id: 3, name: "Iryna Shevchenko", matricule: "UA-00501", orgUnit: "Central Office",
        department: "IT", position: "Specialist", companyStatus: "Active",
        talentStatus: "NA", talentStatusLabel: "Not Assessed", talentPeriod: "",
        targetPosition: "", email: "", talentStatusPeriodLinkId:-1
    },
    {
        id: 4, name: "Vasyl Moroz", matricule: "UA-00287", orgUnit: "Central Office",
        department: "Finance", position: "Coordinator", companyStatus: "Active",
        talentStatus: "PO", talentStatusLabel: "Potential", talentPeriod: "24 months",
        targetPosition: "Manager", email: "v.moroz@company.com", talentStatusPeriodLinkId:-1
    },
    {
        id: 5, name: "Natalia Petrenko", matricule: "UA-00356", orgUnit: "Central Office",
        department: "Finance", position: "Analyst", companyStatus: "Military Service",
        talentStatus: "PA", talentStatusLabel: "Confirmed Talent", talentPeriod: "36 months",
        targetPosition: "", email: "", talentStatusPeriodLinkId:-1
    },
    {
        id: 6, name: "Serhiy Kravchuk", matricule: "UA-00420", orgUnit: "Central Office",
        department: "HR", position: "Manager", companyStatus: "Active",
        talentStatus: "PO", talentStatusLabel: "Potential", talentPeriod: "12 months",
        targetPosition: "Director", email: "s.kravchuk@company.com", talentStatusPeriodLinkId:-1
    },
    {
        id: 7, name: "Oksana Lysenko", matricule: "UA-00391", orgUnit: "Warehouse North",
        department: "Logistics", position: "Specialist", companyStatus: "Active",
        talentStatus: "NA", talentStatusLabel: "Not Assessed", talentPeriod: "",
        targetPosition: "", email: "", talentStatusPeriodLinkId:-1
    },
    {
        id: 8, name: "Andrii Tkachenko", matricule: "UA-00445", orgUnit: "Warehouse North",
        department: "Logistics", position: "Coordinator", companyStatus: "Active",
        talentStatus: "PA", talentStatusLabel: "Confirmed Talent", talentPeriod: "12 months",
        targetPosition: "Team Lead", email: "a.tkachenko@company.com", talentStatusPeriodLinkId:-1
    },
    {
        id: 9, name: "Yulia Savchenko", matricule: "UA-00312", orgUnit: "Warehouse North",
        department: "Sales", position: "Analyst", companyStatus: "Active",
        talentStatus: "PO", talentStatusLabel: "Potential", talentPeriod: "24 months",
        targetPosition: "", email: "", talentStatusPeriodLinkId:-1
    },
    {
        id: 10, name: "Mykola Hrytsenko", matricule: "UA-00478", orgUnit: "Pick-up Zone A",
        department: "Sales", position: "Specialist", companyStatus: "Active",
        talentStatus: "NA", talentStatusLabel: "Not Assessed", talentPeriod: "",
        targetPosition: "", email: "", talentStatusPeriodLinkId:-1
    },
];

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
    employees: initialEmployees,

    addEmployee: (employeeData) => {
        const employees = get().employees;
        const newId = Math.max(...employees.map(e => e.id), 0) + 1;
        const newEmployee: Employee = {
            ...employeeData,
            id: newId,
        };
        set({ employees: [...employees, newEmployee] });
    },

    updateEmployee: (id, updates) => {
        set(state => ({
            employees: state.employees.map(emp =>
                emp.id === id ? { ...emp, ...updates } : emp
            ),
        }));
    },

    getEmployee: (id) => {
        return get().employees.find(emp => emp.id === id);
    },
}));