const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAdmin() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('Please provide an email address: node scripts/setup-admin.js your-email@example.com');
      process.exit(1);
    }

    console.log(`Setting up admin user for: ${email}`);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: { role: 'admin' }
      });
      console.log(`✅ Updated existing user to admin: ${updatedUser.email}`);
    } else {
      // Create new admin user
      const newUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Use email prefix as name
          role: 'admin'
        }
      });
      console.log(`✅ Created new admin user: ${newUser.email}`);
    }

    console.log('\n🎉 Admin user setup complete!');
    console.log('You can now log in with this email and access admin features.');
    
  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin(); 