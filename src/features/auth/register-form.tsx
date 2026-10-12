'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { applyActionError } from '@/components/form/apply-action-error';
import { FormAlert } from '@/components/form/form-alert';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { registerAction } from './actions';
import { PASSWORD_MIN, registerSchema, type RegisterInput } from './schemas';

export function RegisterForm() {
  const next = useSearchParams().get('next') ?? undefined;

  const [pending, startTransition] = useTransition();
  const [requestId, setRequestId] = useState<string>();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await registerAction(values, next);
      if (result && !result.ok) setRequestId(applyActionError(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.message} requestId={requestId} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="First name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...form.register('firstName')}
          />
          <TextField
            label="Last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...form.register('lastName')}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN} characters.`}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href={next ? { pathname: '/login', query: { next } } : '/login'}
            className="text-foreground underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
