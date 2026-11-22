"use client";

import type { ComponentProps } from "react";
import { useFormContext, type FieldPath, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps<T extends FieldValues> extends Omit<ComponentProps<typeof Input>, "name"> {
  name: FieldPath<T>;
  label: string;
  hint?: string;
}

/**
 * Labelled input bound to the nearest React Hook Form context.
 * Usage: wrap the form in <FormProvider {...form}> and render <FormField name="email" label="ইমেইল" />.
 */
export function FormField<T extends FieldValues>({ name, label, hint, className, ...inputProps }: FormFieldProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const error = errors[name]?.message;
  const id = inputProps.id ?? name;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...inputProps}
        {...register(name)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {String(error)}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
