// snapshotMockData.ts
// ─────────────────────────────────────────────────────────────────────────────
// Types + mock data for the staffing snapshot report.
// Replace `MOCK_SNAPSHOT` with a real API call in production.
// ─────────────────────────────────────────────────────────────────────────────

export type TargetMode = 'total' | 'by_status';
export type FactMode   = 'by_status' | 'by_job_and_status';

export interface JobDef {
  id:   string;
  key:  string;
  name: string;
}

export interface JobGroupConfig {
  target_mode: TargetMode;
  fact_mode:   FactMode;
  jobs:        JobDef[];
}

export interface JobGroupDef {
  id:     string;
  key:    string;
  name:   string;
  config: JobGroupConfig;
}

export interface TalentStatus { id: string; key: string; name: string; }
export interface OrgUnit       { id: string; key: string; name: string; }
export interface Department    { id: string; key: string; name: string; }

export interface Essences {
  talent_statuses: TalentStatus[];
  job_groups:      JobGroupDef[];
  org_units:       OrgUnit[];
  departments:     Department[];
}

// Fact shapes vary by config — we use a flexible map at runtime
export type StatusFact    = { pa: number | null; po: number | null };
export type JobStatusFact = Record<string, StatusFact>;   // keyed by job.key
export type FactValue     = StatusFact | JobStatusFact;

export type TargetValue   = number | StatusFact;          // total or by_status

export interface JobGroupRowData {
  target: TargetValue;
  fact:   FactValue;
  pct:    number | null;
}

export interface SummaryData {
  base_target:   number | null;
  object_target: number | null;
  fact:          number | null;
  pct:           number | null;
}

export interface SnapshotRow {
  org_unit_id?:    string;
  org_unit_key?:   string;
  department_id?:  string;
  department_key?: string;
  label?:          string;          // only on grand_totals
  job_groups:      Record<string, JobGroupRowData>;
  summary:         SummaryData;
}

export interface SnapshotMeta {
  version:     string;
  period:      { year: number; month: number };
  description: string;
}

