import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.modelVersion.createMany({
    data: [
      { version: 'baseline-v1', name: 'Gradient Boosting Classifier', promoted: true, metrics: JSON.stringify({ accuracy: 0.62, auc: 0.68 }) },
      { version: 'tcn-v1', name: 'TCN Sequence Model', promoted: false, metrics: JSON.stringify({ accuracy: 0.59, auc: 0.65 }) },
    ],
    skipDuplicates: true,
  });
  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
