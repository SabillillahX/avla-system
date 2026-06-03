import type { CourseClass } from "@/lib/api/classes"

export const parsePrice = (value: string): number | null => {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) {
    return null;
  }

  return Number(digits);
};

export const formatPrice = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return 'Rp0';
  }

  const numericValue = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, ''));
  if (Number.isNaN(numericValue)) {
    return 'Rp0';
  }

  return `Rp${numericValue.toLocaleString('id-ID')}`;
};

export const getCourseDisplayPrice = (course: Pick<CourseClass, "price" | "discount_price" | "is_free">): string => {
  if (course.is_free) {
    return "Rp0";
  }

  const hasDiscount = course.discount_price !== null && course.discount_price !== undefined && String(course.discount_price) !== "";
  return formatPrice(hasDiscount ? course.discount_price : course.price);
};

export const getCourseOriginalPrice = (course: Pick<CourseClass, "price" | "discount_price" | "is_free">): string => {
  if (course.is_free) {
    return "";
  }

  const hasDiscount = course.discount_price !== null && course.discount_price !== undefined && String(course.discount_price) !== "";
  const isActuallyDiscounted = hasDiscount && String(course.discount_price) !== String(course.price);
  return isActuallyDiscounted ? formatPrice(course.price) : "";
};

export const formatDateLabel = (value?: string | null): string => {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

export const normalizeLevel = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (['beginner', 'intermediate', 'advanced', 'all_levels'].includes(normalized)) {
    return normalized;
  }

  return null;
};
