import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const { to, subject, html } = await request.json()

  console.log('TO DEL EMAIL:', to)
  console.log('SUBJECT:', subject)
  

  if (!to || !subject || !html) {
    console.log('Faltan datos en el envío de email')
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  try {
    // Envío del email
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev', // en free tier usa este sender
      to,
      subject,
      html,
    })
    console.log('RESULTADO RESEND:', result) // Verás aquí error, id, status, etc.

    if (result.error) {
      console.log('ERROR DESDE RESEND:', result.error)
      throw result.error
    }

    return NextResponse.json({ ok: true, data: result })
  } catch (e: any) {
    console.log('ERROR ENVIANDO EMAIL:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
