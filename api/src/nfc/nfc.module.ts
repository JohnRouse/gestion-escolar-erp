import { Module } from '@nestjs/common';
import { NfcController } from './nfc.controller';

@Module({
  controllers: [NfcController]
})
export class NfcModule {}
