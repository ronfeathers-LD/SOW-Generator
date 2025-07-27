const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreData() {
  try {
    console.log('Starting data restoration to Supabase...');
    
    // Read backup file
    const backupPath = path.join(__dirname, '../backup-neon-data.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(`Restoring data from backup created at: ${backupData.timestamp}`);
    
    // Restore data in order (respecting foreign key constraints)
    
    // 1. Restore Users first (no dependencies)
    console.log('Restoring users...');
    for (const user of backupData.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user
      });
    }
    console.log(`Restored ${backupData.users.length} users`);
    
    // 2. Restore SOWs
    console.log('Restoring SOWs...');
    for (const sow of backupData.sows) {
      await prisma.sOW.upsert({
        where: { id: sow.id },
        update: sow,
        create: sow
      });
    }
    console.log(`Restored ${backupData.sows.length} SOWs`);
    
    // 3. Restore Comments (depends on SOWs and Users)
    console.log('Restoring comments...');
    for (const comment of backupData.comments) {
      await prisma.comment.upsert({
        where: { id: comment.id },
        update: comment,
        create: comment
      });
    }
    console.log(`Restored ${backupData.comments.length} comments`);
    
    // 4. Restore Salesforce Configs
    console.log('Restoring Salesforce configs...');
    for (const config of backupData.salesforceConfigs) {
      await prisma.salesforceConfig.upsert({
        where: { id: config.id },
        update: config,
        create: config
      });
    }
    console.log(`Restored ${backupData.salesforceConfigs.length} Salesforce configs`);
    
    // 5. Restore LeanData Signators
    console.log('Restoring LeanData signators...');
    for (const signator of backupData.leanDataSignators) {
      await prisma.leanDataSignator.upsert({
        where: { id: signator.id },
        update: signator,
        create: signator
      });
    }
    console.log(`Restored ${backupData.leanDataSignators.length} LeanData signators`);
    
    // 6. Restore Avoma Configs
    console.log('Restoring Avoma configs...');
    for (const config of backupData.avomaConfigs) {
      await prisma.avomaConfig.upsert({
        where: { id: config.id },
        update: config,
        create: config
      });
    }
    console.log(`Restored ${backupData.avomaConfigs.length} Avoma configs`);
    
    console.log('✅ Data restoration completed successfully!');
    
  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreData(); 