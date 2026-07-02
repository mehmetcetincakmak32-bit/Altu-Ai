import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Format date to YYYYMMDDTHHMMSSZ (iCal UTC format)
function formatICalDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Yetkisiz", { status: 401 });
  }

  try {
    const durusmalar = await prisma.durusma.findMany({
      where: { dava: { userId: session.id } },
      orderBy: { tarih: "asc" },
      include: { dava: true }
    });

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ALTU Hukuk//NONSGML Durusma Takvimi//TR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:ALTU Duruşma Takvimi",
      "X-WR-TIMEZONE:Europe/Istanbul"
    ].join("\r\n") + "\r\n";

    for (const d of durusmalar) {
      const start = formatICalDate(d.tarih);
      
      // Default to 1-hour hearing duration
      const endDate = new Date(d.tarih);
      endDate.setHours(endDate.getHours() + 1);
      const end = formatICalDate(endDate.toISOString());

      const summary = `Duruşma: ${d.baslik} (${d.dava?.ad || "Genel"})`;
      const description = `Dava Dosya No: ${d.dava?.dosyaNo || "-"}\\nMahkeme: ${d.dava?.mahkeme || "-"}\\nKonu: ${d.dava?.konu || "-"}\\nAciklama: ${d.aciklama || "-"}`;
      const location = d.dava?.mahkeme || "Adliye";

      icsContent += [
        "BEGIN:VEVENT",
        `UID:${d.id}@altuhukuk.com`,
        `DTSTAMP:${formatICalDate(new Date().toISOString())}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT"
      ].join("\r\n") + "\r\n";
    }

    icsContent += "END:VCALENDAR";

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="durusma_takvimi.ics"'
      }
    });
  } catch (error: any) {
    console.error("iCal generation failed:", error);
    return new Response("iCal takvimi oluşturulamadı.", { status: 500 });
  }
}
