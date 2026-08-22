import { PrismaClient } from '.prisma/client';
const prisma = new PrismaClient();
async function main() {
  const instances = await prisma.labInstance.findMany({
    include: { user: { select: { email: true } }, lab: { select: { title: true } } },
    orderBy: { startedAt: 'desc' },
    take: 5,
  });
  for (const i of instances) {
    console.log(i.startedAt.toISOString(), '|', i.user.email, '|', i.status, '| guacConnectionId:', i.guacConnectionId, '| ref:', i.externalRef?.slice(0,12));
  }
}
main().finally(() => prisma.$disconnect());
