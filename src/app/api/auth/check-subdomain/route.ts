import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subdomain = searchParams.get("subdomain");

  if (!subdomain) {
    return NextResponse.json({ allowed: true });
  }

  // Get token cookie
  const token = req.cookies.get("token")?.value;

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.id }
        });

        if (user) {
          // If user has a subdomain, it must match
          if (user.subdomain) {
            if (user.subdomain.toLowerCase() === subdomain.toLowerCase()) {
              return NextResponse.json({ allowed: true, userId: user.id });
            } else {
              return NextResponse.json({ 
                allowed: false, 
                reason: "subdomain_mismatch",
                correctSubdomain: user.subdomain 
              });
            }
          } else {
            // User does not have a subdomain assigned, but they are trying to access one.
            // In this case, we can either allow it, or block it. Let's redirect/allow if it's admin,
            // or let them access. Usually, if they don't have a subdomain, they shouldn't access a tenant subdomain.
            return NextResponse.json({ 
              allowed: false, 
              reason: "user_has_no_subdomain" 
            });
          }
        }
      }
    } catch (e) {
      // Invalid token
    }
  }

  // No active session, check if the subdomain exists in the database
  const userWithSubdomain = await prisma.user.findUnique({
    where: { subdomain: subdomain.toLowerCase() }
  });

  if (userWithSubdomain) {
    return NextResponse.json({ allowed: true, hasToken: false });
  }

  return NextResponse.json({ 
    allowed: false, 
    reason: "invalid_subdomain" 
  });
}
