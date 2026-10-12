'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { applyActionError } from '@/components/form/apply-action-error';
import { FormAlert } from '@/components/form/form-alert';
import { NativeSelect } from '@/components/form/native-select';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import type { Address } from '@/lib/api/types';
import { createAddressAction, updateAddressAction } from './actions';
import { COUNTRIES } from './countries';
import { ADDRESS_LIMITS, EMPTY_ADDRESS, addressSchema, type AddressInput } from './schemas';

type Props = {
  /** Edit this address. Without it the form creates a new one. */
  address?: Address;
  /** Hide the "default" checkbox, for example for the very first address. */
  forceDefault?: boolean;
  submitLabel?: string;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
};

/** Create/edit form shared by the address book (ACC-2) and checkout (CHK-2). */
export function AddressForm({ address, forceDefault, submitLabel, onSaved, onCancel }: Props) {
  const [pending, startTransition] = useTransition();
  const [requestId, setRequestId] = useState<string>();
  const countryId = useId();
  const defaultId = useId();

  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          label: address.label ?? '',
          street: address.street,
          city: address.city,
          state: address.state ?? '',
          postalCode: address.postalCode,
          country: address.country,
          isDefault: address.isDefault,
        }
      : { ...EMPTY_ADDRESS, isDefault: Boolean(forceDefault) },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = address
        ? await updateAddressAction(address.id, values)
        : await createAddressAction(values);
      if (result.ok) onSaved(result.address);
      else setRequestId(applyActionError(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label={address ? 'Edit address' : 'New address'}>
      <FieldGroup>
        <FormAlert message={errors.root?.message} requestId={requestId} />
        <TextField
          label="Label (optional)"
          placeholder="Home, Office…"
          maxLength={ADDRESS_LIMITS.label}
          error={errors.label?.message}
          {...form.register('label')}
        />
        <TextField
          label="Street address"
          autoComplete="street-address"
          maxLength={ADDRESS_LIMITS.street}
          error={errors.street?.message}
          {...form.register('street')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="City"
            autoComplete="address-level2"
            maxLength={ADDRESS_LIMITS.city}
            error={errors.city?.message}
            {...form.register('city')}
          />
          <TextField
            label="State / region (optional)"
            autoComplete="address-level1"
            maxLength={ADDRESS_LIMITS.state}
            error={errors.state?.message}
            {...form.register('state')}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Postal code"
            autoComplete="postal-code"
            maxLength={ADDRESS_LIMITS.postalCode}
            error={errors.postalCode?.message}
            {...form.register('postalCode')}
          />
          <Field data-invalid={errors.country ? true : undefined}>
            <FieldLabel htmlFor={countryId}>Country</FieldLabel>
            <NativeSelect
              id={countryId}
              autoComplete="country"
              aria-invalid={errors.country ? true : undefined}
              {...form.register('country')}
            >
              <option value="">Choose a country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </NativeSelect>
            {errors.country ? <FieldError>{errors.country.message}</FieldError> : null}
          </Field>
        </div>
        {forceDefault ? null : (
          <label htmlFor={defaultId} className="flex items-center gap-2 text-sm">
            <input
              id={defaultId}
              type="checkbox"
              className="size-4 accent-primary"
              {...form.register('isDefault')}
            />
            Use as my default address
          </label>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : (submitLabel ?? (address ? 'Save changes' : 'Save address'))}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
