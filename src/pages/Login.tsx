import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

export default function Login() {
  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Entre com sua conta Poxpur">
      <LoginForm />
    </AuthLayout>
  );
}
