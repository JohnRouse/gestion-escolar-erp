import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AcademicosModule } from './academicos/academicos.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { ComunicacionesModule } from './comunicaciones/comunicaciones.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AcademicosModule,
    FinanzasModule,
    ComunicacionesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
