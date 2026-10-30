export type FieldType = "text" | "date" | "number" | "textarea" | "boolean";

export type FieldDef = {
  key: string; // stored as a key inside visa_details.extra_fields
  label: string;
  type: FieldType;
};

export type VisaTypeDef = {
  value: string; // stored in visa_details.visa_category
  labelAr: string;
  fields: FieldDef[];
};

export const VISA_TYPES: VisaTypeDef[] = [
  {
    value: "tourism",
    labelAr: "سياحة",
    fields: [
      { key: "trip_duration_days", label: "مدة الرحلة بالأيام", type: "number" },
      { key: "accommodation", label: "مكان الإقامة", type: "text" },
    ],
  },
  {
    value: "business",
    labelAr: "أعمال",
    fields: [
      { key: "company_name", label: "اسم الشركة", type: "text" },
      { key: "business_purpose", label: "غرض الزيارة", type: "textarea" },
      { key: "has_invitation_letter", label: "توجد دعوة رسمية من الشركة المضيفة", type: "boolean" },
    ],
  },
  {
    value: "studies",
    labelAr: "دراسة",
    fields: [
      { key: "university_name", label: "اسم الجامعة أو المؤسسة", type: "text" },
      { key: "program_name", label: "التخصص", type: "text" },
      { key: "program_start_date", label: "تاريخ بداية الدراسة", type: "date" },
      { key: "has_admission_letter", label: "توجد رسالة قبول", type: "boolean" },
    ],
  },
  {
    value: "family_reunification",
    labelAr: "لمّ الشمل العائلي",
    fields: [
      { key: "sponsor_full_name", label: "اسم الكفيل", type: "text" },
      { key: "sponsor_relationship", label: "صلة القرابة بالكفيل", type: "text" },
      { key: "sponsor_residence_status", label: "وضع الكفيل في بلد الإقامة", type: "text" },
    ],
  },
  {
    value: "long_stay_d",
    labelAr: "إقامة طويلة (نوع D)",
    fields: [
      { key: "purpose_of_stay", label: "سبب الإقامة الطويلة", type: "textarea" },
      { key: "planned_stay_months", label: "المدة المخططة بالأشهر", type: "number" },
    ],
  },
  {
    value: "scientific_researcher",
    labelAr: "باحث علمي",
    fields: [
      { key: "host_institution", label: "المؤسسة العلمية المستضيفة", type: "text" },
      { key: "research_topic", label: "موضوع البحث", type: "textarea" },
      { key: "has_hosting_agreement", label: "توجد اتفاقية استضافة", type: "boolean" },
    ],
  },
];

export const APPLICATION_TYPES: { value: string; labelAr: string }[] = [
  { value: "first", labelAr: "أول مرة" },
  { value: "renewal", labelAr: "تجديد" },
];

// Popular destinations shown first, in this exact order.
export const PRIORITY_DESTINATION_CODES: string[] = [
  "FR", "ES", "IT", "DE", "BE", "NL", "PT",
];

export function getVisaType(value: string): VisaTypeDef | undefined {
  return VISA_TYPES.find((type) => type.value === value);
}
