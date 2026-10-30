import { getVisaType } from "@/lib/visa-catalog";

// Form-side values for the visa section (strings, as typed in the UI)
export type VisaFormValues = {
  country: string;
  visaCategory: string;
  applicationType: string;
  expectedTravelDate: string;
  appointmentDate: string;
  previousVisaHistory: string;
  extra: Record<string, string | boolean>;
};

export const EMPTY_VISA_FORM: VisaFormValues = {
  country: "",
  visaCategory: "",
  applicationType: "",
  expectedTravelDate: "",
  appointmentDate: "",
  previousVisaHistory: "",
  extra: {},
};

// Shape of a row in visa_details as returned by Supabase
export type VisaDetailsRow = {
  request_id: string;
  country: string | null;
  visa_category: string | null;
  application_type: string | null;
  expected_travel_date: string | null;
  appointment_date: string | null;
  previous_visa_history: string | null;
  extra_fields: Record<string, unknown> | null;
};

function toNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Database row -> form values
export function visaRowToForm(row: VisaDetailsRow | null): VisaFormValues {
  if (!row) return EMPTY_VISA_FORM;

  const extra: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(row.extra_fields ?? {})) {
    if (typeof value === "boolean") {
      extra[key] = value;
    } else if (value !== null && value !== undefined) {
      extra[key] = String(value);
    }
  }

  return {
    country: row.country ?? "",
    visaCategory: row.visa_category ?? "",
    applicationType: row.application_type ?? "",
    expectedTravelDate: row.expected_travel_date ?? "",
    appointmentDate: row.appointment_date ?? "",
    previousVisaHistory: row.previous_visa_history ?? "",
    extra,
  };
}

// Form values -> database row.
// Only fields that belong to the selected visa category are saved in extra_fields,
// so switching the category never leaves stale values behind.
export function visaFormToRow(requestId: string, form: VisaFormValues) {
  const extraFields: Record<string, string | number | boolean> = {};
  const category = getVisaType(form.visaCategory);

  if (category) {
    for (const field of category.fields) {
      const raw = form.extra[field.key];
      if (raw === undefined || raw === "") continue;
      extraFields[field.key] = field.type === "number" ? Number(raw) : raw;
    }
  }

  return {
    request_id: requestId,
    country: toNull(form.country),
    visa_category: toNull(form.visaCategory),
    application_type: toNull(form.applicationType),
    expected_travel_date: toNull(form.expectedTravelDate),
    appointment_date: toNull(form.appointmentDate),
    previous_visa_history: toNull(form.previousVisaHistory),
    extra_fields: extraFields,
  };
}
