'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { applyActionError } from '@/components/form/apply-action-error';
import { FormAlert } from '@/components/form/form-alert';
import { NativeSelect } from '@/components/form/native-select';
import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIES } from '@/features/catalog/categories';
import type { Product } from '@/lib/api/types';
import { SUPPORTED_CURRENCIES } from '@/lib/money';
import { createProductAction, updateProductAction } from './actions';
import {
  EMPTY_PRODUCT_FORM,
  PRODUCT_LIMITS,
  isHttpUrl,
  productFormSchema,
  productToFormValues,
  toCreateBody,
  toUpdateBody,
  type ProductFormValues,
} from './product-form-model';

/** Create/edit product form (ADM-3). Editing sends only the changed fields. */
export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [requestId, setRequestId] = useState<string>();
  const ids = { description: useId(), currency: useId(), categories: useId(), active: useId() };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? productToFormValues(product) : EMPTY_PRODUCT_FORM,
  });
  const { errors } = form.formState;
  const attributes = useFieldArray({ control: form.control, name: 'attributes' });
  const images = useFieldArray({ control: form.control, name: 'images' });
  const imageValues = useWatch({ control: form.control, name: 'images' });

  const onSubmit = form.handleSubmit((values) => {
    setRequestId(undefined);
    if (product) {
      const body = toUpdateBody(product, values);
      if (Object.keys(body).length === 0) {
        form.setError('root', { message: 'Nothing was changed.' });
        return;
      }
      startTransition(async () => {
        const result = await updateProductAction(product.id, body);
        if (result.ok) {
          toast.success('Product updated.');
          router.push('/admin/products');
        } else {
          setRequestId(applyActionError(form, result));
        }
      });
      return;
    }

    startTransition(async () => {
      const result = await createProductAction(toCreateBody(values));
      if (result.ok) {
        toast.success('Product created.');
        router.push('/admin/products');
      } else {
        setRequestId(applyActionError(form, result));
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl">
      <FieldGroup>
        <FormAlert message={errors.root?.message} requestId={requestId} />

        <TextField
          label="Name"
          maxLength={PRODUCT_LIMITS.name}
          error={errors.name?.message}
          {...form.register('name')}
        />

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor={ids.description}>Description</FieldLabel>
          <Textarea
            id={ids.description}
            rows={5}
            maxLength={PRODUCT_LIMITS.description}
            aria-invalid={errors.description ? true : undefined}
            {...form.register('description')}
          />
          {errors.description ? <FieldError>{errors.description.message}</FieldError> : null}
        </Field>

        <TextField
          label="Category"
          list={ids.categories}
          maxLength={PRODUCT_LIMITS.category}
          description="Pick an existing category or type a new one."
          error={errors.category?.message}
          {...form.register('category')}
        />
        <datalist id={ids.categories}>
          {CATEGORIES.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.label}
            </option>
          ))}
        </datalist>

        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <TextField
            label="Price"
            inputMode="decimal"
            placeholder="12.34"
            description="In major units. Stored as integer minor units."
            error={errors.price?.message}
            {...form.register('price')}
          />
          <Field>
            <FieldLabel htmlFor={ids.currency}>Currency</FieldLabel>
            <NativeSelect id={ids.currency} {...form.register('currency')}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        {product ? (
          <p className="text-muted-foreground text-sm">
            Stock: {product.stock?.available ?? 0} available, {product.stock?.reserved ?? 0}{' '}
            reserved. Use “Adjust stock” in the product list to change it.
          </p>
        ) : (
          <TextField
            label="Initial stock"
            inputMode="numeric"
            error={errors.initialStock?.message}
            {...form.register('initialStock')}
          />
        )}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Attributes</legend>
          {attributes.fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">No attributes, for example color or size.</p>
          ) : null}
          {attributes.fields.map((row, index) => {
            const rowErrors = errors.attributes?.[index];
            return (
              <div key={row.id} className="flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <Input
                    aria-label={`Attribute ${index + 1} name`}
                    placeholder="Name"
                    aria-invalid={rowErrors?.key ? true : undefined}
                    {...form.register(`attributes.${index}.key`)}
                  />
                  <Input
                    aria-label={`Attribute ${index + 1} value`}
                    placeholder="Value"
                    aria-invalid={rowErrors?.value ? true : undefined}
                    {...form.register(`attributes.${index}.value`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove attribute ${index + 1}`}
                    onClick={() => attributes.remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <FieldError>{rowErrors?.key?.message ?? rowErrors?.value?.message}</FieldError>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={attributes.fields.length >= PRODUCT_LIMITS.attributes}
            onClick={() => attributes.append({ key: '', value: '' })}
          >
            <PlusIcon /> Add attribute
          </Button>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">
            Images ({images.fields.length}/{PRODUCT_LIMITS.images})
          </legend>
          <FieldDescription>
            Image URLs. The first one is the main image. Only hosts in IMAGE_HOSTS are shown in the
            shop.
          </FieldDescription>
          {images.fields.map((row, index) => {
            const url = imageValues?.[index]?.url ?? '';
            const error = errors.images?.[index]?.url?.message;
            return (
              <div key={row.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="bg-muted size-10 shrink-0 overflow-hidden rounded-md border">
                    {isHttpUrl(url) ? (
                      // A plain <img>: the preview must work for any host, before it is saved.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="size-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                  </div>
                  <Input
                    type="url"
                    aria-label={`Image ${index + 1} URL`}
                    placeholder="https://…"
                    aria-invalid={error ? true : undefined}
                    {...form.register(`images.${index}.url`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove image ${index + 1}`}
                    onClick={() => images.remove(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <FieldError>{error}</FieldError>
              </div>
            );
          })}
          <FieldError>{errors.images?.root?.message ?? errors.images?.message}</FieldError>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            disabled={images.fields.length >= PRODUCT_LIMITS.images}
            onClick={() => images.append({ url: '' })}
          >
            <PlusIcon /> Add image
          </Button>
        </fieldset>

        {product ? (
          <label htmlFor={ids.active} className="flex items-start gap-2 text-sm">
            <input
              id={ids.active}
              type="checkbox"
              className="accent-primary mt-0.5 size-4"
              {...form.register('isActive')}
            />
            <span>
              Active
              <span className="text-muted-foreground block">
                Inactive products are hidden from the shop and cannot be ordered.
              </span>
            </span>
          </label>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
