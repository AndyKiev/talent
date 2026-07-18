// src/api/createCrudApi.ts
//
// Factory for the standard CRUD api quartet every essence slice repeats:
//   fetchX(params?)  → GET    BASE        → T[]
//   createX(body)    → POST   BASE        → MutationResponse<T>
//   updateX({id,data}) → PATCH `${BASE}/${id}` → MutationResponse<T>
//   deleteX(id)      → DELETE `${BASE}/${id}` → MutationResponse<null>
// Slice api files keep exporting their original named functions as one-line
// aliases of the factory members, so consumers never change.
import { axiosInstance } from './axiosInstance';
import type { MutationResponse } from '../types/mutationResponse';

export interface CrudApi<T, TCreate, TUpdate, TListParams extends object> {
    /** Filterable list. NEVER pass this bare as a queryFn — TanStack would call
     *  it with its context object, which would be serialized as query params.
     *  Wrap it: `queryFn: () => fetchX({ ... })`. */
    fetchAll: (params?: TListParams) => Promise<T[]>;
    /** Zero-arg list fetch — ignores arguments, safe as a bare queryFn. */
    fetchList: () => Promise<T[]>;
    create: (body: TCreate) => Promise<MutationResponse<T>>;
    update: (args: { id: number; data: TUpdate }) => Promise<MutationResponse<T>>;
    remove: (id: number) => Promise<MutationResponse<null>>;
}

export function createCrudApi<
    T,
    TCreate,
    TUpdate,
    TListParams extends object = Record<string, never>,
>(base: string): CrudApi<T, TCreate, TUpdate, TListParams> {
    return {
        fetchAll: async (params?: TListParams): Promise<T[]> => {
            const res = await axiosInstance.get<T[]>(base, { params });
            return res.data ?? [];
        },
        fetchList: async (): Promise<T[]> => {
            const res = await axiosInstance.get<T[]>(base);
            return res.data ?? [];
        },
        create: async (body: TCreate): Promise<MutationResponse<T>> => {
            const res = await axiosInstance.post<MutationResponse<T>>(base, body);
            return res.data;
        },
        update: async ({ id, data }: { id: number; data: TUpdate }): Promise<MutationResponse<T>> => {
            const res = await axiosInstance.patch<MutationResponse<T>>(`${base}/${id}`, data);
            return res.data;
        },
        remove: async (id: number): Promise<MutationResponse<null>> => {
            const res = await axiosInstance.delete<MutationResponse<null>>(`${base}/${id}`);
            return res.data;
        },
    };
}
