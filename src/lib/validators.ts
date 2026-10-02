import { formatNumberWithDecimal } from '@/lib/utils';
import { z } from 'zod';
const currency = z
        .string()
        .refine(
            (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(Number(value))),'price must have exactly two decimals');
// Schema for inserting products
export const insertProductSchema = z.object({
    name: z.string().min(3, { message: "Name must be at least 3 characters" }),
    slug: z.string().min(3, { message: "Slug must be at least 3 characters" }),
    category: z.string().min(3, { message: "Category must be at least 3 characters" }),
    brand: z.string().min(3, { message: "Brand must be at least 3 characters" }),
    description: z.string().min(3, { message: "Description must be at least 3 characters" }),
    stock: z.coerce.number().min(0, { message: "Stock must be a non-negative number" }),
    images: z.array(z.string()).min(1, { message: "At least one image URL is required" }),
    isFeatured: z.boolean().optional(),
    banner:z.string().nullable(),
    price: currency
});