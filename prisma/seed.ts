import {PrismaClient} from "@prisma/client";


const prisma = new PrismaClient()

async function main(){
    await prisma.user.deleteMany()
    await prisma.user.createMany({
        data: [
          {
            name: 'Moudja Admin',
            email: 'admin@synapsed.ai',
            role: 'ADMIN',
            image: '',
          },
          {
            name: 'Prof Sarah',
            email: 'sarah@synapsed.ai',
            role: 'PROFESSOR',
            image: '',
          },
          {
            name: 'Learner John',
            email: 'john@student.ai',
            role: 'STUDENT',
            image: '',
          },
        ],
      });
    
      console.log('✅ Seeded users successfully.');
    }
    
    main()
      .catch((e) => {
        console.error('❌ Error while seeding:', e);
        process.exit(1);
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
    