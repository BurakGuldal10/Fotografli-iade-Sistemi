import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";

export async function GET(req: NextRequest) {
  try {
    const query = (req.nextUrl.searchParams.get("q") || "").trim().toUpperCase();
    await ensureSeeded();

    if (!query) {
      // Demo kolaylığı için mevcut örnek siparişlerin özet listesini döndür
      const sampleOrders = await prisma.order.findMany({
        include: {
          items: {
            include: { product: true },
          },
          claims: true,
        },
        orderBy: { deliveredAt: "desc" },
      });
      return NextResponse.json({ orders: sampleOrders });
    }

    // Sipariş Numarası (ORD-...) veya Seri Numarası (SN-...) ile arama
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: query },
          {
            items: {
              some: {
                serialNumber: query,
              },
            },
          },
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        claims: {
          include: {
            evidences: true,
            inspection: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Bu sipariş veya seri numarasına ait kayıt bulunamadı. Lütfen faturanızdaki ORD-2026-... veya SN-... kodunu kontrol edin.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (err) {
    console.error("Order lookup error:", err);
    return NextResponse.json(
      { error: "Sipariş sorgulanırken sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
