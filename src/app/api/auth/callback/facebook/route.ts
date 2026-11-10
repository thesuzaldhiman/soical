import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return new NextResponse(
      `<html><body><script>
        alert("Facebook Authentication Failed: ${errorDescription || error}");
        window.location.href = "/accounts?error=oauth_failed";
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/accounts?error=no_code', request.url));
  }

  // In production, exchange code for 60-day long-lived User Access Token via graph.facebook.com/v19.0/oauth/access_token
  // and fetch /me/accounts to store encrypted tokens in Database.
  return NextResponse.redirect(new URL('/accounts?success=facebook_connected', request.url));
}
