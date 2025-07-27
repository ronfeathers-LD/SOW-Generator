const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backupData() {
  try {
    console.log('Starting data backup from Neon...');
    
    // Backup all tables
    const sows = await prisma.sOW.findMany();
    const users = await prisma.user.findMany();
    const comments = await prisma.comment.findMany();
    const salesforceConfigs = await prisma.salesforceConfig.findMany();
    const leanDataSignators = await prisma.leanDataSignator.findMany();
    const avomaConfigs = await prisma.avomaConfig.findMany();
    
    const backup = {
      timestamp: new Date().toISOString(),
      sows,
      users,
      comments,
      salesforceConfigs,
      leanDataSignators,
      avomaConfigs
    };
    
    // Write to file
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(__dirname, '../backup-neon-data.json');
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`Backup completed! Data saved to: ${backupPath}`);
    console.log(`SOWs: ${sows.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Comments: ${comments.length}`);
    console.log(`Salesforce Configs: ${salesforceConfigs.length}`);
    console.log(`LeanData Signators: ${leanDataSignators.length}`);
    console.log(`Avoma Configs: ${avomaConfigs.length}`);
    
  } catch (error) {
    console.error('Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupData(); 