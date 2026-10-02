'use server'
import { convertToPlainObject } from "@/lib/utils";
import { prisma } from "@/db/prisma";

// Get Latest Products
export async function getLatestProducts() {
    const data = await prisma.product.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' }
    })

    return convertToPlainObject(data);
}


// Get single product by it's slug
export async function getProductBySlug(slug: string) {
    return await prisma.product.findFirst({
        where: { slug: slug }
    })
}