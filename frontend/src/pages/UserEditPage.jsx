import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listUsersRequest, updateUserByAdminRequest } from '../services/authService.js';

function UserEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: 'consultant',
      approvalStatus: 'pending',
      password: '',
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await listUsersRequest();
        const target = response.users.find((user) => user._id === userId);

        if (!target) {
          setServerError('User not found');
          return;
        }

        reset({
          name: target.name,
          email: target.email,
          role: target.role,
          approvalStatus: target.approvalStatus,
          password: '',
        });
      } catch (error) {
        setServerError(error.response?.data?.message || 'Failed to load user');
      }
    };

    loadUser();
  }, [userId, reset]);

  const onSubmit = async (values) => {
    setServerError('');

    const payload = {
      name: values.name,
      email: values.email,
      role: values.role,
      approvalStatus: values.approvalStatus,
    };

    if (values.password) {
      payload.password = values.password;
    }

    try {
      await updateUserByAdminRequest(userId, payload);
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Edit User</h1>
          <Link to="/dashboard" className="text-sm text-primary-700">
            Back
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input {...register('name')} className="w-full rounded-lg border border-slate-300 px-4 py-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" {...register('email')} className="w-full rounded-lg border border-slate-300 px-4 py-3" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select {...register('role')} className="w-full rounded-lg border border-slate-300 px-4 py-3">
              <option value="consultant">consultant</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Approval Status</label>
            <select {...register('approvalStatus')} className="w-full rounded-lg border border-slate-300 px-4 py-3">
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New Password (optional)</label>
            <input
              type="password"
              {...register('password')}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-3 text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Save User'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserEditPage;
