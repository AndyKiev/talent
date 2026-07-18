// src/types/mutationResponse.ts
// The backend's standard mutation envelope (MutationResponse[T] in FastAPI):
// every create/update/delete returns { detail, data }. One shared declaration —
// api slice files import it from here instead of redeclaring it.
export interface MutationResponse<T> {
    detail: string;
    data: T;
}
