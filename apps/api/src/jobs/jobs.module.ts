import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { LabsModule } from '../labs/labs.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [LabsModule, CertificatesModule],
  providers: [JobsService],
})
export class JobsModule {}
