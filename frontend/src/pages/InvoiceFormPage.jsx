import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { monthOptions, serviceOptions } from '../services/options.js';
import {
  getInvoiceRequest,
  submitInvoiceRequest,
  updateInvoiceRequest,
} from '../services/invoiceService.js';

const monthToIndex = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const toDateInput = (date) => new Date(date).toISOString().split('T')[0];

function InvoiceFormPage() {
  const { invoiceId } = useParams();
  const isEditMode = Boolean(invoiceId);
  const navigate = useNavigate();

  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loadingInvoice, setLoadingInvoice] = useState(isEditMode);
  const [existingFileName, setExistingFileName] = useState('');

  const defaultYear = useMemo(() => new Date().getFullYear(), []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      invoiceNumber: '',
      invoiceMonth: '',
      invoiceYear: defaultYear,
      consultingPeriodFrom: '',
      consultingPeriodTo: '',
      invoiceAmount: '',
      serviceProvided: '',
      serviceProvidedDetails: '',
      invoiceDocumentData: '',
      invoiceDocumentName: '',
    },
  });

  const selectedMonth = watch('invoiceMonth');
  const selectedYear = watch('invoiceYear');
  const selectedService = watch('serviceProvided');

  useEffect(() => {
    if (!selectedMonth || !selectedYear) {
      return;
    }

    const monthIndex = monthToIndex[selectedMonth];
    if (monthIndex === undefined) {
      return;
    }

    // Auto-fill the "To Date" with the last day of the selected month/year.
    const endOfMonth = new Date(Number(selectedYear), monthIndex + 1, 0);
    setValue('consultingPeriodTo', toDateInput(endOfMonth), { shouldValidate: true });
  }, [selectedMonth, selectedYear, setValue]);

  useEffect(() => {
    if (selectedService !== 'Other') {
      setValue('serviceProvidedDetails', '');
    }
  }, [selectedService, setValue]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const loadInvoice = async () => {
      try {
        const response = await getInvoiceRequest(invoiceId);
        const invoice = response.invoice;

        setValue('invoiceNumber', invoice.invoiceNumber);
        setValue('invoiceMonth', invoice.invoiceMonth);
        setValue('invoiceYear', invoice.invoiceYear);
        setValue('consultingPeriodFrom', toDateInput(invoice.consultingPeriodFrom));
        setValue('consultingPeriodTo', toDateInput(invoice.consultingPeriodTo));
        setValue('invoiceAmount', invoice.invoiceAmount);
        setValue('serviceProvided', invoice.serviceProvided);
        setValue('serviceProvidedDetails', invoice.serviceProvidedDetails || '');

        setExistingFileName(invoice.invoiceDocument?.originalName || '');
      } catch (error) {
        setServerError(error.response?.data?.message || 'Failed to load invoice.');
      } finally {
        setLoadingInvoice(false);
      }
    };

    loadInvoice();
  }, [invoiceId, isEditMode, setValue]);

  const onInvoiceFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setValue('invoiceDocumentData', dataUrl, { shouldValidate: true });
      setValue('invoiceDocumentName', file.name, { shouldValidate: true });
    };

    reader.readAsDataURL(file);
  };

  const onSubmit = async (formValues) => {
    setServerError('');
    setSuccessMessage('');

    const hasUploadedFile = Boolean(formValues.invoiceDocumentData && formValues.invoiceDocumentName);
    const hasExistingFile = Boolean(existingFileName);

    if (!hasUploadedFile && !hasExistingFile) {
      setServerError('Invoice file is required (photo or PDF).');
      return;
    }

    const payload = {
      ...formValues,
      invoiceYear: Number(formValues.invoiceYear),
      invoiceAmount: Number(formValues.invoiceAmount),
    };

    if (!hasUploadedFile) {
      delete payload.invoiceDocumentData;
      delete payload.invoiceDocumentName;
    }

    try {
      let response;
      if (isEditMode) {
        response = await updateInvoiceRequest(invoiceId, payload);
      } else {
        response = await submitInvoiceRequest(payload);
      }

      setSuccessMessage(
        response?.message || `Invoice ${isEditMode ? 'updated' : 'submitted'} successfully.`
      );
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      const apiErrors = error.response?.data?.errors;
      if (apiErrors?.length) {
        setServerError(apiErrors[0].msg);
      } else {
        setServerError(error.response?.data?.message || 'Invoice save failed.');
      }
    }
  };

  if (loadingInvoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            {isEditMode ? 'Edit Invoice' : 'Invoice Submission Form'}
          </h1>
          <Link to="/dashboard" className="text-sm font-medium text-primary-700 hover:text-primary-600">
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Invoice Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Invoice Number</label>
                <input
                  {...register('invoiceNumber', { required: 'Invoice number required' })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
                {errors.invoiceNumber ? <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Invoice Year</label>
                <input
                  type="number"
                  {...register('invoiceYear', {
                    required: 'Invoice year required',
                    min: { value: 2000, message: 'Invoice year is invalid' },
                  })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
                {errors.invoiceYear ? <p className="mt-1 text-sm text-red-600">{errors.invoiceYear.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Invoice Month</label>
                <select
                  {...register('invoiceMonth', { required: 'Invoice month required' })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                >
                  <option value="">Select month</option>
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
                {errors.invoiceMonth ? <p className="mt-1 text-sm text-red-600">{errors.invoiceMonth.message}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Service Provided</label>
                <select
                  {...register('serviceProvided', { required: 'Service provided required' })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                >
                  <option value="">Select service</option>
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
                {errors.serviceProvided ? (
                  <p className="mt-1 text-sm text-red-600">{errors.serviceProvided.message}</p>
                ) : null}
              </div>

              {selectedService === 'Other' ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Please Specify Service
                  </label>
                  <input
                    {...register('serviceProvidedDetails', {
                      validate: (value) =>
                        selectedService !== 'Other' || String(value || '').trim().length > 0
                          ? true
                          : 'Please describe the service when selecting Other',
                    })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    placeholder="Type the exact service provided"
                  />
                  {errors.serviceProvidedDetails ? (
                    <p className="mt-1 text-sm text-red-600">{errors.serviceProvidedDetails.message}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Consulting Period</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">From Date</label>
                <input
                  type="date"
                  {...register('consultingPeriodFrom', {
                    required: 'Consulting period start date required',
                  })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
                {errors.consultingPeriodFrom ? (
                  <p className="mt-1 text-sm text-red-600">{errors.consultingPeriodFrom.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">To Date</label>
                <input
                  type="date"
                  {...register('consultingPeriodTo', {
                    required: 'Consulting period end date required',
                    validate: (value) => {
                      if (new Date(value) < new Date(getValues('consultingPeriodFrom'))) {
                        return 'Consulting period must be valid';
                      }

                      return true;
                    },
                  })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
                {errors.consultingPeriodTo ? (
                  <p className="mt-1 text-sm text-red-600">{errors.consultingPeriodTo.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Invoice Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('invoiceAmount', {
                    required: 'Invoice amount required',
                    min: { value: 0.01, message: 'Invoice amount must be > 0' },
                  })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
                {errors.invoiceAmount ? (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceAmount.message}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Invoice File (PDF/Image)</h2>
            <input type="hidden" {...register('invoiceDocumentData')} />
            <input type="hidden" {...register('invoiceDocumentName')} />
            {existingFileName ? (
              <p className="mb-2 text-sm text-slate-600">Current file: {existingFileName}</p>
            ) : null}
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg"
              onChange={onInvoiceFileChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
            <p className="mt-2 text-xs text-slate-500">Upload a new file to replace the current one.</p>
          </div>

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
          {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary-600 px-6 py-3 text-base font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Invoice' : 'Submit Invoice'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default InvoiceFormPage;
