import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// Función para enviar mensaje de Telegram
async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Telegram API error:', result);
      return false;
    }

    return result.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

// Función para guardar registro de alerta
async function saveAlertRecord(chatId: string, message: string, status: 'sent' | 'failed') {
  try {
    if (!db) return;
    await db.collection('admin_alerts').add({
      type: 'test_message',
      recipientChatId: chatId,
      message: message,
      data: {
        testMessage: true,
        timestamp: new Date().toISOString()
      },
      sentAt: new Date().toISOString(),
      status: status
    });
  } catch (error) {
    console.error('Error saving alert record:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { chatId, message } = await request.json();

    // Validar datos requeridos
    if (!chatId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, message' },
        { status: 400 }
      );
    }

    // Verificar que el token de Telegram esté configurado
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot token not configured' },
        { status: 500 }
      );
    }

    // Preparar mensaje de prueba con formato
    const testMessage = `🧪 <b>Mensaje de Prueba</b>\n\n${message}\n\n<i>Enviado desde el panel de administración</i>\n⏰ ${new Date().toLocaleString('es-ES')}`;

    // Enviar mensaje
    const success = await sendTelegramMessage(chatId, testMessage);

    // Guardar registro
    await saveAlertRecord(chatId, testMessage, success ? 'sent' : 'failed');

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test message sent successfully' 
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test message' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test message endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Endpoint para verificar la configuración del bot
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      return NextResponse.json({
        configured: false,
        message: 'Telegram bot token not configured'
      });
    }

    // Verificar que el bot esté funcionando
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();
      
      if (result.ok) {
        return NextResponse.json({
          configured: true,
          botInfo: {
            username: result.result.username,
            firstName: result.result.first_name,
            canJoinGroups: result.result.can_join_groups,
            canReadAllGroupMessages: result.result.can_read_all_group_messages
          }
        });
      } else {
        return NextResponse.json({
          configured: false,
          message: 'Invalid bot token'
        });
      }
    } catch (error) {
      return NextResponse.json({
        configured: false,
        message: 'Error connecting to Telegram API'
      });
    }
  } catch (error) {
    console.error('Error checking bot configuration:', error);
    return NextResponse.json(
      { error: 'Error checking bot configuration' },
      { status: 500 }
    );
  }
}
