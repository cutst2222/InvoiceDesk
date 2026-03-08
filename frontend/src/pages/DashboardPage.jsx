import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import {
  listPendingUsersRequest,
  listUsersRequest,
  reviewConsultantRequest,
} from '../services/authService.js';
import {
  deleteInvoiceRequest,
  downloadInvoiceRequest,
  listInvoicesRequest,
  reviewInvoiceRequest,
  viewInvoiceRequest,
} from '../services/invoiceService.js';

const getFileNameFromDisposition = (contentDisposition) => {
  if (!contentDisposition) {
    return 'invoice-file';
  }

  const match = /filename="?([^\";]+)"?/.exec(contentDisposition);
  return match?.[1] || 'invoice-file';
};

function DashboardPage() {
  const { user, logout, updateMyProfile } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const isAdmin = user?.role === 'admin';
  const formatINR = (value) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
      Number(value || 0)
    );

  const loadData = async () => {
    try {
      const invoiceResponse = await listInvoicesRequest();
      setInvoices(invoiceResponse.invoices || []);

      if (isAdmin) {
        const [pendingResponse, usersResponse] = await Promise.all([
          listPendingUsersRequest(),
          listUsersRequest(),
        ]);
        setPendingUsers(pendingResponse.users || []);
        setUsers(usersResponse.users || []);
      }
    } catch {
      setInvoices([]);
      setPendingUsers([]);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  useEffect(() => {
    setNameInput(user?.name || '');
  }, [user?.name]);

  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [invoices]
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleProfileUpdate = async () => {
    setProfileMessage('');
    try {
      await updateMyProfile({ name: nameInput });
      setProfileMessage('Profile updated.');
    } catch (error) {
      setProfileMessage(error.response?.data?.message || 'Profile update failed.');
    }
  };

  const handleConsultantDecision = async (userId, decision) => {
    try {
      await reviewConsultantRequest(userId, decision);
      setActionMessage(`Consultant ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
      await loadData();
    } catch (error) {
      setActionMessage(error.response?.data?.message || 'Consultant action failed.');
    }
  };

  const handleInvoiceDecision = async (invoiceId, decision) => {
    try {
      await reviewInvoiceRequest(invoiceId, decision);
      setActionMessage(`Invoice ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
      await loadData();
    } catch (error) {
      setActionMessage(error.response?.data?.message || 'Invoice action failed.');
    }
  };

  const handleDownload = async (invoiceId) => {
    try {
      const response = await downloadInvoiceRequest(invoiceId);
      const blobUrl = window.URL.createObjectURL(response.data);
      const fileName = getFileNameFromDisposition(response.contentDisposition);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setActionMessage('Invoice downloaded. File removed from server storage.');
      await loadData();
    } catch (error) {
      setActionMessage(error.response?.data?.message || 'Download failed.');
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    try {
      const response = await viewInvoiceRequest(invoiceId);
      const blob = new Blob([response.data], {
        type: response.contentType || 'application/octet-stream',
      });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (error) {
      setActionMessage(error.response?.data?.message || 'Unable to view invoice file.');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    const confirmed = window.confirm('Delete this invoice? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      await deleteInvoiceRequest(invoiceId);
      setActionMessage('Invoice deleted successfully.');
      await loadData();
    } catch (error) {
      setActionMessage(error.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.name}</h1>
              <p className="text-slate-600">
                Role: <span className="font-medium uppercase">{user?.role}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/invoice/new"
              className="inline-flex rounded-lg bg-primary-600 px-5 py-3 text-sm font-medium text-white hover:bg-primary-700"
            >
              Submit New Invoice
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-900">My Details</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3"
            />
            <button
              type="button"
              onClick={handleProfileUpdate}
              className="rounded-lg bg-primary-600 px-5 py-3 text-sm font-medium text-white hover:bg-primary-700"
            >
              Save Name
            </button>
          </div>
          {profileMessage ? <p className="mt-2 text-sm text-slate-700">{profileMessage}</p> : null}
          {actionMessage ? <p className="mt-2 text-sm text-slate-700">{actionMessage}</p> : null}
        </div>

        {isAdmin ? (
          <>
            <div className="rounded-2xl bg-white p-6 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900">Pending Consultant Approvals</h2>

              {pendingUsers.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No pending consultants.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {pendingUsers.map((pendingUser) => (
                        <tr key={pendingUser._id} className="border-t border-slate-200">
                          <td className="py-2 pr-4">{pendingUser.name}</td>
                          <td className="py-2 pr-4">{pendingUser.email}</td>
                          <td className="py-2 pr-4">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleConsultantDecision(pendingUser._id, 'approve')}
                                className="rounded-md bg-green-600 px-3 py-1 text-white"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConsultantDecision(pendingUser._id, 'reject')}
                                className="rounded-md bg-red-600 px-3 py-1 text-white"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {users.map((managedUser) => (
                      <tr key={managedUser._id} className="border-t border-slate-200">
                        <td className="py-2 pr-4">{managedUser.name}</td>
                        <td className="py-2 pr-4">{managedUser.email}</td>
                        <td className="py-2 pr-4">{managedUser.role}</td>
                        <td className="py-2 pr-4">{managedUser.approvalStatus}</td>
                        <td className="py-2 pr-4">
                          <Link
                            to={`/users/${managedUser._id}/edit`}
                            className="rounded-md border border-slate-300 px-3 py-1"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-900">
            {isAdmin ? 'All Invoices' : 'My Invoices'}
          </h2>

          {sortedInvoices.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No invoices available.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    {isAdmin ? <th className="py-2 pr-4">Consultant</th> : null}
                    <th className="py-2 pr-4">Invoice #</th>
                    <th className="py-2 pr-4">Month</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {sortedInvoices.map((item) => (
                    <tr key={item._id} className="border-t border-slate-200">
                      {isAdmin ? (
                        <td className="py-2 pr-4">{item.consultantId?.name || '-'}</td>
                      ) : null}
                      <td className="py-2 pr-4">{item.invoiceNumber}</td>
                      <td className="py-2 pr-4">
                        {item.invoiceMonth} {item.invoiceYear}
                      </td>
                      <td className="py-2 pr-4">{formatINR(item.invoiceAmount)}</td>
                      <td className="py-2 pr-4">
                        <span className="uppercase">{item.approvalStatus}</span>
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/invoice/${item._id}/edit`}
                            className="rounded-md border border-slate-300 px-3 py-1"
                          >
                            Edit
                          </Link>

                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleInvoiceDecision(item._id, 'approve')}
                                className="rounded-md bg-green-600 px-3 py-1 text-white"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInvoiceDecision(item._id, 'reject')}
                                className="rounded-md bg-red-600 px-3 py-1 text-white"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewInvoice(item._id)}
                                disabled={item.fileDeletedAt || !item.invoiceDocument}
                                className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownload(item._id)}
                                disabled={item.approvalStatus !== 'approved' || item.fileDeletedAt}
                                className="rounded-md bg-primary-600 px-3 py-1 text-white disabled:opacity-50"
                              >
                                Download
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteInvoice(item._id)}
                            className="rounded-md border border-red-400 px-3 py-1 text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
