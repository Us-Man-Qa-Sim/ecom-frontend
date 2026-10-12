'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type TextFieldProps = ComponentProps<typeof Input> & {
  label: ReactNode;
  error?: string;
  description?: ReactNode;
};

/** A labelled input with its error message. Works with `register()` from react-hook-form. */
export function TextField({ label, error, description, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, description ? descriptionId : null].filter(Boolean).join(' ') ||
          undefined
        }
        {...props}
      />
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
