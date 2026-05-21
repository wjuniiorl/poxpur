import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PoxpurSpinner } from '@/components/common/PoxpurSpinner';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const { error } = await requestPasswordReset(values.email);
    if (error) {
      setServerError(error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Alert>
        <AlertDescription>
          Se este e-mail estiver cadastrado, você receberá um link de recuperação em
          instantes. Confira sua caixa de entrada e spam.
        </AlertDescription>
        <div className="mt-4">
          <Link to="/login" className="text-sm text-poxpur-green hover:underline">
            ← Voltar ao login
          </Link>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail cadastrado</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-poxpur-navy text-white hover:bg-poxpur-navy-dark"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <PoxpurSpinner size="sm" />
            Enviando...
          </span>
        ) : (
          'Enviar link de recuperação'
        )}
      </Button>

      <div className="text-center">
        <Link to="/login" className="text-sm text-poxpur-green hover:underline">
          ← Voltar ao login
        </Link>
      </div>
    </form>
  );
}
