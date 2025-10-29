/**
 * Migration Script for Survey System Update
 * 
 * This script migrates existing survey data to the new multi-survey system.
 * Run this AFTER applying the Prisma schema changes.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-surveys.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateSurveys() {
  console.log('🔄 Starting survey migration...\n');

  try {
    // Get all classes
    const classes = await prisma.class.findMany({
      select: {
        id: true,
        title: true,
      },
    });

    console.log(`📚 Found ${classes.length} classes\n`);

    for (const classItem of classes) {
      console.log(`\n📖 Processing class: ${classItem.title} (${classItem.id})`);

      // Find existing survey for this class
      const existingSurveys = await prisma.survey.findMany({
        where: { classId: classItem.id },
      });

      if (existingSurveys.length === 0) {
        console.log('  ℹ️  No survey found for this class');
        continue;
      }

      console.log(`  ✅ Found ${existingSurveys.length} survey(s)`);

      // Update each survey to have the new required fields
      for (const survey of existingSurveys) {
        const updates: {
          title?: string;
          status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
          publishedAt?: Date;
        } = {};

        // Add title if missing
        if (!('title' in survey) || !survey.title) {
          updates.title = `${classItem.title} - Student Survey`;
          console.log(`  📝 Adding title: "${updates.title}"`);
        }

        // Set status to ACTIVE (assuming existing surveys are published)
        if (!('status' in survey)) {
          updates.status = 'ACTIVE';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Type guard issue
          updates.publishedAt = (survey as any).createdAt;
          console.log(`  🟢 Setting status to ACTIVE`);
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await prisma.survey.update({
            where: { id: survey.id },
            data: updates,
          });
          console.log(`  ✅ Updated survey ${survey.id}`);
        }
      }

      // Update survey responses to link to a specific survey
      const responses = await prisma.studentSurveyResponse.findMany({
        where: { classId: classItem.id },
      });

      console.log(`  📊 Found ${responses.length} survey response(s)`);

      if (responses.length > 0 && existingSurveys.length > 0) {
        // Link all responses to the first (and likely only) survey
        const targetSurvey = existingSurveys[0];

        for (const response of responses) {
          // Check if surveyId is already set
          if ('surveyId' in response && response.surveyId) {
            continue;
          }

          try {
            await prisma.studentSurveyResponse.update({
              where: { id: response.id },
              data: { surveyId: targetSurvey.id },
            });
            console.log(`  🔗 Linked response ${response.id} to survey ${targetSurvey.id}`);
          } catch (error) {
            console.error(`  ❌ Failed to update response ${response.id}:`, error);
          }
        }
      }

      // Update learning pathways to link to survey if they exist
      const pathways = await prisma.learningPathway.findMany({
        where: { classId: classItem.id },
      });

      console.log(`  🛤️  Found ${pathways.length} learning pathway(s)`);

      if (pathways.length > 0 && existingSurveys.length > 0) {
        const targetSurvey = existingSurveys[0];

        for (const pathway of pathways) {
          // Check if surveyId is already set
          if ('surveyId' in pathway && pathway.surveyId) {
            continue;
          }

          // Set version to 1 if not set
          const updates: { surveyId?: string; version?: number } = {
            surveyId: targetSurvey.id,
          };

          if (!('version' in pathway) || !pathway.version) {
            updates.version = 1;
          }

          try {
            await prisma.learningPathway.update({
              where: { id: pathway.id },
              data: updates,
            });
            console.log(`  🔗 Linked pathway ${pathway.id} to survey ${targetSurvey.id}`);
          } catch (error) {
            console.error(`  ❌ Failed to update pathway ${pathway.id}:`, error);
          }
        }
      }
    }

    console.log('\n\n✨ Migration completed successfully!\n');

    // Summary
    const totalSurveys = await prisma.survey.count();
    const totalResponses = await prisma.studentSurveyResponse.count();
    const totalPathways = await prisma.learningPathway.count();

    console.log('📊 Summary:');
    console.log(`  - Total surveys: ${totalSurveys}`);
    console.log(`  - Total responses: ${totalResponses}`);
    console.log(`  - Total pathways: ${totalPathways}\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSurveys()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

