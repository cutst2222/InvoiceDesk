import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function LoginPage() {
  const { login, register: registerConsultant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login');
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loginForm = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onLogin = async (formValues) => {
    setServerError('');
    setSuccessMessage('');

    try {
      await login(formValues);
      const fallbackPath = '/dashboard';
      const redirectPath = location.state?.from?.pathname || fallbackPath;
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setServerError(error.response?.data?.message || 'Login failed.');
    }
  };

  const onRegister = async (formValues) => {
    setServerError('');
    setSuccessMessage('');

    try {
      const response = await registerConsultant(formValues);
      setSuccessMessage(response.message || 'Registration submitted.');
      setMode('login');
      registerForm.reset();
    } catch (error) {
      setServerError(error.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-slate-900">Consultant Invoice Submission</h1>
        <p className="mt-2 text-sm text-slate-600">Login or register as a consultant.</p>

        <div className="mt-5 inline-flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-md px-4 py-2 text-sm ${
              mode === 'login' ? 'bg-white text-primary-700 shadow' : 'text-slate-600'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-md px-4 py-2 text-sm ${
              mode === 'register' ? 'bg-white text-primary-700 shadow' : 'text-slate-600'
            }`}
          >
            Register
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                {...loginForm.register('email', { required: 'Email is required' })}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              {loginForm.formState.errors.email ? (
                <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                {...loginForm.register('password', { required: 'Password is required' })}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              {loginForm.formState.errors.password ? (
                <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 text-base font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {loginForm.formState.isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input
                {...registerForm.register('name', { required: 'Name is required' })}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              {registerForm.formState.errors.name ? (
                <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                {...registerForm.register('email', { required: 'Email is required' })}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              {registerForm.formState.errors.email ? (
                <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                {...registerForm.register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
              {registerForm.formState.errors.password ? (
                <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full rounded-lg bg-primary-600 px-4 py-3 text-base font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {registerForm.formState.isSubmitting ? 'Submitting...' : 'Register'}
            </button>
          </form>
        )}

        {serverError ? <p className="mt-4 text-sm text-red-600">{serverError}</p> : null}
        {successMessage ? <p className="mt-4 text-sm text-green-700">{successMessage}</p> : null}
      </div>
    </div>
  );
}

export default LoginPage;
