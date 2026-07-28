import {useMutation, useQueryClient} from '@tanstack/react-query';
import type {JobBulkUploadResult} from './jobApi';
import {
  bulkUploadJobs,
  createJob,
  createJobProcessRoleLink,
  deleteJob,
  deleteJobProcessRoleLink,
  setJobGroups,
  setJobJobGroups,
  setJobCategoryForJob,
  setTrainingTypesForJob,
  updateJob,
} from './jobApi';
import {JOB_QK} from "../../../utils/queryKeys.ts";
import type {SnackbarType} from "../../../types/types.ts";
import { useCrudMutations } from '../../../hooks/useCrudMutations';

interface Props {
  setSnackbar: (s: SnackbarType) => void;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onDeleteError?: () => void;
  onSetGroupsSuccess?: () => void;
  onSetJobGroupsSuccess?: () => void;
  onAddProcessRoleSuccess?: () => void;
  onRemoveProcessRoleSuccess?: () => void;
  onBulkUploadSuccess?: (result: JobBulkUploadResult) => void;
  onSetCategorySuccess?: () => void;
  onSetTrainingTypesSuccess?: () => void;
}

export function useJobMutations({
  setSnackbar,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
  onDeleteError,
  onSetGroupsSuccess,
  onSetJobGroupsSuccess,
  onAddProcessRoleSuccess,
  onRemoveProcessRoleSuccess,
  onBulkUploadSuccess,
  onSetCategorySuccess,
  onSetTrainingTypesSuccess,
}: Props) {
  const qc = useQueryClient();

  const { createMutation, updateMutation, deleteMutation } = useCrudMutations({
    queryKey: JOB_QK,
    createFn: createJob,
    updateFn: updateJob,
    deleteFn: deleteJob,
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
  });

  const bulkUploadMutation = useMutation({
    mutationFn: bulkUploadJobs,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      onBulkUploadSuccess?.(res);
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  // Existing: assign user-groups to job (PUT /jobs/{id}/groups)
  const setGroupsMutation = useMutation({
    mutationFn: setJobGroups,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      onSetGroupsSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  // New: assign job-groups to job (PUT /job_job_group_links/job/{id})
  const setJobJobGroupsMutation = useMutation({
    mutationFn: setJobJobGroups,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      onSetJobGroupsSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  // Process-role link: add
  const addProcessRoleLinkMutation = useMutation({
    mutationFn: createJobProcessRoleLink,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      onAddProcessRoleSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  // Set (upsert) the job's single category (PUT /job_job_category_links/job/{id})
  const setCategoryMutation = useMutation({
    mutationFn: setJobCategoryForJob,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onSetCategorySuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  // Set (replace) recommended training types for a job (PUT /training_type_job_links/job/{id})
  const setTrainingTypesMutation = useMutation({
    mutationFn: setTrainingTypesForJob,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      setSnackbar({ open: true, message: res.detail, severity: 'success' });
      onSetTrainingTypesSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  // Process-role link: remove
  const removeProcessRoleLinkMutation = useMutation({
    mutationFn: ({ jobId, processRoleId }: { jobId: number; processRoleId: number }) =>
      deleteJobProcessRoleLink(jobId, processRoleId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: JOB_QK });
      onRemoveProcessRoleSuccess?.();
    },
    onError: (err: Error) => {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    setGroupsMutation,
    setJobJobGroupsMutation,
    addProcessRoleLinkMutation,
    removeProcessRoleLinkMutation,
    bulkUploadMutation,
    setCategoryMutation,
    setTrainingTypesMutation,
  };
}
