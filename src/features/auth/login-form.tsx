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
import { loginAction } from './actions';
import { loginSchema, type LoginInput } from './schemas';

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? undefined;
  const justRegistered = searchParams.get('registered') === '1';

  const [pending, startTransition] = useTransition();
  const [requestId, setRequestId] = useState<string>();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await loginAction(values, next);
      if (result && !result.ok) setRequestId(applyActionError(form, result));
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {justRegistered && !errors.root ? (
          <p role="status" className="rounded-lg bg-muted p-3 text-sm">
            Your account was created. Log in to continue.
          </p>
        ) : null}
        <FormAlert message={errors.root?.message} requestId={requestId} />
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Logging in…' : 'Log in'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link
            href={next ? { pathname: '/register', query: { next } } : '/register'}
            className="text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