export interface Snapshot {
  snapshot_meta: SnapshotMeta;
  essences:      Essences;
  grand_totals:  SnapshotRow;
  data:          SnapshotRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_SNAPSHOT: Snapshot = {
  snapshot_meta: {
    version: '2.0',
    period: { year: 2024, month: 5 },
    description: 'Monthly staffing snapshot',
  },
  essences: {
    talent_statuses: [
      { id: 'ts_pa', key: 'Па', name: 'Парі' },
      { id: 'ts_po', key: 'По', name: 'Потенціальний' },
    ],
    job_groups: [
      {
        id: 'jg_1', key: 'заст-к МС', name: 'Заступник МС',
        config: { target_mode: 'total', fact_mode: 'by_status', jobs: [] },
      },
      {
        id: 'jg_2', key: 'МКС/МС', name: 'МКС / МС',
        config: {
          target_mode: 'by_status',
          fact_mode: 'by_job_and_status',
          jobs: [
            { id: 'j_ms',  key: 'МС',  name: 'МС'  },
            { id: 'j_mks', key: 'МКС', name: 'МКС' },
          ],
        },
      },
      {
        id: 'jg_3', key: 'МП', name: 'Менеджер продажів',
        config: { target_mode: 'by_status', fact_mode: 'by_status', jobs: [] },
      },
      {
        id: 'jg_4', key: 'РРШ/КУ/ДМ', name: 'РРШ / КУ / ДМ',
        config: {
          target_mode: 'total',
          fact_mode: 'by_job_and_status',
          jobs: [
            { id: 'j_rrsh', key: 'РРШ', name: 'РРШ' },
            { id: 'j_ku',   key: 'КУ',  name: 'КУ'  },
            { id: 'j_dm',   key: 'ДМ',  name: 'ДМ'  },
          ],
        },
      },
    ],
    org_units: [
      { id: 'ou_1',  key: 'STORE1',  name: 'STORE1'  },
      { id: 'ou_2',  key: 'STORE2',  name: 'STORE2'  },
      { id: 'ou_3',  key: 'STORE3',  name: 'STORE3'  },
      { id: 'ou_4',  key: 'STORE4',  name: 'STORE4'  },
      { id: 'ou_5',  key: 'STORE5',  name: 'STORE5'  },
      { id: 'ou_6',  key: 'STORE6',  name: 'STORE6'  },
      { id: 'ou_7',  key: 'STORE7',  name: 'STORE7'  },
      { id: 'ou_8',  key: 'STORE8',  name: 'STORE8'  },
      { id: 'ou_9',  key: 'STORE9',  name: 'STORE9'  },
      { id: 'ou_10', key: 'STORE10', name: 'STORE10' },
      { id: 'ou_11', key: 'STORE11', name: 'STORE11' },
      { id: 'ou_12', key: 'STORE12', name: 'STORE12' },
      { id: 'ou_13', key: 'STORE13', name: 'STORE13' },
      { id: 'ou_14', key: 'STORE14', name: 'STORE14' },
      { id: 'ou_15', key: 'STORE15', name: 'STORE15' },
      { id: 'ou_16', key: 'STORE16', name: 'STORE16' },
      { id: 'ou_17', key: 'STORE17', name: 'STORE17' },
      { id: 'ou_18', key: 'STORE18', name: 'STORE18' },
      { id: 'ou_19', key: 'STORE19', name: 'STORE19' },
    ],
    departments: [
      { id: 'dept_1', key: 'SALES', name: 'SALES' },
    ],
  },
  grand_totals: {
    label: "Всього по об'єктам",
    job_groups: {
      jg_1: { target: 75,                    fact: { pa: 15, po: 18 },                                                             pct: 0.44 },
      jg_2: { target: { pa: 43, po: 27 },    fact: { МС: { pa: 21, po: 19 }, МКС: { pa: 4, po: 9 } },                             pct: 1    },
      jg_3: { target: { pa: 23, po: 19 },    fact: { pa: 19, po: 19 },                                                             pct: 0.9  },
      jg_4: { target: 46,                    fact: { РРШ: { pa: 2, po: 3 }, КУ: { pa: 5, po: 3 }, ДМ: { pa: 10, po: 5 } },        pct: 0.61 },
    },
    summary: { base_target: 208, object_target: 233, fact: 144, pct: 0.62 },
  },
  data: [
    { org_unit_key: 'STORE1',  department_key: 'SALES', job_groups: { jg_1: { target: 4, fact: { pa: 1, po: 0 }, pct: 0.25 }, jg_2: { target: { pa: 3, po: 2 }, fact: { МС: { pa: 3, po: 0 }, МКС: { pa: 2, po: 0 } }, pct: 1    }, jg_3: { target: { pa: 2, po: 1 }, fact: { pa: 3, po: 0 }, pct: 1    }, jg_4: { target: 3, fact: { РРШ: { pa: 1, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 2, po: 0 } }, pct: 1    } }, summary: { base_target: 14, object_target: 15, fact: 12, pct: 0.80 } },
    { org_unit_key: 'STORE2',  department_key: 'SALES', job_groups: { jg_1: { target: 4, fact: { pa: 0, po: 2 }, pct: 0.50 }, jg_2: { target: { pa: 2, po: 2 }, fact: { МС: { pa: 1, po: 2 }, МКС: { pa: 0, po: 0 } }, pct: 1    }, jg_3: { target: { pa: 2, po: 1 }, fact: { pa: 1, po: 0 }, pct: 0.33 }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 1, po: 0 }, ДМ: { pa: 0, po: 0 } }, pct: 0.33 } }, summary: { base_target: 14, object_target: 14, fact: 7,  pct: 0.50 } },
    { org_unit_key: 'STORE3',  department_key: 'SALES', job_groups: { jg_1: { target: 6, fact: { pa: 2, po: 0 }, pct: 0.33 }, jg_2: { target: { pa: 2, po: 2 }, fact: { МС: { pa: 3, po: 2 }, МКС: { pa: 0, po: 1 } }, pct: 1    }, jg_3: { target: { pa: 2, po: 1 }, fact: { pa: 0, po: 1 }, pct: 0.33 }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 1, po: 1 } }, pct: 0.67 } }, summary: { base_target: 14, object_target: 16, fact: 11, pct: 0.69 } },
    { org_unit_key: 'STORE4',  department_key: 'SALES', job_groups: { jg_1: { target: 4, fact: { pa: 0, po: 2 }, pct: 0.50 }, jg_2: { target: { pa: 2, po: 2 }, fact: { МС: { pa: 0, po: 2 }, МКС: { pa: 0, po: 0 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 2, po: 1 }, pct: 1    }, jg_4: { target: 2, fact: { РРШ: { pa: 1, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 1, po: 0 } }, pct: 1    } }, summary: { base_target: 13, object_target: 12, fact: 9,  pct: 0.75 } },
    { org_unit_key: 'STORE5',  department_key: 'SALES', job_groups: { jg_1: { target: 3, fact: { pa: 0, po: 0 }, pct: 0    }, jg_2: { target: { pa: 2, po: 1 }, fact: { МС: { pa: 1, po: 0 }, МКС: { pa: 0, po: 0 } }, pct: 0.5  }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 0, po: 0 }, pct: 0    }, jg_4: { target: 2, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 0, po: 0 } }, pct: 0    } }, summary: { base_target: 10, object_target: 10, fact: 0,  pct: 0    } },
    { org_unit_key: 'STORE6',  department_key: 'SALES', job_groups: { jg_1: { target: 3, fact: { pa: 1, po: 2 }, pct: 1    }, jg_2: { target: { pa: 2, po: 1 }, fact: { МС: { pa: 0, po: 0 }, МКС: { pa: 0, po: 1 } }, pct: 0.5  }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 0, po: 0 }, pct: 0    }, jg_4: { target: 2, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 1 }, ДМ: { pa: 0, po: 0 } }, pct: 0.5  } }, summary: { base_target: 10, object_target: 10, fact: 0,  pct: 0    } },
    { org_unit_key: 'STORE7',  department_key: 'SALES', job_groups: { jg_1: { target: 4, fact: { pa: 0, po: 2 }, pct: 0.50 }, jg_2: { target: { pa: 3, po: 2 }, fact: { МС: { pa: 2, po: 4 }, МКС: { pa: 2, po: 0 } }, pct: 1    }, jg_3: { target: { pa: 2, po: 1 }, fact: { pa: 1, po: 0 }, pct: 0.33 }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 1, po: 0 } }, pct: 0.33 } }, summary: { base_target: 14, object_target: 15, fact: 12, pct: 0.80 } },
    { org_unit_key: 'STORE8',  department_key: 'SALES', job_groups: { jg_1: { target: 3, fact: { pa: 0, po: 0 }, pct: 0    }, jg_2: { target: { pa: 2, po: 1 }, fact: { МС: { pa: 2, po: 1 }, МКС: { pa: 0, po: 1 } }, pct: 0    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 0, po: 0 }, pct: 0    }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 1 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 0, po: 1 } }, pct: 0.67 } }, summary: { base_target: 11, object_target: 11, fact: 6,  pct: 0.55 } },
    { org_unit_key: 'STORE9',  department_key: 'SALES', job_groups: { jg_1: { target: 2, fact: { pa: 0, po: 3 }, pct: 1    }, jg_2: { target: { pa: 1, po: 1 }, fact: { МС: { pa: 0, po: 1 }, МКС: { pa: 0, po: 0 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 1, po: 0 }, pct: 0.5  }, jg_4: { target: 1, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 1, po: 0 }, ДМ: { pa: 0, po: 0 } }, pct: 1    } }, summary: { base_target: 7,  object_target: 7,  fact: 6,  pct: 0.86 } },
    { org_unit_key: 'STORE10', department_key: 'SALES', job_groups: { jg_1: { target: 5, fact: { pa: 0, po: 1 }, pct: 0.20 }, jg_2: { target: { pa: 3, po: 2 }, fact: { МС: { pa: 2, po: 1 }, МКС: { pa: 0, po: 0 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 2, po: 0 }, pct: 1    }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 1 }, КУ: { pa: 1, po: 0 }, ДМ: { pa: 0, po: 1 } }, pct: 1    } }, summary: { base_target: 11, object_target: 15, fact: 9,  pct: 0.60 } },
    { org_unit_key: 'STORE11', department_key: 'SALES', job_groups: { jg_1: { target: 3, fact: { pa: 4, po: 0 }, pct: 1    }, jg_2: { target: { pa: 3, po: 1 }, fact: { МС: { pa: 0, po: 0 }, МКС: { pa: 0, po: 1 } }, pct: 0.33 }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 1, po: 3 }, pct: 1    }, jg_4: { target: 2, fact: { РРШ: { pa: 0, po: 1 }, КУ: { pa: 1, po: 0 }, ДМ: { pa: 0, po: 0 } }, pct: 1    } }, summary: { base_target: 10, object_target: 11, fact: 11, pct: 1    } },
    { org_unit_key: 'STORE12', department_key: 'SALES', job_groups: { jg_1: { target: 6, fact: { pa: 0, po: 2 }, pct: 0.33 }, jg_2: { target: { pa: 3, po: 1 }, fact: { МС: { pa: 0, po: 2 }, МКС: { pa: 0, po: 1 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 3, po: 3 }, pct: 1    }, jg_4: { target: 2, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 1 }, ДМ: { pa: 0, po: 0 } }, pct: 0.5  } }, summary: { base_target: 10, object_target: 14, fact: 12, pct: 0.86 } },
    { org_unit_key: 'STORE13', department_key: 'SALES', job_groups: { jg_1: { target: 6, fact: { pa: 1, po: 0 }, pct: 0.17 }, jg_2: { target: { pa: 3, po: 1 }, fact: { МС: { pa: 1, po: 1 }, МКС: { pa: 0, po: 0 } }, pct: 0.67 }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 1, po: 2 }, pct: 1    }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 0, po: 1 } }, pct: 0.33 } }, summary: { base_target: 11, object_target: 15, fact: 7,  pct: 0.47 } },
    { org_unit_key: 'STORE14', department_key: 'SALES', job_groups: { jg_1: { target: 5, fact: { pa: 4, po: 0 }, pct: 0.80 }, jg_2: { target: { pa: 2, po: 1 }, fact: { МС: { pa: 2, po: 2 }, МКС: { pa: 0, po: 1 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 0, po: 1 }, pct: 0.5  }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 1 }, ДМ: { pa: 0, po: 0 } }, pct: 0.33 } }, summary: { base_target: 11, object_target: 13, fact: 11, pct: 0.85 } },
    { org_unit_key: 'STORE15', department_key: 'SALES', job_groups: { jg_1: { target: 4, fact: { pa: 0, po: 0 }, pct: 0    }, jg_2: { target: { pa: 2, po: 2 }, fact: { МС: { pa: 3, po: 0 }, МКС: { pa: 0, po: 0 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 2, po: 2 }, pct: 1    }, jg_4: { target: 2, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 2, po: 0 } }, pct: 1    } }, summary: { base_target: 10, object_target: 12, fact: 9,  pct: 0.75 } },
    { org_unit_key: 'STORE16', department_key: 'SALES', job_groups: { jg_1: { target: 0, fact: { pa: 0, po: 0 }, pct: 0    }, jg_2: { target: { pa: 0, po: 0 }, fact: { МС: { pa: 0, po: 0 }, МКС: { pa: 0, po: 0 } }, pct: 0    }, jg_3: { target: { pa: 0, po: 0 }, fact: { pa: 0, po: 0 }, pct: 0    }, jg_4: { target: 0, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 0, po: 0 } }, pct: 0    } }, summary: { base_target: 0,  object_target: 0,  fact: 0,  pct: 0    } },
    { org_unit_key: 'STORE17', department_key: 'SALES', job_groups: { jg_1: { target: 0, fact: { pa: 0, po: 0 }, pct: 0    }, jg_2: { target: { pa: 0, po: 0 }, fact: { МС: { pa: 0, po: 0 }, МКС: { pa: 0, po: 0 } }, pct: 0    }, jg_3: { target: { pa: 0, po: 0 }, fact: { pa: 0, po: 0 }, pct: 0    }, jg_4: { target: 0, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 0, po: 0 } }, pct: 0    } }, summary: { base_target: 0,  object_target: 0,  fact: 0,  pct: 0    } },
    { org_unit_key: 'STORE18', department_key: 'SALES', job_groups: { jg_1: { target: 5, fact: { pa: 0, po: 0 }, pct: 0    }, jg_2: { target: { pa: 2, po: 1 }, fact: { МС: { pa: 0, po: 1 }, МКС: { pa: 0, po: 1 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 0, po: 1 }, pct: 0.5  }, jg_4: { target: 2, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 1, po: 0 }, ДМ: { pa: 1, po: 0 } }, pct: 1    } }, summary: { base_target: 10, object_target: 12, fact: 5,  pct: 0.42 } },
    { org_unit_key: 'STORE19', department_key: 'SALES', job_groups: { jg_1: { target: 3, fact: { pa: 0, po: 0 }, pct: 0    }, jg_2: { target: { pa: 2, po: 1 }, fact: { МС: { pa: 1, po: 0 }, МКС: { pa: 0, po: 1 } }, pct: 1    }, jg_3: { target: { pa: 1, po: 1 }, fact: { pa: 0, po: 1 }, pct: 0.5  }, jg_4: { target: 3, fact: { РРШ: { pa: 0, po: 0 }, КУ: { pa: 0, po: 0 }, ДМ: { pa: 1, po: 0 } }, pct: 0.33 } }, summary: { base_target: 10, object_target: 11, fact: 4,  pct: 0.36 } },
  ],
};
