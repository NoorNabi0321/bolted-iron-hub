#!/usr/bin/env node

import { executeWhatsAppCommand } from './server/services/whatsappCommandExecutor.js';

const testCommands = [
  '/help',
  '/list',
  '/count',
  '/insights',
  '/project 274marcy',
  '/status 274marcy',
  '/team 274marcy',
  '/checklist 274marcy',
  '/notes 274marcy',
  '/changes 274marcy',
  '/list 2026-03-17',
  '/count 2026-03-17',
];

async function runTests() {
  console.log('🧪 Testing WhatsApp Bot Commands\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const command of testCommands) {
    try {
      console.log(`Testing: ${command}`);
      const result = await executeWhatsAppCommand(command);
      
      if (result.success) {
        console.log(`✅ Success - Command: ${result.commandType}`);
        console.log(`   Response length: ${result.message.length} chars\n`);
      } else {
        console.log(`❌ Failed - ${result.error || 'Unknown error'}\n`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Test suite completed!');
}

runTests().catch(console.error);
