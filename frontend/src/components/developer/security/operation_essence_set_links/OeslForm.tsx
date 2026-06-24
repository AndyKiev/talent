// src/components/admin/operation_essence_set_links/OeslForm.tsx
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  Checkbox,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  InputLabel,
  FormControl,
} from '@mui/material';
import type { Operation } from '../../catalog/operations/operationApi.ts';
import type { Essence } from '../../catalog/essences/essenceApi.ts';
import type { OESLCreate } from './oeslApi.ts';
import type { GetStringFn } from '../../../../types/getStringFn.ts';
import cfl from '../../../../utils/helpers.ts';

interface Props {
  getString: GetStringFn;
  operations: Operation[];
  essences: Essence[];
  onSubmit: (data: OESLCreate) => void;
  isPending: boolean;
}

export function OeslForm({ getString, operations, essences, onSubmit, isPending }: Props) {
  const { control, handleSubmit, reset } = useForm<OESLCreate>({
    defaultValues: { operation_id: 0, essence_ids: [] },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((d) => {
        onSubmit(d);
        reset({ operation_id: 0, essence_ids: [] });
      })}
      sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}
    >
      {/* Operation — single select */}
      <Controller
        name="operation_id"
        control={control}
        rules={{ validate: (v) => v > 0 || 'Required' }}
        render={({ field, fieldState }) => (
          <TextField
            select
            size="small"
            label={cfl(getString('operation')) || 'Operation'}
            {...field}
            error={!!fieldState.error}
            sx={{ width: 200 }}
          >
            <MenuItem value={0} disabled>
              {cfl(getString('selectOperation')) || 'Select operation'}
            </MenuItem>
            {operations.map((op) => (
              <MenuItem key={op.id} value={op.id}>{op.name}</MenuItem>
            ))}
          </TextField>
        )}
      />

      {/* Essences — MULTI select (the set) */}
      <Controller
        name="essence_ids"
        control={control}
        rules={{ validate: (v) => (v && v.length > 0) || 'Pick at least one' }}
        render={({ field, fieldState }) => (
          <FormControl size="small" sx={{ width: 320 }} error={!!fieldState.error}>
            <InputLabel>{cfl(getString('essences')) || 'Essences'}</InputLabel>
            <Select
              multiple
              value={field.value ?? []}
              onChange={(e) => field.onChange(e.target.value as number[])}
              input={<OutlinedInput label={cfl(getString('essences')) || 'Essences'} />}
              renderValue={(selected) =>
                essences
                  .filter((es) => (selected as number[]).includes(es.id))
                  .map((es) => es.name)
                  .join(', ')
              }
            >
              {essences.map((es) => (
                <MenuItem key={es.id} value={es.id}>
                  <Checkbox checked={(field.value ?? []).includes(es.id)} size="small" />
                  <ListItemText primary={es.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      />

      <Button type="submit" variant="contained" size="small" disabled={isPending}>
        {cfl(getString('add')) || 'Add'}
      </Button>
    </Box>
  );
}
