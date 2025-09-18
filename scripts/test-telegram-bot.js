#!/usr/bin/env node

/**
 * Script para probar el bot de Telegram y obtener el Chat ID
 * 
 * Instrucciones:
 * 1. Envía un mensaje a tu bot de Telegram (cualquier mensaje)
 * 2. Ejecuta este script: node scripts/test-telegram-bot.js
 * 3. El script te mostrará tu Chat ID
 * 4. Copia el Chat ID y actualiza la variable TELEGRAM_CHAT_ID en .env.local
 */

require('dotenv').config({ path: '.env.local' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN no está configurado en .env.local');
  process.exit(1);
}

async function testTelegramBot() {
  console.log('🤖 Probando bot de Telegram...\n');

  try {
    // 1. Verificar información del bot
    console.log('1️⃣ Verificando información del bot...');
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const botInfo = await botInfoResponse.json();

    if (!botInfoResponse.ok) {
      console.error('❌ Error al obtener información del bot:', botInfo.description);
      return;
    }

    console.log('✅ Bot encontrado:');
    console.log(`   - Nombre: ${botInfo.result.first_name}`);
    console.log(`   - Username: @${botInfo.result.username}`);
    console.log(`   - ID: ${botInfo.result.id}\n`);

    // 2. Obtener actualizaciones (mensajes enviados al bot)
    console.log('2️⃣ Obteniendo mensajes recientes...');
    const updatesResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
    const updates = await updatesResponse.json();

    if (!updatesResponse.ok) {
      console.error('❌ Error al obtener actualizaciones:', updates.description);
      return;
    }

    if (updates.result.length === 0) {
      console.log('⚠️  No se encontraron mensajes recientes.');
      console.log('\n📝 Para obtener tu Chat ID:');
      console.log(`1. Envía un mensaje a tu bot: @${botInfo.result.username}`);
      console.log('2. Ejecuta este script nuevamente');
      return;
    }

    console.log('✅ Mensajes encontrados:\n');

    // Mostrar información de los chats
    const chats = new Map();
    updates.result.forEach(update => {
      if (update.message && update.message.chat) {
        const chat = update.message.chat;
        chats.set(chat.id, chat);
      }
    });

    chats.forEach((chat, chatId) => {
      console.log(`📱 Chat encontrado:`);
      console.log(`   - Chat ID: ${chatId}`);
      console.log(`   - Tipo: ${chat.type}`);
      if (chat.first_name) console.log(`   - Nombre: ${chat.first_name} ${chat.last_name || ''}`);
      if (chat.username) console.log(`   - Username: @${chat.username}`);
      if (chat.title) console.log(`   - Título del grupo: ${chat.title}`);
      console.log('');
    });

    // 3. Probar envío de mensaje si hay un Chat ID configurado
    const configuredChatId = process.env.TELEGRAM_CHAT_ID;
    if (configuredChatId && configuredChatId !== 'YOUR_CHAT_ID_HERE') {
      console.log('3️⃣ Probando envío de mensaje...');
      
      const testMessage = `🧪 *Prueba de Bot de Telegram*

✅ El bot está funcionando correctamente
📅 Fecha: ${new Date().toLocaleString('es-ES')}
🏌️ Sistema: TeeReserve Golf

¡Las alertas de Telegram están activas!`;

      const sendResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: configuredChatId,
          text: testMessage,
          parse_mode: 'Markdown'
        })
      });

      const sendResult = await sendResponse.json();

      if (sendResponse.ok) {
        console.log('✅ Mensaje de prueba enviado exitosamente!');
        console.log(`   - Message ID: ${sendResult.result.message_id}`);
      } else {
        console.error('❌ Error al enviar mensaje:', sendResult.description);
      }
    } else {
      console.log('3️⃣ Para probar el envío de mensajes:');
      console.log('1. Copia uno de los Chat IDs de arriba');
      console.log('2. Actualiza TELEGRAM_CHAT_ID en .env.local');
      console.log('3. Ejecuta este script nuevamente');
    }

    console.log('\n🎉 Prueba completada!');
    
    if (chats.size > 0) {
      console.log('\n📋 Próximos pasos:');
      console.log('1. Copia el Chat ID que corresponda a tu cuenta personal');
      console.log('2. Actualiza la variable TELEGRAM_CHAT_ID en .env.local');
      console.log('3. Reinicia el servidor de desarrollo');
      console.log('4. Realiza una reserva de prueba para verificar las alertas');
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
  }
}

// Ejecutar la prueba
testTelegramBot();